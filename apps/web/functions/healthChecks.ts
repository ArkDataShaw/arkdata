/**
 * Health check functions for monitoring system status
 * Includes DB connectivity, migrations, and config validation
 */

import { base44 } from "@/api/base44Client";

/**
 * Check database connectivity
 */
export async function checkDatabaseHealth() {
  try {
    // Try a simple query to verify DB connection
    const tenants = await base44.entities.Tenant.filter({}, null, 1);
    
    return {
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check if required entities/schema exist
 */
export async function checkSchemaHealth() {
  const requiredEntities = [
    "User",
    "Tenant",
    "TenantBilling",
    "BillingPlan",
    "TenantHygieneSettings",
    "Person",
    "Company",
    "Visitor",
    "Session",
    "RawEvent",
  ];

  const results = {};
  
  for (const entity of requiredEntities) {
    try {
      // Try to call schema on entity
      const schema = await base44.entities[entity].schema();
      results[entity] = { exists: !!schema };
    } catch (error) {
      results[entity] = {
        exists: false,
        error: error.message,
      };
    }
  }

  const allHealthy = Object.values(results).every(r => r.exists);

  return {
    status: allHealthy ? "healthy" : "unhealthy",
    entities: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check required environment variables (safe version - no secrets exposed)
 */
export function checkConfigHealth() {
  const requiredVars = [
    "VITE_BASE44_API_URL",
    "VITE_APP_ID",
  ];

  const results = {};
  
  for (const varName of requiredVars) {
    results[varName] = {
      configured: !!process.env[varName],
      // Don't expose actual value
    };
  }

  const allConfigured = Object.values(results).every(r => r.configured);

  return {
    status: allConfigured ? "healthy" : "unhealthy",
    config: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Full health check combining all checks
 */
export async function performFullHealthCheck() {
  const [dbHealth, schemaHealth, configHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkSchemaHealth(),
    checkConfigHealth(),
  ]);

  const overallStatus = 
    dbHealth.status === "healthy" &&
    schemaHealth.status === "healthy" &&
    configHealth.status === "healthy"
      ? "healthy"
      : "unhealthy";

  return {
    status: overallStatus,
    database: dbHealth,
    schema: schemaHealth,
    config: configHealth,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run periodic health checks and notify if issues detected
 */
export function startPeriodicHealthChecks(intervalMs = 5 * 60 * 1000) {
  // Check every 5 minutes by default
  return setInterval(async () => {
    try {
      const health = await performFullHealthCheck();
      
      if (health.status !== "healthy") {
        console.warn("Health check failed:", health);
        
        // Could trigger notification to admin
        if (process.env.NODE_ENV === "production") {
          // Notify monitoring/alerting system
          console.error("ALERT: System health degraded", health);
        }
      }
    } catch (error) {
      console.error("Health check error:", error);
    }
  }, intervalMs);
}