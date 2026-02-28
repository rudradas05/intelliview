import { Progress } from "@/components/ui/progress";

interface InterviewProgressProps {
  current: number;
  total: number;
}

export default function InterviewProgress({
  current,
  total,
}: InterviewProgressProps) {
  const percentage = total > 0 ? ((current - 1) / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Question {current} of {total}
        </span>
        <span className="font-medium">{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
