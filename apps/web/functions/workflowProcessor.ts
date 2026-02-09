import { base44 } from "@/api/base44Client";

/**
 * Processes a workflow and executes its actions
 * Called when a workflow is triggered by an event
 */
export async function processWorkflow(workflowId, triggerEventData) {
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

    const actionsResults = [];
    let hasError = false;

    // Execute each action in sequence
    for (const actionId of workflowData.action_order || []) {
      const action = workflowData.actions_json?.find((a) => a.id === actionId);
      if (!action) continue;

      try {
        let result;

        switch (action.type) {
          case "send_email":
            result = await executeEmailAction(action.config, triggerEventData);
            break;
          case "create_task":
            result = await executeCreateTaskAction(
              action.config,
              triggerEventData
            );
            break;
          case "send_notification":
            result = await executeNotificationAction(
              action.config,
              triggerEventData
            );
            break;
          case "update_field":
            result = await executeUpdateFieldAction(
              action.config,
              triggerEventData
            );
            break;
          case "webhook":
            result = await executeWebhookAction(action.config, triggerEventData);
            break;
          case "assign_to_user":
            result = await executeAssignAction(
              action.config,
              triggerEventData
            );
            break;
          default:
            result = { status: "unsupported", error: "Unknown action type" };
        }

        actionsResults.push({
          action_id: action.id,
          status: result.status,
          result: result.data,
          error: result.error,
        });

        if (result.status === "failed") {
          hasError = true;
        }
      } catch (error) {
        actionsResults.push({
          action_id: action.id,
          status: "failed",
          error: error.message,
        });
        hasError = true;
      }
    }

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
    console.error("Workflow processing error:", error);
    throw error;
  }
}

async function executeEmailAction(config, triggerData) {
  try {
    const recipients = config.recipients
      ?.split(",")
      .map((r) => r.trim())
      .filter((r) => r);
    if (!recipients || recipients.length === 0) {
      return { status: "failed", error: "No recipients specified" };
    }

    const subject = interpolateTemplate(config.subject, triggerData);
    const body = interpolateTemplate(config.body, triggerData);

    // Send to each recipient
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

async function executeCreateTaskAction(config, triggerData) {
  try {
    const title = interpolateTemplate(config.title, triggerData);
    const description = interpolateTemplate(config.description, triggerData);

    const task = {
      title,
      description,
      status: "open",
      created_from_workflow: true,
      trigger_entity_id: triggerData.entity_id,
    };

    // Assumes a Task entity exists
    const created = await base44.entities.Task?.create?.(task);

    return {
      status: "success",
      data: { task_id: created?.id },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

async function executeNotificationAction(config, triggerData) {
  try {
    const title = interpolateTemplate(config.title, triggerData);
    const message = interpolateTemplate(config.message, triggerData);

    // This would integrate with your notification system
    // For now, we'll create a record
    const notification = {
      title,
      message,
      type: "workflow_notification",
      trigger_entity_id: triggerData.entity_id,
    };

    const created =
      await base44.entities.Notification?.create?.(notification);

    return {
      status: "success",
      data: { notification_id: created?.id },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

async function executeUpdateFieldAction(config, triggerData) {
  try {
    if (!triggerData.entity_id) {
      return {
        status: "failed",
        error: "Cannot update field without entity ID",
      };
    }

    const entityType = triggerData.event_type.split("_")[0]; // e.g., "feedback"
    const entity = base44.entities[entityType?.charAt(0).toUpperCase() + entityType?.slice(1)];

    if (!entity) {
      return {
        status: "failed",
        error: `Unknown entity type: ${entityType}`,
      };
    }

    const value = interpolateTemplate(config.value, triggerData);
    const updateData = { [config.field]: value };

    await entity.update(triggerData.entity_id, updateData);

    return {
      status: "success",
      data: { field: config.field, value },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

async function executeWebhookAction(config, triggerData) {
  try {
    if (!config.url) {
      return { status: "failed", error: "No webhook URL specified" };
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(triggerData),
    });

    return {
      status: response.ok ? "success" : "failed",
      data: { status: response.status },
    };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

async function executeAssignAction(config, triggerData) {
  try {
    if (!config.user_email || !triggerData.entity_id) {
      return {
        status: "failed",
        error: "Missing user email or entity ID",
      };
    }

    const entityType = triggerData.event_type.split("_")[0];
    const entity = base44.entities[entityType?.charAt(0).toUpperCase() + entityType?.slice(1)];

    if (!entity) {
      return {
        status: "failed",
        error: `Unknown entity type: ${entityType}`,
      };
    }

    await entity.update(triggerData.entity_id, {
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

// Template interpolation for dynamic values
function interpolateTemplate(template, data) {
  if (!template) return "";

  let result = template;
  Object.keys(data).forEach((key) => {
    result = result.replace(`{{${key}}}`, data[key]);
  });

  return result;
}