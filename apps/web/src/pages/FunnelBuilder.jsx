import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Save, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

export default function FunnelBuilder() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [funnelName, setFunnelName] = useState("");
  const [steps, setSteps] = useState([
    { name: "Landing", type: "url_match", pattern: "/" },
    { name: "Pricing", type: "url_match", pattern: "/pricing" },
    { name: "Demo", type: "url_match", pattern: "/demo" },
  ]);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [funnelData, setFunnelData] = useState(null);

  const { data: funnels = [], isLoading } = useQuery({
    queryKey: ["funnels"],
    queryFn: () => base44.entities.Funnel.list("-created_date"),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => base44.entities.Session.list("-started_at", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Funnel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Funnel.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funnels"] }),
  });

  const resetForm = () => {
    setFunnelName("");
    setSteps([
      { name: "Landing", type: "url_match", pattern: "/" },
      { name: "Pricing", type: "url_match", pattern: "/pricing" },
    ]);
  };

  const addStep = () => {
    setSteps([...steps, { name: "", type: "url_match", pattern: "" }]);
  };

  const updateStep = (index, key, value) => {
    const newSteps = [...steps];
    newSteps[index][key] = value;
    setSteps(newSteps);
  };

  const removeStep = (index) => {
    if (steps.length > 1) setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    saveMutation.mutate({
      tenant_id: "demo",
      name: funnelName,
      steps_json: steps,
      created_by_user_id: "admin",
    });
  };

  const analyzeFunnel = (funnel) => {
    // Simple funnel analysis
    const stepCounts = funnel.steps_json.map((step, idx) => {
      const count = sessions.filter(s => {
        if (step.type === "url_match") {
          return s.entry_url?.includes(step.pattern) || s.exit_url?.includes(step.pattern);
        }
        return false;
      }).length;
      return { name: step.name, count, dropoff: 0 };
    });

    // Calculate dropoffs
    for (let i = 1; i < stepCounts.length; i++) {
      stepCounts[i].dropoff = stepCounts[i - 1].count - stepCounts[i].count;
    }

    setFunnelData(stepCounts);
    setSelectedFunnel(funnel);
    setViewDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Funnels</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track multi-step conversion journeys</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Funnel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {funnels.map((funnel) => (
          <div
            key={funnel.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => analyzeFunnel(funnel)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-emerald-500" />
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(funnel.id); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">{funnel.name}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">{funnel.steps_json?.length || 0} steps</p>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Funnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Funnel Name</Label>
              <Input
                placeholder="e.g., Demo Request Funnel"
                value={funnelName}
                onChange={(e) => setFunnelName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Step
                </Button>
              </div>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-6">{i + 1}</span>
                  <Input
                    placeholder="Step name"
                    value={step.name}
                    onChange={(e) => updateStep(i, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Select value={step.type} onValueChange={(v) => updateStep(i, "type", v)}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url_match">URL Match</SelectItem>
                      <SelectItem value="event_match">Event Match</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Pattern"
                    value={step.pattern}
                    onChange={(e) => updateStep(i, "pattern", e.target.value)}
                    className="flex-1"
                  />
                  {steps.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStep(i)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={!funnelName}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Funnel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedFunnel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {funnelData?.map((step, i) => {
              const conversionRate = i === 0 ? 100 : ((step.count / funnelData[0].count) * 100).toFixed(1);
              return (
                <div key={i} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">Step {i + 1}</span>
                      <span className="font-semibold">{step.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{conversionRate}%</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold">{step.count}</p>
                      <p className="text-xs text-slate-400">visitors</p>
                    </div>
                    {step.dropoff > 0 && (
                      <div className="flex items-center gap-1 text-red-500">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm font-medium">-{step.dropoff}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}