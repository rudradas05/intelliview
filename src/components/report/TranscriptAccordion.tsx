import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import type { TranscriptItem } from "@/types/index";

interface TranscriptAccordionProps {
  transcript: TranscriptItem[];
}

const difficultyColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

function EvalBlock({
  evaluation,
}: {
  evaluation: TranscriptItem["evaluation"];
}) {
  if (!evaluation) return null;

  const scoreColor =
    evaluation.score >= 7
      ? "bg-green-100 text-green-700"
      : evaluation.score >= 4
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={scoreColor}>{evaluation.score}/10</Badge>
        <span className="text-xs text-muted-foreground">
          {evaluation.confidenceInAnswer} confidence
        </span>
      </div>

      <div className="flex items-start gap-2 text-sm">
        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{evaluation.feedback}</p>
      </div>

      {(evaluation.strengths as string[]).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 mb-1">
            ✓ Strengths
          </p>
          <ul className="space-y-1">
            {(evaluation.strengths as string[]).map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(evaluation.missingPoints as string[]).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-700 mb-1">
            ✗ Missing Points
          </p>
          <ul className="space-y-1">
            {(evaluation.missingPoints as string[]).map((m, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TranscriptAccordion({
  transcript,
}: TranscriptAccordionProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base">Full Transcript</h3>
      <Accordion type="multiple" className="space-y-2">
        {transcript.map((item, index) => (
          <AccordionItem
            key={item.question.id}
            value={`question-${index}`}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 text-left flex-wrap">
                <span className="text-sm font-medium">
                  Q{index + 1}:{" "}
                  {item.question.questionText.slice(0, 60)}
                  {item.question.questionText.length > 60 ? "..." : ""}
                </span>
                <div className="flex gap-1.5">
                  <Badge
                    className={
                      difficultyColor[item.question.difficulty] ?? ""
                    }
                  >
                    {item.question.difficulty}
                  </Badge>
                  {item.evaluation && (
                    <Badge
                      className={
                        item.evaluation.score >= 7
                          ? "bg-green-100 text-green-700"
                          : item.evaluation.score >= 4
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {item.evaluation.score}/10
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="space-y-4 pb-4">
              {/* Full question */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Question
                </p>
                <p className="text-sm">{item.question.questionText}</p>
              </div>

              {/* User answer */}
              {item.answer && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Your Answer
                  </p>
                  <Card className="bg-muted/40">
                    <CardContent className="p-3">
                      <p className="text-sm">{item.answer.answerText}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Evaluation */}
              {item.evaluation && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Evaluation
                  </p>
                  <EvalBlock evaluation={item.evaluation} />
                </div>
              )}

              {/* Follow-up */}
              {item.followUp && (
                <div className="border-l-2 border-orange-300 pl-4 space-y-3">
                  <Badge className="bg-orange-100 text-orange-700 text-xs">
                    🔍 Follow-up Question
                  </Badge>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Follow-up
                    </p>
                    <p className="text-sm">
                      {item.followUp.question.questionText}
                    </p>
                  </div>

                  {item.followUp.answer && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Your Answer
                      </p>
                      <Card className="bg-muted/40">
                        <CardContent className="p-3">
                          <p className="text-sm">
                            {item.followUp.answer.answerText}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {item.followUp.evaluation && (
                    <EvalBlock evaluation={item.followUp.evaluation} />
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}