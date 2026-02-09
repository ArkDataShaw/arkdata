import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Activity, AlertTriangle, Eye, Target, Zap, Globe, TrendingUp } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import KPICard from "@/components/charts/KPICard";
import HomeCharts from "@/components/home/HomeCharts";
import OverviewCharts from "@/components/home/OverviewCharts";
import LiveFeed from "@/components/home/LiveFeed";
import { Skeleton } from "@/components/ui/skeleton";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
import QuickTour from "@/components/onboarding/QuickTour";
import { safeInitializeAll } from "@/functions/initializationGuards";
import { getHomeMetrics } from "@/functions/analyticsEndpoints";

export default function Home() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [flowId, setFlowId] = useState(null);
  const [showChecklist, setShowChecklist] = useState(true);

  // Initialize onboarding and trial on first visit
  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        const tenantId = user.tenant_id || "default";
        setTenantId(tenantId);
      } catch (error) {
        console.error("Error getting user:", error);
      }
    })();

    // Listen for tour start event
    const handleStartTour = () => setTourOpen(true);
    window.addEventListener("onboarding:start-tour", handleStartTour);
    return () => window.removeEventListener("onboarding:start-tour", handleStartTour);
  }, []);

  const { data: homeMetrics = {} } = useQuery({
    queryKey: ["home-metrics"],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const result = await getHomeMetrics({ tenantId: user.tenant_id });
        return result.status === "success" ? result.data : {};
      } catch {
        return {};
      }
    },
  });

  const { data: visitors = [], isLoading: loadingVisitors } = useQuery({
    queryKey: ["visitors"],
    queryFn: () => base44.entities.Visitor.list("-last_seen_at", 200).catch(() => []),
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => base44.entities.Session.list("-started_at", 500).catch(() => []),
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 100).catch(() => []),
  });

  const { data: people = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["people"],
    queryFn: () => base44.entities.Person.list("-created_date", 100).catch(() => []),
  });

  const isLoading = loadingVisitors || loadingSessions || loadingCompanies || loadingPeople;

  const totalVisits = sessions.length;
  const identifiedPeople = people.length;
  const identifiedCompanies = companies.length;
  const matchRate = totalVisits > 0 ? Math.round((visitors.filter(v => v.identity_status !== "anonymous").length / visitors.length) * 100) || 0 : 0;
  const lostTraffic = sessions.filter(s => !s.is_converted).length;
  const conversions = sessions.filter(s => s.is_converted).length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Onboarding Components */}
      {flowId && (
        <>
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
        </>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">Your traffic identification at a glance</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Total Sessions"
          value={totalVisits.toLocaleString()}
          icon={Activity}
          iconColor="text-violet-500"
          iconBg="bg-violet-50"
          change={12}
          changeLabel="vs last period"
        />
        <MetricCard
          title="People Identified"
          value={identifiedPeople.toLocaleString()}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
          change={8}
          changeLabel="vs last period"
        />
        <MetricCard
          title="Companies Identified"
          value={identifiedCompanies.toLocaleString()}
          icon={Building2}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-50"
          change={5}
          changeLabel="vs last period"
        />
        <MetricCard
          title="Match Rate"
          value={`${matchRate}%`}
          icon={Target}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50"
          change={3}
          changeLabel="vs last period"
        />
        <MetricCard
          title="Lost Traffic"
          value={lostTraffic.toLocaleString()}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          change={-4}
          changeLabel="vs last period"
        />
        <MetricCard
          title="Conversions"
          value={conversions.toLocaleString()}
          icon={Zap}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
          change={15}
          changeLabel="vs last period"
        />
        <MetricCard
          title="Total Visitors"
          value={visitors.length.toLocaleString()}
          icon={Eye}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-50"
          change={7}
          changeLabel="vs last period"
        />
        <MetricCard
         title="Unique Domains"
         value={new Set(sessions.map(s => s.domain_id).filter(Boolean)).size.toLocaleString()}
         icon={Globe}
         iconColor="text-teal-500"
         iconBg="bg-teal-50"
        />
        <MetricCard
         title="Recaptured Traffic"
         value={identifiedPeople.toLocaleString()}
         icon={TrendingUp}
         iconColor="text-emerald-600"
         iconBg="bg-emerald-50"
         change={18}
         changeLabel="vs last period"
        />
        </div>

      {/* Charts */}
      {tenantId && (
        <>
          <HomeCharts tenantId={tenantId} />
          <OverviewCharts data={{ visitors, sessions, people: people, companies }} />
        </>
      )}

      {/* Live Feed */}
      <LiveFeed visitors={visitors} />

      {/* Setup Checklist */}
      {flowId && showChecklist && (
        <SetupChecklist flowId={flowId} tenantId={tenantId} />
      )}
    </div>
  );
}