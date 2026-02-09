import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TrendChart from "@/components/analytics/TrendChart";
import AdvancedTrendChart from "@/components/analytics/AdvancedTrendChart";
import ComparativeChart from "@/components/dashboards/ComparativeChart";
import { comparePeriods } from "@/components/dashboards/trendForecast";

const COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function DashboardWidget({ widget, dateRange = null, showTrend = false, showForecast = false }) {
  const [widgetDateRange, setWidgetDateRange] = useState(widget.dateRange || dateRange);

  const { data: dailyMetrics = [], isLoading } = useQuery({
    queryKey: ["daily-metrics", widgetDateRange],
    queryFn: () => base44.entities.DailyMetric.list("-day", 90),
  });

  const { data: dimensionMetrics = [] } = useQuery({
    queryKey: ["dimension-metrics", widget.dimension, widgetDateRange],
    queryFn: () => base44.entities.DailyDimensionMetric.filter({ dimension_type: widget.dimension }, "-day", 100),
    enabled: widget.dimension !== "none",
  });

  if (isLoading) {
    return <Skeleton className={`h-[${widget.size === "large" ? "300" : widget.size === "medium" ? "200" : "150"}px] rounded-xl`} />;
  }

  const renderMetricCard = () => {
    const total = dailyMetrics.reduce((sum, m) => sum + (m[widget.metric] || 0), 0);
    const midpoint = Math.floor(dailyMetrics.length / 2);
    const previousData = dailyMetrics.slice(0, midpoint).map(m => m[widget.metric] || 0);
    const currentData = dailyMetrics.slice(midpoint).map(m => m[widget.metric] || 0);
    
    const comparison = comparePeriods(currentData, previousData);
    const change = comparison.changePercent;

    return (
      <Card className="p-5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {widget.metric.replace(/_/g, " ")}
        </p>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{total.toLocaleString()}</p>
        <div className="flex items-center gap-1.5">
          {change >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          <span className={`text-xs font-medium ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">vs prev period</span>
        </div>
      </Card>
    );
  };

  const renderLineChart = () => {
    const data = dailyMetrics.map(m => ({ day: m.day?.slice(5, 10), value: m[widget.metric] || 0 }));
    return (
      <TrendChart
        data={data}
        metric={widget.metric.replace(/_/g, " ")}
        showTrend={widget.enableForecast ? false : showTrend}
        showForecast={false}
      />
    );
  };

  const renderAdvancedTrendChart = () => {
    const data = dailyMetrics.map(m => ({ day: m.day?.slice(5, 10), value: m[widget.metric] || 0 }));
    return (
      <AdvancedTrendChart
        data={data}
        metric={widget.metric.replace(/_/g, " ")}
        showTrend={true}
        showForecast={false}
      />
    );
  };

  const renderForecastChart = () => {
    const data = dailyMetrics.map(m => ({ day: m.day?.slice(5, 10), value: m[widget.metric] || 0 }));
    return (
      <AdvancedTrendChart
        data={data}
        metric={widget.metric.replace(/_/g, " ")}
        showTrend={false}
        showForecast={true}
        daysAhead={widget.forecastDays || 30}
      />
    );
  };

  const renderComparativeChart = () => {
    const midpoint = Math.floor(dailyMetrics.length / 2);
    const previousData = dailyMetrics.slice(0, midpoint).map(m => m[widget.metric] || 0);
    const currentData = dailyMetrics.slice(midpoint).map(m => m[widget.metric] || 0);
    
    return (
      <ComparativeChart
        currentData={currentData}
        previousData={previousData}
        metric={widget.metric}
        chartType="bar"
      />
    );
  };

  const renderComparativeLineChart = () => {
    const midpoint = Math.floor(dailyMetrics.length / 2);
    const previousData = dailyMetrics.slice(0, midpoint).map(m => m[widget.metric] || 0);
    const currentData = dailyMetrics.slice(midpoint).map(m => m[widget.metric] || 0);
    
    return (
      <ComparativeChart
        currentData={currentData}
        previousData={previousData}
        metric={widget.metric}
        chartType="line"
      />
    );
  };

  const renderBarChart = () => {
    const dataMap = {};
    dimensionMetrics.forEach(m => {
      if (!dataMap[m.dimension_value]) dataMap[m.dimension_value] = 0;
      dataMap[m.dimension_value] += m[widget.metric] || 0;
    });
    const data = Object.entries(dataMap).sort(([,a],[,b]) => b - a).slice(0, 8).map(([name, value]) => ({ name, value }));

    return (
      <Card className="p-5">
        <p className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">{widget.metric.replace(/_/g, " ")} by {widget.dimension.replace(/_/g, " ")}</p>
        <ResponsiveContainer width="100%" height={widget.size === "large" ? 250 : 150}>
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#e2e8f0" />
            <YAxis tick={{ fontSize: 10 }} stroke="#e2e8f0" />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderPieChart = () => {
    const dataMap = {};
    dimensionMetrics.forEach(m => {
      if (!dataMap[m.dimension_value]) dataMap[m.dimension_value] = 0;
      dataMap[m.dimension_value] += m[widget.metric] || 0;
    });
    const data = Object.entries(dataMap).sort(([,a],[,b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }));

    return (
      <Card className="p-5">
        <p className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">{widget.metric.replace(/_/g, " ")} by {widget.dimension.replace(/_/g, " ")}</p>
        <ResponsiveContainer width="100%" height={widget.size === "large" ? 250 : 150}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderTable = () => {
    const dataMap = {};
    dimensionMetrics.forEach(m => {
      if (!dataMap[m.dimension_value]) dataMap[m.dimension_value] = 0;
      dataMap[m.dimension_value] += m[widget.metric] || 0;
    });
    const data = Object.entries(dataMap).sort(([,a],[,b]) => b - a).slice(0, 10);

    return (
      <Card className="p-5">
        <p className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">{widget.metric.replace(/_/g, " ")} by {widget.dimension.replace(/_/g, " ")}</p>
        <div className="space-y-2">
          {data.map(([name, value], i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{name}</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  switch (widget.type) {
    case "metric_card": return renderMetricCard();
    case "line_chart": return renderLineChart();
    case "line_chart_trend": return renderAdvancedTrendChart();
    case "line_chart_forecast": return renderForecastChart();
    case "comparative_bar": return renderComparativeChart();
    case "comparative_line": return renderComparativeLineChart();
    case "bar_chart": return renderBarChart();
    case "pie_chart": return renderPieChart();
    case "table": return renderTable();
    default: return renderMetricCard();
  }
}