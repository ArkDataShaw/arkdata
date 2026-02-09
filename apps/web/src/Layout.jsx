import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import HelpDrawer from "@/components/layout/HelpDrawer";
import MobileNav from "@/components/layout/MobileNav";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";

const adminPages = [
  "AdminTenants", "AdminUsers", "AdminUIConfig", "AdminHelpCMS",
  "AdminIntegrations", "AdminPipeline", "AdminLogs", "AdminFeatureFlags", "AdminSecurity", "AdminBillingSettings"
];

export default function Layout({ children, currentPageName }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const isAdmin = adminPages.includes(currentPageName);

  // Setup axios interceptors on mount
  useEffect(() => {
    import("@/functions/axiosInterceptor").then(({ setupAxiosInterceptors }) => {
      setupAxiosInterceptors();
    });
  }, []);

  return (
    <ErrorBoundaryWrapper>
      <div className="flex h-screen surface-app overflow-hidden">
        <Sidebar currentPage={currentPageName} isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onHelpClick={() => setHelpOpen(true)} isAdmin={isAdmin}>
            <MobileNav currentPage={currentPageName} isAdmin={isAdmin} />
          </TopBar>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </ErrorBoundaryWrapper>
  );
}