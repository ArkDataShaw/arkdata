import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function OverviewCharts({ sessions = [] }) {
  // Group sessions by day
  const dayMap = {};
  sessions.forEach(s => {
    const day = (s.started_at || s.created_date)?.slice(0, 10);
    if (!day) return;
    if (!dayMap[day]) dayMap[day] = { date: day, visits: 0, identified: 0, conversions: 0 };
    dayMap[day].visits++;
    if (s.person_id || s.company_id) dayMap[day].identified++;
    if (s.is_converted) dayMap[day].conversions++;
  });
  const chartData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  // Top pages
  const pageMap = {};
  sessions.forEach(s => {
    if (s.entry_url) {
      if (!pageMap[s.entry_url]) pageMap[s.entry_url] = { page: s.entry_url, views: 0 };
      pageMap[s.entry_url].views++;
    }
  });
  const topPages = Object.values(pageMap).sort((a, b) => b.views - a.views).slice(0, 6);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Area Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Traffic & Identification Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="idGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} stroke="#e2e8f0" />
            <YAxis tick={{ fontSize: 11 }} stroke="#e2e8f0" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="visits" stroke="#8b5cf6" fill="url(#visitGrad)" strokeWidth={2} name="Visits" />
            <Area type="monotone" dataKey="identified" stroke="#10b981" fill="url(#idGrad)" strokeWidth={2} name="Identified" />
            <Area type="monotone" dataKey="conversions" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Conversions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Pages */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Top Pages</h3>
        <div className="space-y-3">
          {topPages.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No page data yet</p>
          ) : (
            topPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 w-4">{i + 1}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{p.page}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2">{p.views}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}