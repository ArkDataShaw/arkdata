import React, { useState, useEffect } from "react";
import { BaseChart } from "@/components/charts/ChartBase";
import { getSessionsTrend, getTopUtmSources, getTopPages } from "@/functions/analyticsEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomeCharts({ tenantId }) {
  const [sessionsTrend, setSessionsTrend] = useState([]);
  const [utmSources, setUtmSources] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [trends, utm, pages] = await Promise.all([
        getSessionsTrend({ tenantId, days: 30 }),
        getTopUtmSources({ tenantId }),
        getTopPages({ tenantId }),
      ]);

      if (trends.status === "success") setSessionsTrend(trends.data);
      if (utm.status === "success") setUtmSources(utm.data);
      if (pages.status === "success") setTopPages(pages.data);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  return (
    <div className="space-y-6 mt-8">
      {/* Sessions Trend */}
      <BaseChart
        title="Traffic Trends"
        subtitle="Sessions vs Identified vs Conversions over 30 days"
        data={sessionsTrend}
        type="area"
        series={[
          { key: "sessions", name: "Sessions", color: "hsl(214, 88%, 48%)" },
          { key: "identified", name: "Identified", color: "hsl(142, 71%, 45%)" },
          { key: "conversions", name: "Conversions", color: "hsl(38, 92%, 50%)" },
        ]}
        height={300}
      />

      {/* Top UTM Sources */}
      <BaseChart
        title="Top Traffic Sources"
        subtitle="Sessions by UTM source"
        data={utmSources}
        type="bar"
        series={[{ key: "value", name: "Sessions" }]}
        height={250}
      />

      {/* Top Pages */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-h3">Top Pages</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">By session count and conversion rate</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPages.map((page, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{page.name}</p>
                  <p className="text-xs text-muted-foreground">{page.count} sessions</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{(page.cvr * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">CVR</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}