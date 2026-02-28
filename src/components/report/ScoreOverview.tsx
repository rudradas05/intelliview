import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Target, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ScoreOverviewProps {
  overallScore: number;
  sessionId: string;
  mode: string;
  role: string | null;
  topics: string[];
  difficulty: string;
  startedAt: Date;
  endedAt: Date | null;
}

export default function ScoreOverview({
  overallScore,
  sessionId,
  mode,
  role,
  topics,
  difficulty,
  startedAt,
  endedAt,
}: ScoreOverviewProps) {
  const scoreColor =
    overallScore >= 7
      ? "text-green-600"
      : overallScore >= 4
      ? "text-yellow-600"
      : "text-red-600";

  const scoreBg =
    overallScore >= 7
      ? "bg-green-50 border-green-200"
      : overallScore >= 4
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";

  const duration =
    endedAt && startedAt
      ? Math.round(
          (new Date(endedAt).getTime() - new Date(startedAt).getTime()) /
            60000
        )
      : null;

  const modeLabel =
    mode === "ROLE"
      ? role ?? "Role Interview"
      : mode === "TOPICS"
      ? topics.slice(0, 2).join(", ")
      : "Resume Interview";

  return (
    <Card className={`border-2 ${scoreBg}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Score */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${scoreColor}`}>
              {overallScore.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              out of 10
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-2 flex-1 min-width: 200px">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{modeLabel}</span>
              <Badge variant="outline" className="text-xs">
                {difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {new Date(startedAt).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            {duration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {duration} minutes
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link href="/setup">
              <Button className="gap-2 w-full">
                New Interview
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}