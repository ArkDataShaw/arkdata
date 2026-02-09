import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Edit, Eye, Trash2, Save, RotateCcw, CheckCircle, Code, Play, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import moment from "moment";

const CONFIG_KEYS = [
  { key: "navigation", label: "Navigation Menu", schema: "navigation.schema.json" },
  { key: "page_layout", label: "Page Layouts", schema: "page_layout.schema.json" },
  { key: "table_config", label: "Table Configs", schema: "table_config.schema.json" },
  { key: "chart_config", label: "Chart Configs", schema: "chart_config.schema.json" },
  { key: "metrics", label: "Metrics Definitions", schema: "metrics.schema.json" },
  { key: "labels", label: "UI Labels & Copy", schema: "labels.schema.json" },
  { key: "tooltips", label: "Tooltips", schema: "tooltips.schema.json" },
  { key: "theme", label: "Theme & Branding", schema: "theme.schema.json" },
  { key: "onboarding", label: "Onboarding Flow", schema: "onboarding.schema.json" },
  { key: "help_launcher", label: "Help Launcher", schema: "help_launcher.schema.json" },
];

export default function AdminUIBuilder() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [diffDialog, setDiffDialog] = useState(false);
  const [editConfig, setEditConfig] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedScope, setSelectedScope] = useState("global");
  const [validationError, setValidationError] = useState("");
  const [diffBefore, setDiffBefore] = useState(null);
  const [diffAfter, setDiffAfter] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ui-configs"],
    queryFn: () => base44.entities.UIConfig.list("-updated_date", 100),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["ui-config-history"],
    queryFn: () => base44.entities.UIConfigHistory.list("-created_date", 50),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.UIConfig.update(id, data)
      : base44.entities.UIConfig.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ui-configs"] });
      queryClient.invalidateQueries({ queryKey: ["ui-config-history"] });
      base44.entities.UIConfigHistory.create({
        ui_config_id: data.id,
        action: editConfig ? "updated" : "created",
        after_json: JSON.parse(jsonText),
        actor_user_id: "admin",
      });
      setDialogOpen(false);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (config) => base44.entities.UIConfig.update(config.id, {
      status: "published",
      published_at: new Date().toISOString(),
      version: (config.version || 1) + 1,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ui-configs"] });
      base44.entities.UIConfigHistory.create({
        ui_config_id: data.id,
        action: "published",
        actor_user_id: "admin",
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ configId, historyId }) => {
      const historyItem = history.find(h => h.id === historyId);
      if (!historyItem) throw new Error("History not found");
      return base44.entities.UIConfig.update(configId, {
        config_json: historyItem.before_json,
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ui-configs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UIConfig.update(id, { status: "archived" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ui-configs"] }),
  });

  const openEditor = (config = null) => {
    setEditConfig(config);
    setJsonText(config?.config_json ? JSON.stringify(config.config_json, null, 2) : "{}");
    setSelectedKey(config?.key || "");
    setSelectedScope(config?.scope || "global");
    setValidationError("");
    setDialogOpen(true);
  };

  const validateAndSave = () => {
    setValidationError("");
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setValidationError("Invalid JSON: " + e.message);
      return;
    }

    // Basic validation checks
    if (selectedKey === "navigation" && !Array.isArray(parsed.items)) {
      setValidationError("Navigation config must have 'items' array");
      return;
    }

    const data = {
      key: selectedKey || editConfig?.key,
      scope: selectedScope,
      config_json: parsed,
      status: editConfig?.status || "draft",
      schema_version: 1,
      updated_by_user_id: "admin",
    };

    if (!editConfig) {
      data.created_by_user_id = "admin";
    }

    saveMutation.mutate({ id: editConfig?.id, data });
  };

  const openDiff = (historyItem) => {
    setDiffBefore(historyItem.before_json);
    setDiffAfter(historyItem.after_json);
    setDiffDialog(true);
  };

  const columns = [
    {
      key: "key",
      label: "Config Key",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <FileCode className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{CONFIG_KEYS.find(k => k.key === val)?.label || val}</p>
            <p className="text-xs text-slate-400">{val}</p>
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      render: (val) => <Badge variant="outline" className="capitalize text-xs">{val}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "version",
      label: "Version",
      render: (val) => <span className="text-xs tabular-nums">v{val || 1}</span>,
    },
    {
      key: "published_at",
      label: "Published",
      render: (val) => val ? <span className="text-xs text-slate-500">{moment(val).fromNow()}</span> : "—",
    },
    {
      key: "updated_date",
      label: "Updated",
      render: (val) => <span className="text-xs text-slate-500">{moment(val).fromNow()}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(row)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          {row.status === "draft" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => publishMutation.mutate(row)}>
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          {row.status === "published" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => setPreviewDialog(true)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMutation.mutate(row.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">UI Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Config-driven customer UI • Draft → Preview → Publish workflow</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => openEditor()}>
          <Plus className="w-4 h-4" />
          New Config
        </Button>
      </div>

      <Tabs defaultValue="configs">
        <TabsList>
          <TabsTrigger value="configs">Configs</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="mt-4">
          <DataTable columns={columns} data={configs.filter(c => c.status !== "archived")} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-100 divide-y">
            {history.slice(0, 20).map(h => (
              <div key={h.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{h.action}</p>
                  <p className="text-xs text-slate-400">{moment(h.created_date).format("MMM D, YYYY h:mm A")}</p>
                </div>
                {h.before_json && (
                  <Button variant="outline" size="sm" onClick={() => openDiff(h)}>
                    <Code className="w-3.5 h-3.5 mr-1.5" />
                    View Diff
                  </Button>
                )}
                {h.action !== "created" && (
                  <Button variant="outline" size="sm" onClick={() => rollbackMutation.mutate({ configId: h.ui_config_id, historyId: h.id })}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Rollback
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schemas" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONFIG_KEYS.map(k => (
              <div key={k.key} className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-sm mb-1">{k.label}</h3>
                <p className="text-xs text-slate-400 mb-3">Key: {k.key}</p>
                <Badge variant="outline" className="text-xs">{k.schema}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{editConfig ? "Edit Config" : "New Config"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Config Key</Label>
                <Select value={selectedKey} onValueChange={setSelectedKey} disabled={!!editConfig}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select key" /></SelectTrigger>
                  <SelectContent>
                    {CONFIG_KEYS.map(k => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={selectedScope} onValueChange={setSelectedScope}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Configuration JSON</Label>
              <Textarea
                className="mt-1 font-mono text-xs min-h-[400px]"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"items": []}'
              />
              {validationError && (
                <p className="text-xs text-red-500 mt-1">{validationError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={validateAndSave}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Dialog */}
      <Dialog open={diffDialog} onOpenChange={setDiffDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Configuration Diff</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[60vh]">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-red-600">Before</h4>
              <pre className="bg-red-50 text-red-900 p-3 rounded text-xs overflow-auto max-h-[500px]">
                {JSON.stringify(diffBefore, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 text-emerald-600">After</h4>
              <pre className="bg-emerald-50 text-emerald-900 p-3 rounded text-xs overflow-auto max-h-[500px]">
                {JSON.stringify(diffAfter, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}