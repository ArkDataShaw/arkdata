import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function EstimatedChargesTrend({ usage = {}, unitPrice = 30 }) {
  // Mock daily usage data for current period
  const dailyUsageData = [
    { day: "1", leads: 12, charge: (12 * unitPrice) / 100 },
    { day: "2", charge: (18 * unitPrice) / 100, leads: 18 },
    { day: "3", charge: (15 * unitPrice) / 100, leads: 15 },
    { day: "4", charge: (22 * unitPrice) / 100, leads: 22 },
    { day: "5", charge: (25 * unitPrice) / 100, leads: 25 },
    { day: "6", charge: (19 * unitPrice) / 100, leads: 19 },
    { day: "7", charge: (28 * unitPrice) / 100, leads: 28 },
  ];

  const cumulativeData = dailyUsageData.map((item, idx) => ({
    ...item,
    cumulativeCharge: (
      dailyUsageData.slice(0, idx + 1).reduce((sum, d) => sum + d.charge, 0)
    ).toFixed(2),
  }));

  const totalEstimated = cumulativeData[cumulativeData.length - 1]?.cumulativeCharge || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated Charges Trend</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Daily charges based on usage @ ${(unitPrice / 100).toFixed(2)}/lead
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" label={{ value: "Day of period", position: "insideBottom", offset: -5 }} />
              <YAxis label={{ value: "Cumulative charge ($)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgb(71, 85, 105)",
                  borderRadius: "0.375rem",
                }}
                formatter={(value) => `$${value}`}
                labelStyle={{ color: "white" }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeCharge"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Estimated Charges (7 days)
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              ${totalEstimated}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Average Daily Charge
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              ${(totalEstimated / 7).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}