import React, { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Activity, AlertTriangle, Eye, Target, Zap, Globe, TrendingUp } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import HomeCharts from "@/components/home/HomeCharts";
import OverviewCharts from "@/components/home/OverviewCharts";
import LiveFeed from "@/components/home/LiveFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { getHomeMetrics } from "@/functions/analyticsEndpoints";

// Lazy-load heavy conditional components
const OnboardingWizard = lazy(() => import("@/components/onboarding/OnboardingWizard"));
const SetupChecklist = lazy(() => import("@/components/onboarding/SetupChecklist"));
const QuickTour = lazy(() => import("@/components/onboarding/QuickTour"));

// --- Diagnostic timer (auto-stops once all divs load) ---
const PERF_KEY = '__arkdata_home_mount';
if (typeof window !== 'undefined' && !window[PERF_KEY]) {
  window[PERF_KEY] = performance.now();
  console.log('%c[Overview] Page mount started', 'color: #8b5cf6; font-weight: bold');
}

function timedQueryFn(label, fn) {
  return async () => {
    const t0 = performance.now();
    console.log(`%c[Overview] ⏳ ${label} — fetching...`, 'color: #94a3b8');
    try {
      const result = await fn();
      const ms = (performance.now() - t0).toFixed(0);
      const count = Array.isArray(result) ? ` (${result.length} rows)` : '';
      console.log(`%c[Overview] ✅ ${label} — ${ms}ms${count}`, 'color: #22c55e; font-weight: bold');
      return result;
    } catch (err) {
      const ms = (performance.now() - t0).toFixed(0);
      console.log(`%c[Overview] ❌ ${label} — FAILED after ${ms}ms: ${err?.message || err}`, 'color: #ef4444; font-weight: bold');
      throw err;
    }
  };
}

