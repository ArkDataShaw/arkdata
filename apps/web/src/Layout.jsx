import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import HelpDrawer from "@/components/layout/HelpDrawer";
import MobileNav from "@/components/layout/MobileNav";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import RequireRole from "@/components/guards/RequireRole";
import ComingSoon from "@/components/guards/ComingSoon";
import { useAuth } from "@/lib/AuthContext";

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
        <Sidebar currentPage={currentPageName} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onHelpClick={() => setHelpOpen(true)}>
            <MobileNav currentPage={currentPageName} />
          </TopBar>
          <main className="flex-1 overflow-y-auto">
            {pageContent}
          </main>
        </div>
        <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </ErrorBoundaryWrapper>
  );
}
