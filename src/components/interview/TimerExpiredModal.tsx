"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface TimerExpiredModalProps {
  open: boolean;
  onSubmitNow: () => void;
  onForceEnd: () => void;
}

export default function TimerExpiredModal({
  open,
  onSubmitNow,
  onForceEnd,
}: TimerExpiredModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!open) {
      setSecondsLeft(30);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onForceEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onForceEnd]);

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle>Time&apos;s Up!</DialogTitle>
          </div>
          <DialogDescription>
            Submit your current answer within{" "}
            <span className="font-bold text-red-600">{secondsLeft}s</span> or
            your session will end automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={onSubmitNow}
            className="flex-1"
            disabled={secondsLeft === 0}
          >
            Submit Now
          </Button>
          <Button
            variant="outline"
            onClick={onForceEnd}
            className="flex-1"
          >
            End Session
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div
            className="bg-red-500 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${(secondsLeft / 30) * 100}%` }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}