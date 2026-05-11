// Core types for appliance diagnoses.

export type ApplianceCategory =
  | 'dishwasher'
  | 'washer'
  | 'dryer'
  | 'refrigerator'
  | 'oven'
  | 'other';

export type Appliance = {
  category: ApplianceCategory;
  make: string | null;
  model: string | null;
  confidence: number;
};

export type RecoveryStep = {
  action: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
};

export type Recovery = {
  diy: RecoveryStep[];
  callPro: boolean;
  proReason?: string;
};

export type Part = {
  name: string;
  partNumber?: string;
  typicalCostUsd?: string;
};

export type PrimaryDiagnosis = {
  name: string;
  confidence: number;
  rationale: string;
  recovery: Recovery;
  parts: Part[];
};

export type AlternativeDiagnosis = {
  name: string;
  confidence: number;
  rationale: string;
};

// Keep the exported name `DiagnosisResult` — this minimizes import-site churn
// vs slop-plant-doctor while keeping schemas independent.
export type DiagnosisResult = {
  appliance: Appliance | null;
  primary: PrimaryDiagnosis;
  alternatives: AlternativeDiagnosis[];
  whatWouldChangeMyMind: string[];
  meta: {
    model: string;
    createdAt: string;
  };
};

export type StoredDiagnosis = {
  result: DiagnosisResult;
  createdAt: string;
};

// Inherited verbatim from slop-plant-doctor — same 10 codes.
export type ApiErrorCode =
  | 'turnstile_failed'
  | 'rate_limited'
  | 'daily_cap_per_ip'
  | 'budget_exhausted'
  | 'photo_too_large'
  | 'photo_unsupported_format'
  | 'text_too_long'
  | 'llm_error'
  | 'schema_error'
  | 'internal_error';
