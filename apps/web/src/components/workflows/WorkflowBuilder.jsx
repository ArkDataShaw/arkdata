import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "feedback_created", label: "Feedback Created" },
  { value: "feedback_status_changed", label: "Feedback Status Changed" },
  { value: "feedback_priority_changed", label: "Feedback Priority Changed" },
  { value: "onboarding_task_completed", label: "Onboarding Task Completed" },
  { value: "onboarding_flow_completed", label: "Onboarding Flow Completed" },
  { value: "custom_event", label: "Custom Event" },
  { value: "scheduled", label: "Scheduled (Cron)" },
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email" },
  { value: "create_task", label: "Create Task" },
  { value: "update_field", label: "Update Field" },
  { value: "send_notification", label: "Send Notification" },
  { value: "webhook", label: "Webhook" },
  { value: "http_request", label: "HTTP Request" },
  { value: "assign_to_user", label: "Assign to User" },
  { value: "delay", label: "Wait/Delay" },
  { value: "conditional", label: "Conditional (If/Else)" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "in", label: "In List" },
  { value: "not_in", label: "Not In List" },
];

export default function WorkflowBuilder({ workflow, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    workflow || {
      name: "",
      description: "",
      enabled: true,
      trigger_type: "feedback_created",
      trigger_conditions_json: {},
      actions_json: [],
      action_order: [],
    }
  );

  const addAction = () => {
    const newActionId = `action_${Date.now()}`;
    setFormData({
      ...formData,
      actions_json: [
        ...formData.actions_json,
        {
          id: newActionId,
          type: "send_email",
          config: {},
          execution_mode: "sequential",
          retry_config: { max_retries: 3, backoff_seconds: 5 },
          timeout_seconds: 30,
        },
      ],
      action_order: [...formData.action_order, newActionId],
    });
  };

  const removeAction = (actionId) => {
    setFormData({
      ...formData,
      actions_json: formData.actions_json.filter((a) => a.id !== actionId),
      action_order: formData.action_order.filter((id) => id !== actionId),
    });
  };

  const updateAction = (actionId, updates) => {
    setFormData({
      ...formData,
      actions_json: formData.actions_json.map((a) =>
        a.id === actionId ? { ...a, ...updates } : a
      ),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.actions_json.length === 0) {
      alert("Please enter a name and add at least one action");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Workflow Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Alert on Critical Bugs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What does this workflow do?"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
              className="w-4 h-4"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Enable this workflow
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              When this event occurs
            </label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) =>
                setFormData({ ...formData, trigger_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Additional Conditions (optional)
            </label>
            <div className="space-y-2">
              {formData.trigger_type === "feedback_status_changed" && (
                <Input
                  placeholder="Specific status to match (e.g., 'critical', 'planned')"
                  value={
                    formData.trigger_conditions_json?.status_value || ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger_conditions_json: {
                        ...formData.trigger_conditions_json,
                        status_value: e.target.value,
                      },
                    })
                  }
                />
              )}
              {formData.trigger_type === "feedback_priority_changed" && (
                <Select
                  value={
                    formData.trigger_conditions_json?.priority_value || ""
                  }
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      trigger_conditions_json: {
                        ...formData.trigger_conditions_json,
                        priority_value: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {formData.trigger_type === "custom_event" && (
                <Input
                  placeholder="Custom event key (e.g., visitor_converted)"
                  value={formData.trigger_conditions_json?.event_key || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger_conditions_json: {
                        ...formData.trigger_conditions_json,
                        event_key: e.target.value,
                      },
                    })
                  }
                />
              )}
              {formData.trigger_type === "scheduled" && (
                <Input
                  placeholder="Cron expression (e.g., 0 9 * * MON)"
                  value={formData.trigger_conditions_json?.cron || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger_conditions_json: {
                        ...formData.trigger_conditions_json,
                        cron: e.target.value,
                      },
                    })
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Actions</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAction}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Action
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.actions_json.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No actions added yet. Click "Add Action" to create one.
            </p>
          ) : (
            formData.actions_json.map((action, index) => (
              <div
                key={action.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <Badge variant="secondary">Step {index + 1}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAction(action.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <Select
                  value={action.type}
                  onValueChange={(value) =>
                    updateAction(action.id, { type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Action-specific config */}
                {action.type === "send_email" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Email recipients (comma-separated)"
                      value={action.config?.recipients || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: {
                            ...action.config,
                            recipients: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Email subject"
                      value={action.config?.subject || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: {
                            ...action.config,
                            subject: e.target.value,
                          },
                        })
                      }
                    />
                    <Textarea
                      placeholder="Email body"
                      value={action.config?.body || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: { ...action.config, body: e.target.value },
                        })
                      }
                      rows={2}
                    />
                  </div>
                )}

                {action.type === "create_task" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Task title"
                      value={action.config?.title || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: { ...action.config, title: e.target.value },
                        })
                      }
                    />
                    <Textarea
                      placeholder="Task description"
                      value={action.config?.description || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: {
                            ...action.config,
                            description: e.target.value,
                          },
                        })
                      }
                      rows={2}
                    />
                  </div>
                )}

                {action.type === "send_notification" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Notification title"
                      value={action.config?.title || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: { ...action.config, title: e.target.value },
                        })
                      }
                    />
                    <Textarea
                      placeholder="Notification message"
                      value={action.config?.message || ""}
                      onChange={(e) =>
                        updateAction(action.id, {
                          config: {
                            ...action.config,
                            message: e.target.value,
                          },
                        })
                      }
                      rows={2}
                    />
                  </div>
                )}

                {action.type === "webhook" && (
                   <div className="space-y-2">
                     <Input
                       placeholder="Webhook URL"
                       value={action.config?.url || ""}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: { ...action.config, url: e.target.value },
                         })
                       }
                     />
                   </div>
                 )}

                {action.type === "http_request" && (
                   <div className="space-y-2">
                     <Select
                       value={action.config?.method || "POST"}
                       onValueChange={(value) =>
                         updateAction(action.id, {
                           config: { ...action.config, method: value },
                         })
                       }
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="GET">GET</SelectItem>
                         <SelectItem value="POST">POST</SelectItem>
                         <SelectItem value="PUT">PUT</SelectItem>
                         <SelectItem value="PATCH">PATCH</SelectItem>
                         <SelectItem value="DELETE">DELETE</SelectItem>
                       </SelectContent>
                     </Select>
                     <Input
                       placeholder="Request URL"
                       value={action.config?.url || ""}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: { ...action.config, url: e.target.value },
                         })
                       }
                     />
                     <Textarea
                       placeholder="Request body (JSON, optional)"
                       value={JSON.stringify(action.config?.body || {}, null, 2)}
                       onChange={(e) => {
                         try {
                           const parsed = JSON.parse(e.target.value);
                           updateAction(action.id, {
                             config: { ...action.config, body: parsed },
                           });
                         } catch (err) {
                           // Invalid JSON, skip
                         }
                       }}
                       rows={3}
                     />
                   </div>
                 )}

                {action.type === "delay" && (
                   <div className="space-y-2">
                     <Input
                       type="number"
                       placeholder="Delay in seconds"
                       value={action.config?.delay_seconds || 60}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: {
                             ...action.config,
                             delay_seconds: parseInt(e.target.value),
                           },
                         })
                       }
                     />
                     <p className="text-xs text-slate-500 dark:text-slate-400">
                       Pause execution for specified duration
                     </p>
                   </div>
                 )}

                {action.type === "conditional" && (
                   <div className="space-y-2">
                     <Input
                       placeholder="Field to evaluate (e.g., priority, status)"
                       value={action.config?.field || ""}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: { ...action.config, field: e.target.value },
                         })
                       }
                     />
                     <Select
                       value={action.config?.operator || "equals"}
                       onValueChange={(value) =>
                         updateAction(action.id, {
                           config: { ...action.config, operator: value },
                         })
                       }
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {CONDITION_OPERATORS.map((op) => (
                           <SelectItem key={op.value} value={op.value}>
                             {op.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <Input
                       placeholder="Expected value"
                       value={action.config?.value || ""}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: { ...action.config, value: e.target.value },
                         })
                       }
                     />
                   </div>
                 )}

                {action.type === "update_field" && (
                   <div className="space-y-2">
                     <Input
                       placeholder="Field name"
                       value={action.config?.field || ""}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: { ...action.config, field: e.target.value },
                         })
                       }
                     />
                     <Input
                       placeholder="New value"
                       value={action.config?.value || ""}
                       onChange={(e) =>
                         updateAction(action.id, {
                           config: { ...action.config, value: e.target.value },
                         })
                       }
                     />
                   </div>
                 )}

                {/* Advanced Settings */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Execution Mode
                    </label>
                    <Select
                      value={action.execution_mode || "sequential"}
                      onValueChange={(value) =>
                        updateAction(action.id, { execution_mode: value })
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential</SelectItem>
                        <SelectItem value="parallel">Parallel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Max Retries
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={action.retry_config?.max_retries || 3}
                      onChange={(e) =>
                        updateAction(action.id, {
                          retry_config: {
                            ...action.retry_config,
                            max_retries: parseInt(e.target.value),
                          },
                        })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Timeout (seconds)
                    </label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      value={action.timeout_seconds || 30}
                      onChange={(e) =>
                        updateAction(action.id, {
                          timeout_seconds: parseInt(e.target.value),
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
                </div>
                ))
                )}
                </CardContent>
                </Card>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {workflow ? "Update Workflow" : "Create Workflow"}
        </Button>
      </div>
    </form>
  );
}