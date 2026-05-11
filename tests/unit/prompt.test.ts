import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserContent } from '../../src/lib/prompt';
import type { FailureMode } from '../../src/lib/referenceData';

const SAMPLE_MODES: FailureMode[] = [
  {
    category: 'dishwasher',
    name: 'Drain pump failure',
    symptoms: ['water remains in tub', 'humming during drain'],
    errorCodePatterns: ['LE', 'OE'],
    diyDifficulty: 'moderate',
    typicalParts: ['drain pump']
  }
];

describe('buildSystemPrompt', () => {
  it('includes appliance-technician role and key rules', () => {
    const p = buildSystemPrompt(SAMPLE_MODES);
    expect(p.toLowerCase()).toContain('appliance');
    expect(p).toContain('confidence');
    expect(p).toContain('whatWouldChangeMyMind');
    expect(p).toContain('callPro');
    expect(p).toContain('difficulty');
    expect(p).toContain('parts');
    expect(p).toContain('JSON');
  });

  it('includes the safety rules (gas/sealed system/electrical)', () => {
    const p = buildSystemPrompt(SAMPLE_MODES);
    expect(p.toLowerCase()).toMatch(/gas/);
    expect(p.toLowerCase()).toMatch(/sealed|refrigerat/);
    expect(p.toLowerCase()).toMatch(/electric/);
  });

  it('injects the provided reference modes into the prompt', () => {
    const p = buildSystemPrompt(SAMPLE_MODES);
    expect(p).toContain('Drain pump failure');
    expect(p).toContain('LE');
  });

  it('handles empty reference modes gracefully', () => {
    const p = buildSystemPrompt([]);
    expect(p.length).toBeGreaterThan(0);
    expect(p).not.toContain('undefined');
  });
});

describe('buildUserContent', () => {
  it('includes the photo, freeform text, and optional fields', () => {
    const c = buildUserContent('data:image/jpeg;base64,XYZ', 'wont start', 'Whirlpool WDT780', 'F21');
    expect(Array.isArray(c)).toBe(true);
    const text = c.find(x => x.type === 'text');
    expect(text?.text).toContain('wont start');
    expect(text?.text).toContain('Whirlpool WDT780');
    expect(text?.text).toContain('F21');
  });

  it('shows placeholders when optional fields missing', () => {
    const c = buildUserContent('data:image/jpeg;base64,XYZ', '', '', '');
    const text = c.find(x => x.type === 'text');
    expect(text?.text.toLowerCase()).toContain('no additional context');
    expect(text?.text.toLowerCase()).toContain('not provided');
  });

  it('respects retry mode instruction', () => {
    const c = buildUserContent('data:image/jpeg;base64,XYZ', 'x', '', '', { retry: true });
    const text = c.find(x => x.type === 'text');
    expect(text?.text.toLowerCase()).toContain('previous response did not match the schema');
  });
});
