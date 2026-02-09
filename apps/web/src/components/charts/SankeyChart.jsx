import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SankeyChart({ title, stages, flows }) {
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

  const stageWidth = 100 / stages.length;
  const maxValue = Math.max(...flows.map(f => f.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96 bg-white dark:bg-gray-900 rounded">
          <svg width="100%" height="100%" className="absolute inset-0">
            {/* Render flows as curved paths */}
            {flows.map((flow, idx) => {
              const startStage = flow.from;
              const endStage = flow.to;
              const startIdx = stages.findIndex(s => s === startStage);
              const endIdx = stages.findIndex(s => s === endStage);
              
              const x1 = (startIdx + 0.5) * stageWidth + "%";
              const x2 = (endIdx + 0.5) * stageWidth + "%";
              const strokeWidth = Math.max(1, (flow.value / maxValue) * 8);
              const opacity = 0.3 + (flow.value / maxValue) * 0.7;

              return (
                <path
                  key={`flow-${idx}`}
                  d={`M ${x1} 20% Q 50% 50% ${x2} 80%`}
                  stroke="#3b82f6"
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  fill="none"
                  className="transition-opacity hover:opacity-100"
                />
              );
            })}
          </svg>

          {/* Stage nodes */}
          <div className="absolute inset-0 flex items-end justify-between p-4">
            {stages.map((stage, idx) => {
              const stageFlows = flows.filter(f => f.from === stage);
              const total = stageFlows.reduce((sum, f) => sum + f.value, 0) || 0;
              return (
                <div key={idx} className="text-center">
                  <div className="text-sm font-semibold mb-2">{stage}</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {total.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 space-y-2 text-sm">
          {flows.map((flow, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>{flow.from} → {flow.to}</span>
              <span className="font-semibold">{flow.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}