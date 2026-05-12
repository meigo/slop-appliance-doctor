import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/diagnose/+server';
import { makeKvMock } from '../support/kvMock';

function makeFormData(opts: {
  photo?: Blob;
  text?: string;
  modelField?: string;
  errorCode?: string;
  token?: string;
}): FormData {
  const fd = new FormData();
  if (opts.photo !== undefined) fd.append('photo', opts.photo, 'p.jpg');
  fd.append('text', opts.text ?? '');
  fd.append('modelField', opts.modelField ?? '');
  fd.append('errorCode', opts.errorCode ?? '');
  fd.append('turnstileToken', opts.token ?? 'test-token');
  return fd;
}

function makeRequest(fd: FormData): Request {
  return new Request('http://localhost/api/diagnose', { method: 'POST', body: fd });
}

const validJson = JSON.stringify({
  appliance: { category: 'dishwasher', make: 'X', model: 'Y', confidence: 0.7 },
  primary: {
    name: 'Drain pump failure',
    confidence: 0.7,
    rationale: 'r',
    recovery: { diy: [], callPro: false },
    parts: []
  },
  alternatives: [],
  whatWouldChangeMyMind: [],
  meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
});

beforeEach(() => vi.restoreAllMocks());

const baseEvent = (request: Request, kv: KVNamespace) => ({
  request,
  platform: {
    env: {
      DIAGNOSES: kv,
      OPENROUTER_API_KEY: 'k',
      OPENROUTER_MODEL: 'qwen/qwen-2.5-vl-72b-instruct',
      DAILY_BUDGET_CENTS: '1000',
      RATE_LIMIT_PER_HOUR: '10',
      DAILY_CAP_PER_IP: '50',
      MAX_OUTPUT_TOKENS: '2000',
      TURNSTILE_SITE_KEY: 'site',
      TURNSTILE_SECRET_KEY: 'secret',
      HASH_SALT: 'test-salt'
    }
  },
  getClientAddress: () => '1.2.3.4'
} as any);

describe('POST /api/diagnose (appliance)', () => {
  it('returns 401 when Turnstile fails', async () => {
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: false }));
      throw new Error('unexpected fetch');
    }) as any;

    const fd = makeFormData({ photo: new Blob(['x'], { type: 'image/jpeg' }) });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(401);
  });

  it('returns 400 when photo missing', async () => {
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      throw new Error('unexpected fetch');
    }) as any;
    const fd = makeFormData({});
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(400);
  });

  it('returns 200 + id on happy path with all optional fields', async () => {
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      if (u.includes('openrouter')) {
        return new Response(JSON.stringify({
          choices: [{ message: { content: validJson } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_cost: 0.001 }
        }));
      }
      throw new Error('unexpected: ' + u);
    }) as any;

    const fd = makeFormData({
      photo: new Blob(['x'], { type: 'image/jpeg' }),
      text: 'wont drain',
      modelField: 'Whirlpool WDT780',
      errorCode: 'LE'
    });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string };
    expect(body.id).toMatch(/^[0-9a-z]{8}$/);
  });

  it('returns 400 when modelField is oversize', async () => {
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      throw new Error('unexpected');
    }) as any;

    const fd = makeFormData({
      photo: new Blob(['x'], { type: 'image/jpeg' }),
      modelField: 'a'.repeat(201)
    });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(400);
  });

  it('returns 400 when errorCode is oversize', async () => {
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      throw new Error('unexpected');
    }) as any;

    const fd = makeFormData({
      photo: new Blob(['x'], { type: 'image/jpeg' }),
      errorCode: 'F' + '1'.repeat(50)
    });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(400);
  });
});
