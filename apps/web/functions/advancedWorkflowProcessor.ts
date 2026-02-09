import { base44 } from "@/api/base44Client";

/**
 * Advanced workflow processor supporting:
 * - Conditional branching (if/else)
 * - Parallel action execution
 * - Delays and retries
 * - Custom event triggers
 * - External webhook integrations
 */
export async function processAdvancedWorkflow(workflowId, triggerEventData) {
  try {
    const workflow = await base44.entities.Workflow.filter({ id: workflowId });
    if (!workflow || workflow.length === 0 || !workflow[0].enabled) {
      return { status: "skipped", reason: "Workflow not found or disabled" };
    }

    const workflowData = workflow[0];

    // Create execution record
    const execution = await base44.entities.WorkflowExecution.create({
      workflow_id: workflowId,
      trigger_event_type: triggerEventData.event_type,
      trigger_event_id: triggerEventData.entity_id,
      status: "running",
      started_at: new Date().toISOString(),
    });

    // Execute workflow with context
    const context = {
      triggerData: triggerEventData,
      executionId: execution.id,
      variables: {},
    };

    const actionsResults = await executeActionSequence(
      workflowData.actions_json || [],
      workflowData.action_order || [],
      context
    );

    const hasError = actionsResults.some((r) => r.status === "failed");

    // Update execution record
    const finalStatus = hasError ? "failed" : "completed";
    await base44.entities.WorkflowExecution.update(execution.id, {
      status: finalStatus,
      completed_at: new Date().toISOString(),
      actions_results_json: actionsResults,
    });

    // Update workflow stats
    await base44.entities.Workflow.update(workflowId, {
      execution_count: (workflowData.execution_count || 0) + 1,
      last_executed_at: new Date().toISOString(),
      error_count: hasError
        ? (workflowData.error_count || 0) + 1
        : workflowData.error_count || 0,
    });

    return {
      status: finalStatus,
      executionId: execution.id,
      actionsResults,
    };
  } catch (error) {
    console.error("Advanced workflow processing error:", error);
    throw error;
  }
}

/**
 * Execute a sequence of actions, handling conditionals and parallel execution
 */
async function executeActionSequence(actions, actionOrder, context) {
  const results = [];

  for (const actionId of actionOrder) {
    const action = actions.find((a) => a.id === actionId || a.action_id === actionId);
    if (!action) continue;

    // Evaluate conditionals
    if (action.type === "conditional") {
      const branchResult = await evaluateConditional(action, context);
      results.push(branchResult);

      // Execute branch actions
      const branchActions = branchResult.branch === "then"
        ? action.then_action_ids || []
        : action.else_action_ids || [];

      for (const branchActionId of branchActions) {
        const branchAction = actions.find(
          (a) => a.id === branchActionId || a.action_id === branchActionId
        );
        if (branchAction) {
          const result = await executeAction(branchAction, context);
          results.push(result);
        }
      }
      continue;
    }

    // Handle delays
    if (action.type === "delay") {
      const delayResult = await executeDelay(action, context);
      results.push(delayResult);
      continue;
    }

    // Handle parallel actions
    if (action.execution_mode === "parallel") {
      const parallelResult = await executeParallelActions(
        [action],
        context
      );
      results.push(...parallelResult);
    } else {
      const result = await executeAction(action, context);
      results.push(result);
    }
  }

  return results;
}

/**
 * Execute a single action with retry logic
 */
