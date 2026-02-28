"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/shared/Navbar";
import InterviewProgress from "@/components/interview/InterviewProgress";
import CountdownTimer from "@/components/interview/CountdownTimer";
import TimerExpiredModal from "@/components/interview/TimerExpiredModal";
import QuestionCard from "@/components/interview/QuestionCard";
import AnswerInput from "@/components/interview/AnswerInput";
import EvaluationFeedback from "@/components/interview/EvaluationFeedback";
import type {
  NextQuestionResponse,
  EvaluationResult,
  SessionStateResponse,
} from "@/types/index";

type Phase =
  | "init"
  | "loading"
  | "speaking_question"
  | "question"
  | "submitting"
  | "speaking_feedback"
  | "feedback"
  | "followup_loading"
  | "followup_speaking"
  | "followup_question"
  | "followup_submitting"
  | "followup_speaking_feedback"
  | "followup_feedback"
  | "done";

// ── Text to Speech helper ─────────────────────────────────
function speak(
  text: string,
  onEnd?: () => void,
  rate: number = 1.0
): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Pick a good English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
  );
  if (preferred) utterance.voice = preferred;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [sessionInfo, setSessionInfo] = useState<SessionStateResponse | null>(null);
  const [phase, setPhase] = useState<Phase>("init");
  const [currentQuestion, setCurrentQuestion] = useState<NextQuestionResponse | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState<NextQuestionResponse | null>(null);
  const [followUpEvaluation, setFollowUpEvaluation] = useState<EvaluationResult | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState("");
  const [autoStartMic, setAutoStartMic] = useState(false);
  const voicesLoadedRef = useRef(false);

  // Preload voices on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadVoices = () => { voicesLoadedRef.current = true; };
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    loadSession();
    return () => { window.speechSynthesis?.cancel(); };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/interview/session?sessionId=${sessionId}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); router.replace("/dashboard"); return; }
      if (data.status === "COMPLETED") { router.replace(`/interview/${sessionId}/report`); return; }
      if (data.status === "ABANDONED") { toast.error("Session abandoned"); router.replace("/dashboard"); return; }
      setSessionInfo(data);
      setPhase("loading");
      await fetchNextQuestion();
    } catch {
      toast.error("Failed to load session");
      router.replace("/dashboard");
    }
  };

  // ── Speak question then auto-start mic ───────────────────
  const speakQuestionThenListen = useCallback((question: NextQuestionResponse) => {
    setPhase("speaking_question");
    const text = `Question ${question.questionNumber}. ${question.questionText}`;
    speak(text, () => {
      setPhase("question");
      setAutoStartMic(true);
    }, 0.95);
  }, []);

  const speakFollowUpThenListen = useCallback((question: NextQuestionResponse) => {
    setPhase("followup_speaking");
    speak(`Follow-up question. ${question.questionText}`, () => {
      setPhase("followup_question");
      setAutoStartMic(true);
    }, 0.95);
  }, []);

  // ── Speak feedback summary ───────────────────────────────
  const speakFeedback = useCallback((
    evaluation: EvaluationResult,
    onEnd: () => void
  ) => {
    const text = `${evaluation.score} out of 10. ${evaluation.feedback}`;
    speak(text, onEnd, 1.0);
  }, []);

  // ── Fetch next main question ─────────────────────────────
  const fetchNextQuestion = useCallback(async () => {
    setPhase("loading");
    setCurrentQuestion(null);
    setCurrentEvaluation(null);
    setFollowUpQuestion(null);
    setFollowUpEvaluation(null);
    setAutoStartMic(false);

    try {
      const res = await fetch("/api/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (data.done) { await endSession(); return; }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to get question");
        return;
      }

      setCurrentQuestion(data);
      speakQuestionThenListen(data);
    } catch {
      toast.error("Failed to load question. Please refresh.");
    }
  }, [sessionId, speakQuestionThenListen]);

  // ── Submit main answer ───────────────────────────────────
  const submitAnswer = async (answerText: string) => {
    if (!currentQuestion) return;
    setPhase("submitting");
    setAutoStartMic(false);
    window.speechSynthesis.cancel();

    try {
      const res = await fetch("/api/interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          answerText,
          sessionId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to evaluate");
        setPhase("question");
        return;
      }

      setCurrentEvaluation(data.evaluation);
      setPhase("speaking_feedback");

      // Reload session info
      const sessionRes = await fetch(`/api/interview/session?sessionId=${sessionId}`);
      const sessionData = await sessionRes.json();
      if (sessionRes.ok) setSessionInfo(sessionData);

      // Speak feedback then show visual
      speakFeedback(data.evaluation, () => {
        setPhase("feedback");
      });
    } catch {
      toast.error("Failed to submit. Please try again.");
      setPhase("question");
    }
  };

  // ── Fetch follow-up ──────────────────────────────────────
  const fetchFollowUp = async () => {
    if (!currentQuestion) return;
    setPhase("followup_loading");
    setAutoStartMic(false);

    try {
      const res = await fetch("/api/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          followUp: true,
          parentQuestionId: currentQuestion.questionId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Could not generate follow-up.");
        setPhase("feedback");
        return;
      }

      setFollowUpQuestion(data);
      speakFollowUpThenListen(data);
    } catch {
      toast.error("Failed to load follow-up.");
      setPhase("feedback");
    }
  };

  // ── Submit follow-up ─────────────────────────────────────
  const submitFollowUp = async (answerText: string) => {
    if (!followUpQuestion) return;
    setPhase("followup_submitting");
    setAutoStartMic(false);
    window.speechSynthesis.cancel();

    try {
      const res = await fetch("/api/interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: followUpQuestion.questionId,
          answerText,
          sessionId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to evaluate follow-up");
        setPhase("followup_question");
        return;
      }

      setFollowUpEvaluation(data.evaluation);
      setPhase("followup_speaking_feedback");

      speakFeedback(data.evaluation, () => {
        setPhase("followup_feedback");
      });
    } catch {
      toast.error("Failed to submit follow-up.");
      setPhase("followup_question");
    }
  };

  // ── Handle next after feedback ───────────────────────────
  const handleAfterFeedback = () => {
    if (
      sessionInfo?.numQuestions &&
      sessionInfo.answeredCount >= sessionInfo.numQuestions
    ) {
      endSession();
      return;
    }

    if (currentEvaluation?.confidenceInAnswer === "low") {
      fetchFollowUp();
    } else {
      fetchNextQuestion();
    }
  };

  const handleNext = () => {
    if (
      sessionInfo?.numQuestions &&
      sessionInfo.answeredCount >= sessionInfo.numQuestions
    ) {
      endSession();
    } else {
      fetchNextQuestion();
    }
  };

  // ── End session ──────────────────────────────────────────
  const endSession = useCallback(async () => {
    setPhase("done");
    window.speechSynthesis.cancel();
    speak("Interview complete. Generating your report now.");
    try {
      await fetch(`/api/interview/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
    } catch { /* ignore */ }
    setTimeout(() => {
      router.push(`/interview/${sessionId}/report`);
    }, 2000);
  }, [sessionId, router]);

  const handleTimerExpire = useCallback(() => {
    setShowTimerModal(true);
    window.speechSynthesis.cancel();
    speak("Time is up. Please submit your current answer.");
  }, []);

  const handleTimerForceEnd = useCallback(async () => {
    setShowTimerModal(false);
    await endSession();
  }, [endSession]);

  const handleTimerSubmitNow = async () => {
    setShowTimerModal(false);
    if (pendingAnswer.trim() && currentQuestion) {
      await submitAnswer(pendingAnswer);
    }
    await endSession();
  };

  // ── Is mic input active phase ────────────────────────────
  const isAnswerPhase =
    phase === "question" || phase === "submitting";
  const isFollowUpAnswerPhase =
    phase === "followup_question" || phase === "followup_submitting";
  const isSpeaking =
    phase === "speaking_question" || phase === "followup_speaking";
  const isSpeakingFeedback =
    phase === "speaking_feedback" || phase === "followup_speaking_feedback";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <TimerExpiredModal
        open={showTimerModal}
        onSubmitNow={handleTimerSubmitNow}
        onForceEnd={handleTimerForceEnd}
      />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* ── Header ── */}
        {sessionInfo && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <InterviewProgress
                current={sessionInfo.answeredCount + 1}
                total={sessionInfo.numQuestions ?? 10}
              />
            </div>
            {sessionInfo.timeLimitMins && (
              <CountdownTimer
                totalMins={sessionInfo.timeLimitMins}
                onExpire={handleTimerExpire}
              />
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Loading ── */}
          {(phase === "init" || phase === "loading" || phase === "followup_loading") && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card><CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </CardContent></Card>
              <Card><CardContent className="p-6 space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent></Card>
            </motion.div>
          )}

          {/* ── Speaking Question ── */}
          {isSpeaking && (currentQuestion || followUpQuestion) && (
            <motion.div key="speaking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <QuestionCard
                questionText={(currentQuestion || followUpQuestion)!.questionText}
                topic={(currentQuestion || followUpQuestion)!.topic}
                difficulty={(currentQuestion || followUpQuestion)!.difficulty}
                questionNumber={(currentQuestion || followUpQuestion)!.questionNumber}
                totalQuestions={(currentQuestion || followUpQuestion)!.totalQuestions}
                isFollowUp={phase === "followup_speaking"}
                isSpeaking={true}
              />
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm mt-3">AI is reading the question... mic will start automatically</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Question + Answer Input ── */}
          {isAnswerPhase && currentQuestion && (
            <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <QuestionCard
                questionText={currentQuestion.questionText}
                topic={currentQuestion.topic}
                difficulty={currentQuestion.difficulty}
                questionNumber={currentQuestion.questionNumber}
                totalQuestions={currentQuestion.totalQuestions}
                isFollowUp={false}
                isSpeaking={false}
              />
              <AnswerInput
                onSubmit={(answer) => { setPendingAnswer(answer); submitAnswer(answer); }}
                disabled={phase === "submitting"}
                submitting={phase === "submitting"}
                autoStart={autoStartMic}
                onAutoStartDone={() => setAutoStartMic(false)}
              />
            </motion.div>
          )}

          {/* ── Speaking Feedback ── */}
          {isSpeakingFeedback && (currentEvaluation || followUpEvaluation) && (
            <motion.div key="speaking_feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="text-4xl font-bold text-primary">
                    {(currentEvaluation || followUpEvaluation)!.score}/10
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm text-muted-foreground">AI is speaking your feedback...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Feedback ── */}
          {phase === "feedback" && currentEvaluation && (
            <motion.div key="feedback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {currentQuestion && (
                <QuestionCard
                  questionText={currentQuestion.questionText}
                  topic={currentQuestion.topic}
                  difficulty={currentQuestion.difficulty}
                  questionNumber={currentQuestion.questionNumber}
                  totalQuestions={currentQuestion.totalQuestions}
                  isFollowUp={false}
                />
              )}
              <EvaluationFeedback evaluation={currentEvaluation} />
              <Button onClick={handleAfterFeedback} className="w-full" size="lg">
                {currentEvaluation.confidenceInAnswer === "low"
                  ? "Answer Follow-up Question →"
                  : "Next Question →"}
              </Button>
            </motion.div>
          )}

          {/* ── Follow-up Question ── */}
          {isFollowUpAnswerPhase && followUpQuestion && (
            <motion.div key="followup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <QuestionCard
                questionText={followUpQuestion.questionText}
                topic={followUpQuestion.topic}
                difficulty={followUpQuestion.difficulty}
                questionNumber={followUpQuestion.questionNumber}
                totalQuestions={followUpQuestion.totalQuestions}
                isFollowUp={true}
                isSpeaking={false}
              />
              <AnswerInput
                onSubmit={submitFollowUp}
                disabled={phase === "followup_submitting"}
                submitting={phase === "followup_submitting"}
                autoStart={autoStartMic}
                onAutoStartDone={() => setAutoStartMic(false)}
              />
            </motion.div>
          )}

          {/* ── Follow-up Feedback ── */}
          {phase === "followup_feedback" && followUpEvaluation && (
            <motion.div key="followup_feedback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {followUpQuestion && (
                <QuestionCard
                  questionText={followUpQuestion.questionText}
                  topic={followUpQuestion.topic}
                  difficulty={followUpQuestion.difficulty}
                  questionNumber={followUpQuestion.questionNumber}
                  totalQuestions={followUpQuestion.totalQuestions}
                  isFollowUp={true}
                />
              )}
              <EvaluationFeedback evaluation={followUpEvaluation} />
              <Button onClick={handleNext} className="w-full" size="lg">
                Next Question →
              </Button>
            </motion.div>
          )}

          {/* ── Done ── */}
          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
              <div className="text-4xl">🎉</div>
              <p className="text-lg font-semibold">Interview Complete!</p>
              <p className="text-muted-foreground text-sm">Generating your detailed report...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}