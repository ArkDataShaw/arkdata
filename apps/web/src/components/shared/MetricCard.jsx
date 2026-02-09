import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MetricCard({ title, value, change, changeLabel, icon: Icon, iconColor = "text-violet-500", iconBg = "bg-violet-50", className }) {
  const isPositive = change > 0;

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-slate-900/50 transition-all duration-200",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg, "dark:bg-opacity-20")}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={cn("text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-600")}>
            {isPositive ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}