import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const METRICS = [
  { key: "sessions", label: "Total Sessions", type: "number" },
  { key: "unique_visitors", label: "Unique Visitors", type: "number" },
  { key: "identified_people", label: "People Identified", type: "number" },
  { key: "identified_companies", label: "Companies Identified", type: "number" },
  { key: "match_rate", label: "Match Rate", type: "percentage" },
  { key: "conversions", label: "Conversions", type: "number" },
  { key: "lost_sessions", label: "Lost Sessions", type: "number" },
  { key: "avg_session_duration", label: "Avg Session Duration", type: "duration" },
  { key: "intent_score_dist", label: "Intent Score Distribution", type: "chart" },
];

const DIMENSIONS = [
  { key: "none", label: "None (Total)" },
  { key: "utm_source", label: "UTM Source" },
  { key: "utm_campaign", label: "UTM Campaign" },
  { key: "device_type", label: "Device Type" },
  { key: "country", label: "Country" },
  { key: "landing_page", label: "Landing Page" },
  { key: "referrer", label: "Referrer" },
  { key: "industry", label: "Industry" },
];

const WIDGET_TYPES = [
  { key: "metric_card", label: "Metric Card" },
  { key: "line_chart", label: "Line Chart" },
  { key: "line_chart_trend", label: "Line Chart with Trend" },
  { key: "line_chart_forecast", label: "Line Chart with Forecast" },
  { key: "comparative_bar", label: "Comparative Bar Chart" },
  { key: "comparative_line", label: "Comparative Line Chart" },
  { key: "bar_chart", label: "Bar Chart" },
  { key: "pie_chart", label: "Pie Chart" },
  { key: "table", label: "Table" },
];

const SIZES = [
  { key: "small", label: "Small (1x1)" },
  { key: "medium", label: "Medium (2x1)" },
  { key: "large", label: "Large (2x2)" },
];

export default function WidgetBuilder({ open, onClose, onSave }) {
  const [widgetType, setWidgetType] = useState("metric_card");
  const [metric, setMetric] = useState("sessions");
  const [dimension, setDimension] = useState("none");
  const [size, setSize] = useState("small");
  const [enableComparison, setEnableComparison] = useState(false);
  const [enableForecast, setEnableForecast] = useState(false);

  const handleSave = () => {
    onSave({
      id: Date.now().toString(),
      type: widgetType,
      metric,
      dimension,
      size,
      position: { x: 0, y: 0 },
      enableComparison,
      enableForecast,
      forecastDays: 30,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Widget Type</Label>
            <Select value={widgetType} onValueChange={setWidgetType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map(w => <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Metric</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRICS.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dimension (Break down by)</Label>
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="comparison"
              checked={enableComparison}
              onChange={(e) => setEnableComparison(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="comparison" className="text-sm">Enable Period Comparison</Label>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="forecast"
              checked={enableForecast}
              onChange={(e) => setEnableForecast(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="forecast" className="text-sm">Enable 30-Day Forecast</Label>
          </div>
          </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">Add Widget</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}