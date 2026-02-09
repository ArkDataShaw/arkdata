import React, { useState, useEffect } from "react";
import { BaseChart } from "@/components/charts/ChartBase";
import { getIntegrationsHealth } from "@/functions/analyticsEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function IntegrationsCharts({ tenantId }) {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getIntegrationsHealth({ tenantId });
      if (result.status === "success") setHealthData(result.data);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  return (
    <div className="space-y-6 mt-8">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-h3">Integration Health</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Success vs failure rates by provider</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthData.map((item, idx) => {
              const total = item.success + item.failed;
              const successRate = ((item.success / total) * 100).toFixed(1);
              return (
                <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{item.name}</p>
                    <span className="text-xs font-semibold text-success">{successRate}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
                    <div
                      className="bg-success rounded-full h-2"
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.success} successful, {item.failed} failed
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}