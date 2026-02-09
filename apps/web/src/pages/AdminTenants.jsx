import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Layers, Globe, Users, Activity } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function AdminTenants() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date"),
  });

  const columns = [
    {
      key: "name",
      label: "Tenant",
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{val}</p>
            <p className="text-xs text-slate-400">ID: {row.id?.slice(0, 8)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (val) => <Badge variant="outline" className="capitalize text-xs">{val || "starter"}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "active_users",
      label: "Users",
      sortable: true,
      render: (val) => <span className="tabular-nums">{val || 0}</span>,
    },
    {
      key: "domain_count",
      label: "Domains",
      sortable: true,
      render: (val) => <span className="tabular-nums">{val || 0}</span>,
    },
    {
      key: "last_event_at",
      label: "Last Event",
      sortable: true,
      render: (val) => val ? <span className="text-xs text-slate-500">{moment(val).fromNow()}</span> : "—",
    },
    {
      key: "created_date",
      label: "Created",
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500">{moment(val).format("MMM D, YYYY")}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tenants</h1>
        <p className="text-sm text-slate-500 mt-1">Manage all customer accounts</p>
      </div>
      <DataTable columns={columns} data={tenants} isLoading={isLoading} emptyMessage="No tenants" emptyIcon={Layers} />
    </div>
  );
}