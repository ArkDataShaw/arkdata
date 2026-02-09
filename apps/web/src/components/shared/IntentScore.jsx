import React from "react";
import { cn } from "@/lib/utils";

export default function IntentScore({ score }) {
  if (score === null || score === undefined) return <span className="text-slate-300">—</span>;

  const getColor = () => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-400";
    return "bg-slate-300";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", getColor())} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 tabular-nums">{score}</span>
    </div>
  );
}