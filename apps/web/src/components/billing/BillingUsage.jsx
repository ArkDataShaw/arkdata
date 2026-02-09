import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Download } from "lucide-react";

export default function BillingUsage({ billingState }) {
  const [source, setSource] = useState("all");

  const enhancedLeads = 127;
  const last7Days = 32;
  const matchRate = 24.5;

  // Mock chart data
  const chartData = [
    { date: "Day 1", count: 12 },
    { date: "Day 2", count: 18 },
    { date: "Day 3", count: 14 },
    { date: "Day 4", count: 22 },
    { date: "Day 5", count: 19 },
    { date: "Day 6", count: 25 },
    { date: "Day 7", count: 17 },
  ];

  const enhancedLeadsTable = [
    {
      id: 1,
      name: "Alice Johnson",
      company: "TechCorp",
      firstSeen: "2025-02-01",
      source: "pixel",
      confidence: 95,
    },
    {
      id: 2,
      name: "Bob Smith",
      company: "DataFlow Inc",
      firstSeen: "2025-02-02",
      source: "enrichment",
      confidence: 87,
    },
    {
      id: 3,
      name: "Carol White",
      company: "InnovateLabs",
      firstSeen: "2025-02-03",
      source: "pixel",
      confidence: 92,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Enhanced Leads This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {enhancedLeads}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Unique identified visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {last7Days}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <p className="text-xs text-green-600">+15% vs prev week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {matchRate}%
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Of total visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Est. Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              $38.10
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              @ $0.30/lead
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Leads by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {chartData.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(item.count / 25) * 100}%` }}
                />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {item.count}
                </p>
                <p className="text-xs text-slate-500">
                  {item.date.split(" ")[1]}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Enhanced Leads List</CardTitle>
          <div className="flex gap-3">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="pixel">Pixel</SelectItem>
                <SelectItem value="enrichment">Enrichment</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-medium">
                    Name
                  </th>
                  <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-medium">
                    Company
                  </th>
                  <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-medium">
                    First Seen
                  </th>
                  <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-medium">
                    Source
                  </th>
                  <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-medium">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {enhancedLeadsTable.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="py-3 px-2 text-slate-900 dark:text-slate-100">
                      {lead.name}
                    </td>
                    <td className="py-3 px-2 text-slate-700 dark:text-slate-300">
                      {lead.company}
                    </td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                      {lead.firstSeen}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary" className="text-xs">
                        {lead.source}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                      {lead.confidence}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}