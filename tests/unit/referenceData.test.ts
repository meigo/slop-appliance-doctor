import { describe, it, expect } from 'vitest';
import { FAILURE_MODES, selectRelevantModes } from '../../src/lib/referenceData';

describe('FAILURE_MODES', () => {
  it('has at least 30 entries seeded (target ~50–75 at v1 launch)', () => {
    expect(FAILURE_MODES.length).toBeGreaterThanOrEqual(30);
  });

  it('every entry has the required fields', () => {
    for (const m of FAILURE_MODES) {
      expect(m.category).toMatch(/^(dishwasher|washer|dryer|refrigerator|oven)$/);
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.symptoms.length).toBeGreaterThan(0);
      expect(['easy', 'moderate', 'advanced']).toContain(m.diyDifficulty);
    }
  });

  it('error code patterns are uppercase-normalized', () => {
    for (const m of FAILURE_MODES) {
      if (m.errorCodePatterns) {
        for (const p of m.errorCodePatterns) {
          expect(p).toBe(p.toUpperCase());
        }
      }
    }
  });
});

describe('selectRelevantModes', () => {
  it('tier 1: errorCode exact match returns only matching entries', () => {
    // Seed should include a known LE pattern for dishwasher and/or washer (drain pump).
    const result = selectRelevantModes('unknown', 'LE');
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.errorCodePatterns?.map(p => p.toUpperCase())).toContain('LE');
    }
  });

  it('tier 1 is case-insensitive on user input', () => {
    const upper = selectRelevantModes('unknown', 'LE');
    const lower = selectRelevantModes('unknown', 'le');
    expect(upper.length).toBe(lower.length);
  });

  it('tier 2: categoryHint returns that category', () => {
    const result = selectRelevantModes('dishwasher', null);
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.category).toBe('dishwasher');
    }
  });

  it('tier 3: unknown + no errorCode returns all modes', () => {
    const result = selectRelevantModes('unknown', null);
    expect(result.length).toBe(FAILURE_MODES.length);
  });
});
