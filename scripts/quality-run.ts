// Manual quality runner. Run with: npm run quality
// Reads tests/fixtures/appliance-photos.manifest.json + tests/fixtures/appliance-photos/.
// Calls OpenRouter for each fixture, writes a report to quality-reports/<timestamp>.md.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { callOpenRouter } from '../src/lib/openrouter';
import { buildSystemPrompt, buildUserContent } from '../src/lib/prompt';
import { parseDiagnosisResponse } from '../src/lib/parser';
import { selectRelevantModes, type FailureMode } from '../src/lib/referenceData';

type Fixture = {
  id: string;
  file: string;
  freeformText: string;
  modelField: string;
  errorCode: string;
  expected: {
    category?: FailureMode['category'];
    primaryCategory: string;
    primaryCategoryAlternatives?: string[];
    callPro?: boolean;
  };
};

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL ?? 'qwen/qwen-2.5-vl-72b-instruct';
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not set');
  process.exit(1);
}

const manifestPath = 'tests/fixtures/appliance-photos.manifest.json';
const photosDir = 'tests/fixtures/appliance-photos';
const reportsDir = 'quality-reports';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { fixtures: Fixture[] };

async function loadAsDataUrl(path: string): Promise<string> {
  const buf = readFileSync(path);
  const ext = path.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function matches(actual: string, expected: string): boolean {
  return actual.toLowerCase().includes(expected.toLowerCase());
}

function deriveCategoryHint(freeform: string, modelField: string): FailureMode['category'] | 'unknown' {
  const t = `${freeform} ${modelField}`.toLowerCase();
  if (/dishwasher/.test(t)) return 'dishwasher';
  if (/washer|washing machine/.test(t)) return 'washer';
  if (/dryer/.test(t)) return 'dryer';
  if (/fridge|refrigerator/.test(t)) return 'refrigerator';
  if (/oven|range|stove/.test(t)) return 'oven';
  return 'unknown';
}

async function run() {
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(reportsDir, `${stamp}.md`);

  let report = `# Quality run ${stamp}\n\nModel: \`${model}\`\n\n`;
  let categoryMatches = 0;
  let primaryMatches = 0;
  let callProMatches = 0;
  let callProRelevant = 0;
  let total = 0;

  for (const fx of manifest.fixtures) {
    const photoPath = join(photosDir, fx.file);
    if (!existsSync(photoPath)) {
      report += `## ${fx.id}\n\n_SKIPPED — fixture file missing at ${photoPath}_\n\n`;
      continue;
    }
    total++;

    const dataUrl = await loadAsDataUrl(photoPath);
    const categoryHint = deriveCategoryHint(fx.freeformText, fx.modelField);
    const refModes = selectRelevantModes(categoryHint, fx.errorCode || null);

    let result;
    try {
      const raw = await callOpenRouter({
        apiKey: apiKey!,
        model,
        systemPrompt: buildSystemPrompt(refModes),
        userContent: buildUserContent(dataUrl, fx.freeformText, fx.modelField, fx.errorCode),
        maxOutputTokens: 2000
      });
      result = parseDiagnosisResponse(raw.content);
    } catch (e) {
      report += `## ${fx.id}\n\n_ERROR: ${(e as Error).message}_\n\n`;
      continue;
    }

    const categoryOk = !fx.expected.category || result.appliance?.category === fx.expected.category;
    const primaryHits = [fx.expected.primaryCategory, ...(fx.expected.primaryCategoryAlternatives ?? [])];
    const primaryOk = primaryHits.some(c => matches(result.primary.name, c));

    let callProOk: boolean | null = null;
    if (typeof fx.expected.callPro === 'boolean') {
      callProRelevant++;
      callProOk = result.primary.recovery.callPro === fx.expected.callPro;
      if (callProOk) callProMatches++;
    }

    if (categoryOk) categoryMatches++;
    if (primaryOk) primaryMatches++;

    report += `## ${fx.id}\n\n`;
    report += `Appliance: ${result.appliance?.category ?? 'null'} (${categoryOk ? 'OK' : 'MISS'})\n`;
    report += `Primary: ${result.primary.name} @ ${Math.round(result.primary.confidence * 100)}% (${primaryOk ? 'OK' : 'MISS'})\n`;
    report += `callPro: ${result.primary.recovery.callPro}${callProOk === null ? '' : ' (' + (callProOk ? 'OK' : 'MISS') + ')'}\n`;
    report += `Rationale: ${result.primary.rationale}\n\n`;
    if (result.primary.recovery.diy.length > 0) {
      report += `DIY:\n`;
      for (const s of result.primary.recovery.diy) report += `- [${s.difficulty}] ${s.action}\n`;
    }
    if (result.primary.parts.length > 0) {
      report += `\nParts:\n`;
      for (const p of result.primary.parts) report += `- ${p.name}${p.partNumber ? ` (${p.partNumber})` : ''}${p.typicalCostUsd ? ` ${p.typicalCostUsd}` : ''}\n`;
    }
    report += `\n---\n\n`;
  }

  const summary = `Category match: ${categoryMatches}/${total} (${total > 0 ? Math.round(categoryMatches/total*100) : 0}%)\nPrimary match: ${primaryMatches}/${total} (${total > 0 ? Math.round(primaryMatches/total*100) : 0}%)\ncallPro correctness: ${callProMatches}/${callProRelevant} (${callProRelevant > 0 ? Math.round(callProMatches/callProRelevant*100) : 0}%)\n\n`;
  report = report.replace('Model:', summary + 'Model:');

  writeFileSync(reportPath, report);
  console.log(`Report written to ${reportPath}`);
  console.log(summary);
}

run().catch(e => { console.error(e); process.exit(1); });
