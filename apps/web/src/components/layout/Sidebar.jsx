import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  Home, Users, Building2, Activity, AlertTriangle, BarChart3,
  Plug, GitBranch, FileText, Settings, ChevronLeft, ChevronRight,
  Shield, Layers, Target, CreditCard, CodeXml, Key
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  {
    section: "Navigation",
    items: [
      { label: "Overview", icon: Home, page: "Home" },
      { label: "Visitors", icon: Users, page: "Visitors" },
      { label: "Companies", icon: Building2, page: "Companies" },
      { label: "Sessions", icon: Activity, page: "Sessions" },
      { label: "Lost Traffic", icon: AlertTriangle, page: "LostTraffic" },
      { label: "Analytics", icon: BarChart3, page: "Analytics" },
    ],
  },
  {
    section: "Integrations",
    items: [
      { label: "Pixel", icon: CodeXml, page: "AppSettings" },
      { label: "Dashboards", icon: Layers, page: "Dashboards" },
      { label: "Segments", icon: Target, page: "SegmentBuilder" },
      { label: "Funnels", icon: GitBranch, page: "FunnelBuilder" },
      { label: "Integrations", icon: Plug, page: "Integrations" },
      { label: "Automations", icon: GitBranch, page: "Automations" },
    ],
  },
  {
    section: "Settings",
    items: [
      { label: "Reports", icon: FileText, page: "Reports" },
      { label: "Billing", icon: CreditCard, page: "Billing" },
      { label: "Settings", icon: Settings, page: "Profile" },
    ],
  },
];

const adminSection = {
  section: "Admin",
  items: [
    { label: "Teams", icon: Layers, page: "AdminTenants" },
    { label: "Users & Roles", icon: Shield, page: "AdminUsers" },
    { label: "Security", icon: Key, page: "AdminSecurity" },
  ],
};

export default function Sidebar({ currentPage }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isTeamAdmin = user?.role === "tenant_admin" || isSuperAdmin;

  // Build settings section dynamically — add Team Members for admins
  const settingsSection = {
    section: "Settings",
    items: [
      { label: "Reports", icon: FileText, page: "Reports" },
      { label: "Billing", icon: CreditCard, page: "Billing" },
      ...(isTeamAdmin ? [{ label: "Team", icon: Users, page: "TeamMembers" }] : []),
      { label: "Settings", icon: Settings, page: "Profile" },
    ],
  };

  const baseNav = [mainNav[0], mainNav[1], settingsSection];
  const sections = isSuperAdmin ? [...baseNav, adminSection] : baseNav;

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
              Ark Data
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {sections.map((group, gi) => (
          <div key={group.section} className={cn(gi > 0 && "mt-4")}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-medium px-3 mb-2">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>

      {/* User info + collapse toggle */}
      <div className="border-t border-slate-200 dark:border-slate-800/50">
        {!collapsed && user && (
          <div className="px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-violet-600">
                {(user.name || user.email)?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
