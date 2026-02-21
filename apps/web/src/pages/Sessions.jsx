import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Activity, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function Sessions() {
  const [convertedFilter, setConvertedFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => base44.entities.Session.list("-started_at", 500),
  });

  const filtered = sessions.filter(s => {
    if (convertedFilter === "converted" && !s.is_converted) return false;
    if (convertedFilter === "not_converted" && s.is_converted) return false;
    if (deviceFilter !== "all" && s.device_type !== deviceFilter) return false;
    return true;
  });

  const columns = [
    {
      key: "started_at",
      label: "Time",
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-600 font-medium tabular-nums">
          {val ? moment(val).format("MMM D, h:mm A") : "—"}
        </span>
      ),
    },
    {
      key: "visitor_cookie_id",
      label: "Visitor",
      render: (val) => <span className="text-sm text-slate-600 font-mono">{val?.slice(0, 12) || "—"}</span>,
    },
    {
      key: "entry_url",
      label: "Entry Page",
      render: (val) => <span className="text-sm text-slate-600 truncate max-w-[200px] block">{val || "Direct"}</span>,
    },
    {
      key: "exit_url",
      label: "Exit Page",
      render: (val) => <span className="text-sm text-slate-500 truncate max-w-[200px] block">{val || "—"}</span>,
    },
    {
      key: "pageviews_count",
      label: "Pages",
      sortable: true,
      render: (val) => <span className="tabular-nums">{val || 1}</span>,
    },
    {
      key: "duration_seconds",
      label: "Duration",
      sortable: true,
      render: (val) => <span className="tabular-nums text-xs">{val ? `${Math.round(val / 60)}m ${val % 60}s` : "<1m"}</span>,
    },
    {
      key: "utm_source",
      label: "Source",
      render: (val, row) => val ? (
        <Badge variant="outline" className="text-xs">{val}{row.utm_medium ? ` / ${row.utm_medium}` : ""}</Badge>
      ) : <span className="text-slate-300">—</span>,
    },
    {
      key: "device_type",
      label: "Device",
      render: (val) => <span className="text-xs capitalize text-slate-500">{val || "—"}</span>,
    },
    {
      key: "is_converted",
      label: "Converted",
      render: (val) => val ? (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Yes</Badge>
      ) : (
        <span className="text-xs text-slate-400">No</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Sessions</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} sessions</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <Select value={convertedFilter} onValueChange={setConvertedFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="not_converted">Not Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No sessions recorded yet"
        emptyIcon={Activity}
      />
    </div>
  );
}