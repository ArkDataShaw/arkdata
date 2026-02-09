import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function AdminLogs() {
  const [logType, setLogType] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 200),
  });

  const filtered = logType === "all" ? logs : logs.filter(l => l.actor_type === logType);

  const columns = [
    {
      key: "created_date",
      label: "Time",
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500 tabular-nums">{moment(val).format("MMM D, h:mm:ss A")}</span>,
    },
    {
      key: "actor_email",
      label: "Actor",
      render: (val) => <span className="text-sm font-medium">{val || "System"}</span>,
    },
    {
      key: "actor_type",
      label: "Type",
      render: (val) => <Badge variant="outline" className="text-xs capitalize">{val}</Badge>,
    },
    {
      key: "action",
      label: "Action",
      render: (val) => <span className="text-sm">{val}</span>,
    },
    {
      key: "entity_type",
      label: "Entity",
      render: (val, row) => val ? (
        <span className="text-xs text-slate-500">{val} {row.entity_id ? `#${row.entity_id.slice(0, 8)}` : ""}</span>
      ) : "—",
    },
    {
      key: "details",
      label: "Details",
      render: (val) => val ? <span className="text-xs text-slate-500 truncate max-w-[200px] block">{val}</span> : "—",
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">View all system and user activity</p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <Select value={logType} onValueChange={setLogType}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No logs" emptyIcon={FileText} />
    </div>
  );
}