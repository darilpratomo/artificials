import { streamSSE } from 'hono/streaming';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { artifactSchema, artifactJsonSchema } from '../shared/schema';
import {
  MODEL,
  MAX_OUTPUT_TOKENS,
  MAX_INPUT_BYTES,
  SYSTEM_PROMPT,
  dailyBudgetMicros,
} from '../shared/plans';
import { aiReady, db, requireUser } from './auth';
import type { Ctx } from './types';
const requestSchema = z
  .object({
    prompt: z.string().min(10).max(4000),
    requestId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
  })
  .strict();
const messages: Record<string, string> = {
  STORAGE_CAPACITY: 'Studio is temporarily at storage capacity. Please try again later.',
  SUBSCRIPTION_REQUIRED: 'An active Studio subscription is required.',
  MONTHLY_LIMIT: 'You have reached your monthly generation limit.',
  GENERATION_IN_PROGRESS: 'Another generation is running. Please wait.',
  RATE_LIMIT: 'Please wait a minute before generating again.',
  DAILY_SERVICE_LIMIT:
    'Studio has reached its daily service capacity. Please try again after 00:00 UTC.',
  PROJECT_LIMIT: 'Your saved project limit is reached. Delete a project or revise an existing one.',
  PROJECT_NOT_FOUND: 'Project not found.',
};
export async function generate(c: Ctx) {
  const { user } = await requireUser(c);
  if (!aiReady(c.env))
    throw new HTTPException(503, { message: 'AI generation is not available yet.' });
  const body = requestSchema.parse(await c.req.json());
  const database = db(c.env);
  let previous = '';
  if (body.projectId) {
    const { data, error } = await database
      .from('projects')
      .select('artifact')
      .eq('id', body.projectId)
      .eq('user_id', user.id)
      .single();
    if (error || !data) throw new HTTPException(404, { message: 'Project not found.' });
    if (data.artifact) previous = '\nExisting app to revise:\n' + JSON.stringify(data.artifact);
  }
  const input = body.prompt + previous;
  // Count the complete serialized payload, not just the user prompt. The schema
  // and instructions are also billed input. One provider call; no retries/tools.
  const providerBody = JSON.stringify({
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    reasoning: { effort: 'minimal' },
    text: {
      format: {
        type: 'json_schema',
        name: 'full_stack_app',
        strict: true,
        schema: artifactJsonSchema,
      },
    },
    service_tier: 'default',
    store: false,
    stream: false,
  });
  if (new TextEncoder().encode(providerBody).length > MAX_INPUT_BYTES)
    throw new HTTPException(413, {
      message:
        'This project is too large for a revision. Start a new project with a shorter brief.',
    });
  const { data: reservation, error } = await database.rpc('reserve_generation', {
    p_user: user.id,
    p_id: body.requestId,
    p_project: body.projectId || null,
    p_title: body.prompt.slice(0, 70),
    p_daily_limit: dailyBudgetMicros(c.env.GLOBAL_DAILY_AI_BUDGET_MICROS),
  });
  if (error) {
    const known = Object.keys(messages).find((k) => error.message.includes(k));
    throw new HTTPException(known === 'PROJECT_NOT_FOUND' ? 404 : 429, {
      message: known ? messages[known] : 'Unable to reserve a generation. Please try again later.',
    });
  }
  if (reservation.duplicate)
    return c.json({
      duplicate: true,
      projectId: reservation.project_id,
      status: reservation.status,
    });
  return streamSSE(c, async (stream) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 180000);
    stream.onAbort(() => abort.abort());
    const heartbeat = setInterval(() => {
      void stream
        .writeSSE({
          event: 'status',
          data: JSON.stringify({ message: 'Building your interface and database connections…' }),
        })
        .catch(() => abort.abort());
    }, 15000);
    try {
      await stream.writeSSE({
        event: 'status',
        data: JSON.stringify({ message: 'Designing your app and database…' }),
      });
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: providerBody,
        signal: abort.signal,
      });
      if (!response.ok || !response.body) throw new Error('provider');
      // Status still streams to the browser. Parsing a single completed JSON
      // response avoids thousands of token-delta events on the Free CPU budget.
      const raw = await response.text();
      if (raw.length > 500000) throw new Error('output limit');
      const result = z
        .object({
          status: z.literal('completed'),
          usage: z.object({
            input_tokens: z.number().int().nonnegative(),
            output_tokens: z.number().int().nonnegative(),
          }),
          output: z.array(
            z.object({
              type: z.string(),
              content: z
                .array(z.object({ type: z.string(), text: z.string().optional() }))
                .optional(),
            }),
          ),
        })
        .parse(JSON.parse(raw));
      const output = result.output
        .filter((item) => item.type === 'message')
        .flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text || '')
        .join('');
      if (!output || output.length > 220000) throw new Error('output limit');
      const usage = result.usage;
      const artifact = artifactSchema.parse(JSON.parse(output));
      const { error: saveError } = await database.rpc('complete_generation', {
        p_user: user.id,
        p_id: body.requestId,
        p_artifact: artifact,
        p_input: usage.input_tokens,
        p_output: usage.output_tokens,
      });
      if (saveError) throw new Error('save');
      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({ artifact, projectId: reservation.project_id }),
      });
    } catch {
      abort.abort();
      await database
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', body.requestId)
        .eq('user_id', user.id)
        .eq('status', 'pending');
      try {
        await stream.writeSSE({
          event: 'failure',
          data: JSON.stringify({
            message:
              'This generation could not finish. Check your dashboard before trying again. The submitted attempt has used one generation.',
          }),
        });
      } catch {
        /* Disconnected clients can inspect their dashboard. */
      }
    } finally {
      clearTimeout(timer);
      clearInterval(heartbeat);
    }
  });
}