export default function Home() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [flowId, setFlowId] = useState(null);
  const [showChecklist, setShowChecklist] = useState(true);

  const STALE_TIME = 30_000; // 30s — avoid re-fetching on nav-away/back

  // Single auth query — all other queries depend on this, no redundant auth.me() calls
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    staleTime: STALE_TIME,
    queryFn: timedQueryFn('auth.me()', () => base44.auth.me()),
  });

  useEffect(() => {
    if (currentUser) {
      setTenantId(currentUser.tenant_id || "default");
    }
    // Listen for tour start event
    const handleStartTour = () => setTourOpen(true);
    window.addEventListener("onboarding:start-tour", handleStartTour);
    return () => window.removeEventListener("onboarding:start-tour", handleStartTour);
  }, [currentUser]);

  const { data: homeMetrics = {} } = useQuery({
    queryKey: ["home-metrics", tenantId],
    staleTime: STALE_TIME,
    enabled: !!tenantId,
    queryFn: timedQueryFn('homeMetrics', async () => {
      try {
        const result = await getHomeMetrics({ tenantId });
        return result.status === "success" ? result.data : {};
      } catch {
        return {};
      }
    }),
  });

  const { data: visitors = [], isLoading: loadingVisitors } = useQuery({
    queryKey: ["visitors"],
    staleTime: STALE_TIME,
    queryFn: timedQueryFn('Visitor.list', () => base44.entities.Visitor.list("-last_seen_at", 50).catch(() => [])),
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["sessions"],
    staleTime: STALE_TIME,
    queryFn: timedQueryFn('Session.list', () => base44.entities.Session.list("-started_at", 50).catch(() => [])),
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    staleTime: STALE_TIME,
    queryFn: timedQueryFn('Company.list', () => base44.entities.Company.list("-created_date", 50).catch(() => [])),
  });

  const { data: people = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["people"],
    staleTime: STALE_TIME,
    queryFn: timedQueryFn('Person.list', () => base44.entities.Person.list("-created_date", 50).catch(() => [])),
  });

  // Log when all queries finish and auto-stop the timer
  const allLoaded = !loadingVisitors && !loadingSessions && !loadingCompanies && !loadingPeople;
  useEffect(() => {
    if (allLoaded && window[PERF_KEY]) {
      const totalMs = (performance.now() - window[PERF_KEY]).toFixed(0);
      console.log(
        `%c[Overview] 🏁 All divs loaded — total time: ${totalMs}ms`,
        'color: #8b5cf6; font-weight: bold; font-size: 14px'
      );
      delete window[PERF_KEY]; // auto-stop, won't log again until next full page load
    }
  }, [allLoaded]);

  const totalVisits = sessions.length;
  const identifiedPeople = people.length;
  const identifiedCompanies = companies.length;
  const matchRate = totalVisits > 0 ? Math.round((visitors.filter(v => v.identity_status !== "anonymous").length / visitors.length) * 100) || 0 : 0;
  const lostTraffic = sessions.filter(s => !s.is_converted).length;
  const conversions = sessions.filter(s => s.is_converted).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Onboarding Components — lazy-loaded, only fetched when flowId exists */}
      {flowId && (
        <Suspense fallback={null}>
          <OnboardingWizard
            open={onboardingOpen}
            onOpenChange={setOnboardingOpen}
            flowId={flowId}
            tenantId={tenantId}
          />
          <QuickTour
            open={tourOpen}
            onOpenChange={setTourOpen}
            tenantId={tenantId}
          />
        </Suspense>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">Your traffic identification at a glance</p>
      </div>

      {/* Metrics — render progressively, show skeleton per card while its query loads */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loadingSessions ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Total Sessions" value={totalVisits.toLocaleString()} icon={Activity} iconColor="text-violet-500" iconBg="bg-violet-50" change={12} changeLabel="vs last period" />
        )}
        {loadingPeople ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="People Identified" value={identifiedPeople.toLocaleString()} icon={Users} iconColor="text-blue-500" iconBg="bg-blue-50" change={8} changeLabel="vs last period" />
        )}
        {loadingCompanies ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Companies Identified" value={identifiedCompanies.toLocaleString()} icon={Building2} iconColor="text-indigo-500" iconBg="bg-indigo-50" change={5} changeLabel="vs last period" />
        )}
        {loadingVisitors ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Match Rate" value={`${matchRate}%`} icon={Target} iconColor="text-emerald-500" iconBg="bg-emerald-50" change={3} changeLabel="vs last period" />
        )}
        {loadingSessions ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Lost Traffic" value={lostTraffic.toLocaleString()} icon={AlertTriangle} iconColor="text-red-500" iconBg="bg-red-50" change={-4} changeLabel="vs last period" />
        )}
        {loadingSessions ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Conversions" value={conversions.toLocaleString()} icon={Zap} iconColor="text-amber-500" iconBg="bg-amber-50" change={15} changeLabel="vs last period" />
        )}
        {loadingVisitors ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Total Visitors" value={visitors.length.toLocaleString()} icon={Eye} iconColor="text-cyan-500" iconBg="bg-cyan-50" change={7} changeLabel="vs last period" />
        )}
        {loadingSessions ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Unique Domains" value={new Set(sessions.map(s => s.domain_id).filter(Boolean)).size.toLocaleString()} icon={Globe} iconColor="text-teal-500" iconBg="bg-teal-50" />
        )}
        {loadingPeople ? <Skeleton className="h-[120px] rounded-xl" /> : (
          <MetricCard title="Recaptured Traffic" value={identifiedPeople.toLocaleString()} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" change={18} changeLabel="vs last period" />
        )}
      </div>

      {/* Charts — render as soon as their data is available */}
      {tenantId && <HomeCharts tenantId={tenantId} />}
      {tenantId && !loadingVisitors && !loadingSessions && !loadingCompanies && !loadingPeople ? (
        <OverviewCharts data={{ visitors, sessions, people, companies }} />
      ) : (
        <Skeleton className="h-[350px] rounded-xl" />
      )}

      {/* Live Feed — render as soon as visitors load */}
      {loadingVisitors ? (
        <Skeleton className="h-[200px] rounded-xl" />
      ) : (
        <LiveFeed visitors={visitors} />
      )}

      {/* Setup Checklist */}
      {flowId && showChecklist && (
        <Suspense fallback={null}>
          <SetupChecklist flowId={flowId} tenantId={tenantId} />
        </Suspense>
      )}
    </div>
  );
}