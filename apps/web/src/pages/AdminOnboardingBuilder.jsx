import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Copy, Eye, CheckCircle2, Clock, Settings, Lock, Zap, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminOnboardingBuilder() {
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [editingFlow, setEditingFlow] = useState(null);
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantOverrideDialog, setShowTenantOverrideDialog] = useState(false);
  const [tenantOverride, setTenantOverride] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const queryClient = useQueryClient();

  const { data: flows = [] } = useQuery({
    queryKey: ["onboarding-flows-admin"],
    queryFn: () =>
      base44.entities.OnboardingFlow.list("-updated_date", 100),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date", 100),
  });

  const { data: tenantOverrides = [] } = useQuery({
    queryKey: ["tenant-overrides", selectedFlow?.id],
    queryFn: () =>
      selectedFlow
        ? base44.entities.TenantOnboardingOverride.filter({
            flow_id: selectedFlow.id,
          })
        : Promise.resolve([]),
    enabled: !!selectedFlow,
  });

  const createFlowMutation = useMutation({
    mutationFn: (flowData) =>
      base44.entities.OnboardingFlow.create(flowData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-flows-admin"] });
      setShowFlowDialog(false);
    },
  });

  const updateFlowMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.OnboardingFlow.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-flows-admin"] });
      setEditingFlow(null);
    },
  });

  const publishFlowMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.OnboardingFlow.update(id, {
        status: "published",
        published_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-flows-admin"] });
    },
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.OnboardingFlow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-flows-admin"] });
      setSelectedFlow(null);
    },
  });

  const duplicateFlowMutation = useMutation({
    mutationFn: async (flowId) => {
      const flow = flows.find((f) => f.id === flowId);
      if (!flow) throw new Error("Flow not found");

      return await base44.entities.OnboardingFlow.create({
        ...flow,
        id: undefined,
        name: `${flow.name} (Copy)`,
        status: "draft",
        version: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-flows-admin"] });
    },
  });

  const createTenantOverrideMutation = useMutation({
    mutationFn: (data) => base44.entities.TenantOnboardingOverride.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-overrides", selectedFlow?.id] });
      setShowTenantOverrideDialog(false);
      setTenantOverride(null);
      setSelectedTenant(null);
    },
  });

  const updateTenantOverrideMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.TenantOnboardingOverride.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-overrides", selectedFlow?.id] });
      setShowTenantOverrideDialog(false);
      setTenantOverride(null);
    },
  });

  const deleteTenantOverrideMutation = useMutation({
    mutationFn: (id) => base44.entities.TenantOnboardingOverride.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-overrides", selectedFlow?.id] });
    },
  });

  const handlePublish = (flowId) => {
    publishFlowMutation.mutate(flowId);
  };

  const handleDelete = (flowId) => {
    if (confirm("Are you sure? This cannot be undone.")) {
      deleteFlowMutation.mutate(flowId);
    }
  };

  const publicFlows = flows.filter((f) => f.status === "published");
  const draftFlows = flows.filter((f) => f.status === "draft");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Onboarding Builder
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Create and manage customer onboarding flows
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFlow(null);
            setShowFlowDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Flow
        </Button>
      </div>

      <Tabs defaultValue="published" className="space-y-6">
        <TabsList>
          <TabsTrigger value="published">
            Published ({publicFlows.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts ({draftFlows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="space-y-3">
          {publicFlows.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No published flows yet
              </p>
            </Card>
          ) : (
            publicFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onSelect={() => setSelectedFlow(flow)}
                onEdit={() => {
                  setEditingFlow(flow);
                  setShowFlowDialog(true);
                }}
                onDuplicate={() => duplicateFlowMutation.mutate(flow.id)}
                onDelete={() => handleDelete(flow.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-3">
          {draftFlows.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No drafts yet
              </p>
            </Card>
          ) : (
            draftFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                isDraft
                onSelect={() => setSelectedFlow(flow)}
                onEdit={() => {
                  setEditingFlow(flow);
                  setShowFlowDialog(true);
                }}
                onPublish={() => handlePublish(flow.id)}
                onDuplicate={() => duplicateFlowMutation.mutate(flow.id)}
                onDelete={() => handleDelete(flow.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Flow Editor Dialog */}
      <Dialog open={showFlowDialog} onOpenChange={setShowFlowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFlow ? "Edit Flow" : "Create New Flow"}
            </DialogTitle>
          </DialogHeader>
          <FlowEditor
            flow={editingFlow}
            onSave={async (data) => {
              if (editingFlow) {
                await updateFlowMutation.mutateAsync({
                  id: editingFlow.id,
                  data,
                });
              } else {
                await createFlowMutation.mutateAsync(data);
              }
            }}
            onCancel={() => setShowFlowDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Flow Details & Tenant Overrides */}
      {selectedFlow && (
        <div className="fixed bottom-0 right-0 left-0 md:left-auto md:right-6 md:bottom-6 md:w-full md:max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 z-40 max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Flow Details
            </h3>
            <button
              onClick={() => setSelectedFlow(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Name:</strong> {selectedFlow.name}
              </p>
              <p className="text-sm">
                <strong>Status:</strong>{" "}
                <Badge>{selectedFlow.status}</Badge>
              </p>
              <p className="text-sm">
                <strong>Tasks:</strong>{" "}
                {selectedFlow.config_json?.categories
                  .flatMap((c) => c.tasks)
                  .length || 0}
              </p>
            </div>

            {/* Tenant Overrides Section */}
            {selectedFlow.status === "published" && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedSections({
                      ...expandedSections,
                      overrides: !expandedSections.overrides,
                    })
                  }
                >
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Tenant Overrides
                  </h4>
                  <ChevronDown
                    className={`w-4 h-4 transition ${
                      expandedSections.overrides ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {expandedSections.overrides && (
                  <div className="mt-3 space-y-2">
                    {tenantOverrides.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No tenant overrides yet
                      </p>
                    ) : (
                      tenantOverrides.map((override) => (
                        <div
                          key={override.id}
                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 p-2 rounded text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {tenants.find((t) => t.id === override.tenant_id)
                                ?.name || override.tenant_id}
                            </p>
                            {override.activation_conditions_json && (
                              <p className="text-xs text-slate-500">
                                Conditions: {override.activation_conditions_json.type}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTenantOverride(override);
                                setSelectedTenant(override.tenant_id);
                                setShowTenantOverrideDialog(true);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                deleteTenantOverrideMutation.mutate(override.id)
                              }
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}

                    <Button
                      size="sm"
                      onClick={() => setShowTenantOverrideDialog(true)}
                      className="w-full mt-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Override
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tenant Override Dialog */}
      <Dialog open={showTenantOverrideDialog} onOpenChange={setShowTenantOverrideDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tenantOverride ? "Edit" : "Create"} Tenant Override
            </DialogTitle>
          </DialogHeader>
          <TenantOverrideEditor
            flow={selectedFlow}
            override={tenantOverride}
            tenants={tenants}
            onSave={async (data) => {
              if (tenantOverride) {
                await updateTenantOverrideMutation.mutateAsync({
                  id: tenantOverride.id,
                  data,
                });
              } else {
                await createTenantOverrideMutation.mutateAsync({
                  flow_id: selectedFlow.id,
                  ...data,
                });
              }
            }}
            onCancel={() => {
              setShowTenantOverrideDialog(false);
              setTenantOverride(null);
              setSelectedTenant(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowCard({
  flow,
  isDraft,
  onSelect,
  onEdit,
  onPublish,
  onDuplicate,
  onDelete,
}) {
  const taskCount = flow.config_json?.categories
    .flatMap((c) => c.tasks)
    .length || 0;

  return (
    <Card className="p-4 hover:shadow-md transition cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {flow.name}
            </h3>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {flow.status}
            </Badge>
            {flow.scope === "tenant" && (
              <Badge variant="outline">Tenant Override</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {taskCount} tasks
            </div>
            {flow.published_at && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                v{flow.version}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          {isDraft && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onPublish();
              }}
            >
              Publish
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FlowEditor({ flow, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    flow || {
      name: "",
      status: "draft",
      scope: "global",
      config_json: {
        categories: [],
        completionCriteria: {},
      },
    }
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
          Flow Name
        </label>
        <Input
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          placeholder="e.g., Ark Data Setup (Default)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
          Scope
        </label>
        <select
          value={formData.scope}
          onChange={(e) =>
            setFormData({ ...formData, scope: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          <option value="global">Global Default</option>
          <option value="tenant">Tenant Override</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(formData)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {flow ? "Update Flow" : "Create Flow"}
        </Button>
      </div>
    </div>
  );
}

function TenantOverrideEditor({ flow, override, tenants, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    override || {
      tenant_id: "",
      enabled: true,
      gating_config_json: {
        enabled: true,
        showOn: "first_login",
        conditions: [],
      },
      activation_conditions_json: {
        type: "always",
      },
      task_overrides_json: [],
      integration_preference: "",
      task_order_json: [],
    }
  );

  const allTasks = flow?.config_json?.categories.flatMap((c) => c.tasks) || [];

  return (
    <div className="space-y-6">
      {/* Tenant Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          Tenant
        </label>
        <select
          value={formData.tenant_id}
          onChange={(e) =>
            setFormData({ ...formData, tenant_id: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          disabled={!!override}
        >
          <option value="">Select a tenant...</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Activation Conditions */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Activation Conditions
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
              When to activate this flow
            </label>
            <select
              value={formData.activation_conditions_json?.type || "always"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  activation_conditions_json: {
                    ...formData.activation_conditions_json,
                    type: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="always">Always (from signup)</option>
              <option value="date_based">On specific date</option>
              <option value="event_based">When event occurs</option>
            </select>
          </div>

          {formData.activation_conditions_json?.type === "date_based" && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Activate after (days)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.activation_conditions_json?.minDaysActive || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    activation_conditions_json: {
                      ...formData.activation_conditions_json,
                      minDaysActive: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          )}

          {formData.activation_conditions_json?.type === "event_based" && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Required events (comma-separated)
              </label>
              <Input
                value={(formData.activation_conditions_json?.requiredEvents || []).join(", ")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    activation_conditions_json: {
                      ...formData.activation_conditions_json,
                      requiredEvents: e.target.value.split(",").map(s => s.trim()),
                    },
                  })
                }
                placeholder="e.g., domain_added, pixel_verified"
              />
            </div>
          )}
        </div>
      </div>

      {/* Gating Configuration */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Onboarding Wizard Gating
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Show wizard on first login
            </label>
            <input
              type="checkbox"
              checked={formData.gating_config_json?.enabled || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gating_config_json: {
                    ...formData.gating_config_json,
                    enabled: e.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
          </div>

          {formData.gating_config_json?.enabled && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Show wizard condition
              </label>
              <select
                value={formData.gating_config_json?.showOn || "first_login"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gating_config_json: {
                      ...formData.gating_config_json,
                      showOn: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="first_login">First login only</option>
                <option value="day_7">After 7 days</option>
                <option value="always">Every login</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Task Overrides */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Task Overrides
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {allTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks in flow</p>
          ) : (
            allTasks.map((task) => {
              const override = formData.task_overrides_json?.find(
                (o) => o.task_id === task.id
              );
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 p-2 rounded text-sm"
                >
                  <span className="flex-1">{task.title}</span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={override?.required ?? task.required}
                        onChange={(e) => {
                          const updated = formData.task_overrides_json?.filter(
                            (o) => o.task_id !== task.id
                          ) || [];
                          if (e.target.checked || override?.required !== undefined) {
                            updated.push({
                              task_id: task.id,
                              required: e.target.checked,
                            });
                          }
                          setFormData({
                            ...formData,
                            task_overrides_json: updated,
                          });
                        }}
                        className="w-3 h-3"
                      />
                      Required
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Integration Preference */}
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          Preferred Integration (for task_9)
        </label>
        <select
          value={formData.integration_preference || ""}
          onChange={(e) =>
            setFormData({ ...formData, integration_preference: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          <option value="">No preference</option>
          <option value="salesforce">Salesforce</option>
          <option value="ghl">Go High Level</option>
          <option value="klaviyo">Klaviyo</option>
          <option value="hubspot">HubSpot</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(formData)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!formData.tenant_id}
        >
          {override ? "Update Override" : "Create Override"}
        </Button>
      </div>
    </div>
  );
}