import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu, Home, Users, Building2, Activity, AlertTriangle, BarChart3,
  Plug, GitBranch, FileText, Settings, Layers, Target, X
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
  { label: "Settings", icon: Settings, page: "AppSettings" },
];

export default function MobileNav({ currentPage, isAdmin }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-slate-950 border-slate-800">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69899db1dffa2f0b930dfd60/4aeee1040_image.png" 
                alt="Ark Data" 
                className="w-8 h-8 object-contain"
              />
              <span className="font-semibold text-white">Ark Data</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="w-5 h-5 text-slate-400" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
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
                      ? "bg-violet-600/20 text-violet-300"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:bg-slate-800"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-violet-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}