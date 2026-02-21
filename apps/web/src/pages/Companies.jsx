import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import IntentScore from "@/components/shared/IntentScore";
import moment from "moment";

export default function Companies() {
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 200),
  });

  const filtered = companies.filter(c => {
    if (industryFilter !== "all" && c.industry !== industryFilter) return false;
    if (sizeFilter !== "all" && c.employee_range !== sizeFilter) return false;
    return true;
  });

  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];

  const columns = [
    {
      key: "name",
      label: "Company",
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            {row.logo_url ? (
              <img src={row.logo_url} alt="" className="w-6 h-6 rounded" />
            ) : (
              <Building2 className="w-4 h-4 text-indigo-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 text-sm">{val}</p>
            <p className="text-xs text-slate-400">{row.domain}</p>
          </div>
        </div>
      ),
    },
    { key: "industry", label: "Industry", sortable: true },
    { key: "employee_range", label: "Size", sortable: true },
    { key: "revenue_range", label: "Revenue" },
    { key: "hq_location", label: "Location" },
    {
      key: "visitor_count",
      label: "Visitors",
      sortable: true,
      render: (val) => <span className="tabular-nums font-medium">{val || 0}</span>,
    },
    {
      key: "intent_score",
      label: "Intent",
      sortable: true,
      render: (val) => <IntentScore score={val} />,
    },
    {
      key: "last_seen_at",
      label: "Last Seen",
      sortable: true,
      render: (val) => val ? <span className="text-xs text-slate-500">{moment(val).fromNow()}</span> : "—",
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Companies</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} companies identified</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sizeFilter} onValueChange={setSizeFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            {["1-10","11-50","51-200","201-500","501-1000","1001-5000","5000+"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No companies identified yet"
        emptyIcon={Building2}
      />
    </div>
  );
}