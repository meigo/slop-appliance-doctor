import { z } from 'zod';

const ApplianceCategoryEnum = z.enum(['dishwasher', 'washer', 'dryer', 'refrigerator', 'oven', 'other']);

const ApplianceSchema = z.object({
  category: ApplianceCategoryEnum,
  make: z.string().min(1).nullable(),
  model: z.string().min(1).nullable(),
  confidence: z.number().min(0).max(1)
});

const RecoveryStepSchema = z.object({
  action: z.string().min(1),
  difficulty: z.enum(['easy', 'moderate', 'advanced'])
});

const RecoverySchema = z.object({
  diy: z.array(RecoveryStepSchema),
  callPro: z.boolean(),
  proReason: z.string().nullish()
});

const PartSchema = z.object({
  name: z.string().min(1),
  partNumber: z.string().nullish(),
  typicalCostUsd: z.string().nullish()
});

const PrimaryDiagnosisSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  recovery: RecoverySchema,
  parts: z.array(PartSchema)
});

const AlternativeDiagnosisSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1)
});

export const DiagnosisResultSchema = z.object({
  appliance: ApplianceSchema.nullable(),
  primary: PrimaryDiagnosisSchema,
  alternatives: z.array(AlternativeDiagnosisSchema),
  whatWouldChangeMyMind: z.array(z.string()),
  meta: z.object({
    model: z.string().min(1),
    createdAt: z.string().min(1)
  })
});

export type DiagnosisResultZ = z.infer<typeof DiagnosisResultSchema>;
