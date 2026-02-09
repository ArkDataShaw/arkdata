import React from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Simple linear regression for trend line (moved to trendForecast.js)
const calculateTrendLine = (data) => {
  const n = data.length;
  if (n < 2) return data.map(() => 0);

  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, d) => sum + d.value, 0);
  const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
  const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((_, i) => slope * i + intercept);
};

// Simple forecasting (extend trend line)
const forecastData = (data, periods = 7) => {
  const trendLine = calculateTrendLine(data);
  const lastValue = trendLine[trendLine.length - 1];
  const slope = trendLine[trendLine.length - 1] - trendLine[trendLine.length - 2];

  const forecast = [];
  for (let i = 1; i <= periods; i++) {
    const forecastValue = Math.max(0, lastValue + slope * i);
    forecast.push({
      day: `+${i}d`,
      value: null,
      forecast: Math.round(forecastValue),
      isForecast: true
    });
  }
  return forecast;
};

export default function TrendChart({ data, metric, showTrend = true, showForecast = false, compareData = null }) {
  const trendLine = showTrend ? calculateTrendLine(data) : [];
  const forecast = showForecast ? forecastData(data) : [];
  const combinedData = [...data.map((d, i) => ({
    ...d,
    trend: showTrend ? Math.round(trendLine[i]) : null,
    compareValue: compareData?.[i]?.value || null
  })), ...forecast];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{data.day}</p>
        {data.isForecast ? (
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
            Forecast: {data.forecast?.toLocaleString()}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {metric}: {data.value?.toLocaleString()}
            </p>
            {showTrend && data.trend !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trend: {data.trend?.toLocaleString()}
              </p>
            )}
            {compareData && data.compareValue !== null && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Previous: {data.compareValue?.toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{metric}</p>
        {showForecast && (
          <span className="text-xs text-slate-400 dark:text-slate-500">Including 7-day forecast</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={combinedData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Actual Data */}
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#8b5cf6" 
            fill="url(#colorValue)" 
            strokeWidth={2}
            dot={{ fill: "#8b5cf6", r: 3 }}
          />
          
          {/* Trend Line */}
          {showTrend && (
            <Line 
              type="monotone" 
              dataKey="trend" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          
          {/* Comparison Data */}
          {compareData && (
            <Area 
              type="monotone" 
              dataKey="compareValue" 
              stroke="#3b82f6" 
              fill="none" 
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ fill: "#3b82f6", r: 2 }}
            />
          )}
          
          {/* Forecast */}
          {showForecast && (
            <Area 
              type="monotone" 
              dataKey="forecast" 
              stroke="#f59e0b" 
              fill="url(#colorForecast)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "#f59e0b", r: 3 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}