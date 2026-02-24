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
import CompanyNameModal from "@/components/onboarding/CompanyNameModal";
import ImpersonationBanner, { useImpersonation } from "@/components/layout/ImpersonationBanner";

// Pages accessible by platform_admin only
const platformOnlyPages = [
  "AdminUIConfig", "AdminHelpCMS", "AdminIntegrations", "AdminPipeline",
  "AdminLogs", "AdminFeatureFlags", "AdminSecurity", "AdminBillingSettings",
  "AdminUIBuilder", "AdminJobs", "AdminWorkflows", "AdminFeedback",
  "AdminHealthDashboard", "AdminDataHygiene", "AdminOnboardingAnalytics",
  "AdminOnboardingBuilder", "AdminOnboardingSupport", "AdminPartners",
];

// Pages accessible by both platform_admin and super_admin (partner)
const partnerAdminPages = [
  "AdminTenants", "AdminTenantDetail", "AdminUsers", "AdminUserDetail",
  "PartnerBranding", "PartnerCredits",
];

const adminPages = [...platformOnlyPages, ...partnerAdminPages];

// Pages available to all tenants (everything else gets "Coming Soon" for non-arkdata tenants)
const livePages = [
  "AppSettings", "TeamMembers", "Profile", "Settings", "Billing",
  // Admin pages are gated separately by RequireRole
  ...adminPages,
];

export default function Layout({ children, currentPageName }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const { user } = useAuth();
  const isImpersonating = useImpersonation(user);
  const isAdminPage = adminPages.includes(currentPageName);
  const isPlatformOnlyPage = platformOnlyPages.includes(currentPageName);
  const isArkDataTenant = user?.tenant_id === "arkdata" || user?.role === "super_admin" || user?.role === "platform_admin";
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
  if (isPlatformOnlyPage) {
    pageContent = (
      <RequireRole roles={["platform_admin"]}>
        {children}
      </RequireRole>
    );
  } else if (isAdminPage) {
    pageContent = (
      <RequireRole roles={["platform_admin", "super_admin"]}>
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
      <div className="flex flex-col h-screen">
        {isImpersonating && (
          <ImpersonationBanner
            visible={bannerVisible}
            onDismiss={() => setBannerVisible(false)}
          />
        )}
        <div className="flex flex-1 surface-app overflow-hidden">
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
              isImpersonating={isImpersonating}
              bannerDismissed={isImpersonating && !bannerVisible}
              onRestoreBanner={() => setBannerVisible(true)}
            >
              <MobileNav currentPage={currentPageName} />
            </TopBar>
            <main className="flex-1 overflow-y-auto">
              {pageContent}
            </main>
          </div>
          <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
          <CompanyNameModal />
          <Suspense fallback={null}>
            <OnboardingSprite currentPageName={currentPageName} />
          </Suspense>
        </div>
      </div>
    </ErrorBoundaryWrapper>
  );
}
