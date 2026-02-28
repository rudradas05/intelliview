"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled: boolean;
  submitting: boolean;
  autoStart?: boolean;
  onAutoStartDone?: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

export default function AnswerInput({
  onSubmit,
  disabled,
  submitting,
  autoStart = false,
  onAutoStartDone,
}: AnswerInputProps) {
  const [answer, setAnswer] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const shouldRestartRef = useRef<boolean>(false);
  const autoStartAttemptedRef = useRef<boolean>(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      setMicReady(true);
    }
  }, []);

  const buildRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new (SpeechRecognition as new () =>
      SpeechRecognitionInstance)();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (finalChunk) {
        finalTranscriptRef.current += finalChunk + " ";
        setAnswer(finalTranscriptRef.current);
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log("Speech error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow microphone in browser settings.");
        shouldRestartRef.current = false;
        setIsListening(false);
      } else if (event.error === "no-speech") {
        // No speech detected — keep listening, will restart via onend
      } else if (event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        // Auto-restart to keep listening continuously
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Already started
          }
        }, 100);
      } else {
        setIsListening(false);
        setInterimText("");
      }
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return;

    // Reset transcript for new answer
    finalTranscriptRef.current = "";
    setAnswer("");
    setInterimText("");
    shouldRestartRef.current = true;

    const recognition = buildRecognition();
    if (!recognition) {
      toast.error("Voice not supported in this browser");
      return;
    }

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      console.log("Mic started");
    } catch (e) {
      console.error("Failed to start mic:", e);
      toast.error("Could not start microphone. Please click mic button manually.");
      shouldRestartRef.current = false;
    }
  }, [isListening, buildRecognition]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  // Auto-start mic when AI finishes speaking
  useEffect(() => {
    if (
      autoStart &&
      voiceSupported &&
      micReady &&
      !disabled &&
      !autoStartAttemptedRef.current
    ) {
      autoStartAttemptedRef.current = true;
      // Small delay to ensure page is fully ready
      const timer = setTimeout(() => {
        startListening();
        onAutoStartDone?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, voiceSupported, micReady, disabled, startListening, onAutoStartDone]);

  // Reset auto-start flag when question changes
  useEffect(() => {
    if (!autoStart) {
      autoStartAttemptedRef.current = false;
    }
  }, [autoStart]);

  const clearAnswer = () => {
    if (isListening) stopListening();
    setAnswer("");
    setInterimText("");
    finalTranscriptRef.current = "";
  };

  const handleSubmit = () => {
    if (isListening) stopListening();
    const finalAnswer = (answer + " " + interimText).trim();
    if (!finalAnswer) {
      toast.error("Please provide an answer before submitting");
      return;
    }
    onSubmit(finalAnswer);
    setAnswer("");
    setInterimText("");
    finalTranscriptRef.current = "";
  };

  const displayText = answer + interimText;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-start">
        {/* ── Mic Button ── */}
        {voiceSupported && (
          <div className="flex flex-col items-center gap-1 pt-1">
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={disabled || submitting}
              className={`w-12 h-12 rounded-full shrink-0 transition-all ${
                isListening
                  ? "shadow-lg shadow-red-200 scale-110 animate-pulse"
                  : "hover:scale-105"
              }`}
              title={isListening ? "Click to stop recording" : "Click to start voice input"}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground text-center w-14">
              {isListening ? "Stop" : "Speak"}
            </span>
          </div>
        )}

        {/* ── Textarea ── */}
        <div className="flex-1 space-y-2">
          <Textarea
            value={displayText}
            onChange={(e) => {
              const val = e.target.value;
              setAnswer(val);
              finalTranscriptRef.current = val;
              setInterimText("");
            }}
            placeholder={
              isListening
                ? "🎤 Listening... speak your answer, click stop when done"
                : voiceSupported
                ? "Mic auto-starts after question. Or type here..."
                : "Type your answer here..."
            }
            className={`min-h-[160px] resize-none transition-all ${
              isListening
                ? "border-red-300 bg-red-50/20 focus-visible:ring-red-300"
                : ""
            }`}
            disabled={disabled || submitting}
          />

          <div className="flex items-center justify-between">
            {isListening ? (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Recording — speak freely, click stop when done
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {displayText.trim()
                  ? `${displayText.trim().split(/\s+/).length} words captured`
                  : "Waiting for answer..."}
              </div>
            )}
            {displayText.trim() && !submitting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAnswer}
                className="h-6 text-xs gap-1 text-muted-foreground"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <Button
        onClick={handleSubmit}
        disabled={disabled || submitting || !displayText.trim()}
        className="w-full gap-2"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Evaluating your answer...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Answer
          </>
        )}
      </Button>

      {!voiceSupported && (
        <p className="text-xs text-muted-foreground text-center">
          Voice input requires Chrome or Edge browser
        </p>
      )}
    </div>
  );
}