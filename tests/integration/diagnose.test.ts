import { describe, it, expect, vi } from 'vitest';
import { runDiagnose } from '../../src/lib/diagnose';
import { makeKvMock } from '../support/kvMock';

const validJson = (model: string) => JSON.stringify({
  appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780', confidence: 0.9 },
  primary: {
    name: 'Drain pump failure',
    confidence: 0.75,
    rationale: 'r',
    recovery: { diy: [{ action: 'unplug', difficulty: 'easy' }], callPro: false },
    parts: []
  },
  alternatives: [],
  whatWouldChangeMyMind: [],
  meta: { model, createdAt: '2026-05-11T10:00:00Z' }
});

describe('runDiagnose (appliance)', () => {
  it('returns id + result on happy path; updates budget; passes optional fields through', async () => {
    const kv = makeKvMock();
    const openRouter = vi.fn(async () => ({
      content: validJson('qwen/qwen-2.5-vl-72b-instruct'),
      usage: { prompt_tokens: 1000, completion_tokens: 500, total_cost: 0.005 }
    }));

    const r = await runDiagnose({
      kv,
      ipHash: 'ip',
      photoDataUrl: 'data:image/jpeg;base64,xxx',
      freeformText: 'wont drain',
      modelField: 'Whirlpool WDT780',
      errorCode: 'LE',
      apiKey: 'k',
      model: 'qwen/qwen-2.5-vl-72b-instruct',
      maxOutputTokens: 2000,
      callOpenRouter: openRouter as any
    });

    expect(r.id).toMatch(/^[0-9a-z]{8}$/);
    expect(r.result.appliance?.make).toBe('Whirlpool');
    expect(r.result.meta.model).toBe('qwen/qwen-2.5-vl-72b-instruct');

    // Verify the optional fields made it into the user content text.
    const calls = (openRouter as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const callArgs = calls[0][0];
    const userText = callArgs.userContent.find((p: any) => p.type === 'text')?.text ?? '';
    expect(userText).toContain('wont drain');
    expect(userText).toContain('Whirlpool WDT780');
    expect(userText).toContain('LE');
  });

  it('retries once on schema error and succeeds', async () => {
    const kv = makeKvMock();
    const openRouter = vi.fn()
      .mockResolvedValueOnce({ content: '{"bad":true}', usage: { total_cost: 0.001 } })
      .mockResolvedValueOnce({ content: validJson('qwen/qwen-2.5-vl-72b-instruct'), usage: { total_cost: 0.005 } });

    const r = await runDiagnose({
      kv, ipHash: 'ip', photoDataUrl: 'data:image/jpeg;base64,xxx',
      freeformText: '', modelField: '', errorCode: '',
      apiKey: 'k', model: 'qwen/qwen-2.5-vl-72b-instruct', maxOutputTokens: 2000,
      callOpenRouter: openRouter as any
    });

    expect(openRouter).toHaveBeenCalledTimes(2);
    expect(r.result.primary.name).toBe('Drain pump failure');
  });

  it('throws schemaError after second failure', async () => {
    const kv = makeKvMock();
    const openRouter = vi.fn(async () => ({ content: '{"still":"bad"}', usage: { total_cost: 0 } }));

    await expect(runDiagnose({
      kv, ipHash: 'ip', photoDataUrl: 'data:image/jpeg;base64,xxx',
      freeformText: '', modelField: '', errorCode: '',
      apiKey: 'k', model: 'qwen/qwen-2.5-vl-72b-instruct', maxOutputTokens: 2000,
      callOpenRouter: openRouter as any
    })).rejects.toThrow(/schema/i);

    expect(openRouter).toHaveBeenCalledTimes(2);
  });
});
