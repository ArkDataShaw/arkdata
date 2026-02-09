import { base44 } from "@/api/base44Client";

/**
 * CORE BACKEND - Production-grade Ark Data backend functions
 * Handles trial initialization, tenant setup, analytics pipelines
 */

// ==================== TRIAL & BILLING ====================

export async function initializeTrialOnFirstLogin({ userId, tenantId }) {
  try {
    if (!tenantId || !userId) {
      throw new Error("Missing required parameters: userId, tenantId");
    }

    // Get current tenant
    const tenants = await base44.entities.Tenant.list("created_date", 1);
    const tenant = tenants?.find(t => t.id === tenantId);
    
    if (!tenant) {
      console.log("Creating new tenant for first login");
      // Create tenant if doesn't exist
      const newTenant = await base44.entities.Tenant.create({
        name: `Workspace - ${userId.split("@")[0]}`,
        status: "active",
        plan: "starter",
        billing_status: "trialing",
      });
      tenantId = newTenant.id;
    } else if (tenant.trial_started_at) {
      console.log("Trial already started for tenant");
      return {
        status: "success",
        trial_started_at: tenant.trial_started_at,
        trial_ends_at: tenant.trial_ends_at,
      };
    }

    // Initialize trial (30 days)
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    await base44.entities.Tenant.update(tenantId, {
      trial_started_at: trialStartDate.toISOString(),
      trial_ends_at: trialEndDate.toISOString(),
      billing_status: "trialing",
      trial_start_source: "first_login",
      first_login_at: trialStartDate.toISOString(),
    });

    // Create billing event
    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      user_id: userId,
      event_type: "trial_started",
      payload_json: {
        trial_started_at: trialStartDate.toISOString(),
        trial_ends_at: trialEndDate.toISOString(),
        trial_days: 30,
      },
    });

    console.log("Trial initialized:", tenantId);
    return {
      status: "success",
      trial_started_at: trialStartDate.toISOString(),
      trial_ends_at: trialEndDate.toISOString(),
    };
  } catch (error) {
    console.error("Trial initialization error:", error.message);
    return {
      status: "error",
      message: error.message,
    };
  }
}

export async function checkTrialExpiration(tenantId) {
  try {
    const tenants = await base44.entities.Tenant.list("created_date", 1);
    const tenant = tenants?.find(t => t.id === tenantId);

    if (!tenant) return { expired: false, reason: "tenant_not_found" };
    if (!tenant.trial_ends_at) return { expired: false, reason: "no_trial" };

    const now = new Date();
    const trialEnd = new Date(tenant.trial_ends_at);
    const hasSubscription = tenant.billing_status === "active";

    if (now > trialEnd && !hasSubscription) {
      return {
        expired: true,
        reason: "trial_expired_no_subscription",
        trial_ended_at: tenant.trial_ends_at,
      };
    }

    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return {
      expired: false,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndsAt: tenant.trial_ends_at,
    };
  } catch (error) {
    console.error("Trial check error:", error.message);
    return { status: "error", message: error.message };
  }
}

// ==================== ONBOARDING ====================

export async function getOnboardingState({ tenantId, userId, flowId }) {
  try {
    if (!tenantId || !userId) {
      throw new Error("Missing tenant_id or user_id");
    }

    // Get user state
    const states = await base44.entities.OnboardingUserState.filter({
      tenant_id: tenantId,
      user_id: userId,
      flow_id: flowId,
    });

    const userState = states?.[0];

    // Get task statuses
    const taskStatuses = await base44.entities.OnboardingTaskStatus.filter({
      tenant_id: tenantId,
      flow_id: flowId,
    });

    return {
      status: "success",
      userState: userState || null,
      taskStatuses: taskStatuses || [],
      completionPercentage: calculateOnboardingProgress(taskStatuses),
    };
  } catch (error) {
    console.error("Onboarding state error:", error.message);
    return { status: "error", message: error.message };
  }
}

