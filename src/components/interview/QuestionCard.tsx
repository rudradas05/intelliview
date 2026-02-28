import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Volume2 } from "lucide-react";

interface QuestionCardProps {
  questionText: string;
  topic: string;
  difficulty: string;
  questionNumber: number;
  totalQuestions: number;
  isFollowUp: boolean;
  isSpeaking?: boolean;
}

const difficultyColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

export default function QuestionCard({
  questionText,
  topic,
  difficulty,
  questionNumber,
  totalQuestions,
  isFollowUp,
  isSpeaking = false,
}: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={isFollowUp ? "border-orange-200 bg-orange-50/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isFollowUp ? (
              <Badge className="bg-orange-100 text-orange-700">
                🔍 Follow-up Question
              </Badge>
            ) : (
              <Badge variant="outline">
                Q{questionNumber} / {totalQuestions}
              </Badge>
            )}
            <Badge className={difficultyColor[difficulty] ?? ""}>
              {difficulty}
            </Badge>
            <Badge variant="secondary">{topic}</Badge>
            {isSpeaking && (
              <Badge className="bg-blue-100 text-blue-700 gap-1 animate-pulse">
                <Volume2 className="w-3 h-3" />
                Speaking...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed font-medium">
            {questionText}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}