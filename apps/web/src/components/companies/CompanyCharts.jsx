import React, { useState, useEffect } from "react";
import { BaseChart } from "@/components/charts/ChartBase";
import { getCompaniesTrend, getIndustryDistribution } from "@/functions/analyticsEndpoints";

export default function CompanyCharts({ tenantId }) {
  const [companiesTrend, setCompaniesTrend] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [trend, dist] = await Promise.all([
        getCompaniesTrend({ tenantId, days: 30 }),
        getIndustryDistribution({ tenantId }),
      ]);

      if (trend.status === "success") setCompaniesTrend(trend.data);
      if (dist.status === "success") setIndustries(dist.data);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  return (
    <div className="space-y-6 mt-8">
      <BaseChart
        title="Active Companies Trend"
        subtitle="Daily active companies over last 30 days"
        data={companiesTrend}
        type="area"
        series={[{ key: "active", name: "Active Companies" }]}
        height={300}
      />

      <BaseChart
        title="Industry Distribution"
        subtitle="Companies by industry"
        data={industries}
        type="bar"
        series={[{ key: "count", name: "Companies" }]}
        height={250}
      />
    </div>
  );
}