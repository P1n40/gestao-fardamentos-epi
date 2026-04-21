"use client";

import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface OperationFeedbackProps {
  title: string;
  message: string;
  variant?: "info" | "success" | "warning" | "error" | "loading";
  className?: string;
}

const variantStyles = {
  info: {
    icon: Info,
    wrapper: "border-blue-200 bg-blue-50 text-blue-900",
    iconClass: "text-blue-600",
  },
  success: {
    icon: CheckCircle2,
    wrapper: "border-green-200 bg-green-50 text-green-900",
    iconClass: "text-green-600",
  },
  warning: {
    icon: TriangleAlert,
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    iconClass: "text-amber-600",
  },
  error: {
    icon: AlertCircle,
    wrapper: "border-red-200 bg-red-50 text-red-900",
    iconClass: "text-red-600",
  },
  loading: {
    icon: Loader2,
    wrapper: "border-zinc-200 bg-zinc-50 text-zinc-900",
    iconClass: "text-zinc-600",
  },
} as const;

export function OperationFeedback({
  title,
  message,
  variant = "info",
  className,
}: OperationFeedbackProps) {
  const config = variantStyles[variant];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm", config.wrapper, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass, variant === "loading" && "animate-spin")} />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  );
}
