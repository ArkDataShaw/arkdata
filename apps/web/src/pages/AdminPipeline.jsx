import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Database, Activity, CheckCircle, AlertCircle, Clock } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import moment from "moment";

export default function AdminPipeline() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["all-sync-jobs"],
    queryFn: () => base44.entities.SyncJob.list("-created_date", 100),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["raw-events-count"],
    queryFn: () => base44.entities.RawEvent.list("-created_date", 100),
  });

  const successJobs = jobs.filter(j => j.status === "success").length;
  const failedJobs = jobs.filter(j => j.status === "failed").length;
  const runningJobs = jobs.filter(j => j.status === "running").length;

  const columns = [
    {
      key: "type",
      label: "Job Type",
      render: (val) => <span className="text-sm capitalize">{val?.replace(/_/g, " ")}</span>,
    },
    { key: "provider_key", label: "Provider", render: (val) => val || "—" },
    { key: "status", label: "Status", render: (val) => <StatusBadge status={val} /> },
    {
      key: "records_processed",
      label: "Records",
      render: (val) => <span className="tabular-nums">{val || 0}</span>,
    },
    { key: "attempts", label: "Attempts", render: (val) => <span className="tabular-nums">{val || 0}</span> },
    {
      key: "error_message",
      label: "Error",
      render: (val) => val ? <span className="text-xs text-red-500 truncate max-w-[200px] block">{val}</span> : "—",
    },
    {
      key: "created_date",
      label: "Created",
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500">{moment(val).fromNow()}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Pipeline & Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor ingestion, sessionization, and sync jobs</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Events Ingested" value={events.length.toLocaleString()} icon={Activity} iconBg="bg-blue-50" iconColor="text-blue-500" />
        <MetricCard title="Jobs Succeeded" value={successJobs.toLocaleString()} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-500" />
        <MetricCard title="Jobs Failed" value={failedJobs.toLocaleString()} icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-500" />
        <MetricCard title="Running" value={runningJobs.toLocaleString()} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
      </div>

      <DataTable columns={columns} data={jobs} isLoading={isLoading} emptyMessage="No jobs" emptyIcon={Database} />
    </div>
  );
}