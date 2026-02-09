import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, Plus, Save, Trash2, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

const FIELDS = [
  { key: "intent_score", label: "Intent Score", type: "number" },
  { key: "total_sessions", label: "Session Count", type: "number" },
  { key: "status", label: "Status", type: "enum", values: ["new", "returning", "converted", "lost"] },
  { key: "identity_status", label: "Identity", type: "enum", values: ["anonymous", "identified_person", "identified_company", "both"] },
  { key: "utm_source", label: "UTM Source", type: "string" },
  { key: "utm_campaign", label: "UTM Campaign", type: "string" },
  { key: "is_converted", label: "Is Converted", type: "boolean" },
  { key: "company_industry", label: "Company Industry", type: "string" },
  { key: "company_size", label: "Company Size", type: "enum", values: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"] },
];

const OPERATORS = {
  number: [{ key: ">=", label: "≥" }, { key: "<=", label: "≤" }, { key: "==", label: "=" }],
  string: [{ key: "contains", label: "Contains" }, { key: "equals", label: "Equals" }, { key: "starts_with", label: "Starts with" }],
  enum: [{ key: "equals", label: "=" }, { key: "in", label: "In" }],
  boolean: [{ key: "equals", label: "=" }],
};

export default function SegmentBuilder() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [sharedWithTeam, setSharedWithTeam] = useState(false);
  const [rules, setRules] = useState([{ field: "intent_score", operator: ">=", value: "70" }]);
  const [previewCount, setPreviewCount] = useState(null);

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ["segments"],
    queryFn: () => base44.entities.Segment.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Segment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Segment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["segments"] }),
  });

  const resetForm = () => {
    setSegmentName("");
    setRules([{ field: "intent_score", operator: ">=", value: "70" }]);
    setSharedWithTeam(false);
    setPreviewCount(null);
  };

  const addRule = () => {
    setRules([...rules, { field: "intent_score", operator: ">=", value: "" }]);
  };

  const updateRule = (index, key, value) => {
    const newRules = [...rules];
    newRules[index][key] = value;
    setRules(newRules);
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    // Simulate preview by counting visitors that match
    const { data: visitors } = await base44.entities.Visitor.list();
    let count = visitors.length;
    // In real implementation, apply filter logic server-side
    setPreviewCount(count);
  };

  const handleSave = () => {
    saveMutation.mutate({
      tenant_id: "demo",
      name: segmentName,
      definition_json: { rules, logic: "and" },
      shared_with_team: sharedWithTeam,
      created_by_user_id: "admin",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Segments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Build reusable visitor segments with advanced filters</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Segment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((seg) => (
          <div key={seg.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Filter className="w-5 h-5 text-violet-500" />
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMutation.mutate(seg.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">{seg.name}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{seg.definition_json?.rules?.length || 0} rules</p>
            <div className="flex items-center gap-2">
              {seg.shared_with_team && (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Team
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">Created {new Date(seg.created_date).toLocaleDateString()}</Badge>
            </div>
          </div>
        ))}
        {segments.length === 0 && !isLoading && (
          <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-12 text-center">
            <Filter className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No segments yet. Create one to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Segment Name</Label>
              <Input
                placeholder="e.g., High Intent Enterprise"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sharedWithTeam} onCheckedChange={setSharedWithTeam} />
              <Label className="text-sm">Share with team</Label>
            </div>
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Filter Rules</Label>
                <Button variant="outline" size="sm" onClick={addRule}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Rule
                </Button>
              </div>
              {rules.map((rule, i) => {
                const field = FIELDS.find(f => f.key === rule.field);
                const operators = OPERATORS[field?.type || "string"];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={rule.field} onValueChange={(v) => updateRule(i, "field", v)}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={(v) => updateRule(i, "operator", v)}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {operators?.map(op => <SelectItem key={op.key} value={op.key}>{op.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {field?.type === "enum" ? (
                      <Select value={rule.value} onValueChange={(v) => updateRule(i, "value", v)}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {field.values.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Value"
                        value={rule.value}
                        onChange={(e) => updateRule(i, "value", e.target.value)}
                        className="flex-1"
                      />
                    )}
                    {rules.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRule(i)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePreview}>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Preview
              </Button>
              {previewCount !== null && (
                <Badge variant="secondary">{previewCount} visitors match</Badge>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={!segmentName}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}