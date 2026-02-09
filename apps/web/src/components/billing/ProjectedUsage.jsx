import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function ProjectedUsage({ usage = {}, periodStart, periodEnd }) {
  // Calculate days in current period and days remaining
  const start = new Date(periodStart || Date.now());
  const end = new Date(periodEnd || Date.now());
  const today = new Date();

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Current usage
  const currentUsage = usage?.current_period || 127;

  // Simple linear projection
  const dailyAverage = daysElapsed > 0 ? currentUsage / daysElapsed : 0;
  const projectedTotal = Math.ceil(dailyAverage * totalDays);
  const projectedRemaining = Math.max(0, projectedTotal - currentUsage);

  const percentComplete = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projected Usage</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Forecast for current billing period
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Period Progress
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {daysElapsed} of {totalDays} days
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Usage Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Current Usage
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {currentUsage}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              leads tracked
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Projected Total
            </p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {projectedTotal}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              by period end
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Projected Remaining
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {projectedRemaining}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {daysRemaining} days left
            </p>
          </div>
        </div>

        {/* Insight */}
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
          <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Daily average: {Math.round(dailyAverage)} leads
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Based on {daysElapsed} days of actual usage
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}