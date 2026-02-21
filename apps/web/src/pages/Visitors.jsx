import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Filter, Download, ExternalLink, Linkedin, LayoutList, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import IntentScore from "@/components/shared/IntentScore";
import VisitorCollectionViewer from "@/components/visitors/VisitorCollectionViewer";
import moment from "moment";

export default function Visitors() {
  const [identityFilter, setIdentityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("table");

  const { data: visitors = [], isLoading: loadingVisitors } = useQuery({
    queryKey: ["visitors"],
    queryFn: () => base44.entities.Visitor.list("-last_seen_at", 200),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => base44.entities.Person.list("-created_date", 200),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 200),
  });

  const peopleMap = Object.fromEntries(people.map(p => [p.id, p]));
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));

  const enriched = visitors.map(v => {
    const person = v.person_id ? peopleMap[v.person_id] : null;
    const company = v.company_id ? companyMap[v.company_id] : null;
    return {
      ...v,
      name: person ? `${person.first_name || ""} ${person.last_name || ""}`.trim() : "Anonymous",
      email: person?.email || "\u2014",
      personTitle: person?.title || "\u2014",
      companyName: company?.name || person?.company_name || "\u2014",
      location: person ? [person.city, person.country].filter(Boolean).join(", ") || "\u2014" : "\u2014",
      linkedinUrl: person?.linkedin_url,
    };
  });

  const filtered = enriched.filter(v => {
    if (identityFilter !== "all" && v.identity_status !== identityFilter) return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    return true;
  });

  const columns = [
    {
      key: "name",
      label: "Visitor",
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-violet-600">
              {val?.charAt(0) || "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 text-sm truncate">{val}</p>
            <p className="text-xs text-slate-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "personTitle",
      label: "Title",
      sortable: true,
    },
    {
      key: "companyName",
      label: "Company",
      sortable: true,
      render: (val) => <span className="font-medium text-slate-700">{val}</span>,
    },
    {
      key: "location",
      label: "Location",
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
      key: "last_seen_at",
      label: "Last Seen",
      sortable: true,
      render: (val) => val ? (
        <span className="text-xs text-slate-500">{moment(val).fromNow()}</span>
      ) : "\u2014",
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Visitors</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} visitors found</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="table" className="gap-1.5">
            <LayoutList className="w-3.5 h-3.5" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Event Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Filters:</span>
            </div>
            <Select value={identityFilter} onValueChange={setIdentityFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Identity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Identity</SelectItem>
                <SelectItem value="anonymous">Anonymous</SelectItem>
                <SelectItem value="identified_person">Person</SelectItem>
                <SelectItem value="identified_company">Company</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="returning">Returning</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            isLoading={loadingVisitors}
            emptyMessage="No visitors found"
            emptyIcon={Users}
            onRowClick={(row) => {
              window.location.href = createPageUrl("VisitorDetail") + `?id=${row.id}`;
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <VisitorCollectionViewer
            collectionName="All Visitors"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
