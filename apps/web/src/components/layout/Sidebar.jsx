import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home, Users, Building2, Activity, AlertTriangle, BarChart3,
  Plug, GitBranch, FileText, Settings, ChevronLeft, ChevronRight,
  Shield, Database, BookOpen, Flag, Lock, Layers, Target, CreditCard, CodeXml
} from "lucide-react";
import { cn } from "@/lib/utils";

const customerNav = [
  { label: "Overview", icon: Home, page: "Home" },
  { label: "Visitors", icon: Users, page: "Visitors" },
  { label: "Companies", icon: Building2, page: "Companies" },
  { label: "Sessions", icon: Activity, page: "Sessions" },
  { label: "Lost Traffic", icon: AlertTriangle, page: "LostTraffic" },
  { label: "Analytics", icon: BarChart3, page: "Analytics" },
  { label: "Dashboards", icon: Layers, page: "Dashboards" },
  { label: "Segments", icon: Target, page: "SegmentBuilder" },
  { label: "Funnels", icon: GitBranch, page: "FunnelBuilder" },
  { label: "Integrations", icon: Plug, page: "Integrations" },
  { label: "Automations", icon: GitBranch, page: "Automations" },
  { label: "Reports", icon: FileText, page: "Reports" },
  { label: "Billing", icon: CreditCard, page: "Billing" },
  { label: "Pixel", icon: CodeXml, page: "AppSettings" },
];

const adminNav = [
  { label: "Tenants", icon: Layers, page: "AdminTenants" },
  { label: "Users & Roles", icon: Shield, page: "AdminUsers" },
  { label: "UI Builder", icon: Settings, page: "AdminUIBuilder" },
  { label: "Help CMS", icon: BookOpen, page: "AdminHelpCMS" },
  { label: "Billing Settings", icon: CreditCard, page: "AdminBillingSettings" },
  { label: "Integrations", icon: Plug, page: "AdminIntegrations" },
  { label: "Data Pipeline", icon: Database, page: "AdminPipeline" },
  { label: "Jobs", icon: Activity, page: "AdminJobs" },
  { label: "Logs", icon: FileText, page: "AdminLogs" },
  { label: "Feature Flags", icon: Flag, page: "AdminFeatureFlags" },
  { label: "Security", icon: Lock, page: "AdminSecurity" },
];

export default function Sidebar({ currentPage, isAdmin }) {
  const [collapsed, setCollapsed] = useState(false);
  const nav = isAdmin ? adminNav : customerNav;

  return (
    <aside
      className={cn(
        "h-screen flex-col transition-all duration-300 border-r hidden lg:flex",
        "bg-slate-100 text-slate-900 border-slate-200",
        "dark:bg-slate-950 dark:text-white dark:border-slate-800/50",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo.png"
            alt="Ark Data"
            className="w-11 h-11 -m-1.5 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <span className="font-semibold text-base tracking-tight whitespace-nowrap">
              {isAdmin ? "Ark Admin" : "Ark Data"}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-medium px-3 mb-2">
            {isAdmin ? "Admin Portal" : "Navigation"}
          </p>
        )}
        {nav.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-600/20 dark:text-violet-300"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-violet-600 dark:text-violet-400")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-slate-200 dark:border-slate-800/50 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}