import { base44 } from "@/api/base44Client";

/**
 * Get tenant hygiene settings
 */
export async function getTenantHygieneSettings(tenantId) {
  try {
    const results = await base44.entities.TenantHygieneSettings.filter(
      { tenant_id: tenantId },
      "created_date",
      1
    );
    return results?.[0] || null;
  } catch (error) {
    console.error("Error fetching hygiene settings:", error.message);
    return null;
  }
}

/**
 * Build filter query for pixel-only entities
 */
export function buildPixelOnlyFilter(pixelOnly = false) {
  if (!pixelOnly) {
    return {};
  }

  return {
    is_quarantined: false,
    is_deleted: false,
    has_pixel_anchor: true,
  };
}

/**
 * Fetch people with pixel-only filtering
 */
export async function fetchPixelPeople(tenantId, pixelOnly = false) {
  try {
    const filter = {
      tenant_id: tenantId,
      is_deleted: false,
      ...buildPixelOnlyFilter(pixelOnly),
    };

    return await base44.entities.Person.filter(filter, "-created_date", 1000);
  } catch (error) {
    console.error("Error fetching people:", error.message);
    return [];
  }
}

/**
 * Fetch companies with pixel-only filtering
 */
export async function fetchPixelCompanies(tenantId, pixelOnly = false) {
  try {
    const filter = {
      tenant_id: tenantId,
      is_deleted: false,
      ...buildPixelOnlyFilter(pixelOnly),
    };

    return await base44.entities.Company.filter(filter, "-created_date", 1000);
  } catch (error) {
    console.error("Error fetching companies:", error.message);
    return [];
  }
}

/**
 * Fetch visitors with pixel-only filtering
 */
export async function fetchPixelVisitors(tenantId, pixelOnly = false) {
  try {
    const filter = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (pixelOnly) {
      filter.has_pixel_activity = true;
      filter.is_quarantined = false;
    }

    return await base44.entities.Visitor.filter(filter, "-created_date", 1000);
  } catch (error) {
    console.error("Error fetching visitors:", error.message);
    return [];
  }
}

/**
 * Calculate billing usage with pixel-only filtering
 * Count only pixel-derived people for "Enhanced Leads"
 */
export async function calculatePixelBillingUsage(tenantId, periodStart, periodEnd) {
  try {
    // Get all people linked in this period
    const people = await base44.entities.Person.filter(
      {
        tenant_id: tenantId,
      },
      "created_date",
      10000
    );

    // Filter to pixel-anchored only and in time period
    const pixelPeople = (people || []).filter((p) => {
      const created = new Date(p.created_date);
      return (
        p.has_pixel_anchor &&
        !p.is_quarantined &&
        !p.is_deleted &&
        created >= new Date(periodStart) &&
        created <= new Date(periodEnd)
      );
    });

    return {
      uniquePixelPeople: new Set(pixelPeople.map((p) => p.id)).size,
      pixelPeopleCount: pixelPeople.length,
      records: pixelPeople,
    };
  } catch (error) {
    console.error("Error calculating billing usage:", error.message);
    return {
      uniquePixelPeople: 0,
      pixelPeopleCount: 0,
      records: [],
    };
  }
}

/**
 * Initialize hygiene settings for a tenant
 */
export async function initializeTenantHygiene(tenantId, pixelOnlyMode = false) {
  try {
    // Check if already exists
    const existing = await getTenantHygieneSettings(tenantId);
    if (existing) {
      return existing;
    }

    // Create new settings
    const settings = await base44.entities.TenantHygieneSettings.create({
      tenant_id: tenantId,
      pixel_only_mode: pixelOnlyMode,
      pixel_only_enforcement: "quarantine_then_purge",
      quarantine_retention_days: 30,
      auto_cleanup_enabled: true,
      anonymize_on_purge: true,
    });

    console.log(`[Hygiene] Initialized for tenant ${tenantId}`);
    return settings;
  } catch (error) {
    console.error(
      `[Hygiene] Initialization error for ${tenantId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Toggle pixel-only mode for a tenant
 */
export async function togglePixelOnlyMode(tenantId, enabled) {
  try {
    const settings = await getTenantHygieneSettings(tenantId);

    if (!settings) {
      return initializeTenantHygiene(tenantId, enabled);
    }

    const updated = await base44.entities.TenantHygieneSettings.update(
      settings.id,
      {
        pixel_only_mode: enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
      }
    );

    // Log audit
    await base44.entities.DataHygieneAuditLog.create({
      tenant_id: tenantId,
      action: enabled
        ? "pixel_only_mode_enabled"
        : "pixel_only_mode_disabled",
      user_id: "system",
      details_json: { enforced: enabled },
    });

    return updated;
  } catch (error) {
    console.error(
      `[Hygiene] Toggle error for ${tenantId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Backfill provenance on existing entities (safe operation, idempt)
 */
export async function backfillPixelProvenance(tenantId) {
  try {
    // Check if backfill already ran
    const settings = await getTenantHygieneSettings(tenantId);
    if (settings?.last_cleanup_run_at) {
      console.log(`[Backfill] Already run for tenant ${tenantId}, skipping`);
      return { status: "skipped" };
    }

    // Mark first batch of people as pixel-based if source === "pixel"
    const people = await base44.entities.Person.filter(
      { tenant_id: tenantId },
      "created_date",
      1000
    );

    for (const person of people) {
      if (person.source === "pixel" || person.source_primary === "pixel") {
        await base44.entities.Person.update(person.id, {
          has_pixel_anchor: true,
        });
      }
    }

    console.log(`[Backfill] Completed for tenant ${tenantId}`);
    return { status: "success", processed: people?.length || 0 };
  } catch (error) {
    console.error(`[Backfill] Error for tenant ${tenantId}:`, error.message);
    return { status: "error", message: error.message };
  }
}