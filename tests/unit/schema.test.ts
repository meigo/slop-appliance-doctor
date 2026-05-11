import { describe, it, expect } from 'vitest';
import { DiagnosisResultSchema } from '../../src/lib/schema';

describe('DiagnosisResultSchema (appliance)', () => {
  it('parses a minimal valid result', () => {
    const valid = {
      appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780SAEM', confidence: 0.9 },
      primary: {
        name: 'Drain pump failure',
        confidence: 0.75,
        rationale: 'Standing water in tub after cycle; humming sound from lower area.',
        recovery: {
          diy: [{ action: 'Disconnect power at breaker', difficulty: 'easy' }],
          callPro: false
        },
        parts: []
      },
      alternatives: [],
      whatWouldChangeMyMind: ['Open drain pump filter and check for clogs.'],
      meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(valid)).not.toThrow();
  });

  it('accepts appliance: null', () => {
    const data = {
      appliance: null,
      primary: {
        name: 'Electrical fault',
        confidence: 0.5,
        rationale: 'Visible burning on internal wiring.',
        recovery: {
          diy: [],
          callPro: true,
          proReason: 'Active electrical hazard.'
        },
        parts: []
      },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(data)).not.toThrow();
  });

  it('accepts appliance with null make/model (category-only ID)', () => {
    const data = {
      appliance: { category: 'washer', make: null, model: null, confidence: 0.6 },
      primary: {
        name: 'Drum bearing wear',
        confidence: 0.7,
        rationale: 'Loud grinding during spin cycle.',
        recovery: {
          diy: [{ action: 'Inspect spider arm', difficulty: 'advanced' }],
          callPro: false
        },
        parts: [{ name: 'Drum bearing kit', typicalCostUsd: '$80–150' }]
      },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(data)).not.toThrow();
  });

  it('rejects unknown appliance category', () => {
    const bad = {
      appliance: { category: 'toaster', make: null, model: null, confidence: 0.5 },
      primary: { name: 'X', confidence: 0.5, rationale: 'r', recovery: { diy: [], callPro: false }, parts: [] },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(bad)).toThrow();
  });

  it('rejects unknown difficulty', () => {
    const bad = {
      appliance: null,
      primary: {
        name: 'X',
        confidence: 0.5,
        rationale: 'r',
        recovery: {
          diy: [{ action: 'do thing', difficulty: 'extreme' }],
          callPro: false
        },
        parts: []
      },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(bad)).toThrow();
  });

  it('rejects confidence > 1', () => {
    const bad = {
      appliance: { category: 'dryer', make: null, model: null, confidence: 1.2 },
      primary: { name: 'X', confidence: 0.5, rationale: 'r', recovery: { diy: [], callPro: false }, parts: [] },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(bad)).toThrow();
  });
});
