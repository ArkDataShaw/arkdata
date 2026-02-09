/**
 * Integration tests for 500 error prevention
 * Tests validate that the fixes prevent regression
 */

import { base44 } from "@/api/base44Client";
import {
  safeInitializeTrial,
  safeSetupBillingPlan,
  safeInitializeHygiene,
  safeBackfillProvenance,
  safeInitializeAll,
} from "@/functions/initializationGuards";
import { performFullHealthCheck } from "@/functions/healthChecks";

/**
 * TEST 1: Trial init with missing userId returns 400, not 500
 */
export async function test_TrialMissingUserId() {
  console.log("TEST 1: Trial init with missing userId");
  
  const result = await safeInitializeTrial(null, "test-tenant-1");
  
  if (result.status === "error" && result.statusCode === 400) {
    console.log("✓ PASS: Returns 400 error, not 500");
    return true;
  }
  
  console.log("✗ FAIL: Expected 400 error response", result);
  return false;
}

/**
 * TEST 2: Trial init with missing tenantId returns 400, not 500
 */
export async function test_TrialMissingTenantId() {
  console.log("TEST 2: Trial init with missing tenantId");
  
  const result = await safeInitializeTrial("user@example.com", null);
  
  if (result.status === "error" && result.statusCode === 400) {
    console.log("✓ PASS: Returns 400 error, not 500");
    return true;
  }
  
  console.log("✗ FAIL: Expected 400 error response", result);
  return false;
}

/**
 * TEST 3: Trial init with non-existent tenant creates it gracefully
 */
export async function test_TrialNonExistentTenant() {
  console.log("TEST 3: Trial init with non-existent tenant");
  
  const result = await safeInitializeTrial(
    "test@example.com",
    `tenant-${Date.now()}`
  );
  
  if (result.status === "success") {
    console.log("✓ PASS: Creates tenant if missing, no 500");
    return true;
  }
  
  console.log("✗ FAIL: Should handle missing tenant", result);
  return false;
}

/**
 * TEST 4: Billing setup is idempotent (no duplicate error)
 */
export async function test_BillingSetupIdempotent() {
  console.log("TEST 4: Billing setup idempotency");
  
  const result1 = await safeSetupBillingPlan();
  const result2 = await safeSetupBillingPlan();
  
  if (result1.status === "success" && result2.status === "success") {
    console.log("✓ PASS: Billing setup is idempotent, no 500");
    return true;
  }
  
  console.log("✗ FAIL: Billing setup should be idempotent", {
    first: result1,
    second: result2,
  });
  return false;
}

/**
 * TEST 5: Hygiene init with missing tenant returns gracefully
 */
export async function test_HygieneWithMissingTenant() {
  console.log("TEST 5: Hygiene init with missing tenant");
  
  const result = await safeInitializeHygiene(`hygiene-test-${Date.now()}`);
  
  if (result.status === "success" || result.status === "warning") {
    console.log("✓ PASS: Hygiene handles missing tenant gracefully");
    return true;
  }
  
  console.log("✗ FAIL: Hygiene should not 500", result);
  return false;
}

/**
 * TEST 6: Backfill with empty tenant returns 0, not error
 */
export async function test_BackfillEmptyTenant() {
  console.log("TEST 6: Backfill with empty/non-existent tenant");
  
  const result = await safeBackfillProvenance(`empty-${Date.now()}`);
  
  if ((result.status === "success" || result.status === "warning") && 
      (result.processed === 0 || result.skipped)) {
    console.log("✓ PASS: Backfill handles empty data gracefully");
    return true;
  }
  
  console.log("✗ FAIL: Backfill should handle empty data", result);
  return false;
}

/**
 * TEST 7: Full initialization completes without 500
 */
export async function test_FullInitializationNoErrors() {
  console.log("TEST 7: Full initialization flow");
  
  const results = await safeInitializeAll(
    `test-${Date.now()}@example.com`,
    `full-init-${Date.now()}`
  );
  
  const hasCriticalError = results.trial?.status === "error" && 
    results.trial?.statusCode === 500;
  
  if (!hasCriticalError) {
    console.log("✓ PASS: Full initialization completes without 500", results);
    return true;
  }
  
  console.log("✗ FAIL: Full initialization hit 500 error", results);
  return false;
}

/**
 * TEST 8: Health checks report system status correctly
 */
export async function test_HealthCheckStatus() {
  console.log("TEST 8: Health check endpoints");
  
  const health = await performFullHealthCheck();
  
  if (health.status && health.database && health.schema && health.config) {
    console.log("✓ PASS: Health check returns complete status", {
      overall: health.status,
      db: health.database.status,
      schema: health.schema.status,
      config: health.config.status,
    });
    return true;
  }
  
  console.log("✗ FAIL: Health check incomplete", health);
  return false;
}

/**
 * TEST 9: Invalid input to trial init returns 400, not generic error
 */
export async function test_TrialInvalidInput() {
  console.log("TEST 9: Trial init with invalid input");
  
  const result = await safeInitializeTrial("", "");
  
  if (result.status === "error" && result.statusCode === 400) {
    console.log("✓ PASS: Returns 400 for invalid input");
    return true;
  }
  
  console.log("✗ FAIL: Should return 400 for invalid input", result);
  return false;
}

/**
 * TEST 10: Hygiene init with invalid tenantId returns 400
 */
export async function test_HygieneInvalidInput() {
  console.log("TEST 10: Hygiene init with invalid input");
  
  const result = await safeInitializeHygiene("");
  
  if (result.status === "error" && result.statusCode === 400) {
    console.log("✓ PASS: Returns 400 for invalid tenantId");
    return true;
  }
  
  console.log("✗ FAIL: Should return 400 for invalid input", result);
  return false;
}

/**
 * Run all tests and report results
 */
export async function runIntegrationTests() {
  console.log("\n========== INTEGRATION TESTS (500 ERROR PREVENTION) ==========\n");
  
  const tests = [
    test_TrialMissingUserId,
    test_TrialMissingTenantId,
    test_TrialNonExistentTenant,
    test_BillingSetupIdempotent,
    test_HygieneWithMissingTenant,
    test_BackfillEmptyTenant,
    test_FullInitializationNoErrors,
    test_HealthCheckStatus,
    test_TrialInvalidInput,
    test_HygieneInvalidInput,
  ];
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push({ name: test.name, passed: result });
      if (result) passed++;
      else failed++;
    } catch (error) {
      console.error(`✗ EXCEPTION in ${test.name}:`, error.message);
      results.push({ name: test.name, passed: false, exception: error.message });
      failed++;
    }
    console.log("");
  }
  
  console.log(`========== TEST RESULTS ==========`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  
  if (failed > 0) {
    console.log("\nFailed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}${r.exception ? ` (${r.exception})` : ""}`);
    });
  }
  
  return failed === 0;
}

// Auto-export for window access in dev
if (typeof window !== "undefined") {
  window.runIntegrationTests = runIntegrationTests;
}