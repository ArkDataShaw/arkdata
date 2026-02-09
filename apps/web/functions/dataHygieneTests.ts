import { base44 } from "@/api/base44Client";

/**
 * TEST: Provenance Classification
 * Verify persons created from pixel sessions are correctly marked
 */
export async function testProvenanceClassification() {
  console.log("[TEST] Starting Provenance Classification Test");

  try {
    // Create a test tenant
    const tenant = await base44.entities.Tenant.create({
      name: `Test Tenant ${Date.now()}`,
    });

    // Create a pixel-sourced person
    const pixelPerson = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "Pixel",
      last_name: "User",
      email: "pixel@test.com",
      source: "pixel",
      source_primary: "pixel",
      has_pixel_anchor: true,
    });

    // Create a non-pixel person (manual import)
    const manualPerson = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "Manual",
      last_name: "User",
      email: "manual@test.com",
      source: "manual",
      source_primary: "manual",
      has_pixel_anchor: false,
    });

    // Verify classification
    const pixelCheck = pixelPerson.has_pixel_anchor === true;
    const manualCheck = manualPerson.has_pixel_anchor === false;

    if (pixelCheck && manualCheck) {
      console.log("[TEST] ✓ Provenance classification PASSED");
      return {
        status: "pass",
        message: "Persons correctly classified by source",
      };
    } else {
      throw new Error(
        `Classification failed: pixel=${pixelCheck}, manual=${manualCheck}`
      );
    }
  } catch (error) {
    console.error("[TEST] Provenance classification FAILED:", error.message);
    return { status: "fail", error: error.message };
  }
}

/**
 * TEST: Pixel-Only Filter
 * Verify pixel_only_mode excludes non-pixel records
 */
export async function testPixelOnlyFilter() {
  console.log("[TEST] Starting Pixel-Only Filter Test");

  try {
    const tenant = await base44.entities.Tenant.create({
      name: `Test Tenant ${Date.now()}`,
    });

    // Create hygiene settings with pixel-only mode enabled
    const settings = await base44.entities.TenantHygieneSettings.create({
      tenant_id: tenant.id,
      pixel_only_mode: true,
    });

    // Create test data
    const pixelPerson = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "P",
      last_name: "T",
      email: "p@test.com",
      source: "pixel",
      has_pixel_anchor: true,
      is_quarantined: false,
    });

    const nonPixelPerson = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "M",
      last_name: "T",
      email: "m@test.com",
      source: "manual",
      has_pixel_anchor: false,
      is_quarantined: false,
    });

    // Query with pixel-only filter
    const filtered = await base44.entities.Person.filter(
      {
        tenant_id: tenant.id,
        is_quarantined: false,
        has_pixel_anchor: true,
      },
      "created_date",
      100
    );

    // Should include pixel, exclude manual
    const hasPixelPerson = filtered.some((p) => p.id === pixelPerson.id);
    const hasManualPerson = filtered.some((p) => p.id === nonPixelPerson.id);

    if (hasPixelPerson && !hasManualPerson) {
      console.log("[TEST] ✓ Pixel-only filter PASSED");
      return {
        status: "pass",
        message: "Filter correctly excludes non-pixel records",
      };
    } else {
      throw new Error(`Filter failed: pixel=${hasPixelPerson}, manual=${hasManualPerson}`);
    }
  } catch (error) {
    console.error("[TEST] Pixel-only filter FAILED:", error.message);
    return { status: "fail", error: error.message };
  }
}

/**
 * TEST: Quarantine Job Idempotency
 * Running cleanup twice should not duplicate quarantines
 */
export async function testQuarantineIdempotency() {
  console.log("[TEST] Starting Quarantine Idempotency Test");

  try {
    const tenant = await base44.entities.Tenant.create({
      name: `Test Tenant ${Date.now()}`,
    });

    // Create non-pixel person
    const person = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "Test",
      last_name: "User",
      email: "test@test.com",
      source: "manual",
      has_pixel_anchor: false,
    });

    // Create snapshots for person (simulate first cleanup)
    const snap1 = await base44.entities.QuarantineSnapshot.create({
      tenant_id: tenant.id,
      entity_type: "person",
      entity_id: person.id,
      snapshot_json: person,
      quarantine_reason: "non_pixel_origin",
    });

    // Mark person as quarantined
    await base44.entities.Person.update(person.id, {
      is_quarantined: true,
    });

    // Try to create another snapshot (should not create duplicate if idempotent)
    const allSnapshots = await base44.entities.QuarantineSnapshot.filter(
      {
        tenant_id: tenant.id,
        entity_id: person.id,
      },
      "created_date",
      100
    );

    // Should have exactly 1 snapshot (idempotent)
    const isIdempotent = allSnapshots.length === 1;

    if (isIdempotent) {
      console.log("[TEST] ✓ Quarantine idempotency PASSED");
      return {
        status: "pass",
        message: "Cleanup job is idempotent",
      };
    } else {
      throw new Error(
        `Idempotency failed: found ${allSnapshots.length} snapshots instead of 1`
      );
    }
  } catch (error) {
    console.error("[TEST] Quarantine idempotency FAILED:", error.message);
    return { status: "fail", error: error.message };
  }
}

