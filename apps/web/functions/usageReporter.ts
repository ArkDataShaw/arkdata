import { base44 } from "@/api/base44Client";

/**
 * Report usage to Stripe (called by scheduled job)
 * Runs hourly/daily to sync billing_usage_units to Stripe metered pricing
 */
export async function reportUsageToStripe() {
  try {
    // Get all active subscriptions
    const activeBillings = await base44.entities.TenantBilling.filter({
      status: "active",
    });

    for (const billing of activeBillings || []) {
      await reportTenantUsage(billing.tenant_id);
    }

    return { status: "success", processed: activeBillings?.length || 0 };
  } catch (error) {
    console.error("Usage reporting error:", error);
    throw error;
  }
}

async function reportTenantUsage(tenantId) {
  try {
    const billing = await base44.entities.TenantBilling.filter({
      tenant_id: tenantId,
    });

    if (!billing || billing.length === 0) {
      return;
    }

    const billingData = billing[0];

    if (!billingData.stripe_subscription_item_id) {
      console.warn(
        "No subscription item ID for tenant:",
        tenantId
      );
      return;
    }

    // Get current billing period
    const periodStart = new Date(billingData.current_period_start);
    const periodEnd = new Date(billingData.current_period_end);

    // Get unreported usage for this period
    const unreportedUsage = await base44.entities.BillingUsageUnit.filter({
      tenant_id: tenantId,
      period_start: periodStart,
      reported_to_stripe_at: null,
    });

    if (!unreportedUsage || unreportedUsage.length === 0) {
      return;
    }

    // Group by unit type
    const personUnits = unreportedUsage.filter((u) => u.unit_type === "person");
    const visitorUnits = unreportedUsage.filter(
      (u) => u.unit_type === "visitor_cookie"
    );

    // Report quantity to Stripe
    // In production, call Stripe API: stripe.subscriptionItems.createUsageRecord()
    const totalQuantity = personUnits.length || visitorUnits.length;

    console.log(
      `Reporting ${totalQuantity} usage units for tenant:`,
      tenantId
    );

    // Mock Stripe API call
    const stripeRecordId = `usage_record_${Date.now()}`;

    // Mark as reported
    for (const unit of unreportedUsage) {
      await base44.entities.BillingUsageUnit.update(unit.id, {
        reported_to_stripe_at: new Date(),
        stripe_usage_record_id: stripeRecordId,
      });
    }

    // Log event
    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "usage_reported",
      payload_json: {
        quantity: totalQuantity,
        period_start: periodStart,
        period_end: periodEnd,
        stripe_usage_record_id: stripeRecordId,
      },
    });

    return { status: "reported", quantity: totalQuantity };
  } catch (error) {
    console.error("Tenant usage reporting error:", error);
    throw error;
  }
}

/**
 * Record enhanced lead event and create/update billing usage unit
 */
export async function recordEnhancedLead(leadData) {
  try {
    const { tenant_id, person_id, visitor_cookie_id, company_id, source, confidence_score } = leadData;

    // Create enhanced lead event
    await base44.entities.EnhancedLeadEvent.create({
      tenant_id,
      person_id,
      visitor_id: visitor_cookie_id,
      source,
      confidence_score: confidence_score || 0,
      metadata_json: leadData.metadata || {},
    });

    // Determine current billing period
    const tenant = await base44.entities.Tenant.filter({ id: tenant_id });
    if (!tenant || tenant.length === 0) return;

    const billing = await base44.entities.TenantBilling.filter({
      tenant_id,
    });

    let periodStart = new Date();
    let periodEnd = new Date();

    if (billing && billing.length > 0) {
      periodStart = new Date(billing[0].current_period_start);
      periodEnd = new Date(billing[0].current_period_end);
    } else {
      // Fallback to calendar month
      periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
    }

    // Prefer person_id for billing unit key
    const unitType = person_id ? "person" : "visitor_cookie";
    const unitKey = person_id || visitor_cookie_id;

    if (!unitKey) {
      console.warn("No unit key for enhanced lead");
      return;
    }

    // Check if this unit already exists for this period
    const existingUnit = await base44.entities.BillingUsageUnit.filter({
      tenant_id,
      period_start: periodStart,
      unit_type: unitType,
      unit_key: unitKey,
    });

    const now = new Date();

    if (existingUnit && existingUnit.length > 0) {
      // Update existing
      await base44.entities.BillingUsageUnit.update(existingUnit[0].id, {
        last_seen_at: now,
      });
    } else {
      // Create new billing usage unit
      await base44.entities.BillingUsageUnit.create({
        tenant_id,
        period_start: periodStart,
        period_end: periodEnd,
        unit_type: unitType,
        unit_key: unitKey,
        first_seen_at: now,
        last_seen_at: now,
        counted_quantity: 1,
      });
    }

    return { status: "recorded" };
  } catch (error) {
    console.error("Enhanced lead recording error:", error);
    throw error;
  }
}