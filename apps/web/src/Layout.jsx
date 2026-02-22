import React, { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import HelpDrawer from "@/components/layout/HelpDrawer";
import MobileNav from "@/components/layout/MobileNav";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import RequireRole from "@/components/guards/RequireRole";
import ComingSoon from "@/components/guards/ComingSoon";
import { useAuth } from "@/lib/AuthContext";

const OnboardingSprite = lazy(() => import("@/components/onboarding/OnboardingSprite"));

const adminPages = [
  "AdminTenants", "AdminTenantDetail", "AdminUsers", "AdminUserDetail",
  "AdminUIConfig", "AdminHelpCMS", "AdminIntegrations", "AdminPipeline",
  "AdminLogs", "AdminFeatureFlags", "AdminSecurity", "AdminBillingSettings",
  "AdminUIBuilder", "AdminJobs", "AdminWorkflows", "AdminFeedback",
  "AdminHealthDashboard", "AdminDataHygiene", "AdminOnboardingAnalytics",
  "AdminOnboardingBuilder", "AdminOnboardingSupport",
];

// Pages available to all tenants (everything else gets "Coming Soon" for non-arkdata tenants)
const livePages = [
  "AppSettings", "TeamMembers", "Profile", "Billing",
  // Admin pages are gated separately by RequireRole
  ...adminPages,
];

export default function Layout({ children, currentPageName }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const { user } = useAuth();
  const isAdminPage = adminPages.includes(currentPageName);
  const isArkDataTenant = user?.tenant_id === "arkdata" || user?.role === "super_admin";
  const isComingSoon = !isArkDataTenant && !livePages.includes(currentPageName);

  // Setup axios interceptors on mount
  useEffect(() => {
    import("@/functions/axiosInterceptor").then(({ setupAxiosInterceptors }) => {
      setupAxiosInterceptors();
    });
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Wrap admin pages in role guard; non-admin pages render directly
  let pageContent;
  if (isAdminPage) {
    pageContent = (
      <RequireRole roles={["super_admin"]}>
        {children}
      </RequireRole>
    );
  } else if (isComingSoon) {
    pageContent = <ComingSoon>{children}</ComingSoon>;
  } else {
    pageContent = children;
  }

  return (
    <ErrorBoundaryWrapper>
      <div className="flex h-screen surface-app overflow-hidden">
        <Sidebar
          currentPage={currentPageName}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            onHelpClick={() => setHelpOpen(true)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
            currentPageName={currentPageName}
          >
            <MobileNav currentPage={currentPageName} />
          </TopBar>
          <main className="flex-1 overflow-y-auto">
            {pageContent}
          </main>
        </div>
        <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
        <Suspense fallback={null}>
          <OnboardingSprite currentPageName={currentPageName} />
        </Suspense>
      </div>
    </ErrorBoundaryWrapper>
  );
}
