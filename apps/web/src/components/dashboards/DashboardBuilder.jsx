import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, Copy } from "lucide-react";

const WIDGET_TYPES = [
  { id: "metric-card", name: "Metric Card", description: "Display a single KPI" },
  { id: "chart-line", name: "Line Chart", description: "Trend visualization" },
  { id: "chart-bar", name: "Bar Chart", description: "Comparison view" },
  { id: "chart-heatmap", name: "Heatmap", description: "Activity intensity" },
  { id: "chart-funnel", name: "Funnel", description: "Conversion stages" },
  { id: "chart-sankey", name: "Sankey", description: "User flow" },
  { id: "table", name: "Data Table", description: "Detailed records" },
];

export default function DashboardBuilder({ onSaveDashboard }) {
  const [dashboardName, setDashboardName] = useState("My Dashboard");
  const [description, setDescription] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [saving, setSaving] = useState(false);

  const addWidget = (widgetType) => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: `New ${widgetType} Widget`,
      metric: selectedMetric,
      config: {}
    };
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const updateWidget = (widgetId, updates) => {
    setWidgets(widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w));
  };

  const saveDashboard = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const dashboard = await base44.entities.Dashboard.create({
        name: dashboardName,
        description,
        created_by: user.email,
        is_custom: true,
        layout_json: {
          widgets: widgets.map(({ id, type, title, metric, config }) => ({
            id, type, title, metric, config
          })),
          columns: 2,
          gridSize: "medium"
        }
      });

      if (onSaveDashboard) {
        onSaveDashboard(dashboard);
      }
    } catch (error) {
      console.error("Failed to save dashboard:", error);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Dashboard Name</label>
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Enter dashboard name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Widget Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus size={20} />
            Add Widgets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Metric (Optional)</label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Select metric to track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sessions">Total Sessions</SelectItem>
                <SelectItem value="visitors">Unique Visitors</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
                <SelectItem value="match-rate">Match Rate</SelectItem>
                <SelectItem value="bounce-rate">Bounce Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WIDGET_TYPES.map(widget => (
              <Button
                key={widget.id}
                variant="outline"
                className="h-auto flex-col items-start p-3 justify-start text-left"
                onClick={() => addWidget(widget.id)}
              >
                <span className="font-semibold">{widget.name}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {widget.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Widgets */}
      {widgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Widgets ({widgets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {widgets.map((widget, idx) => (
              <div
                key={widget.id}
                className="p-3 border border-border rounded-lg bg-card flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{widget.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {WIDGET_TYPES.find(w => w.id === widget.type)?.name}
                    </Badge>
                    {widget.metric && (
                      <Badge variant="outline" className="text-xs">
                        {widget.metric}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={widget.title}
                    onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                    placeholder="Widget title"
                    className="text-xs w-32"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWidget(widget.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <Button
        onClick={saveDashboard}
        disabled={saving || widgets.length === 0}
        className="w-full"
        size="lg"
      >
        <Save size={18} className="mr-2" />
        {saving ? "Saving..." : "Save Dashboard"}
      </Button>
    </div>
  );
}