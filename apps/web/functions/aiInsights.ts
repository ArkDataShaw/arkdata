import { base44 } from "@/api/base44Client";

/**
 * Generate AI-powered insights from analytics metrics
 * Uses LLM to analyze trends, anomalies, and opportunities
 */
export async function generateAIInsights(metrics, dateRange) {
  try {
    if (!metrics || Object.keys(metrics).length === 0) {
      return { insights: [], summary: null };
    }

    // Prepare analytics data summary
    const analyticsSummary = {
      totalSessions: metrics.totalSessions || 0,
      identifiedPeople: metrics.identifiedPeople || 0,
      identifiedCompanies: metrics.identifiedCompanies || 0,
      matchRate: metrics.matchRate || 0,
      conversions: metrics.conversions || 0,
      conversionRate: metrics.conversionRate || 0,
      bounceRate: metrics.bounceRate || 0,
      avgSessionDuration: metrics.avgSessionDuration || 0,
      dateRange: dateRange || "last 30 days",
      trends: {
        visitorsTrend: metrics.visitorsTrend || "stable",
        conversionTrend: metrics.conversionTrend || "stable",
        engagementTrend: metrics.engagementTrend || "stable",
      },
      topSources: metrics.topSources || [],
      topPages: metrics.topPages || [],
    };

    const prompt = `Analyze the following analytics metrics and provide 3-5 specific, actionable insights. Focus on identifying trends, anomalies, and growth opportunities.

Analytics Data:
${JSON.stringify(analyticsSummary, null, 2)}

For each insight, identify:
1. What's happening (clear observation)
2. Why it matters (business impact)
3. What to do about it (recommendation)

Return insights that are specific, data-driven, and immediately actionable.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["trend", "anomaly", "opportunity", "warning"],
                  description: "Type of insight"
                },
                title: {
                  type: "string",
                  description: "Short insight title"
                },
                description: {
                  type: "string",
                  description: "Detailed explanation"
                },
                impact: {
                  type: "string",
                  description: "Business impact"
                },
                recommendation: {
                  type: "string",
                  description: "What to do"
                }
              },
              required: ["type", "title", "description", "impact"]
            }
          },
          summary: {
            type: "string",
            description: "Overall summary of key insights"
          }
        },
        required: ["insights", "summary"]
      }
    });

    return response || { insights: [], summary: null };
  } catch (error) {
    console.error("AI Insights error:", error.message);
    return { insights: [], summary: null, error: error.message };
  }
}

/**
 * Detect anomalies in metrics (traffic spikes, conversion drops, etc.)
 */
export async function detectAnomalies(historicalData) {
  try {
    if (!historicalData || historicalData.length < 3) {
      return [];
    }

    // Calculate mean and std dev
    const values = historicalData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detect points that deviate > 2 std devs
    const anomalies = historicalData.filter((point, idx) => {
      const zscore = Math.abs((point.value - mean) / stdDev);
      return zscore > 2;
    });

    return anomalies.map(anomaly => ({
      date: anomaly.date,
      value: anomaly.value,
      deviation: ((anomaly.value - mean) / mean * 100).toFixed(1),
      severity: Math.abs(anomaly.value - mean) / stdDev > 3 ? "high" : "medium"
    }));
  } catch (error) {
    console.error("Anomaly detection error:", error.message);
    return [];
  }
}

/**
 * Generate recommendations based on metrics
 */
export async function generateRecommendations(metrics) {
  try {
    const recommendations = [];

    // Match rate low
    if (metrics.matchRate && metrics.matchRate < 30) {
      recommendations.push({
        priority: "high",
        title: "Improve visitor identification",
        description: "Your match rate is below 30%. Consider implementing more identification strategies.",
        action: "Review your lead capture and enrichment settings"
      });
    }

    // Conversion rate low
    if (metrics.conversionRate && metrics.conversionRate < 2) {
      recommendations.push({
        priority: "high",
        title: "Optimize conversion funnel",
        description: "Conversion rate is below industry average. Analyze your funnel for bottlenecks.",
        action: "Review drop-off points in your conversion journey"
      });
    }

    // Bounce rate high
    if (metrics.bounceRate && metrics.bounceRate > 50) {
      recommendations.push({
        priority: "medium",
        title: "Reduce bounce rate",
        description: "High bounce rate indicates engagement issues on entry pages.",
        action: "Analyze landing pages and improve content relevance"
      });
    }

    return recommendations;
  } catch (error) {
    console.error("Recommendation generation error:", error.message);
    return [];
  }
}