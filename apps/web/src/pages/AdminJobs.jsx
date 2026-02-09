import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function AdminJobs() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 100),
  });

  const retryMutation = useMutation({
    mutationFn: (id) => base44.entities.Job.update(id, {
      status: "queued",
      next_run_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Job.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const columns = [
    {
      key: "type",
      label: "Job Type",
      render: (val) => <Badge variant="outline" className="capitalize text-xs">{val?.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "attempts",
      label: "Attempts",
      render: (val, row) => <span className="text-xs tabular-nums">{val}/{row.max_attempts || 3}</span>,
    },
    {
      key: "next_run_at",
      label: "Next Run",
      render: (val) => val ? <span className="text-xs text-slate-500">{moment(val).fromNow()}</span> : "—",
    },
    {
      key: "last_error",
      label: "Error",
      render: (val) => val ? <span className="text-xs text-red-500 truncate max-w-[200px] block">{val}</span> : "—",
    },
    {
      key: "created_date",
      label: "Created",
      render: (val) => <span className="text-xs text-slate-500">{moment(val).fromNow()}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {row.status === "failed" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => retryMutation.mutate(row.id)}>
              <Play className="w-3.5 h-3.5 text-emerald-500" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(row.id)}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Queue</h1>
        <p className="text-sm text-slate-500 mt-1">Background jobs with retry & dead-letter queue</p>
      </div>
      <DataTable columns={columns} data={jobs} isLoading={isLoading} emptyMessage="No jobs" emptyIcon={Database} />
    </div>
  );
}