import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug, CheckCircle, XCircle, AlertCircle, ExternalLink, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const defaultProviders = [
  { key: "ghl", display_name: "GoHighLevel", description: "Push leads & contacts to GHL CRM", category: "crm", icon_url: "🏢" },
  { key: "klaviyo", display_name: "Klaviyo", description: "Sync visitors to email lists & segments", category: "email_marketing", icon_url: "📧" },
  { key: "salesforce", display_name: "Salesforce", description: "Create Leads and Contacts in Salesforce", category: "crm", icon_url: "☁️" },
  { key: "slack", display_name: "Slack", description: "Get real-time visitor alerts in Slack channels", category: "communication", icon_url: "💬" },
  { key: "zapier", display_name: "Zapier / Webhooks", description: "Connect to 5000+ apps via webhooks", category: "automation", icon_url: "⚡" },
];

export default function Integrations() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["integration-connections"],
    queryFn: () => base44.entities.IntegrationConnection.list(),
  });

  const connectMutation = useMutation({
    mutationFn: (provider) => base44.entities.IntegrationConnection.create({
      tenant_id: "demo",
      provider_key: provider.key,
      provider_name: provider.display_name,
      status: "connected",
      connected_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections"] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connId) => base44.entities.IntegrationConnection.update(connId, { status: "disconnected" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections"] }),
  });

  const connectionMap = Object.fromEntries(connections.map(c => [c.provider_key, c]));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Integrations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect your tools to push identified visitors automatically</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {defaultProviders.map((provider) => {
          const conn = connectionMap[provider.key];
          const isConnected = conn?.status === "connected";

          return (
            <div key={provider.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-slate-800/50 transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">
                    {provider.icon_url}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{provider.display_name}</h3>
                    <Badge variant="outline" className="text-[10px] capitalize">{provider.category?.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
                <StatusBadge status={isConnected ? "connected" : "disconnected"} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{provider.description}</p>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => { setSelectedProvider(provider); setConfigOpen(true); }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => disconnectMutation.mutate(conn.id)}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 bg-violet-600 hover:bg-violet-700 gap-1.5"
                    onClick={() => connectMutation.mutate(provider)}
                  >
                    <Plug className="w-3.5 h-3.5" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {selectedProvider?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Push new identified visitors</Label>
                <p className="text-xs text-slate-500">Automatically sync when a new person is identified</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">High-intent only</Label>
                <p className="text-xs text-slate-500">Only push visitors with intent score ≥ 60</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Push conversion events</Label>
                <p className="text-xs text-slate-500">Sync conversion events as activities</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setConfigOpen(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}