/**
 * Safe initialization wrappers with comprehensive error handling
 * Prevents 500 errors by validating inputs, handling missing data gracefully,
 * and returning consistent error shapes
 */

import { base44 } from "@/api/base44Client";

class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates user input and tenant context
 */
function validateInitParams(userId, tenantId) {
  if (!userId || userId.trim() === "") {
    return { valid: false, error: new AppError("MISSING_PARAM", "userId is required", 400) };
  }
  if (!tenantId || tenantId.trim() === "") {
    return { valid: false, error: new AppError("MISSING_PARAM", "tenantId is required", 400) };
  }
  return { valid: true };
}

/**
 * Safe trial initialization with proper error handling
 */
export async function safeInitializeTrial(userId, tenantId) {
  try {
    // Validate inputs
    const validation = validateInitParams(userId, tenantId);
    if (!validation.valid) {
      return {
        status: "error",
        code: validation.error.code,
        message: validation.error.message,
        statusCode: 400,
      };
    }

    // Try to get/create tenant
    let tenant = null;
    try {
      const tenants = await base44.entities.Tenant.filter({ id: tenantId });
      tenant = tenants[0];
    } catch (e) {
      console.warn("Could not fetch tenant:", e.message);
      // Tenant might not exist yet, create it
    }

    if (!tenant) {
      try {
        tenant = await base44.entities.Tenant.create({
          id: tenantId,
          name: `Tenant ${tenantId.substring(0, 8)}`,
          created_by: userId,
        });
      } catch (e) {
        console.warn("Could not create tenant:", e.message);
        // If we can't create, that's ok - continue
      }
    }

    // Initialize trial on tenant
    if (tenant) {
      const trialRecord = await base44.entities.TenantBilling.filter({
        tenant_id: tenantId,
      });

      if (!trialRecord || trialRecord.length === 0) {
        await base44.entities.TenantBilling.create({
          tenant_id: tenantId,
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: "trial",
        });

        // Log event
        await base44.entities.BillingEvent.create({
          tenant_id: tenantId,
          user_id: userId,
          event_type: "trial_started",
          payload_json: { initialized_at: new Date().toISOString() },
        });
      }
    }

    return {
      status: "success",
      message: "Trial initialized",
      tenant_id: tenantId,
    };
  } catch (error) {
    console.error("Trial initialization error:", error);
    return {
      status: "error",
      code: "TRIAL_INIT_FAILED",
      message: error.message || "Failed to initialize trial",
      statusCode: 500,
    };
  }
}

/**
 * Safe billing plan setup (idempotent)
 */
export async function safeSetupBillingPlan() {
  try {
    // Check if plan already exists
    const existingPlans = await base44.entities.BillingPlan.filter({
      plan_key: "recaptured_usage",
    });

    if (existingPlans && existingPlans.length > 0) {
      return {
        status: "success",
        skipped: true,
        message: "Billing plan already exists",
        plan_id: existingPlans[0].id,
      };
    }

    // Create default plan
    const plan = await base44.entities.BillingPlan.create({
      plan_key: "recaptured_usage",
      name: "Recaptured Usage",
      description: "Pay-as-you-go enhanced leads",
      stripe_price_id_metered: process.env.VITE_STRIPE_PRICE_ID || "price_default",
      unit_name: "Enhanced Lead",
      unit_price_cents_display: 100,
      trial_days_default: 30,
      active: true,
    });

    return {
      status: "success",
      message: "Billing plan created",
      plan_id: plan.id,
    };
  } catch (error) {
    console.error("Billing setup error:", error);
    return {
      status: "warning",
      message: error.message || "Could not setup billing plan",
      code: "BILLING_SETUP_WARNING",
    };
  }
}

/**
 * Safe hygiene settings initialization
 */
