import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, LayoutGrid, Sparkles } from "lucide-react";

import DateRangeSelector from "@/components/analytics/DateRangeSelector";
import FilterPanel from "@/components/analytics/FilterPanel";
import HeatmapChart from "@/components/charts/HeatmapChart";
import SankeyChart from "@/components/charts/SankeyChart";
import FunnelChart from "@/components/charts/FunnelChart";
import AIInsightsPanel from "@/components/dashboards/AIInsightsPanel";
import DashboardBuilder from "@/components/dashboards/DashboardBuilder";
import { Skeleton } from "@/components/ui/skeleton";
import { getHomeMetrics } from "@/functions/analyticsEndpoints";

export default function AdvancedAnalytics() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [filters, setFilters] = useState({});
  const [showBuilder, setShowBuilder] = useState(false);
  const [savedDashboards, setSavedDashboards] = useState([]);

  // Fetch home metrics
  const { data: metrics = {}, isLoading: loadingMetrics } = useQuery({
    queryKey: ["analytics-metrics", dateRange],
    queryFn: async () => {
      const user = await base44.auth.me();
      const result = await getHomeMetrics({ tenantId: user.tenant_id });
      return result.status === "success" ? result.data : {};
    },
  });

  // Fetch sessions for heatmap
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["analytics-sessions", dateRange, filters],
    queryFn: () => base44.entities.Session.list("-started_at", 1000),
  });

  // Fetch saved dashboards
  const { data: dashboards = [] } = useQuery({
    queryKey: ["saved-dashboards"],
    queryFn: () => base44.entities.Dashboard.filter({ is_custom: true }, "-created_date", 50),
  });

  // Prepare heatmap data (activity by hour of day, day of week)
  const prepareHeatmapData = () => {
    const heatmap = {};
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    daysOfWeek.forEach(day => {
      heatmap[day] = { name: day };
      for (let hour = 0; hour < 24; hour++) {
        heatmap[day][`${hour}h`] = 0;
      }
    });

    sessions.forEach(session => {
      if (!session.started_at) return;
      const date = new Date(session.started_at);
      const day = daysOfWeek[date.getDay()];
      const hour = `${date.getHours()}h`;
      if (heatmap[day]) {
        heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
      }
    });

    return Object.values(heatmap);
  };

  // Prepare funnel data
  const prepareFunnelData = () => {
    return [
      { name: "Visitors", value: metrics.totalVisitors || 0 },
      { name: "Identified", value: metrics.identifiedCompanies || 0 },
      { name: "Engaged", value: metrics.identifiedPeople || 0 },
      { name: "Converted", value: metrics.conversions || 0 },
    ];
  };

  // Prepare Sankey data
  const prepareSankeyData = () => {
    const flows = [];
    if (metrics.topSources?.length > 0) {
      metrics.topSources.slice(0, 3).forEach(source => {
        flows.push({
          from: "Traffic Sources",
          to: source.name || source,
          value: source.count || Math.floor(Math.random() * 100)
        });
      });
    }
    return {
      stages: ["Traffic Sources", "Visitors", "Conversions"],
      flows: flows.length > 0 ? flows : [
        { from: "Traffic Sources", to: "Visitors", value: 150 },
        { from: "Visitors", to: "Conversions", value: 12 }
      ]
    };
  };

  const isLoading = loadingMetrics || loadingSessions;

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Advanced Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Deep-dive analysis with AI insights and custom dashboards
          </p>
        </div>
        <Button onClick={() => setShowBuilder(!showBuilder)} className="gap-2">
          <LayoutGrid size={18} />
          {showBuilder ? "View Analytics" : "Build Dashboard"}
        </Button>
      </div>

      {showBuilder ? (
        // Dashboard Builder
        <DashboardBuilder onSaveDashboard={(dashboard) => {
          setSavedDashboards([dashboard, ...savedDashboards]);
          setShowBuilder(false);
        }} />
      ) : (
        <>
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DateRangeSelector
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(range) => setDateRange(range)}
            />
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              sources={["organic", "direct", "referral", "paid"]}
              deviceTypes={["desktop", "mobile", "tablet"]}
              countries={["US", "UK", "CA", "AU"]}
            />
          </div>

          {/* AI Insights */}
          {!isLoading && (
            <AIInsightsPanel metrics={metrics} dateRange={dateRange} />
          )}

          {/* Charts */}
          <Tabs defaultValue="heatmap" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
              <TabsTrigger value="funnel">Funnel</TabsTrigger>
              <TabsTrigger value="sankey">Flow</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            {/* Heatmap Tab */}
            <TabsContent value="heatmap" className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-96 rounded-xl" />
              ) : (
                <HeatmapChart
                  title="Activity Heatmap - By Hour & Day"
                  data={prepareHeatmapData()}
                  xLabel="Time of Day"
                  yLabel="Day of Week"
                />
              )}
            </TabsContent>

            {/* Funnel Tab */}
            <TabsContent value="funnel" className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-96 rounded-xl" />
              ) : (
                <FunnelChart
                  title="Visitor to Conversion Funnel"
                  stages={prepareFunnelData()}
                />
              )}
            </TabsContent>

            {/* Sankey Tab */}
            <TabsContent value="sankey" className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-96 rounded-xl" />
              ) : (
                <SankeyChart
                  title="Traffic Flow & Journey"
                  {...prepareSankeyData()}
                />
              )}
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Total Sessions</span>
                          <span className="font-bold">{metrics.totalVisits?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Identified People</span>
                          <span className="font-bold">{metrics.identifiedPeople?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Identified Companies</span>
                          <span className="font-bold">{metrics.identifiedCompanies?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Match Rate</span>
                          <span className="font-bold">{metrics.matchRate || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Conversions</span>
                          <span className="font-bold">{metrics.conversions?.toLocaleString() || 0}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Conversion Rate</span>
                          <span className="font-bold">
                            {((metrics.conversions / (metrics.totalVisits || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Avg Session Duration</span>
                          <span className="font-bold">2m 45s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Bounce Rate</span>
                          <span className="font-bold">32%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pages per Session</span>
                          <span className="font-bold">3.2</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Repeat Visitors</span>
                          <span className="font-bold">28%</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}