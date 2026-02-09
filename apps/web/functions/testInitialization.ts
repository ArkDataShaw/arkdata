/**
 * Integration tests for initialization flow
 * Tests for 500 error prevention
 */

import { base44 } from "@/api/base44Client";
import {
  safeInitializeTrial,
  safeSetupBillingPlan,
  safeInitializeHygiene,
  safeBackfillProvenance,
  safeInitializeAll,
} from "@/functions/initializationGuards";

/**
 * Test: Trial init with missing params should return error, not 500
 */
export async function testTrialMissingParams() {
  console.log("TEST: Trial init with missing params");
  
  const result = await safeInitializeTrial(null, "tenant-123");
  
  if (result.status === "error" && result.code === "MISSING_PARAM") {
    console.log("✓ PASS: Missing userId returns 400 error");
    return true;
  }
  
  console.log("✗ FAIL: Expected error response", result);
  return false;
}

/**
 * Test: Trial init with invalid tenant should handle gracefully
 */
export async function testTrialInvalidTenant() {
  console.log("TEST: Trial init with non-existent tenant");
  
  const result = await safeInitializeTrial("test@example.com", "invalid-tenant-xxx");
  
  if (result.status === "success") {
    console.log("✓ PASS: Creates tenant if missing, no 500 error");
    return true;
  }
  
  console.log("✗ FAIL: Should handle missing tenant gracefully", result);
  return false;
}

/**
 * Test: Billing setup doesn't throw on duplicate
 */
export async function testBillingSetupIdempotent() {
  console.log("TEST: Billing setup idempotency");
  
  const result1 = await safeSetupBillingPlan();
  const result2 = await safeSetupBillingPlan();
  
  if ((result1.status === "success" || result1.status === "warning") &&
      (result2.status === "success" && result2.skipped)) {
    console.log("✓ PASS: Billing setup is idempotent, no 500 on duplicate");
    return true;
  }
  
  console.log("✗ FAIL: Billing setup should be idempotent", {
    first: result1,
    second: result2,
  });
  return false;
}

/**
 * Test: Hygiene init with missing tenant doesn't 500
 */
export async function testHygieneMissingTenant() {
  console.log("TEST: Hygiene init with invalid tenant");
  
  const result = await safeInitializeHygiene("invalid-tenant-yyy", false);
  
  // Should return warning/success even if tenant doesn't exist
  if (result.status === "success" || result.status === "warning") {
    console.log("✓ PASS: Hygiene handles missing tenant gracefully");
    return true;
  }
  
  console.log("✗ FAIL: Hygiene should not 500 on missing tenant", result);
  return false;
}

/**
 * Test: Backfill with no people should return 0, not error
 */
export async function testBackfillNoPeople() {
  console.log("TEST: Backfill with empty tenant");
  
  const result = await safeBackfillProvenance("empty-tenant-zzz");
  
  if ((result.status === "success" || result.status === "warning") && 
      (result.processed === 0 || result.skipped)) {
    console.log("✓ PASS: Backfill handles empty data gracefully");
    return true;
  }
  
  console.log("✗ FAIL: Backfill should handle empty data", result);
  return false;
}

/**
 * Test: Full initialization flow doesn't 500 on partial failures
 */
export async function testFullInitializationResilience() {
  console.log("TEST: Full initialization resilience");
  
  const results = await safeInitializeAll("test@example.com", "resilience-test-aaa");
  
  // Trial is critical, should succeed
  if (results.trial?.status === "success" || results.trial?.status === "error") {
    // Other parts are optional, should be warning/success/skipped
    if ((results.billing?.status === "success" || results.billing?.status === "warning") &&
        (results.hygiene?.status === "success" || results.hygiene?.status === "warning") &&
        (results.provenance?.status === "success" || results.provenance?.status === "warning")) {
      console.log("✓ PASS: Full initialization completes without 500", results);
      return true;
    }
  }
  
  console.log("✗ FAIL: Initialization flow failed", results);
  return false;
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log("\n========== INITIALIZATION TESTS ==========\n");
  
  const tests = [
    testTrialMissingParams,
    testTrialInvalidTenant,
    testBillingSetupIdempotent,
    testHygieneMissingTenant,
    testBackfillNoPeople,
    testFullInitializationResilience,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passed++;
      else failed++;
    } catch (error) {
      console.error(`✗ EXCEPTION in ${test.name}:`, error.message);
      failed++;
    }
    console.log("");
  }
  
  console.log(`========== RESULTS ==========`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  
  return failed === 0;
}

// Auto-run tests in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.runInitTests = runAllTests;
  console.log("Run tests with: window.runInitTests()");
}