async function executeAction(action, context) {
  const retryConfig = action.retry_config || { max_retries: 3, backoff_seconds: 5 };
  let lastError;

  for (let attempt = 0; attempt <= retryConfig.max_retries; attempt++) {
    try {
      let result;

      switch (action.type) {
        case "send_email":
          result = await executeEmailAction(action.config, context);
          break;
        case "create_task":
          result = await executeCreateTaskAction(action.config, context);
          break;
        case "send_notification":
          result = await executeNotificationAction(action.config, context);
          break;
        case "update_field":
          result = await executeUpdateFieldAction(action.config, context);
          break;
        case "webhook":
          result = await executeWebhookAction(action.config, context);
          break;
        case "http_request":
          result = await executeHttpRequestAction(action.config, context);
          break;
        case "assign_to_user":
          result = await executeAssignAction(action.config, context);
          break;
        default:
          result = { status: "unsupported", error: "Unknown action type" };
      }

      return {
        action_id: action.id || action.action_id,
        status: result.status,
        result: result.data,
        error: result.error,
        attempt: attempt + 1,
      };
    } catch (error) {
      lastError = error;

      if (attempt < retryConfig.max_retries) {
        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, retryConfig.backoff_seconds * 1000)
        );
      }
    }
  }

  return {
    action_id: action.id || action.action_id,
    status: "failed",
    error: lastError?.message || "Max retries exceeded",
    attempt: retryConfig.max_retries + 1,
  };
}

/**
 * Execute multiple actions in parallel
 */
async function executeParallelActions(actions, context) {
  const promises = actions.map((action) => executeAction(action, context));
  return Promise.all(promises);
}

/**
 * Evaluate conditional logic
 */
async function evaluateConditional(action, context) {
  try {
    const config = action.config || {};
    const field = config.field;
    const operator = config.operator;
    const expectedValue = config.value;

    const actualValue = context.triggerData[field];

    const conditionMet = evaluateCondition(
      actualValue,
      operator,
      expectedValue
    );

    return {
      action_id: action.id || action.action_id,
      status: "success",
      branch: conditionMet ? "then" : "else",
      result: {
        condition: `${field} ${operator} ${expectedValue}`,
        actual: actualValue,
        met: conditionMet,
      },
    };
  } catch (error) {
    return {
      action_id: action.id || action.action_id,
      status: "failed",
      error: error.message,
    };
  }
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(actual, operator, expected) {
  switch (operator) {
    case "equals":
      return String(actual) === String(expected);
    case "not_equals":
      return String(actual) !== String(expected);
    case "greater_than":
      return Number(actual) > Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
    case "contains":
      return String(actual).includes(String(expected));
    case "not_contains":
      return !String(actual).includes(String(expected));
    case "in":
      return String(expected)
        .split(",")
        .map((v) => v.trim())
        .includes(String(actual));
    case "not_in":
      return !String(expected)
        .split(",")
        .map((v) => v.trim())
        .includes(String(actual));
    default:
      return false;
  }
}

/**
 * Delay execution for specified seconds
 */
async function executeDelay(action, context) {
  try {
    const delaySeconds = action.config?.delay_seconds || 60;
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));

    return {
      action_id: action.id || action.action_id,
      status: "success",
      result: { delayed_seconds: delaySeconds },
    };
  } catch (error) {
    return {
      action_id: action.id || action.action_id,
      status: "failed",
      error: error.message,
    };
  }
}

/**
 * Execute HTTP request (generic webhook)
 */
