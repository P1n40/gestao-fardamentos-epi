"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ImportProgressProps {
  current: number;
  total: number;
  label?: string;
  statusText?: string;
  className?: string;
}

export function ImportProgress({
  current,
  total,
  label,
  statusText,
  className,
}: ImportProgressProps) {
  const percentage = Math.round((current / total) * 100) || 0;
  const isFinished = current >= total && total > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">
          {label || "Processando importação"}
        </label>
        <div className="flex items-center gap-2 font-mono text-sm text-zinc-500">
          {isFinished ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Concluído
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {current} / {total}
            </span>
          )}
          <span className="ml-2 font-bold text-zinc-900">{percentage}%</span>
        </div>
      </div>

      <Progress value={percentage} className="h-2" />

      {statusText && (
        <p className="animate-in fade-in slide-in-from-top-1 text-xs text-zinc-400 italic">
          {statusText}
        </p>
      )}
    </div>
  );
}
