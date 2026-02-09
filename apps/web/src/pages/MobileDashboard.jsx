import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, Building2, Activity, Target, Eye, RefreshCw } from "lucide-react";
import moment from "moment";

export default function MobileDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: visitors = [], refetch: refetchVisitors } = useQuery({
    queryKey: ["visitors-mobile"],
    queryFn: () => base44.entities.Visitor.list("-last_seen_at", 10),
  });

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["sessions-mobile"],
    queryFn: () => base44.entities.Session.list("-started_at", 20),
  });

  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ["companies-mobile"],
    queryFn: () => base44.entities.Company.list("-last_seen_at", 10),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchVisitors(), refetchSessions(), refetchCompanies()]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate metrics
  const totalVisits = sessions.length;
  const identifiedPeople = visitors.filter(v => v.identity_status !== "anonymous").length;
  const identifiedCompanies = companies.length;
  const conversions = sessions.filter(s => s.is_converted).length;

  const MetricCard = ({ icon: Icon, label, value, change, color }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className={refreshing ? "animate-spin" : ""}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Eye}
            label="Total Visits"
            value={totalVisits}
            change={12}
            color="bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400"
          />
          <MetricCard
            icon={Users}
            label="Identified"
            value={identifiedPeople}
            change={8}
            color="bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400"
          />
          <MetricCard
            icon={Building2}
            label="Companies"
            value={identifiedCompanies}
            change={-3}
            color="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400"
          />
          <MetricCard
            icon={Target}
            label="Conversions"
            value={conversions}
            change={15}
            color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="visitors" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="visitors" className="text-xs">Visitors</TabsTrigger>
            <TabsTrigger value="companies" className="text-xs">Companies</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="visitors" className="space-y-2 mt-3">
            {visitors.slice(0, 8).map((visitor) => (
              <Card key={visitor.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {visitor.visitor_cookie_id?.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {visitor.visitor_cookie_id?.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {moment(visitor.last_seen_at).fromNow()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {visitor.identity_status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{visitor.total_sessions} sessions</span>
                  <span>•</span>
                  <span>{visitor.total_pageviews} views</span>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="companies" className="space-y-2 mt-3">
            {companies.slice(0, 8).map((company) => (
              <Card key={company.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {company.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {company.industry || "Unknown industry"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                    {company.visitor_count || 0} visitors
                  </Badge>
                </div>
                {company.hq_location && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    📍 {company.hq_location}
                  </p>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-2 mt-3">
            {sessions.slice(0, 10).map((session) => (
              <Card key={session.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100 truncate">
                      {session.entry_url || "Unknown page"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {moment(session.started_at).fromNow()} • {session.pageviews_count || 0} views
                    </p>
                  </div>
                  {session.is_converted && (
                    <Badge className="bg-emerald-500 text-white text-xs">
                      Converted
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}