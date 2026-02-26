// ─── Resume ──────────────────────────────────────────────
export interface ResumeProfile {
  name: string | null;
  targetRoles: string[];
  skills: {
    technical: string[];
    tools: string[];
    soft: string[];
  };
  projects: {
    name: string;
    techStack: string[];
    keyAchievements: string[];
  }[];
  focusTopics: string[];
  redFlags: string[];
  experienceLevel: "junior" | "mid" | "senior";
}

export interface ResumeUploadResponse {
  resumeId: string;
  profile: ResumeProfile;
}

// ─── Interview ───────────────────────────────────────────
export interface CreateInterviewResponse {
  sessionId: string;
}

export interface SessionStateResponse {
  status: string;
  mode: string;
  role: string | null;
  topics: string[];
  difficulty: string;
  numQuestions: number | null;
  timeLimitMins: number | null;
  answeredCount: number;
}

export interface NextQuestionResponse {
  questionId: string;
  questionText: string;
  topic: string;
  difficulty: string;
  questionNumber: number;
  totalQuestions: number;
  isFollowUp: boolean;
}

export interface EvaluationResult {
  score: number;
  strengths: string[];
  missingPoints: string[];
  feedback: string;
  nextFocusTopic: string | null;
  confidenceInAnswer: "low" | "medium" | "high";
}

export interface SubmitAnswerResponse {
  evaluation: EvaluationResult;
}

export interface TranscriptItem {
  question: {
    id: string;
    questionText: string;
    topic: string;
    difficulty: string;
    orderIndex: number;
  };
  answer: {
    answerText: string;
    submittedAt: Date;
  };
  evaluation: EvaluationResult;
  followUp?: {
    question: { questionText: string; topic: string };
    answer: { answerText: string };
    evaluation: EvaluationResult;
  };
}

export interface InterviewReportResponse {
  id: string;
  sessionId: string;
  overallScore: number;
  topicScores: {
    topic: string;
    avgScore: number;
    questionCount: number;
  }[];
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
  createdAt: Date;
  transcript: TranscriptItem[];
}

// ─── English Practice ────────────────────────────────────
export interface CreateEnglishResponse {
  sessionId: string;
  openingMessage: string;
}

export interface CorrectionResult {
  originalText: string;
  correctedText: string;
  grammarErrors: {
    error: string;
    explanation: string;
  }[];
  vocabularySuggestions: {
    original: string;
    suggested: string;
    reason: string;
  }[];
  rephrasedVersion: string | null;
  toneIssue: string | null;
  fluencyScore: number;
}

export interface EnglishMessageResponse {
  aiMessage: string;
  correction: CorrectionResult;
  runningFluency: number;
}

export interface EnglishTranscriptItem {
  userMessage: string;
  aiResponse: string;
  correction: CorrectionResult;
  orderIndex: number;
}

export interface EnglishReportResponse {
  id: string;
  sessionId: string;
  overallFluency: number;
  grammarScore: number;
  vocabularyScore: number;
  toneScore: number;
  commonMistakes: {
    type: string;
    count: number;
    examples: string[];
  }[];
  vocabularyHighlights: string[];
  improvementTips: string[];
  createdAt: Date;
  transcript: EnglishTranscriptItem[];
}

// ─── Shared ───────────────────────────────────────────────
export interface ApiError {
  error: string;
}