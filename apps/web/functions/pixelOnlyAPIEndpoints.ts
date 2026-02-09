import { base44 } from "@/api/base44Client";

/**
 * API: GET /api/v1/data-hygiene/state
 * Get current hygiene state for authenticated tenant
 */
export async function getDataHygieneState() {
  try {
    const user = await base44.auth.me();
    const tenants = await base44.entities.Tenant.filter(
      { created_by: user.email },
      "created_date",
      1
    );

    if (!tenants?.[0]) {
      return { status: 401, message: "No tenant found" };
    }

    const tenantId = tenants[0].id;

    const [settings, stats, recentRuns] = await Promise.all([
      base44.entities.TenantHygieneSettings.filter(
        { tenant_id: tenantId },
        "created_date",
        1
      ),
      base44.entities.QuarantineSnapshot.filter(
        { tenant_id: tenantId, purged_at: null },
        "created_date",
        1000
      ),
      base44.entities.DataCleanupRun.filter(
        { tenant_id: tenantId },
        "-created_date",
        5
      ),
    ]);

    return {
      status: 200,
      data: {
        tenantId,
        settings: settings?.[0] || null,
        quarantinedCount: stats?.length || 0,
        recentRuns: recentRuns || [],
      },
    };
  } catch (error) {
    console.error("[API] getDataHygieneState error:", error.message);
    return { status: 500, message: error.message };
  }
}

/**
 * API: POST /api/v1/data-hygiene/settings
 * Update hygiene settings
 */
