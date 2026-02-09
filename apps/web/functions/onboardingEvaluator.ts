import { base44 } from "@/api/base44Client";

/**
 * Core evaluator that auto-completes onboarding tasks based on backend state
 */

export async function evaluateTask(task, tenantId, userId, flowId) {
  if (task.completionType !== "auto") {
    return false;
  }

  try {
    const rule = task.completionRule;
    if (!rule) return false;

    switch (rule.ruleType) {
      case "db_count":
        return await checkDbCount(rule, tenantId);
      case "db_exists":
        return await checkDbExists(rule, tenantId);
      case "db_field":
        return await checkDbField(rule, tenantId);
      case "sync_success":
        return await checkSyncSuccess(rule, tenantId);
      case "page_visited":
        return await checkPageVisited(rule, userId, tenantId);
      default:
        return false;
    }
  } catch (error) {
    console.error("Error evaluating task:", error);
    return false;
  }
}

async function checkDbCount(rule, tenantId) {
  const { table, filter = {}, minCount } = rule;
  if (!table || minCount === undefined) return false;

  // Resolve $tenant_id in filter
  const resolvedFilter = JSON.parse(
    JSON.stringify(filter).replace(/\$tenant_id/g, tenantId)
  );

  const entities = await base44.entities[table].filter(
    resolvedFilter
  );
  return entities.length >= minCount;
}

async function checkDbExists(rule, tenantId) {
  const { table, filter = {} } = rule;
  if (!table) return false;

  const resolvedFilter = JSON.parse(
    JSON.stringify(filter).replace(/\$tenant_id/g, tenantId)
  );

  const entities = await base44.entities[table].filter(
    resolvedFilter
  );
  return entities.length > 0;
}

async function checkDbField(rule, tenantId) {
  const { table, conditions = [] } = rule;
  if (!table || conditions.length === 0) return false;

  // For simplicity, check first condition
  const condition = conditions[0];
  const { field, operator, value } = condition;

  // Get sample record
  const entities = await base44.entities[table].filter({
    tenant_id: tenantId,
  });

  if (entities.length === 0) return false;

  const record = entities[0];
  const fieldValue = getNestedField(record, field);

  switch (operator) {
    case "not_null":
      return fieldValue != null;
    case "equals":
      return fieldValue === value;
    case "within_minutes":
      if (!fieldValue) return false;
      const lastEventTime = new Date(fieldValue);
      const now = new Date();
      const diffMinutes = (now - lastEventTime) / (1000 * 60);
      return diffMinutes <= value;
    default:
      return false;
  }
}

async function checkSyncSuccess(rule, tenantId) {
  const { entityType, providers = [] } = rule;
  if (!entityType) return false;

  // Check if any sync job succeeded recently
  const syncLogs = await base44.entities.SyncLog.filter({
    tenant_id: tenantId,
    entity_type: entityType,
    status: "success",
  });

  if (syncLogs.length === 0) return false;

  // If providers specified, check if any of them succeeded
  if (providers.length > 0) {
    return syncLogs.some((log) =>
      providers.some((p) => log.provider_key?.includes(p) || log.metadata_json?.provider?.includes(p))
    );
  }

  return true;
}

async function checkPageVisited(rule, userId, tenantId) {
  const { route } = rule;
  if (!route) return false;

  // Check if user visited the page
  const events = await base44.entities.OnboardingEvent.filter({
    tenant_id: tenantId,
    user_id: userId,
    event_type: "page_visited",
    payload_json: { route },
  });

  return events.length > 0;
}

function getNestedField(obj, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

/**
 * Main evaluation loop: runs when tasks need to be auto-completed
 */
export async function evaluateAllTasks(tenantId, userId, flowId) {
  try {
    const flow = await base44.entities.OnboardingFlow.filter({ id: flowId });
    if (!flow || flow.length === 0) return;

    const flowConfig = flow[0].config_json;
    const allTasks = flowConfig.categories.flatMap((cat) => cat.tasks);

    for (const task of allTasks) {
      if (task.completionType !== "auto") continue;

      // Check if already completed
      const existingStatus = await base44.entities.OnboardingTaskStatus.filter({
        flow_id: flowId,
        task_id: task.id,
        tenant_id: tenantId,
        user_id: userId,
      });

      if (existingStatus.length > 0 && existingStatus[0].status === "complete") {
        continue; // Already complete
      }

      // Evaluate the task
      const isComplete = await evaluateTask(task, tenantId, userId, flowId);

      if (isComplete) {
        // Check dependencies
        const canComplete = await checkDependencies(
          task,
          tenantId,
          userId,
          flowId,
          allTasks
        );

        if (canComplete) {
          // Mark as complete
          if (existingStatus.length > 0) {
            await base44.entities.OnboardingTaskStatus.update(
              existingStatus[0].id,
              {
                status: "complete",
                completed_at: new Date().toISOString(),
                completion_source: "auto",
              }
            );
          } else {
            await base44.entities.OnboardingTaskStatus.create({
              flow_id: flowId,
              task_id: task.id,
              tenant_id: tenantId,
              user_id: task.scope === "user" ? userId : null,
              scope: task.scope,
              status: "complete",
              completed_at: new Date().toISOString(),
              completion_source: "auto",
            });
          }

          // Log event
          await base44.entities.OnboardingEvent.create({
            event_type: "task_completed",
            task_id: task.id,
            tenant_id: tenantId,
            user_id: userId,
            payload_json: { source: "auto" },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in evaluateAllTasks:", error);
  }
}

async function checkDependencies(task, tenantId, userId, flowId, allTasks) {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }

  for (const depId of task.dependencies) {
    const depTask = allTasks.find((t) => t.id === depId);
    if (!depTask) continue;

    const depStatus = await base44.entities.OnboardingTaskStatus.filter({
      flow_id: flowId,
      task_id: depId,
      tenant_id: tenantId,
      user_id: depTask.scope === "user" ? userId : null,
    });

    if (depStatus.length === 0 || depStatus[0].status !== "complete") {
      return false;
    }
  }

  return true;
}