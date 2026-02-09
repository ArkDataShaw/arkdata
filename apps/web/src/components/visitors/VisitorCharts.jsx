import React, { useState, useEffect } from "react";
import { BaseChart } from "@/components/charts/ChartBase";
import {
  getPeopleTrend,
  getIntentScoreDistribution,
  getTopJobTitles,
} from "@/functions/analyticsEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VisitorCharts({ tenantId }) {
  const [peopleTrend, setPeopleTrend] = useState([]);
  const [intentScores, setIntentScores] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [trend, scores, titles] = await Promise.all([
        getPeopleTrend({ tenantId, days: 30 }),
        getIntentScoreDistribution({ tenantId }),
        getTopJobTitles({ tenantId }),
      ]);

      if (trend.status === "success") setPeopleTrend(trend.data);
      if (scores.status === "success") setIntentScores(scores.data);
      if (titles.status === "success") setJobTitles(titles.data);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  return (
    <div className="space-y-6 mt-8">
      <BaseChart
        title="Identified People Trend"
        subtitle="New people identified over last 30 days"
        data={peopleTrend}
        type="line"
        series={[{ key: "identified", name: "Identified People" }]}
        height={300}
      />

      <BaseChart
        title="Intent Score Distribution"
        subtitle="How many visitors fall into each intent score range"
        data={intentScores}
        type="bar"
        series={[{ key: "count", name: "Count" }]}
        height={250}
      />

      <BaseChart
        title="Top Job Titles"
        subtitle="Most common roles among identified people"
        data={jobTitles}
        type="bar"
        series={[{ key: "count", name: "Count" }]}
        height={250}
      />
    </div>
  );
}