import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search, HelpCircle, ChevronRight, PanelLeft, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
} from "@/components/ui/tooltip";

const PAGE_LABELS = {
  Home: "Overview",
  Visitors: "Visitors",
  Companies: "Companies",
  Sessions: "Sessions",
  LostTraffic: "Lost Traffic",
  Analytics: "Analytics",
  AppSettings: "Pixel",
  Dashboards: "Dashboards",
  SegmentBuilder: "Segments",
  FunnelBuilder: "Funnels",
  Integrations: "Integrations",
  Automations: "Automations",
  Reports: "Reports",
  Billing: "Billing",
  TeamMembers: "Team",
  Profile: "Settings",
  AdminTenants: "Teams",
  AdminUsers: "Users & Roles",
  AdminSecurity: "Security",
};

export default function TopBar({ onHelpClick, collapsed, onToggleCollapse, currentPageName, children, isImpersonating, bannerDismissed, onRestoreBanner }) {
  const pageLabel = PAGE_LABELS[currentPageName] || currentPageName;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 lg:px-6 gap-2 lg:gap-4 flex-shrink-0">
      {/* Mobile Nav */}
      {children}

      {/* Sidebar Toggle + Breadcrumb */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 dark:text-slate-400"
          onClick={onToggleCollapse}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to={createPageUrl("Home")}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-400 dark:text-slate-500">{pageLabel}</span>
        </nav>
      </div>

      {/* Search — Coming Soon */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative opacity-50 cursor-not-allowed">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search people, companies, pages..."
                  disabled
                  className="pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Coming soon</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex items-center gap-2">
        {bannerDismissed ? (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 h-8 text-xs font-semibold"
            onClick={onRestoreBanner}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Viewing as...
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 dark:text-slate-400" onClick={onHelpClick}>
            <HelpCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
