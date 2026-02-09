import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clock, MousePointerClick, Eye, Globe, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const fmtTime = (d) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);

const fmtDuration = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return [h ? String(h).padStart(2, "0") : null, String(m).padStart(2, "0"), String(r).padStart(2, "0")]
    .filter(Boolean)
    .join(":");
};

const iconFor = (type) => {
  switch (type) {
    case "page_view":
      return <Eye className="h-4 w-4" />;
    case "click":
      return <MousePointerClick className="h-4 w-4" />;
    case "scroll":
      return <Globe className="h-4 w-4" />;
    case "form_submit":
      return <FileText className="h-4 w-4" />;
    case "identify":
      return <Zap className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

/**
 * Fetch visitors from Firestore via the ArkData Firebase SDK.
 * Falls back to the Visitor entity's list/filter methods.
 */
async function fetchVisitors(page, pageSize, query) {
  try {
    // Fetch visitors sorted by last_seen_at descending
    const allVisitors = query
      ? await base44.entities.Visitor.filter({}, "-last_seen_at", 500)
      : await base44.entities.Visitor.list("-last_seen_at", 500);

    // Client-side search filter (Firestore doesn't support full-text search natively)
    const filtered = query
      ? allVisitors.filter((v) =>
          [v.first_name, v.last_name, v.job_title, v.company_name]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(query.toLowerCase()))
        )
      : allVisitors;

    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((v) => ({
      id: v.id,
      name: [v.first_name, v.last_name].filter(Boolean).join(" ") || "Anonymous",
      jobTitle: v.job_title,
      company: v.company_name,
      email: v.email,
      identityStatus: v.identity_status,
      intentScore: v.intent_score,
      sessionLengthSec: v.session_count ? (v.session_count * 120) : 0, // estimated
      arrivedAt: v.first_seen_at || v.created_at,
      lastSeen: v.last_seen_at,
      eventCount: v.event_count || 0,
      events: [], // Events loaded on expand
    }));

    return { items, total: filtered.length, page, pageSize };
  } catch (error) {
    console.error("Error fetching visitors:", error);
    return { items: [], total: 0, page, pageSize };
  }
}

/**
 * Fetch events for a specific visitor from Firestore.
 */
async function fetchVisitorEvents(visitorId) {
  try {
    const sessions = await base44.entities.Session.filter(
      { visitor_id: visitorId },
      "-started_at",
      10
    );

    // Also try to get raw events
    const events = await base44.entities.RawEvent.filter(
      { visitor_id: visitorId },
      "-event_timestamp",
      50
    ).catch(() => []);

    return events.map((e) => ({
      id: e.id,
      type: e.event_type || "page_view",
      pageUrl: e.url || "",
      timeOnPageSec: e.time_on_page_sec,
      ts: e.event_timestamp || e.created_at,
      meta: e.metadata,
    }));
  } catch (error) {
    console.error("Error fetching visitor events:", error);
    return [];
  }
}

// ---------------------------------------------
// Core Component
// ---------------------------------------------
export default function VisitorCollectionViewer({
  collectionId = "all",
  collectionName = "Website Visitors",
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize });
  const [expanded, setExpanded] = useState({});
  const [visitorEvents, setVisitorEvents] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchVisitors(page, pageSize, query).then((res) => {
      if (!mounted) return;
      setData(res);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [collectionId, page, pageSize, query]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(data.total / pageSize)), [data.total, pageSize]);

  const toggle = async (id) => {
    const isCurrentlyOpen = !!expanded[id];
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

    // Lazy-load events when expanding
    if (!isCurrentlyOpen && !visitorEvents[id]) {
      const events = await fetchVisitorEvents(id);
      setVisitorEvents((prev) => ({ ...prev, [id]: events }));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{collectionName}</CardTitle>
        <CardDescription>Visitors landing on your site — click to expand event timeline</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex gap-2 items-center w-full md:w-auto">
            <Input
              placeholder="Search visitors, titles, companies..."
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              className="w-full md:w-[320px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(Number(v)); }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Page size" /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Title / Company</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="py-10 text-center text-muted-foreground">Loading visitors...</div>
                  </TableCell>
                </TableRow>
              )}

              {!loading && data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="py-10 text-center text-muted-foreground">No visitors found.</div>
                  </TableCell>
                </TableRow>
              )}

              {!loading && data.items.map((v) => {
                const isOpen = !!expanded[v.id];
                const events = visitorEvents[v.id] || [];
                const pagesViewed = Array.from(new Set(events.map((e) => e.pageUrl).filter(Boolean)));

                return (
                  <React.Fragment key={v.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggle(v.id)} aria-expanded={isOpen}>
                      <TableCell className="align-middle">
                        <div className="flex items-center justify-center">
                          {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="font-medium leading-tight">{v.name}</div>
                        <div className="text-xs text-muted-foreground">{v.email || `ID ${v.id.slice(0, 8)}`}</div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="text-sm">{v.jobTitle ?? "\u2014"}</div>
                        <div className="text-xs text-muted-foreground">{v.company ?? "\u2014"}</div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant={
                          v.identityStatus === "verified" ? "default" :
                          v.identityStatus === "identified" ? "secondary" :
                          v.identityStatus === "partially_identified" ? "outline" :
                          "destructive"
                        }>
                          {v.identityStatus || "anonymous"}
                        </Badge>
                        {v.intentScore > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">Score: {v.intentScore}</div>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        {v.lastSeen ? fmtTime(new Date(v.lastSeen)) : "\u2014"}
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        <Badge variant="secondary">{v.eventCount}</Badge>
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                          <div className="px-5 py-4 grid gap-6 md:grid-cols-3">
                            {/* Session Summary */}
                            <div className="md:col-span-1">
                              <div className="text-sm font-medium mb-2">Visitor Summary</div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">First Seen</div>
                                <div>{v.arrivedAt ? fmtTime(new Date(v.arrivedAt)) : "\u2014"}</div>
                                <div className="text-muted-foreground">Last Seen</div>
                                <div>{v.lastSeen ? fmtTime(new Date(v.lastSeen)) : "\u2014"}</div>
                                <div className="text-muted-foreground">Events</div>
                                <div>{v.eventCount}</div>
                                <div className="text-muted-foreground">Pages</div>
                                <div>{pagesViewed.length}</div>
                              </div>
                              {pagesViewed.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-sm font-medium mb-1">Pages Viewed</div>
                                  <ul className="text-sm list-disc pl-5 space-y-1">
                                    {pagesViewed.map((p) => (
                                      <li key={p} className="truncate" title={p}>{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Events Timeline */}
                            <div className="md:col-span-2">
                              <div className="text-sm font-medium mb-2">Events Timeline</div>
                              {events.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-4 text-center">
                                  Loading events...
                                </div>
                              ) : (
                                <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                                  {events
                                    .slice()
                                    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
                                    .map((e) => (
                                      <div key={e.id} className="p-3 flex flex-wrap md:flex-nowrap items-start gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                          {iconFor(e.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium capitalize">{e.type.replace('_', ' ')}</div>
                                          <div className="text-xs text-muted-foreground truncate">{e.pageUrl}</div>
                                          {e.timeOnPageSec && (
                                            <div className="text-xs text-muted-foreground">
                                              {fmtDuration(e.timeOnPageSec)} on page
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                                          {fmtTime(new Date(e.ts))}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of {data.total} visitors
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
