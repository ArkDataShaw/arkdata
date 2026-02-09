import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { calculateTrendLine, forecast } from "@/components/dashboards/trendForecast";

export default function AdvancedTrendChart({ data, metric, showTrend = false, showForecast = false, daysAhead = 30 }) {
  const chartData = [...data];
  const values = data.map(d => d.value || 0);
  
  // Add trend line points
  let trendLineData = [];
  if (showTrend) {
    const trend = calculateTrendLine(values);
    if (trend) {
      trendLineData = data.map((d, i) => ({
        ...d,
        trend: Math.round(trend.slope * i + trend.intercept),
      }));
    }
  }

  // Add forecast
  let forecastData = [];
  if (showForecast) {
    const predictions = forecast(values, daysAhead);
    forecastData = predictions.map((val, i) => ({
      day: `+${i + 1}`,
      value: val,
      isForecast: true,
    }));
  }

  const finalData = showTrend ? trendLineData : data;
  const displayData = [...finalData, ...forecastData];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 shadow-lg">
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {metric.replace(/_/g, " ")}
        </p>
        <div className="flex gap-3 text-xs">
          {showTrend && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Trend</span>
            </div>
          )}
          {showForecast && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 opacity-50" />
              <span className="text-slate-600 dark:text-slate-400">Forecast</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={displayData}>
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 11 }} 
            stroke="#e2e8f0"
          />
          <YAxis tick={{ fontSize: 11 }} stroke="#e2e8f0" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            name="Actual"
            isAnimationActive={true}
          />
          
          {showTrend && (
            <Line 
              type="monotone" 
              dataKey="trend" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Trend"
            />
          )}
          
          {showForecast && (
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#f59e0b" 
              strokeWidth={2}
              strokeDasharray="3 3"
              name="Forecast"
              opacity={0.6}
              dataKey="isForecast"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}