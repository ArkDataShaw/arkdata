import { base44 } from "@/api/base44Client";

/**
 * Analytics data fetching functions for all chart endpoints
 * Each returns properly formatted data for Recharts
 */

// ============ HOME / OVERVIEW ============
export async function getHomeMetrics({ tenantId, dateRange = "30d" } = {}) {
  try {
    // Mock data - in production, fetch from rollup tables
    const metrics = {
      sessions: { current: 1247, previous: 1108, change: 11.6 },
      visitors: { current: 432, previous: 389, change: 11.1 },
      identified: { current: 287, previous: 256, change: 12.1 },
      companies: { current: 84, previous: 78, change: 7.7 },
      matchRate: { current: 66.4, previous: 65.8, change: 0.6 },
      lostSessions: { current: 145, previous: 153, change: -5.2 },
      conversions: { current: 38, previous: 32, change: 18.8 },
      enhancedLeads: { current: 127, previous: 98, change: 29.6 },
    };

    return { status: "success", data: metrics };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getSessionsTrend({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sessions: Math.floor(Math.random() * 100) + 30,
        identified: Math.floor(Math.random() * 80) + 10,
        conversions: Math.floor(Math.random() * 10) + 2,
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getTopUtmSources({ tenantId } = {}) {
  try {
    const data = [
      { name: "organic", value: 342, count: 342 },
      { name: "direct", value: 298, count: 298 },
      { name: "google_ads", value: 187, count: 187 },
      { name: "linkedin", value: 156, count: 156 },
      { name: "twitter", value: 98, count: 98 },
    ];
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getTopPages({ tenantId } = {}) {
  try {
    const data = [
      { name: "/pricing", count: 287, cvr: 0.14 },
      { name: "/features", count: 243, cvr: 0.12 },
      { name: "/", count: 198, cvr: 0.10 },
      { name: "/about", count: 156, cvr: 0.08 },
      { name: "/blog", count: 123, cvr: 0.05 },
    ];
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

// ============ VISITORS / PEOPLE ============
export async function getPeopleTrend({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        identified: Math.floor(Math.random() * 20) + 5,
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getIntentScoreDistribution({ tenantId } = {}) {
  try {
    const data = [
      { range: "0-10", count: 45 },
      { range: "10-20", count: 78 },
      { range: "20-30", count: 112 },
      { range: "30-40", count: 95 },
      { range: "40-50", count: 67 },
      { range: "50-60", count: 54 },
      { range: "60-70", count: 42 },
      { range: "70-80", count: 28 },
      { range: "80-90", count: 15 },
      { range: "90-100", count: 8 },
    ];
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getTopJobTitles({ tenantId } = {}) {
  try {
    const data = [
      { name: "Marketing Manager", count: 28 },
      { name: "Sales Manager", count: 24 },
      { name: "Product Manager", count: 18 },
      { name: "Engineering Manager", count: 16 },
      { name: "C-Level", count: 12 },
    ];
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

// ============ COMPANIES ============
export async function getCompaniesTrend({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        active: Math.floor(Math.random() * 15) + 5,
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getIndustryDistribution({ tenantId } = {}) {
  try {
    const data = [
      { name: "SaaS", count: 24 },
      { name: "Finance", count: 18 },
      { name: "Healthcare", count: 14 },
      { name: "Retail", count: 11 },
      { name: "Technology", count: 9 },
      { name: "Other", count: 8 },
    ];
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

// ============ SESSIONS ============
export async function getSessionsChart({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sessions: Math.floor(Math.random() * 150) + 30,
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

export async function getConversionRateTrend({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cvr: (Math.random() * 5 + 2).toFixed(2),
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

// ============ LOST TRAFFIC ============
export async function getLostSessionsTrend({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        lost: Math.floor(Math.random() * 30) + 5,
        highIntent: Math.floor(Math.random() * 15) + 2,
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

// ============ INTEGRATIONS ============
export async function getIntegrationsHealth({ tenantId } = {}) {
  try {
    const data = [
      { name: "Salesforce", success: 487, failed: 12 },
      { name: "HubSpot", success: 342, failed: 8 },
      { name: "Zapier", success: 156, failed: 3 },
      { name: "Webhooks", success: 98, failed: 5 },
    ];
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

// ============ BILLING ============
export async function getEnhancedLeadsTrend({ tenantId, days = 30 } = {}) {
  try {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        leads: Math.floor(Math.random() * 30) + 2,
      });
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}