import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, HelpCircle, CheckCircle2, Clock } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useBranding } from "@/lib/BrandingContext";

export default function OnboardingWizard({ open, onOpenChange, flowId, tenantId }) {
  const branding = useBranding();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [localTaskStatuses, setLocalTaskStatuses] = useState({});
  const [taskStartTimes, setTaskStartTimes] = useState({});
  const queryClient = useQueryClient();

  const { data: flow } = useQuery({
    queryKey: ["onboarding-flow", flowId],
    queryFn: () => base44.entities.OnboardingFlow.filter({ id: flowId }),
    enabled: !!flowId,
  });

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["onboarding-task-statuses", flowId, tenantId],
    queryFn: () =>
      base44.entities.OnboardingTaskStatus.filter({
        flow_id: flowId,
        tenant_id: tenantId,
      }),
    enabled: !!flowId && !!tenantId,
  });

  const { data: userState } = useQuery({
    queryKey: ["onboarding-user-state", flowId, tenantId],
    queryFn: () =>
      base44.entities.OnboardingUserState.filter({
        flow_id: flowId,
        tenant_id: tenantId,
      }),
    enabled: !!flowId && !!tenantId,
  });

  const startTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.OnboardingTaskStatus.create({
        flow_id: flowId,
        task_id: taskId,
        tenant_id: tenantId,
        scope: getCurrentTask()?.scope || "workspace",
        status: "in_progress",
      });
      await base44.entities.OnboardingEvent.create({
        event_type: "task_started",
        task_id: taskId,
        tenant_id: tenantId,
        payload_json: {
          time_spent_seconds: taskStartTimes[taskId] ? Date.now() - taskStartTimes[taskId] : 0,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["onboarding-task-statuses"],
      });
    },
  });

  const skipWizardMutation = useMutation({
    mutationFn: async () => {
      if (userState?.length > 0) {
        await base44.entities.OnboardingUserState.update(userState[0].id, {
          dismissed_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.OnboardingUserState.create({
          flow_id: flowId,
          tenant_id: tenantId,
          user_id: (await base44.auth.me()).email,
          started_at: new Date().toISOString(),
          dismissed_at: new Date().toISOString(),
        });
      }
      const currentUser = await base44.auth.me();
      await base44.entities.OnboardingEvent.create({
        event_type: "wizard_skipped",
        tenant_id: tenantId,
        user_id: currentUser?.email,
        payload_json: {
          completed_tasks: completedCount,
          total_tasks: allTasks.length,
        },
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["onboarding-user-state"] });
    },
  });

  const flowConfig = flow?.[0]?.config_json;
  const allTasks = flowConfig?.categories
    .flatMap((cat) => cat.tasks)
    .sort((a, b) => a.order - b.order) || [];

  const getCurrentTask = () => allTasks[currentTaskIndex];
  const currentTask = getCurrentTask();

  const getTaskStatus = (taskId) => {
    const status = taskStatuses?.find((s) => s.task_id === taskId);
    return status?.status || "not_started";
  };

  const completedCount = allTasks.filter(
    (t) => getTaskStatus(t.id) === "complete"
  ).length;
  const progressPercent = Math.round(
    ((completedCount || 0) / (allTasks.length || 1)) * 100
  );

  const handleCtaClick = () => {
    if (!currentTask) return;

    if (currentTask.ctaType === "navigate_to_route") {
      // Close modal and navigate
      onOpenChange(false);
      window.location.href = createPageUrl(currentTask.ctaTarget.replace(/\//g, '').replace(/\?.*/, '') + 
        (currentTask.ctaTarget.includes('?') ? '?' + currentTask.ctaTarget.split('?')[1] : ''));
    } else if (currentTask.ctaType === "trigger_action") {
      if (currentTask.ctaAction === "start_tour") {
        // Emit event to start tour
        window.dispatchEvent(
          new CustomEvent("onboarding:start-tour", {
            detail: { tourKey: "quick_tour" },
          })
        );
      }
    }

    if (currentTask.completionType === "manual") {
      startTaskMutation.mutate(currentTask.id);
    }
  };

  const handleNext = () => {
    // Record time on current task
    if (currentTask && !taskStartTimes[currentTask.id]) {
      setTaskStartTimes((prev) => ({
        ...prev,
        [currentTask.id]: Date.now(),
      }));
    }
    if (currentTaskIndex < allTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  // Track when wizard opens
  useEffect(() => {
    if (open && !taskStartTimes[currentTask?.id]) {
      setTaskStartTimes((prev) => ({
        ...prev,
        [currentTask?.id]: Date.now(),
      }));
      if (currentTask) {
        base44.entities.OnboardingEvent.create({
          event_type: "task_viewed",
          task_id: currentTask.id,
          tenant_id: tenantId,
        });
      }
    }
  }, [open, currentTask?.id]);

  if (!flow || !flowConfig) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Welcome to {branding.app_name || "Ark Data"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Let's get you set up in {completedCount}/{allTasks.length} steps
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{progressPercent}%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Complete</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentTask && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={currentTask.required ? "default" : "secondary"}
                  >
                    {currentTask.category}
                  </Badge>
                  {getTaskStatus(currentTask.id) === "complete" && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {currentTask.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {currentTask.description}
                </p>
              </div>

              <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Estimated time: {currentTask.estimatedTime}
                    </p>
                    {currentTask.helpSlug && (
                      <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs mt-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Need help?
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              {currentTask.dependencies && currentTask.dependencies.length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-medium mb-1">Unlock after completing:</p>
                  <div className="flex flex-wrap gap-1">
                    {currentTask.dependencies.map((depId) => {
                      const depTask = allTasks.find((t) => t.id === depId);
                      return (
                        <Badge key={depId} variant="outline" className="text-xs">
                          {depTask?.title}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentTaskIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => skipWizardMutation.mutate()}
            className="flex-1"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleCtaClick}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {currentTask?.ctaLabel || "Next"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentTaskIndex === allTasks.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}