import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu, Home, Users, Building2, Activity, AlertTriangle, BarChart3,
  Plug, GitBranch, FileText, Settings, Layers, Target, X, Shield, CodeXml,
  CreditCard, Key, User
} from "lucide-react";
import { cn } from "@/lib/utils";

const customerNav = [
  { label: "Overview", icon: Home, page: "Home" },
  { label: "Visitors", icon: Users, page: "Visitors" },
  { label: "Companies", icon: Building2, page: "Companies" },
  { label: "Sessions", icon: Activity, page: "Sessions" },
  { label: "Lost Traffic", icon: AlertTriangle, page: "LostTraffic" },
  { label: "Analytics", icon: BarChart3, page: "Analytics" },
  { label: "Pixel", icon: CodeXml, page: "AppSettings" },
  { label: "Dashboards", icon: Layers, page: "Dashboards" },
  { label: "Segments", icon: Target, page: "SegmentBuilder" },
  { label: "Funnels", icon: GitBranch, page: "FunnelBuilder" },
  { label: "Integrations", icon: Plug, page: "Integrations" },
  { label: "Automations", icon: GitBranch, page: "Automations" },
  { label: "Reports", icon: FileText, page: "Reports" },
  { label: "Billing", icon: CreditCard, page: "Billing" },
  { label: "Settings", icon: Settings, page: "Settings" },
  { label: "Profile", icon: User, page: "Profile" },
];

const adminNav = [
  { label: "Teams", icon: Layers, page: "AdminTenants" },
  { label: "Users & Roles", icon: Shield, page: "AdminUsers" },
  { label: "Security", icon: Key, page: "AdminSecurity" },
];

export default function MobileNav({ currentPage }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Ark Data"
                className="w-8 h-8 object-contain"
              />
              <span className="font-semibold text-slate-900 dark:text-white">Ark Data</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <div className="space-y-1">
              {customerNav.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-600/20 dark:text-violet-300"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 active:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 dark:active:bg-slate-800"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-violet-600 dark:text-violet-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {isSuperAdmin && (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium px-3 mb-2">
                  Admin
                </p>
                <div className="space-y-1">
                  {adminNav.map((item) => {
                    const isActive = currentPage === item.page;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all",
                          isActive
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-600/20 dark:text-violet-300"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 active:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 dark:active:bg-slate-800"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-violet-600 dark:text-violet-400")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