export async function updateDataHygieneSettings(payload) {
  try {
    const user = await base44.auth.me();
    const tenants = await base44.entities.Tenant.filter(
      { created_by: user.email },
      "created_date",
      1
    );

    if (!tenants?.[0]) {
      return { status: 401, message: "No tenant found" };
    }

    const tenantId = tenants[0].id;

    const settings = await base44.entities.TenantHygieneSettings.filter(
      { tenant_id: tenantId },
      "created_date",
      1
    ).then((r) => r?.[0]);

    if (!settings) {
      const newSettings = await base44.entities.TenantHygieneSettings.create({
        tenant_id: tenantId,
        ...payload,
      });
      return { status: 201, data: newSettings };
    }

    const updated = await base44.entities.TenantHygieneSettings.update(
      settings.id,
      payload
    );

    // Log audit
    await base44.entities.DataHygieneAuditLog.create({
      tenant_id: tenantId,
      action: "settings_updated",
      user_id: user.id,
      details_json: payload,
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("[API] updateDataHygieneSettings error:", error.message);
    return { status: 500, message: error.message };
  }
}

/**
 * API: POST /api/v1/data-hygiene/preview
 * Preview cleanup without executing
 */
export async function previewDataHygieneCleanup() {
  try {
    const user = await base44.auth.me();
    const tenants = await base44.entities.Tenant.filter(
      { created_by: user.email },
      "created_date",
      1
    );

    if (!tenants?.[0]) {
      return { status: 401, message: "No tenant found" };
    }

    const tenantId = tenants[0].id;

    const [nonPixelPeople, nonPixelCompanies] = await Promise.all([
      base44.entities.Person.filter(
        {
          tenant_id: tenantId,
          has_pixel_anchor: false,
          is_quarantined: false,
          is_deleted: false,
        },
        "created_date",
        100
      ),
      base44.entities.Company.filter(
        {
          tenant_id: tenantId,
          has_pixel_anchor: false,
          is_quarantined: false,
          is_deleted: false,
        },
        "created_date",
        100
      ),
    ]);

    return {
      status: 200,
      data: {
        peopleToQuarantine: nonPixelPeople?.length || 0,
        companiesToQuarantine: nonPixelCompanies?.length || 0,
        total: (nonPixelPeople?.length || 0) + (nonPixelCompanies?.length || 0),
        samplePeople: (nonPixelPeople || []).slice(0, 20),
        sampleCompanies: (nonPixelCompanies || []).slice(0, 20),
      },
    };
  } catch (error) {
    console.error("[API] previewDataHygieneCleanup error:", error.message);
    return { status: 500, message: error.message };
  }
}

/**
 * API: POST /api/v1/data-hygiene/quarantine-run
 * Execute quarantine (from tenant settings)
 */
export async function executeQuarantineRun() {
  try {
    const user = await base44.auth.me();
    const tenants = await base44.entities.Tenant.filter(
      { created_by: user.email },
      "created_date",
      1
    );

    if (!tenants?.[0]) {
      return { status: 401, message: "No tenant found" };
    }

    const tenantId = tenants[0].id;

    // Create cleanup run (this is handled by dataHygieneCleanup.js)
    const cleanupRun = await base44.entities.DataCleanupRun.create({
      tenant_id: tenantId,
      run_type: "quarantine",
      status: "running",
      started_at: new Date().toISOString(),
      triggered_by_user_id: user.id,
      is_manual: true,
    });

    // Queue the actual cleanup job (in production, this would be a background task)
    // For now, return the run ID
    return {
      status: 202,
      data: {
        cleanupRunId: cleanupRun.id,
        message: "Cleanup job queued",
      },
    };
  } catch (error) {
    console.error("[API] executeQuarantineRun error:", error.message);
    return { status: 500, message: error.message };
  }
}

/**
 * API: POST /api/v1/data-hygiene/purge
 * Purge quarantined data (requires confirmation)
 */
export async function executePurgeRun(confirmationCode) {
  try {
    if (confirmationCode !== "PURGE") {
      return { status: 400, message: "Invalid confirmation code" };
    }

    const user = await base44.auth.me();
    const tenants = await base44.entities.Tenant.filter(
      { created_by: user.email },
      "created_date",
      1
    );

    if (!tenants?.[0]) {
      return { status: 401, message: "No tenant found" };
    }

    const tenantId = tenants[0].id;

    // Create purge run
    const purgeRun = await base44.entities.DataCleanupRun.create({
      tenant_id: tenantId,
      run_type: "purge",
      status: "running",
      started_at: new Date().toISOString(),
      triggered_by_user_id: user.id,
      is_manual: true,
    });

    return {
      status: 202,
      data: {
        purgeRunId: purgeRun.id,
        message: "Purge job queued",
      },
    };
  } catch (error) {
    console.error("[API] executePurgeRun error:", error.message);
    return { status: 500, message: error.message };
  }
}

/**
 * API: POST /api/v1/data-hygiene/restore
 * Restore quarantined entity
 */
export async function restoreQuarantinedData(entityType, entityId) {
  try {
    const user = await base44.auth.me();
    const tenants = await base44.entities.Tenant.filter(
      { created_by: user.email },
      "created_date",
      1
    );

    if (!tenants?.[0]) {
      return { status: 401, message: "No tenant found" };
    }

    const tenantId = tenants[0].id;

    // Find and restore snapshot
    const snapshots = await base44.entities.QuarantineSnapshot.filter(
      {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
      },
      "created_date",
      1
    );

    if (!snapshots?.[0]) {
      return { status: 404, message: "Snapshot not found" };
    }

    const snapshot = snapshots[0];

    // Restore entity
    if (entityType === "person") {
      const { id, created_date, updated_date, created_by, ...restoreData } =
        snapshot.snapshot_json;
      await base44.entities.Person.update(entityId, {
        ...restoreData,
        is_quarantined: false,
        quarantined_reason: null,
        quarantined_at: null,
      });
    } else if (entityType === "company") {
      const { id, created_date, updated_date, created_by, ...restoreData } =
        snapshot.snapshot_json;
      await base44.entities.Company.update(entityId, {
        ...restoreData,
        is_quarantined: false,
        quarantined_reason: null,
        quarantined_at: null,
      });
    }

    // Audit log
    await base44.entities.DataHygieneAuditLog.create({
      tenant_id: tenantId,
      action: "entity_restored",
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
    });

    return { status: 200, message: "Entity restored successfully" };
  } catch (error) {
    console.error("[API] restoreQuarantinedData error:", error.message);
    return { status: 500, message: error.message };
  }
}

/**
 * API: GET /api/v1/admin/tenants/:tenant_id/data-hygiene/state
 * Admin endpoint to get hygiene state for any tenant
 */
export async function adminGetDataHygieneState(tenantId) {
  try {
    const user = await base44.auth.me();

    // Check if user is admin
    if (user.role !== "admin") {
      return { status: 403, message: "Admin access required" };
    }

    const [settings, stats] = await Promise.all([
      base44.entities.TenantHygieneSettings.filter(
        { tenant_id: tenantId },
        "created_date",
        1
      ),
      base44.entities.QuarantineSnapshot.filter(
        { tenant_id: tenantId, purged_at: null },
        "created_date",
        1000
      ),
    ]);

    return {
      status: 200,
      data: {
        tenantId,
        settings: settings?.[0] || null,
        quarantinedCount: stats?.length || 0,
      },
    };
  } catch (error) {
    console.error("[API] adminGetDataHygieneState error:", error.message);
    return { status: 500, message: error.message };
  }
}