import { base44 } from "@/api/base44Client";

/**
 * Initialize trial on first login
 * Call this after successful authentication in your login flow
 */
export async function initializeTrialOnFirstLogin(userId, tenantId) {
  try {
    // Get tenant
    const tenant = await base44.entities.Tenant.filter({ id: tenantId });
    if (!tenant || tenant.length === 0) {
      console.warn("Tenant not found:", tenantId);
      return;
    }

    const tenantData = tenant[0];

    // Check if trial already started
    if (tenantData.trial_started_at) {
      console.log("Trial already started for tenant:", tenantId);
      return;
    }

    // Start trial
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial

    await base44.entities.Tenant.update(tenantId, {
      trial_started_at: trialStartDate,
      trial_ends_at: trialEndDate,
      billing_status: "trialing",
      trial_start_source: "first_login",
      first_login_at: trialStartDate,
    });

    // Create billing event
    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      user_id: userId,
      event_type: "trial_started",
      payload_json: {
        trial_started_at: trialStartDate,
        trial_ends_at: trialEndDate,
      },
    });

    console.log("Trial initialized for tenant:", tenantId);
    return {
      trial_started_at: trialStartDate,
      trial_ends_at: trialEndDate,
    };
  } catch (error) {
    console.error("Trial initialization error:", error);
    throw error;
  }
}

/**
 * Check if trial has expired and payment is required
 */
export async function checkTrialExpiration(tenantId) {
  try {
    const tenant = await base44.entities.Tenant.filter({ id: tenantId });
    if (!tenant || tenant.length === 0) return null;

    const tenantData = tenant[0];

    if (!tenantData.trial_ends_at) {
      return { expired: false, reason: "no_trial" };
    }

    const now = new Date();
    const trialEnd = new Date(tenantData.trial_ends_at);
    const hasActiveSubscription = tenantData.billing_status === "active";

    if (now > trialEnd && !hasActiveSubscription) {
      return {
        expired: true,
        reason: "trial_expired_no_subscription",
        trial_ended_at: trialEnd,
      };
    }

    return {
      expired: false,
      daysRemaining: Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)),
    };
  } catch (error) {
    console.error("Trial expiration check error:", error);
    throw error;
  }
}