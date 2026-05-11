import { parseDiagnosisResponse, ParseError } from './parser';
import { buildSystemPrompt, buildUserContent } from './prompt';
import { saveDiagnosis } from './storage';
import { recordSpend } from './budget';
import { parseActualCostCents, estimateCostCents } from './cost';
import { llmError, schemaError } from './errors';
import { selectRelevantModes, type FailureMode } from './referenceData';
import type { OpenRouterCallArgs, OpenRouterCallResult } from './openrouter';
import { callOpenRouter as defaultCallOpenRouter } from './openrouter';
import type { DiagnosisResult } from './types';

export type RunDiagnoseArgs = {
  kv: KVNamespace;
  ipHash: string;
  photoDataUrl: string;
  freeformText: string;
  modelField: string;
  errorCode: string;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  callOpenRouter?: (args: OpenRouterCallArgs) => Promise<OpenRouterCallResult>;
};

export type RunDiagnoseResult = { id: string; result: DiagnosisResult };

// Heuristic: derive a category hint from freeform text and the model field.
// Pure function, no LLM cost.
function deriveCategoryHint(freeform: string, modelField: string): FailureMode['category'] | 'unknown' {
  const text = `${freeform} ${modelField}`.toLowerCase();
  if (/dishwasher/.test(text)) return 'dishwasher';
  if (/washer|washing machine/.test(text)) return 'washer';
  if (/dryer/.test(text)) return 'dryer';
  if (/fridge|refrigerator/.test(text)) return 'refrigerator';
  if (/oven|range|stove/.test(text)) return 'oven';
  return 'unknown';
}

export async function runDiagnose(args: RunDiagnoseArgs): Promise<RunDiagnoseResult> {
  const call = args.callOpenRouter ?? defaultCallOpenRouter;
  const categoryHint = deriveCategoryHint(args.freeformText, args.modelField);
  const errorCodeForSelector = args.errorCode.trim().length > 0 ? args.errorCode : null;
  const referenceModes = selectRelevantModes(categoryHint, errorCodeForSelector);
  const systemPrompt = buildSystemPrompt(referenceModes);

  let lastUsage: OpenRouterCallResult['usage'];
  let parsed: DiagnosisResult | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: OpenRouterCallResult;
    try {
      raw = await call({
        apiKey: args.apiKey,
        model: args.model,
        systemPrompt,
        userContent: buildUserContent(
          args.photoDataUrl,
          args.freeformText,
          args.modelField,
          args.errorCode,
          { retry: attempt > 0 }
        ),
        maxOutputTokens: args.maxOutputTokens
      });
    } catch (e) {
      throw llmError();
    }
    lastUsage = raw.usage;

    try {
      parsed = parseDiagnosisResponse(raw.content);
      break;
    } catch (e) {
      if (!(e instanceof ParseError) || attempt === 1) {
        throw schemaError();
      }
    }
  }

  if (!parsed) throw schemaError();

  parsed.meta = { model: args.model, createdAt: new Date().toISOString() };

  const costCents = parseActualCostCents({ usage: lastUsage }) ?? estimateCostCents(
    args.model,
    lastUsage?.prompt_tokens ?? 1500,
    lastUsage?.completion_tokens ?? 500
  );
  await recordSpend(args.kv, costCents);

  const id = await saveDiagnosis(args.kv, parsed);
  return { id, result: parsed };
}
