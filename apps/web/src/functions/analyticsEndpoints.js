/** Stub — analytics endpoint functions (not yet implemented) */

export async function getHomeMetrics(tenantId) {
  return { totalVisitors: 0, totalEvents: 0, identifiedRate: 0, sessionsToday: 0 };
}

export async function getSessionsTrend(tenantId, days = 30) {
  return [];
}

export async function getTopUtmSources(tenantId) {
  return [];
}

export async function getTopPages(tenantId) {
  return [];
}

export async function getLostSessionsTrend(tenantId, days = 30) {
  return [];
}

export async function getCompaniesTrend(tenantId, days = 30) {
  return [];
}

export async function getIndustryDistribution(tenantId) {
  return [];
}

export async function getPeopleTrend(tenantId, days = 30) {
  return [];
}

export async function getIntentScoreDistribution(tenantId) {
  return [];
}

export async function getTopJobTitles(tenantId) {
  return [];
}

export async function getIntegrationsHealth(tenantId) {
  return [];
}
