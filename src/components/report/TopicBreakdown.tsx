import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TopicScore {
  topic: string;
  avgScore: number;
  questionCount: number;
}

interface TopicBreakdownProps {
  topicScores: TopicScore[];
}

export default function TopicBreakdown({ topicScores }: TopicBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Topic Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topicScores.map((t) => {
          const color =
            t.avgScore >= 7
              ? "text-green-600"
              : t.avgScore >= 4
              ? "text-yellow-600"
              : "text-red-600";

          const progressColor =
            t.avgScore >= 7
              ? "[&>div]:bg-green-500"
              : t.avgScore >= 4
              ? "[&>div]:bg-yellow-500"
              : "[&>div]:bg-red-500";

          return (
            <div key={t.topic} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.topic}</span>
                  <Badge variant="outline" className="text-xs">
                    {t.questionCount}Q
                  </Badge>
                </div>
                <span className={`text-sm font-bold ${color}`}>
                  {t.avgScore.toFixed(1)}/10
                </span>
              </div>
              <Progress
                value={t.avgScore * 10}
                className={`h-2 ${progressColor}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}