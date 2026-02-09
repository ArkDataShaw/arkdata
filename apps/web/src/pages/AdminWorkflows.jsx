import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Play, Settings } from "lucide-react";
import WorkflowBuilder from "@/components/workflows/WorkflowBuilder";

export default function AdminWorkflows() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const queryClient = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => base44.entities.Workflow.list("-created_date", 100),
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["workflow-executions", selectedWorkflow?.id],
    queryFn: () =>
      selectedWorkflow
        ? base44.entities.WorkflowExecution.filter({
            workflow_id: selectedWorkflow.id,
          })
        : [],
    enabled: !!selectedWorkflow,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Workflow.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setShowBuilder(false);
      setEditingWorkflow(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Workflow.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setShowBuilder(false);
      setEditingWorkflow(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Workflow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (workflowId) => {
      // Call backend function to manually trigger workflow
      return base44.integrations.Core.InvokeLLM({
        prompt: `Trigger workflow ${workflowId} manually`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
    },
  });

  const handleSave = (data) => {
    if (editingWorkflow) {
      updateMutation.mutate({
        id: editingWorkflow.id,
        data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const triggerTypeLabels = {
    feedback_created: "Feedback Created",
    feedback_status_changed: "Status Changed",
    feedback_priority_changed: "Priority Changed",
    onboarding_task_completed: "Task Completed",
    onboarding_flow_completed: "Flow Completed",
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Workflow Automation
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Create automated sequences triggered by events
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingWorkflow(null);
              setShowBuilder(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </div>

        {/* Builder Dialog */}
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorkflow ? "Edit Workflow" : "Create Workflow"}
              </DialogTitle>
            </DialogHeader>
            <WorkflowBuilder
              workflow={editingWorkflow}
              onSave={handleSave}
              onCancel={() => {
                setShowBuilder(false);
                setEditingWorkflow(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Workflows Grid */}
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  No workflows yet. Create one to automate tasks.
                </p>
                <Button
                  onClick={() => setShowBuilder(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {workflow.name}
                        </h3>
                        {!workflow.enabled && (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {workflow.description}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          triggerMutation.mutate(workflow.id)
                        }
                        title="Run manually"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingWorkflow(workflow);
                          setShowBuilder(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(workflow.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Workflow Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Trigger
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {triggerTypeLabels[workflow.trigger_type]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Actions
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {workflow.actions_json?.length || 0} step
                        {workflow.actions_json?.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Executions
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {workflow.execution_count || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Errors
                      </p>
                      <p
                        className={`text-sm ${
                          workflow.error_count > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {workflow.error_count || 0}
                      </p>
                    </div>
                  </div>

                  {/* View Executions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="mt-4 gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Settings className="w-4 h-4" />
                    View Executions
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Executions Modal */}
      {selectedWorkflow && (
        <Dialog
          open={!!selectedWorkflow}
          onOpenChange={() => setSelectedWorkflow(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Executions - {selectedWorkflow.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {executions.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                  No executions yet
                </p>
              ) : (
                executions.map((exec) => (
                  <Card key={exec.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge
                          variant={
                            exec.status === "completed"
                              ? "default"
                              : exec.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {exec.status}
                        </Badge>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(exec.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Event: {exec.trigger_event_type}
                        </p>
                      </div>
                    </div>
                    {exec.error_message && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        {exec.error_message}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}