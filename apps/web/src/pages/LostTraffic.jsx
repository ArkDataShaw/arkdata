import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Users, TrendingDown, Target, Lightbulb, ArrowRight, Plug, GitBranch, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/shared/MetricCard";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import IntentScore from "@/components/shared/IntentScore";
import moment from "moment";

export default function LostTraffic() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => base44.entities.Session.list("-started_at", 500),
  });

  const { data: visitors = [] } = useQuery({
    queryKey: ["visitors"],
    queryFn: () => base44.entities.Visitor.list("-last_seen_at", 200),
  });

  const lostSessions = sessions.filter(s => !s.is_converted);
  const highIntentLost = visitors.filter(v => !v.is_converted && v.intent_score >= 60);

  // Top lost sources
  const sourceMap = {};
  lostSessions.forEach(s => {
    const src = s.utm_source || s.referrer || "Direct";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const topSources = Object.entries(sourceMap).sort(([,a],[,b]) => b - a).slice(0, 5);

  // Build table data from high-intent visitors
  const lostVisitors = visitors.filter(v => !v.is_converted).sort((a, b) => (b.intent_score || 0) - (a.intent_score || 0));

  const columns = [
    {
      key: "visitor_cookie_id",
      label: "Visitor",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-red-400" />
          </div>
          <span className="text-sm font-mono text-slate-600">{val?.slice(0, 12) || row.id?.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: "identity_status",
      label: "Identity",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "intent_score",
      label: "Intent",
      sortable: true,
      render: (val) => <IntentScore score={val} />,
    },
    {
      key: "total_sessions",
      label: "Sessions",
      sortable: true,
      render: (val) => <span className="tabular-nums">{val || 0}</span>,
    },
    {
      key: "total_pageviews",
      label: "Pages",
      sortable: true,
      render: (val) => <span className="tabular-nums">{val || 0}</span>,
    },
    {
      key: "utm_source",
      label: "Source",
      render: (val) => val || <span className="text-slate-300">Direct</span>,
    },
    {
      key: "last_seen_at",
      label: "Last Seen",
      sortable: true,
      render: (val) => val ? <span className="text-xs text-slate-500">{moment(val).fromNow()}</span> : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val || "lost"} />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Lost Traffic</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visitors who didn't convert — recover your pipeline</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Lost Sessions"
          value={lostSessions.length.toLocaleString()}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <MetricCard
          title="High Intent Lost"
          value={highIntentLost.length.toLocaleString()}
          icon={Target}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Lost Rate"
          value={sessions.length > 0 ? `${Math.round((lostSessions.length / sessions.length) * 100)}%` : "0%"}
          icon={TrendingDown}
          iconColor="text-orange-500"
          iconBg="bg-orange-50"
        />
        <MetricCard
          title="Lost Visitors"
          value={lostVisitors.length.toLocaleString()}
          icon={Users}
          iconColor="text-slate-500"
          iconBg="bg-slate-100"
        />
      </div>

      {/* Top Sources + Playbooks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Top Lost Traffic Sources</h3>
          <div className="space-y-3">
            {topSources.map(([source, count], i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">{source}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{count}</span>
              </div>
            ))}
            {topSources.length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-violet-100 dark:border-blue-800/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-violet-500 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-violet-900 dark:text-blue-200">Recovery Playbooks</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: Plug, text: "Connect an integration to auto-push high-intent visitors" },
              { icon: GitBranch, text: "Set up routing rules to capture returning visitors" },
              { icon: Target, text: "Create conversion goals to track recovery rate" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                <item.icon className="w-4 h-4 text-violet-500 dark:text-blue-400 flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{item.text}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={lostVisitors}
        isLoading={isLoading}
        emptyMessage="No lost traffic data"
        emptyIcon={AlertTriangle}
      />
    </div>
  );
}