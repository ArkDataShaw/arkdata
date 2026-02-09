import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Zap,
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SetupChecklist({ flowId, tenantId }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: flow } = useQuery({
    queryKey: ["onboarding-flow", flowId],
    queryFn: () => base44.entities.OnboardingFlow.filter({ id: flowId }),
  });

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["onboarding-task-statuses", flowId],
    queryFn: () =>
      base44.entities.OnboardingTaskStatus.filter({
        flow_id: flowId,
        tenant_id: tenantId,
      }),
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const userState = await base44.entities.OnboardingUserState.filter({
        flow_id: flowId,
        tenant_id: tenantId,
      });
      if (userState.length > 0) {
        await base44.entities.OnboardingUserState.update(userState[0].id, {
          dismissed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-user-state"] });
    },
  });

  const flowConfig = flow?.[0]?.config_json;
  if (!flowConfig) return null;

  const allTasks = flowConfig.categories
    .flatMap((cat) => cat.tasks)
    .sort((a, b) => a.order - b.order);

  const getTaskStatus = (taskId) => {
    const status = taskStatuses.find((s) => s.task_id === taskId);
    return status?.status || "not_started";
  };

  const completedCount = allTasks.filter(
    (t) => getTaskStatus(t.id) === "complete"
  ).length;

  const nextIncompleteTask = allTasks.find(
    (t) => getTaskStatus(t.id) === "not_started"
  );

  const groupedByCategory = flowConfig.categories.map((cat) => ({
    ...cat,
    tasks: cat.tasks.sort((a, b) => a.order - b.order),
  }));

  if (completedCount === allTasks.length) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-1">
            You're all set!
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            All onboarding tasks completed. Start exploring your data.
          </p>
          <Button
            onClick={() => dismissMutation.mutate()}
            variant="outline"
            className="mt-4"
          >
            Dismiss Checklist
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Setup Checklist
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {completedCount} of {allTasks.length} tasks complete
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Next up section */}
          {nextIncompleteTask && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Next up
              </p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {nextIncompleteTask.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {nextIncompleteTask.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {nextIncompleteTask.ctaType === "trigger_action" ? (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        if (nextIncompleteTask.ctaAction === "start_tour") {
                          window.dispatchEvent(new Event("onboarding:start-tour"));
                        }
                      }}
                    >
                      {nextIncompleteTask.ctaLabel}
                    </Button>
                  ) : nextIncompleteTask.ctaTarget ? (
                    <a
                      href={createPageUrl(
                        nextIncompleteTask.ctaTarget.replace(/\//g, "").replace(/\?.*/, "") +
                          (nextIncompleteTask.ctaTarget.includes("?")
                            ? "?" + nextIncompleteTask.ctaTarget.split("?")[1]
                            : "")
                      )}
                    >
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        {nextIncompleteTask.ctaLabel}
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      {nextIncompleteTask.ctaLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tasks by category */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {groupedByCategory.map((category) => (
              <div key={category.id}>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {category.name}
                  </p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {category.tasks.map((task) => {
                    const status = getTaskStatus(task.id);
                    const isComplete = status === "complete";

                    return (
                      <div
                        key={task.id}
                        className="p-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isComplete
                                ? "text-slate-500 dark:text-slate-400 line-through"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.required && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {task.completionType === "auto" && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Zap className="w-3 h-3" />
                                Auto-completes
                              </div>
                            )}
                          </div>
                        </div>
                        {!isComplete && (
                          <>
                            {task.ctaType === "trigger_action" ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (task.ctaAction === "start_tour") {
                                    window.dispatchEvent(new Event("onboarding:start-tour"));
                                  }
                                }}
                              >
                                {task.ctaLabel}
                              </Button>
                            ) : task.ctaTarget ? (
                              <a
                                href={createPageUrl(
                                  task.ctaTarget.replace(/\//g, "").replace(/\?.*/, "") +
                                    (task.ctaTarget.includes("?")
                                      ? "?" + task.ctaTarget.split("?")[1]
                                      : "")
                                )}
                              >
                                <Button size="sm" variant="outline">
                                  {task.ctaLabel}
                                </Button>
                              </a>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              onClick={() => dismissMutation.mutate()}
            >
              Dismiss for now
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}