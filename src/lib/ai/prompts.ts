import type { ResumeProfile } from "@/types/index";

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT A — Resume Text → Structured Profile JSON
// ─────────────────────────────────────────────────────────────────────────────
export function buildResumeProfilePrompt(rawText: string): string {
  return `
You are a senior technical recruiter with 15 years of experience evaluating resumes.
Analyze the resume below and extract a compact structured profile for use in a
technical interview system.

RESUME TEXT:
"""
${rawText.slice(0, 6000)}
"""

STRICT RULES:
- focusTopics must be SPECIFIC (e.g. "SQL window functions" not just "SQL")
- experienceLevel: judge by project depth + years, NOT by job title
- redFlags: gaps > 6 months, job-hopping < 1 year, skill mismatch, vague achievements
- targetRoles: 2–4 most suitable roles based on the FULL resume content
- All arrays: maximum 8 items each
- projects: only include projects with clear technical detail
- If a field has no data, return an empty array [] not null

You MUST return ONLY valid JSON matching this exact schema.
No explanation. No markdown. No code fences. No extra text.

{
  "name": string | null,
  "targetRoles": string[],
  "skills": {
    "technical": string[],
    "tools": string[],
    "soft": string[]
  },
  "projects": [
    {
      "name": string,
      "techStack": string[],
      "keyAchievements": string[]
    }
  ],
  "focusTopics": string[],
  "redFlags": string[],
  "experienceLevel": "junior" | "mid" | "senior"
}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT B — Next Question Generator
// ─────────────────────────────────────────────────────────────────────────────
export function buildNextQuestionPrompt(params: {
  mode: "ROLE" | "TOPICS" | "RESUME";
  role?: string | null;
  topics?: string[];
  difficulty: "easy" | "medium" | "hard";
  resumeProfile?: ResumeProfile | null;
  askedQuestions: string[];
  weakTopics: string[];
  focusWeakAreas: boolean;
  questionNumber: number;
  totalQuestions: number;
  isFollowUp: boolean;
  parentQuestionText?: string;
}): string {
  // Build context block based on mode
  const contextBlock =
    params.mode === "RESUME" && params.resumeProfile
      ? `CANDIDATE PROFILE (extracted from resume):
${JSON.stringify(params.resumeProfile, null, 2)}`
      : params.mode === "ROLE"
      ? `TARGET ROLE: ${params.role}
Generate questions testing core skills and knowledge required for a ${params.role}.`
      : `INTERVIEW TOPICS: ${params.topics?.join(", ")}
Generate questions specifically about these topics only.`;

  // Weakness adaptation block
  const weaknessBlock =
    params.focusWeakAreas && params.weakTopics.length > 0
      ? `
WEAKNESS ADAPTATION (IMPORTANT):
The candidate has scored below 6/10 on these topics: ${params.weakTopics.join(", ")}.
Prioritize these weak topics. Ask a question that tests fundamentals if score was very low.`
      : "";

  // Follow-up block
  const followUpBlock = params.isFollowUp
    ? `
FOLLOW-UP MODE (IMPORTANT):
This is a follow-up question to probe deeper into a weak answer.
Parent question was: "${params.parentQuestionText}"
- Reference the parent question explicitly
- Dig deeper into a specific gap or concept from that question
- Do NOT introduce a completely new topic
- Make this question more targeted and specific`
    : "";

  // Dedup block
  const dedupBlock =
    params.askedQuestions.length > 0
      ? `
ALREADY ASKED — DO NOT REPEAT OR PARAPHRASE ANY OF THESE:
${params.askedQuestions.map((q, i) => `${i + 1}. "${q}"`).join("\n")}`
      : "";

  return `
You are a world-class senior technical interviewer conducting a structured interview.
Your questions reveal true depth of understanding — never surface-level definitions.
You probe for application, trade-offs, real-world reasoning, and edge cases.

${contextBlock}
${weaknessBlock}
${followUpBlock}

INTERVIEW PROGRESS: Question ${params.questionNumber} of ${params.totalQuestions}
REQUIRED DIFFICULTY: ${params.difficulty.toUpperCase()}

DIFFICULTY GUIDELINES:
- EASY: test working knowledge and basic application of concepts
- MEDIUM: test problem-solving, trade-offs, and real-world scenarios
- HARD: test system design thinking, edge cases, optimization, expert-level nuance

QUESTION RULES:
- Never start with "Can you explain..." — use scenario-based or direct probe phrasing
- Never ask for simple definitions
- expectedPoints: 3–7 specific concepts, terms, or insights the IDEAL answer must include
- followUpTriggers: 2–3 short phrases that, if said by candidate, suggest shallow understanding
- rationale: one sentence explaining why you chose this question (for internal use only)

${dedupBlock}

You MUST return ONLY valid JSON matching this exact schema.
No explanation. No markdown. No code fences. No extra text.

{
  "questionText": string,
  "topic": string,
  "difficulty": "easy" | "medium" | "hard",
  "expectedPoints": string[],
  "followUpTriggers": string[],
  "rationale": string
}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT C — Answer Evaluator
// ─────────────────────────────────────────────────────────────────────────────
export function buildEvaluationPrompt(params: {
  questionText: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  expectedPoints: string[];
  answerText: string;
  previousScores: { topic: string; score: number }[];
}): string {
  const contextBlock =
    params.previousScores.length > 0
      ? `CANDIDATE'S RECENT PERFORMANCE:
${params.previousScores.map((s) => `- ${s.topic}: ${s.score}/10`).join("\n")}`
      : "This is the first question in this session.";

  return `
You are a strict but fair senior technical interviewer evaluating a candidate's answer.
You score based on SUBSTANCE, ACCURACY, and COMPLETENESS — not verbosity.
A long answer that misses key points scores lower than a short answer that nails them.

QUESTION: "${params.questionText}"
TOPIC: ${params.topic}
DIFFICULTY: ${params.difficulty.toUpperCase()}

EXPECTED POINTS (ideal answer should cover most of these):
${params.expectedPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

CANDIDATE'S ANSWER:
"""
${params.answerText.slice(0, 2000)}
"""

${contextBlock}

SCORING RUBRIC (follow this exactly):
- 10:   Every expected point covered with expert-level depth and clarity
- 8–9:  Most expected points covered, minor gaps, demonstrates clear understanding
- 6–7:  Several points covered but meaningful gaps remain
- 4–5:  Partial understanding, significant gaps, some correct points
- 2–3:  Mostly incorrect or very shallow, minimal correct content
- 0–1:  Wrong answer, "I don't know", irrelevant, or fewer than 20 words

CONFIDENCE RULES (you must follow these deterministically):
- Return "low" if score <= 4 OR answer has fewer than 50 characters
- Return "high" if score >= 8
- Return "medium" for everything else

OUTPUT RULES:
- strengths: specific things the candidate said that were CORRECT
- missingPoints: specific expected points the candidate did NOT cover
- feedback: exactly 2–3 sentences, constructive and actionable
- nextFocusTopic: suggest ONE specific topic to focus on next based on gaps,
  or null if performance was strong (score >= 7)

You MUST return ONLY valid JSON matching this exact schema.
No explanation. No markdown. No code fences. No extra text.

{
  "score": number (0–10 integer only),
  "strengths": string[],
  "missingPoints": string[],
  "feedback": string,
  "nextFocusTopic": string | null,
  "confidenceInAnswer": "low" | "medium" | "high"
}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT D — English Coach (AI Response + Correction)
// ─────────────────────────────────────────────────────────────────────────────
export function buildEnglishCoachPrompt(params: {
  level: "CASUAL" | "PROFESSIONAL";
  mode: "FREE" | "SCENARIO";
  scenarioContext?: string;
  conversationHistory: { role: "USER" | "AI"; content: string }[];
  userMessage: string;
}): string {
  const levelGuidance =
    params.level === "PROFESSIONAL"
      ? `LEVEL: PROFESSIONAL
- Use formal English in your response
- No slang, contractions are acceptable but keep tone business-appropriate
- Flag casual/slang language in corrections as tone issues`
      : `LEVEL: CASUAL
- Use friendly, conversational English in your response
- Contractions and informal phrasing are fine
- Only flag tone issues if extremely inappropriate`;

  const modeBlock =
    params.mode === "SCENARIO"
      ? `MODE: SCENARIO-BASED
SCENARIO: ${params.scenarioContext}
- Stay in character as the person in the scenario
- Respond naturally as that person would
- Keep the scenario conversation going realistically`
      : `MODE: FREE CONVERSATION
- Respond naturally as a friendly English coach
- Keep conversation flowing and engaging
- If message is very short (under 5 words), ask a follow-up question`;

  const historyBlock =
    params.conversationHistory.length > 0
      ? `RECENT CONVERSATION HISTORY (last ${params.conversationHistory.length} messages):
${params.conversationHistory
  .map((m) => `${m.role === "USER" ? "User" : "Coach"}: ${m.content}`)
  .join("\n")}`
      : "This is the start of the conversation.";

  return `
You are a friendly, encouraging English language coach helping a non-native speaker
improve their English. You have two jobs in every response:
1. Respond naturally to continue the conversation
2. Analyze the user's message for language errors

${levelGuidance}

${modeBlock}

${historyBlock}

USER'S MESSAGE TO ANALYZE:
"""
${params.userMessage}
"""

RESPONSE RULES:
- Keep your AI response to 2–4 sentences maximum
- Do NOT correct grammar inside your response text — keep it natural
- Do NOT mention errors in your response text — save all corrections for the JSON fields

CORRECTION RULES:
- grammarErrors: only flag REAL grammar mistakes (subject-verb agreement,
  wrong tense, missing articles, wrong prepositions). Ignore minor stylistic choices.
- vocabularySuggestions: only suggest a better word when a CLEARLY better option exists.
  Do not suggest synonyms for the sake of it.
- rephrasedVersion: provide ONLY if there are 2 or more errors OR the sentence sounds
  very unnatural to a native speaker. Otherwise set to null.
- toneIssue: only flag if level is PROFESSIONAL AND user used slang or very casual
  phrasing inappropriate for a business context. Otherwise set to null.
- fluencyScore: holistic score for THIS message only (0–10).
  10 = native-like fluency. 0 = incomprehensible.
  A grammatically perfect short message = 7–8, not automatically 10.
- correctedText: the full corrected version of the user's message.
  If no corrections needed, set correctedText equal to originalText.
- If the message has zero errors: return empty arrays for grammarErrors and
  vocabularySuggestions, null for rephrasedVersion and toneIssue.

You MUST return ONLY valid JSON matching this exact schema.
No explanation. No markdown. No code fences. No extra text.

{
  "aiResponse": string,
  "correction": {
    "originalText": string,
    "correctedText": string,
    "grammarErrors": [
      { "error": string, "explanation": string }
    ],
    "vocabularySuggestions": [
      { "original": string, "suggested": string, "reason": string }
    ],
    "rephrasedVersion": string | null,
    "toneIssue": string | null,
    "fluencyScore": number
  }
}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT E — English Session Opening Message
// ─────────────────────────────────────────────────────────────────────────────
export function buildEnglishOpeningPrompt(params: {
  mode: "FREE" | "SCENARIO";
  level: "CASUAL" | "PROFESSIONAL";
}): string {
  return `
You are a friendly English language coach starting a new practice session.

MODE: ${params.mode}
LEVEL: ${params.level}

${
  params.mode === "FREE"
    ? `Generate a warm, welcoming opening message that:
- Greets the user and introduces yourself briefly
- Invites them to talk about any topic they like
- Keeps it to 2–3 sentences maximum
- Tone matches the level: ${params.level === "CASUAL" ? "friendly and relaxed" : "professional but warm"}`
    : `Generate a realistic scenario prompt that:
- Sets up a professional situation (job interview, business meeting, client call, etc.)
- Gives the user a specific role and context
- Ends with a direct question or prompt for them to respond to
- Keeps it to 3–4 sentences maximum
- Make it feel like a real ${params.level === "PROFESSIONAL" ? "professional business" : "everyday"} situation`
}

You MUST return ONLY valid JSON matching this exact schema.
No explanation. No markdown. No code fences. No extra text.

{
  "message": string
}
`.trim();
}