import { z } from "zod";

// ─── Schema A: Resume Profile ─────────────────────────────
export const ResumeProfileSchema = z.object({
  name: z.string().nullable(),
  targetRoles: z.array(z.string()).min(1),
  skills: z.object({
    technical: z.array(z.string()),
    tools: z.array(z.string()),
    soft: z.array(z.string()),
  }),
  projects: z.array(
    z.object({
      name: z.string(),
      techStack: z.array(z.string()),
      keyAchievements: z.array(z.string()),
    })
  ),
  focusTopics: z.array(z.string()).min(1).max(10),
  redFlags: z.array(z.string()),
  experienceLevel: z.enum(["junior", "mid", "senior"]),
});

export type ResumeProfileAI = z.infer<typeof ResumeProfileSchema>;

// ─── Schema B: Next Question ──────────────────────────────
export const NextQuestionSchema = z.object({
  questionText: z.string().min(10),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  expectedPoints: z.array(z.string()).min(2).max(8),
  followUpTriggers: z.array(z.string()).min(1).max(4),
  rationale: z.string(),
});

export type NextQuestionAI = z.infer<typeof NextQuestionSchema>;

// ─── Schema C: Evaluation ─────────────────────────────────
export const EvaluationSchema = z.object({
  score: z.number().int().min(0).max(10),
  strengths: z.array(z.string()),
  missingPoints: z.array(z.string()),
  feedback: z.string().min(10),
  nextFocusTopic: z.string().nullable(),
  confidenceInAnswer: z.enum(["low", "medium", "high"]),
});

export type EvaluationAI = z.infer<typeof EvaluationSchema>;

// ─── Schema D: English Response ───────────────────────────
export const EnglishResponseSchema = z.object({
  aiResponse: z.string().min(1),
  correction: z.object({
    originalText: z.string(),
    correctedText: z.string(),
    grammarErrors: z.array(
      z.object({
        error: z.string(),
        explanation: z.string(),
      })
    ),
    vocabularySuggestions: z.array(
      z.object({
        original: z.string(),
        suggested: z.string(),
        reason: z.string(),
      })
    ),
    rephrasedVersion: z.string().nullable(),
    toneIssue: z.string().nullable(),
    fluencyScore: z.number().int().min(0).max(10),
  }),
});

export type EnglishResponseAI = z.infer<typeof EnglishResponseSchema>;