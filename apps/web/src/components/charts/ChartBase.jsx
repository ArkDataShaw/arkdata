import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Maximize2 } from "lucide-react";

const CHART_COLORS = [
  "hsl(214, 88%, 48%)",   // Primary Blue
  "hsl(142, 71%, 45%)",   // Success Green
  "hsl(38, 92%, 50%)",    // Warning Amber
  "hsl(10, 78%, 56%)",    // Orange
  "hsl(260, 70%, 50%)",   // Purple
  "hsl(174, 82%, 40%)",   // Teal
  "hsl(280, 65%, 55%)",   // Violet
  "hsl(15, 86%, 63%)",    // Deep Orange
];

export function BaseChart({
  title,
  subtitle,
  data,
  type = "line",
  height = 300,
  dataKey,
  series = [],
  showLegend = true,
  showGridlines = true,
  onExport,
  onExpand,
  customTooltip,
}) {
  if (!data || data.length === 0) {
    return (
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-h3">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = {
    line: LineChart,
    bar: BarChart,
    area: AreaChart,
    pie: PieChart,
    composed: ComposedChart,
  }[type];

  return (
    <Card className="card-premium">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-h3">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {onExport && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {onExpand && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExpand}
              className="gap-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              {showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
              {type !== "pie" && (
                <>
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                </>
              )}
              <Tooltip
                content={customTooltip}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: `1px solid var(--border)`,
                  borderRadius: "0.5rem",
                }}
              />
              {showLegend && <Legend />}

              {type === "pie" ? (
                <Pie
                  dataKey={dataKey || "value"}
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              ) : (
                series.map((s, idx) => {
                  const ChartShape = type === "bar" ? Bar : Line;
                  return (
                    <ChartShape
                      key={s.key}
                      type={type === "line" ? "monotone" : undefined}
                      dataKey={s.key}
                      stroke={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
                      fill={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
                      name={s.name}
                      isAnimationActive={true}
                    />
                  );
                })
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function useChartInteraction() {
  const [selectedRange, setSelectedRange] = React.useState(null);
  const [compareMode, setCompareMode] = React.useState(false);
  const [breakdown, setBreakdown] = React.useState(null);

  return {
    selectedRange,
    setSelectedRange,
    compareMode,
    setCompareMode,
    breakdown,
    setBreakdown,
  };
}

export function ChartToolbar({ onCompare, onBreakdown, breakdownOptions = [] }) {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onCompare?.()}
      >
        Compare Periods
      </Button>
      {breakdownOptions.length > 0 && (
        <select
          onChange={(e) => onBreakdown?.(e.target.value)}
          className="px-3 py-1 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">Breakdown by...</option>
          {breakdownOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}