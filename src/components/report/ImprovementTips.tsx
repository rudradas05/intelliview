import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface ImprovementTipsProps {
  tips: string[];
}

export default function ImprovementTips({ tips }: ImprovementTipsProps) {
  if (tips.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-blue-700 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Improvement Tips
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed">
                {tip}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}