import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  new: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  returning: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  converted: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  lost: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  anonymous: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  identified_person: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  identified_company: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  both: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  active: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  suspended: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  trial: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  connected: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  disconnected: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  error: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  pending: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  verified: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  success: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  failed: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  running: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  queued: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

const labels = {
  identified_person: "Person",
  identified_company: "Company",
  both: "Identified",
};

export default function StatusBadge({ status, className }) {
  if (!status) return null;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border capitalize", statusStyles[status] || statusStyles.anonymous, className)}>
      {labels[status] || status.replace(/_/g, " ")}
    </Badge>
  );
}