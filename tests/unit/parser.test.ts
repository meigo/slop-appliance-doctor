import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDiagnosisResponse, ParseError } from '../../src/lib/parser';

const FIX = join(__dirname, '../fixtures/llm-responses');
const read = (name: string) => readFileSync(join(FIX, name), 'utf8');

describe('parseDiagnosisResponse (appliance schema)', () => {
  it('parses a clean response', () => {
    const r = parseDiagnosisResponse(read('appliance-clean.json'));
    expect(r.appliance?.make).toBe('Whirlpool');
    expect(r.primary.name).toBe('Drain pump failure');
    expect(r.primary.parts[0].partNumber).toBe('W10348269');
  });

  it('handles trailing prose after the JSON object', () => {
    const r = parseDiagnosisResponse(read('appliance-trailing-prose.txt'));
    expect(r.appliance?.make).toBe('LG');
  });

  it('strips markdown code fences', () => {
    const r = parseDiagnosisResponse(read('appliance-fenced.txt'));
    expect(r.appliance).toBeNull();
    expect(r.primary.name).toBe('Heating element failure');
  });

  it('throws ParseError on schema-invalid content', () => {
    expect(() => parseDiagnosisResponse(read('appliance-invalid-schema.txt'))).toThrow(ParseError);
  });

  it('throws ParseError when no JSON object found', () => {
    expect(() => parseDiagnosisResponse('Just prose, no JSON.')).toThrow(ParseError);
  });
});
