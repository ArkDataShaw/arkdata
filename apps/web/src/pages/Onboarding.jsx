import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function OnboardingPage() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [tenantId, setTenantId] = useState(null);

  // Get current user to determine tenant
  React.useEffect(() => {
    const getCurrentUserTenant = async () => {
      const user = await base44.auth.me();
      // Assuming tenant_id is stored somewhere; adjust as needed
      setTenantId(user.tenant_id || "default");
    };
    getCurrentUserTenant();
  }, []);

  const { data: flows } = useQuery({
    queryKey: ["onboarding-flows", tenantId],
    queryFn: async () => {
      // Get tenant override or global default
      const tenantFlows = await base44.entities.OnboardingFlow.filter({
        tenant_id: tenantId,
        scope: "tenant",
        status: "published",
      });

      if (tenantFlows.length > 0) {
        return tenantFlows;
      }

      return await base44.entities.OnboardingFlow.filter({
        scope: "global",
        status: "published",
      });
    },
    enabled: !!tenantId,
  });

  const flow = flows?.[0];

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["onboarding-task-statuses", flow?.id],
    queryFn: () =>
      base44.entities.OnboardingTaskStatus.filter({
        flow_id: flow.id,
        tenant_id: tenantId,
      }),
    enabled: !!flow,
  });

  if (!flow) {
    return (
      <div className="p-6">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  const flowConfig = flow.config_json;
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
  const progressPercent = Math.round(
    ((completedCount || 0) / (allTasks.length || 1)) * 100
  );

  const visibleTasks = showCompleted
    ? allTasks
    : allTasks.filter((t) => getTaskStatus(t.id) !== "complete");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Onboarding Checklist
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Complete these steps to unlock the full power of Ark Data
        </p>
      </div>

      {/* Progress bar */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Your Progress
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {completedCount} of {allTasks.length} tasks complete
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">{progressPercent}%</div>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Show completed toggle */}
      <div className="flex items-center gap-3 mb-6">
        <Checkbox
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={setShowCompleted}
        />
        <label
          htmlFor="show-completed"
          className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          Show completed tasks
        </label>
      </div>

      {/* Tasks by category */}
      <div className="space-y-8">
        {flowConfig.categories.map((category) => {
          const categoryTasks = category.tasks
            .sort((a, b) => a.order - b.order)
            .filter((t) => visibleTasks.find((vt) => vt.id === t.id));

          if (categoryTasks.length === 0) return null;

          return (
            <div key={category.id}>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {category.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {category.description}
                </p>
              </div>

              <div className="space-y-3">
                {categoryTasks.map((task) => {
                  const status = getTaskStatus(task.id);
                  const isComplete = status === "complete";

                  return (
                    <Card
                      key={task.id}
                      className={`p-4 transition ${
                        isComplete
                          ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {isComplete ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <div>
                              <h3
                                className={`font-semibold ${
                                  isComplete
                                    ? "text-slate-500 dark:text-slate-400 line-through"
                                    : "text-slate-900 dark:text-slate-100"
                                }`}
                              >
                                {task.title}
                              </h3>
                              <p
                                className={`text-sm mt-1 ${
                                  isComplete
                                    ? "text-slate-500 dark:text-slate-400"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {task.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {task.required && (
                              <Badge variant="default">Required</Badge>
                            )}
                            {!task.required && (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                            {task.completionType === "auto" && (
                              <Badge variant="outline" className="text-xs">
                                Auto-completes
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              {task.estimatedTime}
                            </div>
                          </div>

                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/10 rounded text-xs text-amber-700 dark:text-amber-200">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span>
                                  Complete{" "}
                                  {task.dependencies
                                    .map((id) =>
                                      allTasks.find((t) => t.id === id)?.title
                                    )
                                    .join(" and ")}{" "}
                                  first
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isComplete && (
                          <a
                            href={createPageUrl(
                              task.ctaTarget.replace(/\//g, "").replace(/\?.*/, "") +
                                (task.ctaTarget.includes("?")
                                  ? "?" + task.ctaTarget.split("?")[1]
                                  : "")
                            )}
                            className="flex-shrink-0"
                          >
                            <Button
                              variant="default"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {task.ctaLabel}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}