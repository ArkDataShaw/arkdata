import { base44 } from "@/api/base44Client";

/**
 * Preview non-pixel entities that will be cleaned
 */
export async function previewCleanup(tenantId) {
  try {
    const [nonPixelPeople, nonPixelCompanies, quarantineSettings] =
      await Promise.all([
        base44.entities.Person.filter(
          {
            tenant_id: tenantId,
            has_pixel_anchor: false,
            is_quarantined: false,
            is_deleted: false,
          },
          "created_date",
          1000
        ),
        base44.entities.Company.filter(
          {
            tenant_id: tenantId,
            has_pixel_anchor: false,
            is_quarantined: false,
            is_deleted: false,
          },
          "created_date",
          1000
        ),
        base44.entities.TenantHygieneSettings.filter(
          { tenant_id: tenantId },
          "created_date",
          1
        ),
      ]);

    const summary = {
      peopleToQuarantine: nonPixelPeople?.length || 0,
      companiesToQuarantine: nonPixelCompanies?.length || 0,
      totalEntitiesAffected:
        (nonPixelPeople?.length || 0) + (nonPixelCompanies?.length || 0),
      samplePeople: (nonPixelPeople || []).slice(0, 20).map((p) => ({
        id: p.id,
        email: p.email,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        source: p.source_primary,
        createdAt: p.created_date,
      })),
      sampleCompanies: (nonPixelCompanies || []).slice(0, 20).map((c) => ({
        id: c.id,
        name: c.name,
        domain: c.domain,
        source: c.source_primary,
        createdAt: c.created_date,
      })),
      settings: quarantineSettings?.[0] || null,
    };

    return summary;
  } catch (error) {
    console.error(`[Preview] Error for tenant ${tenantId}:`, error.message);
    throw error;
  }
}

/**
 * Run cleanup: quarantine non-pixel entities
 */
export async function runCleanup(tenantId, userId, isManual = true) {
  let cleanupRunId = null;

  try {
    // Create cleanup run record
    const cleanupRun = await base44.entities.DataCleanupRun.create({
      tenant_id: tenantId,
      run_type: "quarantine",
      status: "running",
      started_at: new Date().toISOString(),
      triggered_by_user_id: userId,
      is_manual: isManual,
    });
    cleanupRunId = cleanupRun.id;

    console.log(`[Cleanup] Starting quarantine run ${cleanupRunId}`);

    const [nonPixelPeople, nonPixelCompanies] = await Promise.all([
      base44.entities.Person.filter(
        {
          tenant_id: tenantId,
          has_pixel_anchor: false,
          is_quarantined: false,
          is_deleted: false,
        },
        "created_date",
        10000
      ),
      base44.entities.Company.filter(
        {
          tenant_id: tenantId,
          has_pixel_anchor: false,
          is_quarantined: false,
          is_deleted: false,
        },
        "created_date",
        10000
      ),
    ]);

    let quarantinedCount = 0;
    const now = new Date();
    const purgeEligibleAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Quarantine people
    for (const person of nonPixelPeople || []) {
      // Create snapshot
      await base44.entities.QuarantineSnapshot.create({
        tenant_id: tenantId,
        entity_type: "person",
        entity_id: person.id,
        snapshot_json: person,
        quarantine_reason: "non_pixel_origin",
        quarantine_run_id: cleanupRunId,
        quarantined_by_user_id: userId,
        can_restore: true,
        purge_eligible_at: purgeEligibleAt,
      });

      // Mark as quarantined
      await base44.entities.Person.update(person.id, {
        is_quarantined: true,
        quarantined_reason: "non_pixel_origin",
        quarantined_at: now.toISOString(),
        quarantined_by_user_id: userId,
      });

      // Log audit
      await base44.entities.DataHygieneAuditLog.create({
        tenant_id: tenantId,
        action: "entity_quarantined",
        user_id: userId,
        entity_type: "person",
        entity_id: person.id,
        cleanup_run_id: cleanupRunId,
        details_json: { source: person.source_primary },
      });

      quarantinedCount++;
    }

    // Quarantine companies
    for (const company of nonPixelCompanies || []) {
      // Create snapshot
      await base44.entities.QuarantineSnapshot.create({
        tenant_id: tenantId,
        entity_type: "company",
        entity_id: company.id,
        snapshot_json: company,
        quarantine_reason: "non_pixel_origin",
        quarantine_run_id: cleanupRunId,
        quarantined_by_user_id: userId,
        can_restore: true,
        purge_eligible_at: purgeEligibleAt,
      });

      // Mark as quarantined
      await base44.entities.Company.update(company.id, {
        is_quarantined: true,
        quarantined_reason: "non_pixel_origin",
        quarantined_at: now.toISOString(),
        quarantined_by_user_id: userId,
      });

      // Log audit
      await base44.entities.DataHygieneAuditLog.create({
        tenant_id: tenantId,
        action: "entity_quarantined",
        user_id: userId,
        entity_type: "company",
        entity_id: company.id,
        cleanup_run_id: cleanupRunId,
        details_json: { source: company.source_primary },
      });

      quarantinedCount++;
    }

    // Complete cleanup run
    await base44.entities.DataCleanupRun.update(cleanupRunId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      summary_json: {
        peopleQuarantined: nonPixelPeople?.length || 0,
        companiesQuarantined: nonPixelCompanies?.length || 0,
        totalQuarantined: quarantinedCount,
      },
    });

    // Update tenant settings
    await base44.entities.TenantHygieneSettings.filter(
      { tenant_id: tenantId },
      "created_date",
      1
    ).then((results) => {
      if (results?.[0]) {
        return base44.entities.TenantHygieneSettings.update(results[0].id, {
          last_cleanup_run_at: new Date().toISOString(),
          last_cleanup_run_id: cleanupRunId,
        });
      }
    });

    console.log(
      `[Cleanup] Completed. Quarantined ${quarantinedCount} entities.`
    );

    return {
      status: "success",
      cleanupRunId,
      quarantinedCount,
    };
  } catch (error) {
    console.error(
      `[Cleanup] Error for tenant ${tenantId}:`,
      error.message
    );

    if (cleanupRunId) {
      await base44.entities.DataCleanupRun.update(cleanupRunId, {
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error.message,
      });
    }

    throw error;
  }
}

