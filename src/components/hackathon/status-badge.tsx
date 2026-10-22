import { HackathonStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: HackathonStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<
    HackathonStatus,
    { label: string; bg: string; text: string; dot: string }
  > = {
    DRAFT: {
      label: "Draft",
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
      dot: "bg-slate-400",
    },
    REGISTRATION_OPEN: {
      label: "Registration Open",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    IN_PROGRESS: {
      label: "In Progress",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-700 dark:text-blue-300",
      dot: "bg-blue-500",
    },
    SUBMISSION_OPEN: {
      label: "Submissions Open",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    EVALUATION: {
      label: "Under Evaluation",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      text: "text-purple-700 dark:text-purple-300",
      dot: "bg-purple-500",
    },
    RESULTS_PUBLISHED: {
      label: "Results Announced",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    ARCHIVED: {
      label: "Archived",
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-400",
    },
  };

  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dot)} />
      {config.label}
    </span>
  );
}
