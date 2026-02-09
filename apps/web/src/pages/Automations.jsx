import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Play, Pause, Trash2, Zap, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

export default function Automations() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", enabled: true, priority: 0 });
  const [filterType, setFilterType] = useState("intent_score");
  const [filterValue, setFilterValue] = useState("60");
  const [actionType, setActionType] = useState("push_to_crm");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["routing-rules"],
    queryFn: () => base44.entities.RoutingRule.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RoutingRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      setDialogOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.RoutingRule.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routing-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoutingRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routing-rules"] }),
  });

  const handleCreate = () => {
    createMutation.mutate({
      tenant_id: "demo",
      name: newRule.name,
      enabled: newRule.enabled,
      priority: newRule.priority,
      match_filters_json: { type: filterType, value: filterValue },
      actions_json: [{ type: actionType }],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Automations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Route identified visitors to your tools automatically</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Rule
        </Button>
      </div>

      <div className="space-y-3">
        {rules.length === 0 && !isLoading && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-12 text-center">
            <GitBranch className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No routing rules yet</p>
            <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Create your first rule
            </Button>
          </div>
        )}

        {rules.map((rule) => (
          <div key={rule.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rule.name}</p>
                <Badge variant="outline" className="text-xs">Priority: {rule.priority || 0}</Badge>
                {rule.trigger_count > 0 && (
                  <Badge variant="secondary" className="text-xs">{rule.trigger_count} triggers</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                IF {rule.match_filters_json?.type?.replace(/_/g, " ")} {rule.match_filters_json?.value} → {rule.actions_json?.[0]?.type?.replace(/_/g, " ")}
              </p>
            </div>
            <Switch
              checked={rule.enabled}
              onCheckedChange={(enabled) => toggleMutation.mutate({ id: rule.id, enabled })}
            />
            <Button
              variant="ghost" size="icon"
              className="text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => deleteMutation.mutate(rule.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Routing Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g., High Intent to Salesforce"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div>
              <Label>If visitor matches</Label>
              <div className="flex gap-2 mt-1">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intent_score">Intent Score ≥</SelectItem>
                    <SelectItem value="company_size">Company Size</SelectItem>
                    <SelectItem value="returning">Is Returning</SelectItem>
                    <SelectItem value="page_visited">Visited Page</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Value"
                />
              </div>
            </div>
            <div>
              <Label>Then action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="push_to_crm">Push to CRM</SelectItem>
                  <SelectItem value="add_to_email_list">Add to Email List</SelectItem>
                  <SelectItem value="notify_slack">Notify via Slack</SelectItem>
                  <SelectItem value="add_tag">Add Tag</SelectItem>
                  <SelectItem value="create_notification">Create Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreate} disabled={!newRule.name}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}