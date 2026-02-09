import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export default function KPICard({
  title,
  value,
  unit = "",
  change = 0,
  sparklineData = [],
  icon: Icon,
  color = "text-primary",
}) {
  const isPositive = change >= 0;

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-foreground">
              {value}
              {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
            </p>
          </div>
        </div>
        {Icon && <Icon className={`w-5 h-5 ${color} opacity-60`} />}
      </div>

      {sparklineData.length > 0 && (
        <div className="h-12 -mx-6 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                fill="hsl(214, 88%, 48%, 0.1)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-success" />
        ) : (
          <TrendingDown className="w-4 h-4 text-destructive" />
        )}
        <span className={`text-sm font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : ""}{change}%
        </span>
        <span className="text-xs text-muted-foreground">vs last period</span>
      </div>
    </div>
  );
}