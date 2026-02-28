"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/shared/Navbar";
import TopicTagInput from "@/components/setup/TopicTagInput";
import ResumeUpload from "@/components/setup/ResumeUpload";
import { Brain, BookOpen, FileText, ChevronRight, Loader2 } from "lucide-react";
import type { ResumeProfile } from "@/types/index";

const SetupSchema = z.object({
  role: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  limitType: z.enum(["questions", "time"]),
  numQuestions: z.number().min(1).max(30).optional(),
  timeLimitMins: z.number().min(5).max(120).optional(),
  noRepeats: z.boolean(),
  focusWeakAreas: z.boolean(),
});

type SetupForm = z.infer<typeof SetupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ROLE" | "TOPICS" | "RESUME">("ROLE");
  const [topics, setTopics] = useState<string[]>([]);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SetupForm>({
    resolver: zodResolver(SetupSchema),
    defaultValues: {
      difficulty: "MEDIUM",
      limitType: "questions",
      numQuestions: 10,
      timeLimitMins: 30,
      noRepeats: true,
      focusWeakAreas: false,
    },
  });

  const limitType = watch("limitType");
  const difficulty = watch("difficulty");
  const noRepeats = watch("noRepeats");
  const focusWeakAreas = watch("focusWeakAreas");

  const onSubmit = async (data: SetupForm) => {
    // Validate mode-specific fields
    if (mode === "ROLE" && !data.role?.trim()) {
      toast.error("Please enter a role name");
      return;
    }
    if (mode === "TOPICS" && topics.length === 0) {
      toast.error("Please add at least one topic");
      return;
    }
    if (mode === "RESUME" && !resumeId) {
      toast.error("Please upload your resume first");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/interview/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          role: mode === "ROLE" ? data.role : null,
          topics: mode === "TOPICS" ? topics : [],
          difficulty: data.difficulty,
          numQuestions:
            data.limitType === "questions" ? data.numQuestions : null,
          timeLimitMins: data.limitType === "time" ? data.timeLimitMins : null,
          noRepeats: data.noRepeats,
          focusWeakAreas: data.focusWeakAreas,
          resumeId: mode === "RESUME" ? resumeId : null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to create interview");
        return;
      }

      router.push(`/interview/${result.sessionId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const difficultyOptions = [
    {
      value: "EASY",
      label: "Easy",
      color: "bg-green-100 text-green-700 border-green-200",
    },
    {
      value: "MEDIUM",
      label: "Medium",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    {
      value: "HARD",
      label: "Hard",
      color: "bg-red-100 text-red-700 border-red-200",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Configure Interview</h1>
            <p className="text-muted-foreground mt-1">
              Set up your practice session
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* ── Mode Selection ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interview Mode</CardTitle>
                <CardDescription>
                  How do you want to be interviewed?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={mode}
                  onValueChange={(v) =>
                    setMode(v as "ROLE" | "TOPICS" | "RESUME")
                  }
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="ROLE" className="gap-1.5">
                      <Brain className="w-3.5 h-3.5" />
                      Role
                    </TabsTrigger>
                    <TabsTrigger value="TOPICS" className="gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Topics
                    </TabsTrigger>
                    <TabsTrigger value="RESUME" className="gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Resume
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <TabsContent value="ROLE">
                      <div className="space-y-2">
                        <Label>Target Role</Label>
                        <Input
                          {...register("role")}
                          placeholder="e.g. Data Analyst, Software Engineer, Product Manager"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="TOPICS">
                      <div className="space-y-2">
                        <Label>Topics to Cover</Label>
                        <TopicTagInput value={topics} onChange={setTopics} />
                      </div>
                    </TabsContent>

                    <TabsContent value="RESUME">
                      <ResumeUpload
                        onUploadSuccess={(id) => setResumeId(id)}
                        onClear={() => setResumeId(null)}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>

            {/* ── Difficulty ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Difficulty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {difficultyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("difficulty", opt.value)}
                      className={`
                        p-3 rounded-lg border-2 text-sm font-medium transition-all
                        ${
                          difficulty === opt.value
                            ? opt.color + " border-current"
                            : "border-border hover:border-muted-foreground/50"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Limit ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Session Limit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("limitType", "questions")}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      limitType === "questions"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="font-medium">By Questions</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Fixed number of questions
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("limitType", "time")}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      limitType === "time"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="font-medium">By Time</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Set a time limit
                    </div>
                  </button>
                </div>

                {limitType === "questions" ? (
                  <div className="space-y-2">
                    <Label>Number of Questions</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={30}
                        {...register("numQuestions", { valueAsNumber: true })}
                        className="flex-1"
                      />
                      <Badge variant="outline" className="w-16 justify-center">
                        {watch("numQuestions")} Q
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Time Limit</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={120}
                        step={5}
                        {...register("timeLimitMins", { valueAsNumber: true })}
                        className="flex-1"
                      />
                      <Badge variant="outline" className="w-16 justify-center">
                        {watch("timeLimitMins")} min
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Toggles ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">No Repeated Questions</p>
                    <p className="text-xs text-muted-foreground">
                      AI won't ask the same question twice
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("noRepeats", !noRepeats)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      noRepeats ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        noRepeats ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Focus on Weak Areas</p>
                    <p className="text-xs text-muted-foreground">
                      AI re-tests topics you scored below 6/10
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("focusWeakAreas", !focusWeakAreas)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      focusWeakAreas ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        focusWeakAreas ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* ── Submit ── */}
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Interview...
                </>
              ) : (
                <>
                  Start Interview
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
