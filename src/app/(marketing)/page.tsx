"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  MessageSquare,
  FileText,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: <Target className="w-6 h-6 text-blue-500" />,
      title: "Role-Based Interviews",
      description:
        "Practice for any role — Data Analyst, Software Engineer, Product Manager and more. AI adapts questions to your target position.",
      badge: "Interview Prep",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      icon: <Brain className="w-6 h-6 text-purple-500" />,
      title: "Topic-Focused Practice",
      description:
        "Choose specific topics like SQL joins, System Design, or React hooks. Deep-dive into exactly what you need to improve.",
      badge: "Targeted Learning",
      badgeColor: "bg-purple-100 text-purple-700",
    },
    {
      icon: <FileText className="w-6 h-6 text-green-500" />,
      title: "Resume-Based Interviews",
      description:
        "Upload your resume and AI extracts your projects and skills to ask highly personalized interview questions.",
      badge: "Personalized",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-orange-500" />,
      title: "English Practice",
      description:
        "Improve your spoken English with voice-based AI conversations. Get real-time grammar, vocabulary and tone corrections.",
      badge: "Voice AI",
      badgeColor: "bg-orange-100 text-orange-700",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-red-500" />,
      title: "Detailed Reports",
      description:
        "After every session get a full report — overall score, topic breakdown, strengths, weaknesses and improvement tips.",
      badge: "Analytics",
      badgeColor: "bg-red-100 text-red-700",
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      title: "Adaptive AI",
      description:
        "AI tracks your weak areas and automatically focuses follow-up questions where you need the most improvement.",
      badge: "Smart AI",
      badgeColor: "bg-yellow-100 text-yellow-700",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">IntelliView</span>
          </div>
          <Button onClick={() => signIn("google")} variant="outline" size="sm">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            AI-Powered Interview Coach
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Ace Your Next
            <span className="text-primary"> Interview</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Practice technical interviews with adaptive AI, get instant
            feedback, and improve your English — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => signIn("google")}
              className="gap-2 text-base px-8"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to prepare
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{feature.title}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${feature.badgeColor}`}
                          >
                            {feature.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Built with Next.js + Gemini AI
        </div>
      </footer>
    </div>
  );
}