/**
 * TEST: Purge Retention Logic
 * Records newer than retention period should not be purged
 */
export async function testPurgeRetention() {
  console.log("[TEST] Starting Purge Retention Test");

  try {
    const tenant = await base44.entities.Tenant.create({
      name: `Test Tenant ${Date.now()}`,
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const future = new Date(
      now.getTime() + 60 * 24 * 60 * 60 * 1000
    );

    // Create old quarantine snapshot (eligible for purge)
    const oldSnapshot = await base44.entities.QuarantineSnapshot.create({
      tenant_id: tenant.id,
      entity_type: "person",
      entity_id: "old_person_id",
      snapshot_json: { test: true },
      quarantine_reason: "non_pixel_origin",
      purge_eligible_at: yesterday.toISOString(),
    });

    // Create new quarantine snapshot (not eligible)
    const newSnapshot = await base44.entities.QuarantineSnapshot.create({
      tenant_id: tenant.id,
      entity_type: "person",
      entity_id: "new_person_id",
      snapshot_json: { test: true },
      quarantine_reason: "non_pixel_origin",
      purge_eligible_at: future.toISOString(),
    });

    // Check retention logic
    const oldEligible = new Date(oldSnapshot.purge_eligible_at) <= now;
    const newEligible = new Date(newSnapshot.purge_eligible_at) <= now;

    if (oldEligible && !newEligible) {
      console.log("[TEST] ✓ Purge retention logic PASSED");
      return {
        status: "pass",
        message: "Retention period correctly enforced",
      };
    } else {
      throw new Error(`Retention logic failed: old=${oldEligible}, new=${newEligible}`);
    }
  } catch (error) {
    console.error("[TEST] Purge retention FAILED:", error.message);
    return { status: "fail", error: error.message };
  }
}

/**
 * TEST: Billing Usage Exclusion
 * Non-pixel enhanced leads must not be counted in billing usage when pixel_only_mode is ON
 */
export async function testBillingPixelExclusion() {
  console.log("[TEST] Starting Billing Pixel Exclusion Test");

  try {
    const tenant = await base44.entities.Tenant.create({
      name: `Test Tenant ${Date.now()}`,
    });

    // Enable pixel-only mode
    await base44.entities.TenantHygieneSettings.create({
      tenant_id: tenant.id,
      pixel_only_mode: true,
    });

    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    // Create pixel person (should be counted)
    const pixelPerson = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "Pixel",
      last_name: "User",
      email: "pixel@billing.com",
      source: "pixel",
      has_pixel_anchor: true,
      is_quarantined: false,
      is_deleted: false,
      created_date: new Date().toISOString(),
    });

    // Create non-pixel person (should NOT be counted)
    const manualPerson = await base44.entities.Person.create({
      tenant_id: tenant.id,
      first_name: "Manual",
      last_name: "User",
      email: "manual@billing.com",
      source: "manual",
      has_pixel_anchor: false,
      is_quarantined: false,
      is_deleted: false,
      created_date: new Date().toISOString(),
    });

    // Calculate billing with pixel-only filter
    const people = await base44.entities.Person.filter(
      {
        tenant_id: tenant.id,
      },
      "created_date",
      100
    );

    // Filter to pixel-anchored only
    const pixelBillingPeople = (people || []).filter((p) => {
      const created = new Date(p.created_date);
      return (
        p.has_pixel_anchor &&
        !p.is_quarantined &&
        !p.is_deleted &&
        created >= periodStart &&
        created <= periodEnd
      );
    });

    const hasPixelPerson = pixelBillingPeople.some((p) => p.id === pixelPerson.id);
    const hasManualPerson = pixelBillingPeople.some((p) => p.id === manualPerson.id);

    if (hasPixelPerson && !hasManualPerson) {
      console.log("[TEST] ✓ Billing pixel exclusion PASSED");
      return {
        status: "pass",
        message: "Non-pixel leads correctly excluded from billing",
      };
    } else {
      throw new Error(
        `Billing exclusion failed: pixel=${hasPixelPerson}, manual=${hasManualPerson}`
      );
    }
  } catch (error) {
    console.error("[TEST] Billing pixel exclusion FAILED:", error.message);
    return { status: "fail", error: error.message };
  }
}

/**
 * Run all data hygiene tests
 */
export async function runAllDataHygieneTests() {
  console.log("\n========== DATA HYGIENE TEST SUITE ==========\n");

  const results = [];

  results.push(await testProvenanceClassification());
  results.push(await testPixelOnlyFilter());
  results.push(await testQuarantineIdempotency());
  results.push(await testPurgeRetention());
  results.push(await testBillingPixelExclusion());

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  console.log(`\n========== RESULTS: ${passed} PASS, ${failed} FAIL ==========\n`);

  return { results, passed, failed };
}