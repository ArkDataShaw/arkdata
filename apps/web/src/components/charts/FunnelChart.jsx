import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FunnelChart({ title, stages }) {
  if (!stages || stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...stages.map(s => s.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, idx) => {
          const percentage = (stage.value / maxValue) * 100;
          const conversionRate = idx > 0 ? ((stage.value / stages[idx - 1].value) * 100).toFixed(1) : 100;
          
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{stage.name}</span>
                <div className="text-right">
                  <div className="text-sm font-bold">{stage.value.toLocaleString()}</div>
                  {idx > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {conversionRate}% from previous
                    </div>
                  )}
                </div>
              </div>
              
              <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden h-8">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 flex items-center justify-end pr-3"
                  style={{ width: `${percentage}%` }}
                >
                  {percentage > 15 && (
                    <span className="text-white text-xs font-semibold">
                      {percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary stats */}
        {stages.length > 1 && (
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div className="text-sm">
              <div className="font-semibold mb-2">Funnel Summary</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Entered: </span>
                  <span className="font-semibold">{stages[0].value.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Final Step: </span>
                  <span className="font-semibold">{stages[stages.length - 1].value.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Overall Rate: </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Dropoff: </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {(stages[0].value - stages[stages.length - 1].value).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}