function calculateOnboardingProgress(taskStatuses) {
  if (!taskStatuses || taskStatuses.length === 0) return 0;
  const completed = taskStatuses.filter(
    (t) => t.status === "complete" || t.status === "skipped"
  ).length;
  return Math.round((completed / taskStatuses.length) * 100);
}

export async function markTaskComplete({ tenantId, flowId, taskId, userId, scope = "user" }) {
  try {
    // Find or create task status
    const existing = await base44.entities.OnboardingTaskStatus.filter({
      tenant_id: tenantId,
      flow_id: flowId,
      task_id: taskId,
    });

    const taskStatus = existing?.[0];

    if (taskStatus) {
      await base44.entities.OnboardingTaskStatus.update(taskStatus.id, {
        status: "complete",
        completed_at: new Date().toISOString(),
        completion_source: "auto",
      });
    } else {
      await base44.entities.OnboardingTaskStatus.create({
        tenant_id: tenantId,
        flow_id: flowId,
        task_id: taskId,
        scope,
        user_id: userId,
        status: "complete",
        completed_at: new Date().toISOString(),
        completion_source: "auto",
      });
    }

    // Log event
    await base44.entities.OnboardingEvent.create({
      tenant_id: tenantId,
      user_id: userId,
      event_type: "task_completed",
      task_id: taskId,
      payload_json: { flow_id: flowId, scope },
    });

    return { status: "success", taskId };
  } catch (error) {
    console.error("Task completion error:", error.message);
    return { status: "error", message: error.message };
  }
}

// ==================== ANALYTICS CORE ====================

export async function createOrUpdateSession({
  tenantId,
  visitorId,
  sessionData,
}) {
  try {
    const existing = await base44.entities.Session.filter({
      tenant_id: tenantId,
      visitor_id: visitorId,
      session_id: sessionData.session_id,
    });

    if (existing?.[0]) {
      await base44.entities.Session.update(existing[0].id, {
        ...sessionData,
        updated_at: new Date().toISOString(),
      });
      return { status: "success", action: "updated", id: existing[0].id };
    } else {
      const session = await base44.entities.Session.create({
        tenant_id: tenantId,
        visitor_id: visitorId,
        ...sessionData,
        created_at: new Date().toISOString(),
      });
      return { status: "success", action: "created", id: session.id };
    }
  } catch (error) {
    console.error("Session error:", error.message);
    return { status: "error", message: error.message };
  }
}

export async function recordRawEvent({ tenantId, pixelId, eventData }) {
  try {
    const event = await base44.entities.RawEvent.create({
      tenant_id: tenantId,
      pixel_id: pixelId,
      event_type: eventData.type || "pageview",
      url: eventData.url,
      timestamp: eventData.timestamp || new Date().toISOString(),
      metadata_json: eventData.metadata || {},
    });

    return { status: "success", eventId: event.id };
  } catch (error) {
    console.error("Raw event error:", error.message);
    return { status: "error", message: error.message };
  }
}

// ==================== UTILITY ====================

export async function tenantHealthCheck(tenantId) {
  try {
    const tenant = await base44.entities.Tenant.filter({ id: tenantId });
    
    if (!tenant?.[0]) {
      return { status: "error", message: "Tenant not found" };
    }

    const domains = await base44.entities.Domain.filter({ tenant_id: tenantId });
    const visitors = await base44.entities.Visitor.filter({ tenant_id: tenantId });
    const sessions = await base44.entities.Session.filter({ tenant_id: tenantId });

    return {
      status: "healthy",
      tenant: {
        id: tenant[0].id,
        name: tenant[0].name,
        billing_status: tenant[0].billing_status,
      },
      metrics: {
        domains: domains?.length || 0,
        visitors: visitors?.length || 0,
        sessions: sessions?.length || 0,
      },
    };
  } catch (error) {
    console.error("Health check error:", error.message);
    return { status: "error", message: error.message };
  }
}