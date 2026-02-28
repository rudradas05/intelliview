import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import type { EvaluationResult } from "@/types/index";

interface EvaluationFeedbackProps {
  evaluation: EvaluationResult;
}

export default function EvaluationFeedback({
  evaluation,
}: EvaluationFeedbackProps) {
  const scoreColor =
    evaluation.score >= 7
      ? "text-green-600 bg-green-50 border-green-200"
      : evaluation.score >= 4
      ? "text-yellow-600 bg-yellow-50 border-yellow-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Evaluation</CardTitle>
            <div
              className={`text-2xl font-bold px-3 py-1 rounded-lg border ${scoreColor}`}
            >
              {evaluation.score}/10
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feedback */}
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {evaluation.feedback}
            </p>
          </div>

          {/* Strengths */}
          {evaluation.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
                ✓ What you got right
              </p>
              <ul className="space-y-1.5">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Points */}
          {evaluation.missingPoints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">
                ✗ What was missing
              </p>
              <ul className="space-y-1.5">
                {evaluation.missingPoints.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}