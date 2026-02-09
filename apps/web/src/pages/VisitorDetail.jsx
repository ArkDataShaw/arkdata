import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, User, Building2, Mail, Phone, Linkedin, MapPin, Calendar, Activity, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/shared/StatusBadge";
import IntentScore from "@/components/shared/IntentScore";
import moment from "moment";

export default function VisitorDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const visitorId = urlParams.get("id");

  const { data: visitor, isLoading } = useQuery({
    queryKey: ["visitor", visitorId],
    queryFn: () => base44.entities.Visitor.list().then(all => all.find(v => v.id === visitorId)),
    enabled: !!visitorId,
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => base44.entities.Person.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["visitor-sessions", visitorId],
    queryFn: () => base44.entities.Session.filter({ visitor_id: visitorId }, "-started_at", 50),
    enabled: !!visitorId,
  });

  const person = visitor?.person_id ? people.find(p => p.id === visitor.person_id) : null;
  const company = visitor?.company_id ? companies.find(c => c.id === visitor.company_id) : null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Visitor not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link to={createPageUrl("Visitors")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Visitors
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-violet-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                {person ? `${person.first_name || ""} ${person.last_name || ""}`.trim() : `Visitor ${visitor.id?.slice(0, 8)}`}
              </h1>
              <StatusBadge status={visitor.identity_status} />
              <StatusBadge status={visitor.status} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
              {person?.email && (
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{person.email}</span>
              )}
              {person?.title && (
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{person.title}</span>
              )}
              {(person?.city || person?.country) && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[person.city, person.country].filter(Boolean).join(", ")}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <IntentScore score={visitor.intent_score} />
              <span className="text-xs text-slate-400">{visitor.total_sessions || 0} sessions · {visitor.total_pageviews || 0} pageviews</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Session History</h3>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No sessions recorded</p>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-700">
                          {s.pageviews_count || 1} pages · {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : "<1m"}
                        </p>
                        {s.is_converted && <Badge className="bg-emerald-50 text-emerald-700 text-xs border-emerald-200">Converted</Badge>}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{s.entry_url || "Direct"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{moment(s.started_at).format("MMM D, YYYY h:mm A")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="company">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            {company ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{company.name}</p>
                    <p className="text-sm text-slate-500">{company.industry} · {company.employee_range} employees</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Domain</p>
                    <p className="text-sm font-medium">{company.domain || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Revenue</p>
                    <p className="text-sm font-medium">{company.revenue_range || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Location</p>
                    <p className="text-sm font-medium">{company.hq_location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Visitors</p>
                    <p className="text-sm font-medium">{company.visitor_count || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4">No company associated</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <p className="text-sm text-slate-400 py-4">No integrations synced for this visitor</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}