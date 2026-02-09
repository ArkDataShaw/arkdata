import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Plus, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

export default function AdminUIConfig() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [newKey, setNewKey] = useState("");

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ui-configs"],
    queryFn: () => base44.entities.UIConfig.list("-updated_date"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.UIConfig.update(id, data)
      : base44.entities.UIConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ui-configs"] });
      setDialogOpen(false);
    },
  });

  const openEditor = (config) => {
    setEditConfig(config);
    setJsonText(JSON.stringify(config?.config_json || {}, null, 2));
    setNewKey(config?.key || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    let parsed;
    try { parsed = JSON.parse(jsonText); } catch { return; }
    saveMutation.mutate({
      id: editConfig?.id,
      data: {
        key: newKey || editConfig?.key,
        scope: "global",
        config_json: parsed,
        version: (editConfig?.version || 0) + 1,
      },
    });
  };

  const configKeys = ["navigation", "visitors_table", "analytics_cards", "theme", "labels", "tooltips", "onboarding"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">UI Config Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Edit navigation, tables, charts, labels, and more — no code required</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => openEditor(null)}>
          <Plus className="w-4 h-4" />
          New Config
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => (
          <div
            key={config.id}
            className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md hover:shadow-slate-100/50 transition-all cursor-pointer"
            onClick={() => openEditor(config)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <Code className="w-4 h-4 text-slate-500" />
              </div>
              <Badge variant="outline" className="text-xs">v{config.version || 1}</Badge>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 capitalize">{config.key?.replace(/_/g, " ")}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Scope: {config.scope} · Updated {config.updated_date ? new Date(config.updated_date).toLocaleDateString() : "—"}
            </p>
          </div>
        ))}
        {configs.length === 0 && !isLoading && (
          <div className="col-span-full bg-white rounded-xl border border-slate-100 p-12 text-center">
            <Settings className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No configs yet. Create one to start customizing the UI.</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editConfig ? `Edit: ${editConfig.key}` : "New UI Config"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editConfig && (
              <div>
                <Label>Config Key</Label>
                <Select value={newKey} onValueChange={setNewKey}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select key" /></SelectTrigger>
                  <SelectContent>
                    {configKeys.map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Configuration JSON</Label>
              <Textarea
                className="mt-1 font-mono text-xs min-h-[300px]"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 gap-1.5" onClick={handleSave}>
              <Save className="w-3.5 h-3.5" />
              Save Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}