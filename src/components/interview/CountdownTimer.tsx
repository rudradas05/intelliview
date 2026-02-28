"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  totalMins: number;
  onExpire: () => void;
}

export default function CountdownTimer({
  totalMins,
  onExpire,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalMins * 60);

  const handleExpire = useCallback(() => {
    onExpire();
  }, [onExpire]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      handleExpire();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, handleExpire]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;

  return (
    <div
      className={`flex items-center gap-1.5 text-sm font-mono font-medium px-3 py-1.5 rounded-full border ${
        isUrgent
          ? "text-red-600 border-red-200 bg-red-50 animate-pulse"
          : "text-muted-foreground border-border"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}