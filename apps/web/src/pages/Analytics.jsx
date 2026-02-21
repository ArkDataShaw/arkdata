import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, Target, Layers } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))", "hsl(var(--chart-7))", "hsl(var(--chart-8))"];

export default function Analytics() {
  const [dateRange, setDateRange] = useState(null);
  const [deviceType, setDeviceType] = useState("");
  const [trafficSource, setTrafficSource] = useState("");
  const [identityStatus, setIdentityStatus] = useState("");

  // Mock data
  const mockSessions = Array.from({ length: 15000 }, (_, i) => ({
    id: `s${i}`,
    device_type: ["desktop", "mobile", "tablet"][Math.floor(Math.random() * 3)],
    utm_source: ["google", "facebook", "direct", "linkedin", "twitter", "instagram", "email", "referral"][Math.floor(Math.random() * 8)],
    started_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    person_id: Math.random() > 0.65 ? `p${Math.floor(Math.random() * 5000)}` : null,
    company_id: Math.random() > 0.75 ? `c${Math.floor(Math.random() * 500)}` : null,
    is_converted: Math.random() > 0.92,
  }));

  const mockVisitors = Array.from({ length: 8000 }, (_, i) => ({
    id: `v${i}`,
    identity_status: ["anonymous", "identified_person", "identified_company", "both"][Math.floor(Math.random() * 4)],
    last_seen_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    intent_score: Math.floor(Math.random() * 100),
    created_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const mockPeople = Array.from({ length: 5000 }, (_, i) => ({
    id: `p${i}`,
    seniority: ["entry", "mid", "senior", "director", "vp", "c_level"][Math.floor(Math.random() * 6)],
    created_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { data: sessions = mockSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => Promise.resolve(mockSessions),
  });

  const { data: visitors = mockVisitors } = useQuery({
    queryKey: ["visitors"],
    queryFn: () => Promise.resolve(mockVisitors),
  });

  const { data: people = mockPeople } = useQuery({
    queryKey: ["people"],
    queryFn: () => Promise.resolve(mockPeople),
  });

  // Filter data based on selected filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (deviceType && s.device_type !== deviceType) return false;
      if (trafficSource && (s.utm_source || "Direct") !== trafficSource) return false;
      if (dateRange?.from && new Date(s.started_at || s.created_date) < dateRange.from) return false;
      if (dateRange?.to && new Date(s.started_at || s.created_date) > dateRange.to) return false;
      return true;
    });
  }, [sessions, deviceType, trafficSource, dateRange]);

  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (identityStatus && v.identity_status !== identityStatus) return false;
      if (dateRange?.from && new Date(v.last_seen_at || v.created_date) < dateRange.from) return false;
      if (dateRange?.to && new Date(v.last_seen_at || v.created_date) > dateRange.to) return false;
      return true;
    });
  }, [visitors, identityStatus, dateRange]);

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (dateRange?.from && new Date(p.created_date) < dateRange.from) return false;
      if (dateRange?.to && new Date(p.created_date) > dateRange.to) return false;
      return true;
    });
  }, [people, dateRange]);

  // Extract unique traffic sources
  const uniqueSources = useMemo(() => {
    const sources = new Set(sessions.map((s) => s.utm_source || "Direct"));
    return Array.from(sources).sort();
  }, [sessions]);

  // Aggregate data for charts with filtered data
   const dailyData = {};
   filteredSessions.forEach((s, idx) => {
     const d = (s.started_at || s.created_date)?.slice(0, 10);
     if (!d) return;
     if (!dailyData[d]) dailyData[d] = { date: d, visits: 0, identified: 0, conversions: 0 };
     dailyData[d].visits++;
     if (s.person_id || s.company_id || idx % 3 === 0) dailyData[d].identified++;
     if (s.is_converted) dailyData[d].conversions++;
   });
   const trendData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  // Device breakdown
  const deviceMap = {};
  filteredSessions.forEach(s => { if (s.device_type) deviceMap[s.device_type] = (deviceMap[s.device_type] || 0) + 1; });
  const deviceData = Object.entries(deviceMap).map(([name, value]) => ({ name, value }));

  // Source breakdown
  const sourceMap = {};
  filteredSessions.forEach(s => {
    const src = s.utm_source || "Direct";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).sort(([,a],[,b]) => b - a).slice(0, 8).map(([name, value]) => ({ name, value }));

  // Identity distribution
  const identityMap = {};
  filteredVisitors.forEach(v => { identityMap[v.identity_status || "anonymous"] = (identityMap[v.identity_status || "anonymous"] || 0) + 1; });
  const identityData = Object.entries(identityMap).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  // Seniority breakdown
  const seniorityMap = {};
  filteredPeople.forEach(p => { if (p.seniority) seniorityMap[p.seniority] = (seniorityMap[p.seniority] || 0) + 1; });
  const seniorityData = Object.entries(seniorityMap).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[hsl(var(--chart-tooltip-bg))] text-[hsl(var(--chart-tooltip-text))] text-xs rounded-lg px-3 py-2 shadow-xl">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i}>{p.name}: {p.value?.toLocaleString()}</p>
        ))}
      </div>
    );
  };

  const handleResetFilters = () => {
    setDateRange(null);
    setDeviceType("");
    setTrafficSource("");
    setIdentityStatus("");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Deep insights into your traffic and identification</p>
      </div>

      <AnalyticsFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        deviceType={deviceType}
        onDeviceTypeChange={setDeviceType}
        trafficSource={trafficSource}
        onTrafficSourceChange={setTrafficSource}
        identityStatus={identityStatus}
        onIdentityStatusChange={setIdentityStatus}
        onReset={handleResetFilters}
        sources={uniqueSources}
      />

      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Sessions" value={filteredSessions.length.toLocaleString()} icon={BarChart3} change={12} />
          <MetricCard title="Unique Visitors" value={filteredVisitors.length.toLocaleString()} icon={Users} change={8} />
          <MetricCard title="Identified" value={filteredVisitors.filter(v => v.identity_status !== "anonymous").length.toLocaleString()} icon={Target} change={15} />
          <MetricCard title="Conversions" value={filteredSessions.filter(s => s.is_converted).length.toLocaleString()} icon={Layers} change={5} />
        </div>

        <div className="surface-card p-5">
          <h3 className="text-h3 mb-4">Daily Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} stroke="hsl(var(--chart-axis))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--chart-axis))" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="visits" stroke="hsl(var(--chart-1))" fill="url(#aGrad)" strokeWidth={2} name="Visits" />
              <Area type="monotone" dataKey="identified" stroke="hsl(var(--chart-3))" fill="transparent" strokeWidth={2} name="Identified" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="surface-card p-5">
            <h3 className="text-h3 mb-4">Device Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="surface-card p-5">
            <h3 className="text-h3 mb-4">Sessions Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} stroke="hsl(var(--chart-axis))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--chart-axis))" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="visits" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface-card p-5">
          <h3 className="text-h3 mb-4">Traffic Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--chart-axis))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} stroke="hsl(var(--chart-axis))" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="surface-card p-5">
            <h3 className="text-h3 mb-4">Identity Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={identityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {identityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="surface-card p-5">
            <h3 className="text-h3 mb-4">Identification Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9D4EDD" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#9D4EDD" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} stroke="hsl(var(--chart-axis))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--chart-axis))" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="identified" stroke="#9D4EDD" fill="url(#purpleGrad)" strokeWidth={3} name="Identified" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="surface-card p-5">
            <h3 className="text-h3 mb-4">Intent Score Distribution</h3>
            {(() => {
              const buckets = [
                { name: "0-20", count: filteredVisitors.filter(v => (v.intent_score || 0) <= 20).length },
                { name: "21-40", count: filteredVisitors.filter(v => v.intent_score > 20 && v.intent_score <= 40).length },
                { name: "41-60", count: filteredVisitors.filter(v => v.intent_score > 40 && v.intent_score <= 60).length },
                { name: "61-80", count: filteredVisitors.filter(v => v.intent_score > 60 && v.intent_score <= 80).length },
                { name: "81-100", count: filteredVisitors.filter(v => v.intent_score > 80).length },
              ];
              return (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={buckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--chart-axis))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--chart-axis))" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#FF9500" radius={[4, 4, 0, 0]} name="Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
          <div className="surface-card p-5">
            <h3 className="text-h3 mb-4">Seniority Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={seniorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {seniorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}