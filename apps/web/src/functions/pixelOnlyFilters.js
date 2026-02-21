/** Stub — pixel-only filter functions (not yet implemented) */

export async function getTenantHygieneSettings(tenantId) {
  return { pixelOnlyMode: false, autoCleanup: false };
}

export async function togglePixelOnlyMode(tenantId, enabled) {
  return { success: true, pixelOnlyMode: enabled };
}