/**
 * Purge quarantined entities after retention period
 */
export async function purgeQuarantinedData(tenantId, userId) {
  try {
    const settings = await base44.entities.TenantHygieneSettings.filter(
      { tenant_id: tenantId },
      "created_date",
      1
    ).then((r) => r?.[0]);

    if (!settings) {
      throw new Error("Hygiene settings not found");
    }

    const now = new Date();
    const purgeRun = await base44.entities.DataCleanupRun.create({
      tenant_id: tenantId,
      run_type: "purge",
      status: "running",
      started_at: now.toISOString(),
      triggered_by_user_id: userId,
      is_manual: true,
    });

    // Find snapshots eligible for purge
    const snapshots = await base44.entities.QuarantineSnapshot.filter(
      {
        tenant_id: tenantId,
        purged_at: null,
      },
      "created_date",
      10000
    );

    let purgedCount = 0;

    for (const snapshot of snapshots || []) {
      if (
        snapshot.purge_eligible_at &&
        new Date(snapshot.purge_eligible_at) <= now
      ) {
        // Hard delete the entity
        if (snapshot.entity_type === "person") {
          await base44.entities.Person.update(snapshot.entity_id, {
            is_deleted: true,
            deleted_at: now.toISOString(),
            email: null,
            phone: null,
            first_name: null,
            last_name: null,
          });
        } else if (snapshot.entity_type === "company") {
          await base44.entities.Company.update(snapshot.entity_id, {
            is_deleted: true,
            deleted_at: now.toISOString(),
            name: null,
            domain: null,
          });
        }

        // Mark snapshot as purged
        await base44.entities.QuarantineSnapshot.update(snapshot.id, {
          purged_at: now.toISOString(),
        });

        // Log audit
        await base44.entities.DataHygieneAuditLog.create({
          tenant_id: tenantId,
          action: "entity_purged",
          user_id: userId,
          entity_type: snapshot.entity_type,
          entity_id: snapshot.entity_id,
          cleanup_run_id: purgeRun.id,
        });

        purgedCount++;
      }
    }

    // Complete purge run
    await base44.entities.DataCleanupRun.update(purgeRun.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      summary_json: {
        purgedCount,
      },
    });

    // Update settings
    await base44.entities.TenantHygieneSettings.filter(
      { tenant_id: tenantId },
      "created_date",
      1
    ).then((r) => {
      if (r?.[0]) {
        return base44.entities.TenantHygieneSettings.update(r[0].id, {
          last_purge_run_at: now.toISOString(),
        });
      }
    });

    console.log(`[Purge] Completed. Purged ${purgedCount} entities.`);

    return {
      status: "success",
      purgedCount,
    };
  } catch (error) {
    console.error(`[Purge] Error for tenant ${tenantId}:`, error.message);
    throw error;
  }
}

/**
 * Restore a quarantined entity
 */
export async function restoreQuarantinedEntity(
  tenantId,
  entityType,
  entityId,
  userId
) {
  try {
    // Find snapshot
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
      throw new Error("Snapshot not found");
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

    // Log audit
    await base44.entities.DataHygieneAuditLog.create({
      tenant_id: tenantId,
      action: "entity_restored",
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    });

    return { status: "success", message: "Entity restored" };
  } catch (error) {
    console.error(`[Restore] Error:`, error.message);
    throw error;
  }
}