async function executeHttpRequestAction(config, context) {
  try {
    if (!config.url) {
      return { status: "failed", error: "No URL specified" };
    }

    const method = config.method || "POST";
    const headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };

    const body = interpolateTemplate(
      JSON.stringify(config.body || context.triggerData),
      context
    );

    const response = await fetch(config.url, {
      method,
      headers,
      body: method !== "GET" ? body : undefined,
      timeout: config.timeout_seconds || 30,
    });

    const responseData = await response.text().catch(() => "");

    return {
      status: response.ok ? "success" : "failed",
      data: {
        status: response.status,
        statusText: response.statusText,
        body: responseData?.substring(0, 500),
      },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Send email with template interpolation
 */
async function executeEmailAction(config, context) {
  try {
    const recipients = config.recipients
      ?.split(",")
      .map((r) => r.trim())
      .filter((r) => r);
    if (!recipients || recipients.length === 0) {
      return { status: "failed", error: "No recipients specified" };
    }

    const subject = interpolateTemplate(config.subject, context);
    const body = interpolateTemplate(config.body, context);

    for (const recipient of recipients) {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject,
        body,
      });
    }

    return {
      status: "success",
      data: { sent_to: recipients.length },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Create task
 */
async function executeCreateTaskAction(config, context) {
  try {
    const title = interpolateTemplate(config.title, context);
    const description = interpolateTemplate(config.description, context);

    const task = {
      title,
      description,
      status: "open",
      created_from_workflow: true,
      trigger_entity_id: context.triggerData.entity_id,
    };

    const created = await base44.entities.Task?.create?.(task);

    return {
      status: "success",
      data: { task_id: created?.id },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Send notification
 */
async function executeNotificationAction(config, context) {
  try {
    const title = interpolateTemplate(config.title, context);
    const message = interpolateTemplate(config.message, context);

    const notification = {
      title,
      message,
      type: "workflow_notification",
      trigger_entity_id: context.triggerData.entity_id,
    };

    const created = await base44.entities.Notification?.create?.(notification);

    return {
      status: "success",
      data: { notification_id: created?.id },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Update field
 */
async function executeUpdateFieldAction(config, context) {
  try {
    if (!context.triggerData.entity_id) {
      return {
        status: "failed",
        error: "Cannot update field without entity ID",
      };
    }

    const entityType = context.triggerData.event_type.split("_")[0];
    const entity = base44.entities[
      entityType?.charAt(0).toUpperCase() + entityType?.slice(1)
    ];

    if (!entity) {
      return {
        status: "failed",
        error: `Unknown entity type: ${entityType}`,
      };
    }

    const value = interpolateTemplate(config.value, context);
    const updateData = { [config.field]: value };

    await entity.update(context.triggerData.entity_id, updateData);

    return {
      status: "success",
      data: { field: config.field, value },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Webhook action
 */
async function executeWebhookAction(config, context) {
  try {
    if (!config.url) {
      return { status: "failed", error: "No webhook URL specified" };
    }

    const body = interpolateTemplate(
      JSON.stringify(context.triggerData),
      context
    );

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
      body,
    });

    return {
      status: response.ok ? "success" : "failed",
      data: { status: response.status },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Assign to user
 */
async function executeAssignAction(config, context) {
  try {
    if (!config.user_email || !context.triggerData.entity_id) {
      return {
        status: "failed",
        error: "Missing user email or entity ID",
      };
    }

    const entityType = context.triggerData.event_type.split("_")[0];
    const entity = base44.entities[
      entityType?.charAt(0).toUpperCase() + entityType?.slice(1)
    ];

    if (!entity) {
      return {
        status: "failed",
        error: `Unknown entity type: ${entityType}`,
      };
    }

    await entity.update(context.triggerData.entity_id, {
      assigned_to: config.user_email,
    });

    return {
      status: "success",
      data: { assigned_to: config.user_email },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

/**
 * Template interpolation supporting nested field access
 */
function interpolateTemplate(template, context) {
  if (!template) return "";

  let result = template;
  const { triggerData, variables } = context;

  // Replace trigger data placeholders
  Object.keys(triggerData || {}).forEach((key) => {
    result = result.replace(new RegExp(`{{triggerData\\.${key}}}`, "g"), triggerData[key]);
    result = result.replace(new RegExp(`{{${key}}}`, "g"), triggerData[key]);
  });

  // Replace variable placeholders
  Object.keys(variables || {}).forEach((key) => {
    result = result.replace(new RegExp(`{{variables\\.${key}}}`, "g"), variables[key]);
  });

  return result;
}

/**
 * Trigger a custom event to start workflows
 */
export async function triggerCustomEvent(eventKey, tenantId, payload) {
  try {
    // Find workflows listening to this event
    const workflows = await base44.entities.Workflow.filter({
      trigger_type: "custom_event",
    });

    const matchingWorkflows = workflows.filter(
      (w) => w.trigger_conditions_json?.event_key === eventKey
    );

    const results = [];
    for (const workflow of matchingWorkflows) {
      const result = await processAdvancedWorkflow(workflow.id, {
        event_type: "custom_event",
        event_key: eventKey,
        entity_id: payload.entity_id,
        ...payload,
      });
      results.push(result);
    }

    return {
      status: "success",
      triggered_workflows: results.length,
      results,
    };
  } catch (error) {
    console.error("Custom event trigger error:", error);
    throw error;
  }
}