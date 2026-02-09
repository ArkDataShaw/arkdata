import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

export default function AdminIntegrations() {
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: () => base44.entities.IntegrationProvider.list(),
  });

  const columns = [
    {
      key: "display_name",
      label: "Provider",
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-base">
            {row.icon_url || "🔌"}
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{val}</p>
            <p className="text-xs text-slate-400">{row.key}</p>
          </div>
        </div>
      ),
    },
    {
      key: "auth_type",
      label: "Auth",
      render: (val) => <Badge variant="outline" className="text-xs uppercase">{val}</Badge>,
    },
    {
      key: "category",
      label: "Category",
      render: (val) => <span className="text-xs capitalize text-slate-600">{val?.replace(/_/g, " ")}</span>,
    },
    {
      key: "enabled",
      label: "Status",
      render: (val) => <StatusBadge status={val ? "active" : "suspended"} />,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integrations Registry</h1>
        <p className="text-sm text-slate-500 mt-1">Manage available integration providers</p>
      </div>
      <DataTable columns={columns} data={providers} isLoading={isLoading} emptyMessage="No providers" emptyIcon={Plug} />
    </div>
  );
}