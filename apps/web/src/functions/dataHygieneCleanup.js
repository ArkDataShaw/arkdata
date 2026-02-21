/** Stub — data hygiene cleanup functions (not yet implemented) */

export async function previewCleanup(tenantId) {
  return { affectedRecords: 0, estimatedSize: "0 KB" };
}

export async function runCleanup(tenantId) {
  return { cleaned: 0, success: true };
}

export async function purgeQuarantinedData(tenantId) {
  return { purged: 0, success: true };
}

export async function restoreQuarantinedEntity(tenantId, entityId) {
  return { restored: true };
}
