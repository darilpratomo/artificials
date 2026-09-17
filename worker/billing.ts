import { HTTPException } from 'hono/http-exception';
import { PLANS, isPlan, type PlanKey } from '../shared/plans';
import { db, aiReady } from './auth';
import { verifyPaddleSignature } from './security';
import type { Env, Ctx } from './types';
export const billingReady = (e: Env) =>
  e.BILLING_ENABLED === 'true' &&
  aiReady(e) &&
  (e.ENVIRONMENT !== 'production' || !!(e.TURNSTILE_SITE_KEY && e.TURNSTILE_SECRET_KEY)) &&
  e.LEGAL_READY === 'true' &&
  !!(
    e.OPERATOR_NAME &&
    e.OPERATOR_ADDRESS &&
    e.SUPPORT_EMAIL &&
    e.PRIVACY_EMAIL &&
    e.PADDLE_API_KEY &&
    e.PADDLE_CLIENT_TOKEN &&
    e.PADDLE_WEBHOOK_SECRET &&
    e.PADDLE_PRICE_STARTER &&
    e.PADDLE_PRICE_PRO &&
    e.PADDLE_PRICE_STUDIO
  );
export function priceId(e: Env, plan: PlanKey) {
  return {
    starter: e.PADDLE_PRICE_STARTER,
    pro: e.PADDLE_PRICE_PRO,
    studio: e.PADDLE_PRICE_STUDIO,
  }[plan];
}
export async function paddle(e: Env, path: string, body?: unknown) {
  const response = await fetch(
    `https://${e.PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox-api' : 'api'}.paddle.com${path}`,
    {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${e.PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new HTTPException(502, { message: 'The billing provider is temporarily unavailable.' });
  return ((await response.json()) as { data: any }).data;
}
export async function checkout(c: Ctx, userId: string, plan: PlanKey) {
  if (!billingReady(c.env))
    throw new HTTPException(503, { message: 'Subscriptions are not open yet.' });
  const { data: existing, error } = await db(c.env)
    .from('subscriptions')
    .select('period_end,status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('billing database');
  if (existing && (new Date(existing.period_end) > new Date() || existing.status === 'active'))
    throw new HTTPException(409, {
      message: 'You already have a subscription. Manage it from your dashboard.',
    });
  const price = await paddle(c.env, '/prices/' + priceId(c.env, plan));
  if (
    price.status !== 'active' ||
    price.unit_price?.currency_code !== 'USD' ||
    Number(price.unit_price?.amount) !== PLANS[plan].price * 100 ||
    price.billing_cycle?.interval !== 'month' ||
    price.billing_cycle?.frequency !== 1 ||
    price.trial_period ||
    price.tax_mode !== 'external'
  )
    throw new HTTPException(503, { message: 'This plan is being configured.' });
  const { data: claim, error: claimError } = await db(c.env).rpc('claim_checkout', {
    p_user: userId,
    p_plan: plan,
  });
  if (claimError) throw new Error('Checkout lock');
  if (!claim.claimed) {
    if (claim.transaction_id && claim.plan === plan) {
      const previous = await paddle(c.env, '/transactions/' + claim.transaction_id);
      if (['draft', 'ready', 'billed'].includes(previous.status))
        return { url: c.env.APP_URL + '/checkout?_ptxn=' + encodeURIComponent(previous.id) };
      if (['canceled', 'completed'].includes(previous.status)) {
        if (previous.status === 'canceled') {
          await db(c.env)
            .from('checkout_requests')
            .delete()
            .eq('user_id', userId)
            .eq('transaction_id', previous.id);
          throw new HTTPException(409, {
            message: 'Your previous checkout was canceled. Please try again.',
          });
        }
      }
    }
    throw new HTTPException(409, {
      message:
        'A checkout is already in progress. Complete your existing checkout or contact support before starting another plan.',
    });
  }
  const transaction = await paddle(c.env, '/transactions', {
    items: [{ price_id: priceId(c.env, plan), quantity: 1 }],
    collection_mode: 'automatic',
    custom_data: { user_id: userId, plan },
    checkout: { url: c.env.APP_URL + '/checkout' },
  });
  const { error: saveError } = await db(c.env)
    .from('checkout_requests')
    .update({ transaction_id: transaction.id })
    .eq('user_id', userId);
  if (saveError) throw new Error('Checkout save');
  return { url: c.env.APP_URL + '/checkout?_ptxn=' + encodeURIComponent(transaction.id) };
}
type Period = { starts_at: string; ends_at: string };
/** Never map an old initial payment to the subscription's current renewal cycle. */
export function paidPeriod(
  transaction: { origin: string; billing_period?: Period | null },
  subscription: { first_billed_at?: string | null; current_billing_period?: Period | null },
): Period | null {
  const explicit = transaction.billing_period;
  const initial =
    ['api', 'web'].includes(transaction.origin) &&
    subscription.first_billed_at &&
    subscription.current_billing_period &&
    Date.parse(subscription.first_billed_at) ===
      Date.parse(subscription.current_billing_period.starts_at)
      ? subscription.current_billing_period
      : null;
  const period = explicit || initial;
  if (!period) return null;
  const duration = Date.parse(period.ends_at) - Date.parse(period.starts_at);
  return Number.isFinite(duration) && duration >= 27 * 86400000 && duration <= 32 * 86400000
    ? period
    : null;
}
export async function webhook(c: Ctx) {
  const raw = await c.req.text();
  if (
    !(await verifyPaddleSignature(
      raw,
      c.req.header('paddle-signature') || null,
      c.env.PADDLE_WEBHOOK_SECRET,
    ))
  )
    throw new HTTPException(401, { message: 'Invalid signature.' });
  const event = JSON.parse(raw);
  if (!event.event_id || !event.occurred_at || !event.data?.id)
    throw new HTTPException(400, { message: 'Invalid webhook.' });
  const kind = String(event.event_type);
  if (
    kind !== 'transaction.completed' &&
    ![
      'subscription.updated',
      'subscription.canceled',
      'subscription.paused',
      'subscription.past_due',
      'adjustment.updated',
      'adjustment.created',
    ].includes(kind)
  )
    return c.json({ received: true });
  const database = db(c.env);
  if (kind.startsWith('adjustment.')) {
    const adjustment = await paddle(c.env, '/adjustments/' + event.data.id);
    if (
      !['approved'].includes(adjustment.status) ||
      !['refund', 'chargeback', 'chargeback_warning'].includes(adjustment.action)
    )
      return c.json({ received: true });
    const txn = await paddle(c.env, '/transactions/' + adjustment.transaction_id);
    if (txn.subscription_id) {
      const { error } = await database.rpc('apply_adjustment', {
        p_id: adjustment.id,
        p_occurred: event.occurred_at,
        p_subscription: txn.subscription_id,
      });
      if (error) throw new Error('refund state update');
    }
    return c.json({ received: true });
  }
  const paid = kind === 'transaction.completed';
  const data = await paddle(c.env, (paid ? '/transactions/' : '/subscriptions/') + event.data.id);
  const subId = paid ? data.subscription_id : data.id;
  if (!subId) return c.json({ received: true });
  const subscription = paid ? await paddle(c.env, '/subscriptions/' + subId) : data;
  let userId = subscription.custom_data?.user_id || data.custom_data?.user_id;
  if (!userId) {
    const { data: row } = await database
      .from('subscriptions')
      .select('user_id')
      .eq('paddle_subscription_id', subId)
      .maybeSingle();
    userId = row?.user_id;
  }
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId))
    throw new HTTPException(400, { message: 'Unmapped subscription.' });
  const period = paid ? paidPeriod(data, subscription) : null;
  const items = data.items || [];
  const plan = Object.keys(PLANS).find((key) =>
    items.some((item: any) => item.price?.id === priceId(c.env, key as PlanKey)),
  ) as PlanKey | undefined;
  if (
    paid &&
    (!plan ||
      !isPlan(plan) ||
      data.status !== 'completed' ||
      !['subscription_recurring', 'api', 'web'].includes(data.origin) ||
      !period ||
      items.length !== 1 ||
      items[0].quantity !== 1 ||
      items[0].proration ||
      items[0].price?.billing_cycle?.interval !== 'month' ||
      items[0].price?.billing_cycle?.frequency !== 1)
  )
    throw new HTTPException(400, { message: 'Unsupported transaction.' });
  // Only a fully paid monthly cycle activates or replenishes a plan; no proration resets.
  if (paid) {
    const total = Number(data.details?.totals?.total);
    if (
      data.currency_code !== 'USD' ||
      data.discount_id ||
      Number(data.details?.totals?.discount || 0) !== 0 ||
      !Number.isFinite(total) ||
      total < PLANS[plan!].price * 100
    )
      throw new HTTPException(400, { message: 'Unexpected paid amount.' });
    if (subscription.status !== 'active') return c.json({ received: true });
  }
  const { error } = await database.rpc('apply_billing_event', {
    p_event: event.event_id,
    p_occurred: event.occurred_at,
    p_user: userId,
    p_subscription: subId,
    p_customer: data.customer_id,
    p_plan: plan || 'starter',
    p_start: period?.starts_at || null,
    p_end: period?.ends_at || null,
    p_status: subscription.status,
    p_paid: paid,
  });
  if (error) throw new Error('Webhook persistence failed');
  return c.json({ received: true });
}