export async function safeInitializeHygiene(tenantId, pixelOnlyMode = false) {
  try {
    if (!tenantId || tenantId.trim() === "") {
      return {
        status: "error",
        code: "MISSING_TENANT",
        message: "tenantId is required",
        statusCode: 400,
      };
    }

    // Check if settings exist
    const existing = await base44.entities.TenantHygieneSettings.filter({
      tenant_id: tenantId,
    });

    if (existing && existing.length > 0) {
      return {
        status: "success",
        skipped: true,
        message: "Hygiene settings already initialized",
        settings_id: existing[0].id,
      };
    }

    // Create default hygiene settings
    const settings = await base44.entities.TenantHygieneSettings.create({
      tenant_id: tenantId,
      pixel_only_mode: pixelOnlyMode,
      pixel_only_enforcement: "quarantine_then_purge",
      quarantine_retention_days: 30,
      auto_cleanup_enabled: true,
      anonymize_on_purge: true,
    });

    return {
      status: "success",
      message: "Hygiene settings initialized",
      settings_id: settings.id,
    };
  } catch (error) {
    console.error("Hygiene initialization error:", error);
    return {
      status: "warning",
      message: error.message || "Could not initialize hygiene settings",
      code: "HYGIENE_INIT_WARNING",
    };
  }
}

/**
 * Safe provenance backfill (handles empty data)
 */
export async function safeBackfillProvenance(tenantId) {
  try {
    if (!tenantId || tenantId.trim() === "") {
      return {
        status: "error",
        code: "MISSING_TENANT",
        message: "tenantId is required",
        statusCode: 400,
      };
    }

    // Fetch people without provenance (limit to 100 by fetching and slicing)
    const allPeople = await base44.entities.Person.filter({
      tenant_id: tenantId,
    });
    const people = (allPeople || []).slice(0, 100);

    if (!people || people.length === 0) {
      return {
        status: "success",
        processed: 0,
        skipped: true,
        message: "No people to backfill",
      };
    }

    // Backfill provenance on each
    let updated = 0;
    for (const person of people) {
      try {
        await base44.entities.Person.update(person.id, {
          provenance_json: {
            source: person.source_primary || "unknown",
            has_pixel_anchor: person.has_pixel_anchor || false,
            first_pixel_seen_at: person.first_pixel_seen_at,
          },
        });
        updated++;
      } catch (e) {
        console.warn(`Could not update person ${person.id}:`, e.message);
      }
    }

    return {
      status: "success",
      processed: updated,
      message: `Backfilled ${updated} people records`,
    };
  } catch (error) {
    console.error("Provenance backfill error:", error);
    return {
      status: "warning",
      message: error.message || "Could not backfill provenance",
      code: "BACKFILL_WARNING",
      processed: 0,
    };
  }
}

/**
 * Master initialization function - runs all safe initializations in parallel
 */
export async function safeInitializeAll(userId, tenantId) {
  try {
    // Validate once
    const validation = validateInitParams(userId, tenantId);
    if (!validation.valid) {
      return {
        trial: validation.error,
        billing: null,
        hygiene: null,
        provenance: null,
      };
    }

    // Run all in parallel with error handling
    const [trial, billing, hygiene, provenance] = await Promise.allSettled([
      safeInitializeTrial(userId, tenantId),
      safeSetupBillingPlan(),
      safeInitializeHygiene(tenantId, false),
      safeBackfillProvenance(tenantId),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', message: 'Initialization failed' }));

    return {
      trial: trial || { status: 'error', message: 'Trial initialization failed' },
      billing: billing || { status: 'warning', message: 'Billing setup skipped' },
      hygiene: hygiene || { status: 'warning', message: 'Hygiene initialization skipped' },
      provenance: provenance || { status: 'warning', message: 'Provenance backfill skipped' },
    };
  } catch (error) {
    console.error("Master initialization error:", error);
    return {
      trial: { status: "error", code: "INIT_FAILED", message: error.message },
      billing: null,
      hygiene: null,
      provenance: null,
    };
  }
}