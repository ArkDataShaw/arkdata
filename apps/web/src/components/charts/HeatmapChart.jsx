import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HeatmapChart({ title, data, xLabel, yLabel }) {
  if (!data || data.length === 0) {
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

  const maxValue = Math.max(...data.flatMap(row => Object.values(row).filter(v => typeof v === 'number')));
  const getColor = (value) => {
    if (!value) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'bg-blue-50 dark:bg-blue-900/20';
    if (intensity < 0.4) return 'bg-blue-100 dark:bg-blue-800/40';
    if (intensity < 0.6) return 'bg-blue-300 dark:bg-blue-700/60';
    if (intensity < 0.8) return 'bg-blue-500 dark:bg-blue-600/80';
    return 'bg-blue-700 dark:bg-blue-500';
  };

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 font-semibold">{xLabel}</th>
              {columns.map(col => (
                <th key={col} className="text-center p-2 font-semibold text-xs">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="p-2 font-medium text-xs">{row.name}</td>
                {columns.map(col => (
                  <td
                    key={`${idx}-${col}`}
                    className={`text-center p-2 ${getColor(row[col])}`}
                    title={`${row[col] || 0}`}
                  >
                    <span className="font-semibold">{row[col] || 0}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}