import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/shared/Navbar";
import {
  Brain,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) redirect("/");

  // Load interview sessions
  const interviewSessions = await prisma.interviewSession.findMany({
    where: { userId: user.id },
    include: { config: true },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  // Load english sessions
  const englishSessions = await prisma.englishSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  const statusIcon = {
    IN_PROGRESS: <Clock className="w-3 h-3" />,
    COMPLETED: <CheckCircle className="w-3 h-3" />,
    ABANDONED: <XCircle className="w-3 h-3" />,
  };

  const statusColor = {
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    ABANDONED: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to practice? Pick up where you left off or start something
            new.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Interview Practice ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Interview Practice</CardTitle>
                  <CardDescription>
                    Role, topic, or resume-based
                  </CardDescription>
                </div>
              </div>
              <Link href="/setup">
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  New
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {interviewSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No interviews yet.</p>
                  <Link href="/setup">
                    <Button variant="outline" size="sm" className="mt-3">
                      Start your first interview
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {interviewSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {s.config.mode === "ROLE"
                              ? (s.config.role ?? "Role Interview")
                              : s.config.mode === "TOPICS"
                                ? (s.config.topics as string[])
                                    .slice(0, 2)
                                    .join(", ")
                                : "Resume Interview"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              statusColor[s.status]
                            }`}
                          >
                            {statusIcon[s.status]}
                            {s.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.startedAt).toLocaleDateString()} ·{" "}
                          {s.config.difficulty} ·{" "}
                          {s.config.numQuestions
                            ? `${s.config.numQuestions} questions`
                            : `${s.config.timeLimitMins} min`}
                        </p>
                      </div>
                      <Link
                        href={
                          s.status === "COMPLETED"
                            ? `/interview/${s.id}/report`
                            : `/interview/${s.id}`
                        }
                      >
                        <Button variant="ghost" size="sm">
                          {s.status === "COMPLETED" ? "Report" : "Continue"}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── English Practice ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <div>
                  <CardTitle className="text-lg">English Practice</CardTitle>
                  <CardDescription>
                    Voice conversations with AI coach
                  </CardDescription>
                </div>
              </div>
              <Link href="/english/setup">
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  New
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {englishSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No English sessions yet.</p>
                  <Link href="/english/setup">
                    <Button variant="outline" size="sm" className="mt-3">
                      Start practicing English
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {englishSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {s.mode === "FREE"
                              ? "Free Conversation"
                              : "Scenario Practice"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              statusColor[s.status]
                            }`}
                          >
                            {statusIcon[s.status]}
                            {s.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.startedAt).toLocaleDateString()} ·{" "}
                          {s.level} ·{" "}
                          {s.overallFluencyScore
                            ? `${s.overallFluencyScore}/10 fluency`
                            : "In progress"}
                        </p>
                      </div>
                      {s.status === "COMPLETED" && (
                        <Link href={`/english/${s.id}/report`}>
                          <Button variant="ghost" size="sm">
                            Report
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
