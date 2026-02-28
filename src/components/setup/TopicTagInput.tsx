"use client";

import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TopicTagInputProps {
  value: string[];
  onChange: (topics: string[]) => void;
}

export default function TopicTagInput({
  value,
  onChange,
}: TopicTagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTopic = (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeTopic = (topic: string) => {
    onChange(value.filter((t) => t !== topic));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopic(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTopic(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-height: 40px p-2 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring">
        {value.map((topic) => (
          <Badge
            key={topic}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {topic}
            <button
              type="button"
              onClick={() => removeTopic(topic)}
              className="ml-1 hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTopic(inputValue)}
          placeholder={
            value.length === 0
              ? "Type a topic and press Enter (e.g. SQL joins)"
              : "Add more topics..."
          }
          className="border-0 shadow-none focus-visible:ring-0 h-7 px-1 flex-1 min-width: 200px"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add a topic
      </p>
    </div>
  );
}