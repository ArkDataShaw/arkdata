import React from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";

export default function ComparativeChart({ currentData, previousData, metric, chartType = "bar" }) {
  // Combine data for side-by-side comparison
  const maxLength = Math.max(currentData.length, previousData.length);
  const comparisonData = [];

  for (let i = 0; i < maxLength; i++) {
    comparisonData.push({
      period: i + 1,
      current: currentData[i] || 0,
      previous: previousData[i] || 0,
    });
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 text-white text-xs rounded px-2 py-1">
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  const ChartComponent = chartType === "bar" ? 
    <BarChart data={comparisonData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#e2e8f0" />
      <YAxis tick={{ fontSize: 11 }} stroke="#e2e8f0" />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar dataKey="current" fill="#8b5cf6" name="Current Period" radius={[4, 4, 0, 0]} />
      <Bar dataKey="previous" fill="#cbd5e1" name="Previous Period" radius={[4, 4, 0, 0]} />
    </BarChart>
    :
    <LineChart data={comparisonData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#e2e8f0" />
      <YAxis tick={{ fontSize: 11 }} stroke="#e2e8f0" />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Line type="monotone" dataKey="current" stroke="#8b5cf6" strokeWidth={2} name="Current Period" />
      <Line type="monotone" dataKey="previous" stroke="#cbd5e1" strokeWidth={2} name="Previous Period" />
    </LineChart>;

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold mb-4 text-slate-900 dark:text-slate-100">
        {metric.replace(/_/g, " ")} - Period Comparison
      </p>
      <ResponsiveContainer width="100%" height={250}>
        {ChartComponent}
      </ResponsiveContainer>
    </Card>
  );
}