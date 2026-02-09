import React, { useState, useEffect } from "react";
import { BaseChart } from "@/components/charts/ChartBase";
import { getLostSessionsTrend } from "@/functions/analyticsEndpoints";

export default function LostTrafficCharts({ tenantId }) {
  const [lostTrend, setLostTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getLostSessionsTrend({ tenantId, days: 30 });
      if (result.status === "success") setLostTrend(result.data);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  return (
    <div className="space-y-6 mt-8">
      <BaseChart
        title="Lost Sessions Trend"
        subtitle="Sessions that did not convert, with high-intent segment highlighted"
        data={lostTrend}
        type="area"
        series={[
          { key: "lost", name: "Lost Sessions", color: "hsl(0, 84%, 60%)" },
          { key: "highIntent", name: "High Intent Lost", color: "hsl(38, 92%, 50%)" },
        ]}
        height={300}
      />
    </div>
  );
}