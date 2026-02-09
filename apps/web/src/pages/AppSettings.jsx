import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Users, Globe, Code, Target, Shield, Copy, Check, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import DataTable from "@/components/shared/DataTable";
import moment from "moment";

export default function AppSettings() {
  const queryClient = useQueryClient();
  const [copiedPixel, setCopiedPixel] = useState(false);

  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: () => base44.entities.Domain.list(),
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["conversions"],
    queryFn: () => base44.entities.ConversionDefinition.list(),
  });

  const pixelSnippet = domains[0]?.pixel_public_id
    ? `<script>
  (function(w,d,s,p){
    w._arkQ=w._arkQ||[];
    var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s);
    j.async=1;j.src='https://cdn.arkdata.io/pixel.js';
    j.dataset.pixelId='${domains[0].pixel_public_id}';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script');
</script>`
    : `<!-- Add a domain first to get your pixel snippet -->`;

  const copyPixel = () => {
    navigator.clipboard.writeText(pixelSnippet);
    setCopiedPixel(true);
    setTimeout(() => setCopiedPixel(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your workspace configuration</p>
      </div>

      <Tabs defaultValue="pixel">
        <TabsList>
          <TabsTrigger value="pixel" className="gap-1.5">
            <Code className="w-3.5 h-3.5" />
            Pixel Setup
          </TabsTrigger>
          <TabsTrigger value="domains" className="gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="conversions" className="gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Conversions
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pixel" className="mt-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Install Your Pixel</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Add this snippet before the closing {"</head>"} tag on your website</p>
            <div className="relative">
              <pre className="bg-slate-950 text-slate-300 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                {pixelSnippet}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={copyPixel}
              >
                {copiedPixel ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {domains[0]?.last_event_at && (
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-700">Pixel verified — last event {moment(domains[0].last_event_at).fromNow()}</span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="domains" className="mt-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Domains</h3>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Domain
              </Button>
            </div>
            {domains.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No domains added yet</div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {domains.map(d => (
                  <div key={d.id} className="px-5 py-3 flex items-center gap-4">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.domain}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Pixel: {d.pixel_public_id || "—"}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="mt-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Conversion Goals</h3>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Conversion
              </Button>
            </div>
            {conversions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No conversion goals defined</div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {conversions.map(c => (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                    <Target className="w-4 h-4 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{c.type?.replace(/_/g, " ")} · {c.attribution_model?.replace(/_/g, " ")}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${c.is_active ? "text-emerald-700 border-emerald-200" : "text-slate-400"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Invite Team Members</h3>
            <div className="flex gap-2">
              <Input placeholder="email@company.com" className="flex-1" />
              <Button className="bg-violet-600 hover:bg-violet-700">Invite</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}