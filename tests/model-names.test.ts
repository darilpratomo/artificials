import { describe, expect, it } from 'vitest';
import { readableName } from '../shared/model-names';

describe('readable model names', () => {
  it('writes a publisher’s identifier the way model names are written', () => {
    for (const [raw, readable] of [
      ['gpt-4-0613', 'GPT-4 (0613)'],
      ['gpt-3-5-turbo', 'GPT-3.5 Turbo'],
      ['claude-3-5-sonnet-20240620', 'Claude 3.5 Sonnet (2024-06-20)'],
      ['gemini-1.5-pro-002', 'Gemini 1.5 Pro (002)'],
      ['grok-2-2024-08-13', 'Grok 2 (2024-08-13)'],
      ['gemma-2-9b-it', 'Gemma 2 9B IT'],
      ['qwen1.5-32b-chat', 'Qwen1.5 32B Chat'],
      ['mixtral-8x7b-instruct-v0.1', 'Mixtral 8x7B Instruct V0.1'],
      ['deepseek-v4-pro-high-preview', 'DeepSeek V4 Pro High Preview'],
      ['minimax-m2.1-preview', 'MiniMax M2.1 Preview'],
      ['o1-preview', 'o1 Preview'],
      ['internlm2_5-20b-chat', 'InternLM2.5 20B Chat'],
      ['kimi-k2p5', 'Kimi K2.5'],
      ['muse-spark', 'Muse Spark'],
      ['amazon-nova-experimental-chat-26-02-10', 'Amazon Nova Experimental Chat (26-02-10)'],
      ['phi-3-mini-4k-instruct-june-2024', 'Phi-3 Mini 4K Instruct June 2024'],
    ])
      expect(readableName(raw), raw).toBe(readable);
  });

  it('keeps Epoch’s configuration and drops an organisation prefix', () => {
    expect(readableName('gpt-5.5-pre-release_xhigh')).toBe('GPT-5.5 Pre-release (xhigh)');
    expect(readableName('ByteDance-Seed/Seed-OSS-36B-Instruct')).toBe('Seed OSS 36B Instruct');
  });

  it('leaves names already written for people as they are', () => {
    expect(readableName('Claude 3 Opus')).toBe('Claude 3 Opus');
    expect(readableName('Qwen3.8 Max 0902 (xhigh)')).toBe('Qwen3.8 Max 0902 (xhigh)');
  });
});
