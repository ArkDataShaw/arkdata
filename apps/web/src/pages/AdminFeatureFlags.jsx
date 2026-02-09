import React from "react";
import { Flag, ToggleLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const flags = [
  { key: "enable_cohorts", label: "Cohort Analysis", description: "Enable returning visitor cohort tracking", plan: "pro", enabled: true },
  { key: "enable_custom_dashboards", label: "Custom Dashboards", description: "Allow users to build custom analytics dashboards", plan: "enterprise", enabled: false },
  { key: "enable_company_only_mode", label: "Company-Only Mode", description: "Only show company-level identification", plan: "starter", enabled: false },
  { key: "enable_funnels", label: "Funnel Builder", description: "Enable funnel visualization and analysis", plan: "pro", enabled: true },
  { key: "enable_journeys", label: "Journey Exploration", description: "Path analysis and journey mapping", plan: "enterprise", enabled: false },
  { key: "enable_webhooks", label: "Webhooks / Zapier", description: "Allow webhook-based integrations", plan: "pro", enabled: true },
  { key: "enable_advanced_attribution", label: "Multi-Touch Attribution", description: "Enable multi-touch attribution models", plan: "enterprise", enabled: false },
  { key: "enable_data_export", label: "Data Export", description: "CSV/Excel data export functionality", plan: "starter", enabled: true },
];

const planColors = {
  starter: "bg-slate-50 text-slate-600 border-slate-200",
  pro: "bg-violet-50 text-violet-600 border-violet-200",
  enterprise: "bg-amber-50 text-amber-600 border-amber-200",
};

export default function AdminFeatureFlags() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Flags & Plans</h1>
        <p className="text-sm text-slate-500 mt-1">Control feature availability per plan tier</p>
      </div>

      <div className="space-y-3">
        {flags.map((flag) => (
          <div key={flag.key} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
              <Flag className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{flag.label}</p>
                <Badge variant="outline" className={`text-[10px] capitalize ${planColors[flag.plan]}`}>
                  {flag.plan}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{flag.description}</p>
            </div>
            <Switch defaultChecked={flag.enabled} />
          </div>
        ))}
      </div>
    </div>
  );
}