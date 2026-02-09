import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Play, Trash2 } from "lucide-react";
import { adminGetDataHygieneState } from "@/functions/pixelOnlyAPIEndpoints";

export default function AdminDataHygiene() {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all tenants for admin
  const { data: tenants } = useQuery(
    ["adminTenants"],
    () => base44.entities.Tenant.list("-created_date", 100),
    { refetchInterval: 10000 }
  );

  // Fetch hygiene state for selected tenant
  const { data: hygieneState } = useQuery(
    ["adminHygieneState", selectedTenant],
    () => adminGetDataHygieneState(selectedTenant),
    { enabled: !!selectedTenant }
  );

  // Fetch cleanup runs
  const { data: cleanupRuns } = useQuery(
    ["adminCleanupRuns", selectedTenant],
    () =>
      base44.entities.DataCleanupRun.filter(
        { tenant_id: selectedTenant },
        "-created_date",
        20
      ),
    { enabled: !!selectedTenant }
  );

  // Fetch audit logs
  const { data: auditLogs } = useQuery(
    ["adminAuditLogs", selectedTenant],
    () =>
      base44.entities.DataHygieneAuditLog.filter(
        { tenant_id: selectedTenant },
        "-created_date",
        50
      ),
    { enabled: !!selectedTenant }
  );

  return (
    <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2">Data Hygiene - Admin</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage pixel-only mode across all tenants.
        </p>
      </div>

      {/* Tenant Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenant || ""} onValueChange={setSelectedTenant}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a tenant..." />
            </SelectTrigger>
            <SelectContent>
              {tenants?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTenant && hygieneState?.data && (
        <>
          {/* Hygiene Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Hygiene Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Pixel-Only Mode:</span>
                <Badge
                  variant={
                    hygieneState.data.settings?.pixel_only_mode
                      ? "default"
                      : "secondary"
                  }
                >
                  {hygieneState.data.settings?.pixel_only_mode
                    ? "ENABLED"
                    : "DISABLED"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span>Enforcement:</span>
                <span className="text-sm">
                  {hygieneState.data.settings?.pixel_only_enforcement ||
                    "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Retention Days:</span>
                <span className="text-sm">
                  {hygieneState.data.settings?.quarantine_retention_days || 30}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Quarantined Count:</span>
                <Badge variant="outline">
                  {hygieneState.data.quarantinedCount || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cleanup Runs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Cleanup Runs</CardTitle>
            </CardHeader>
            <CardContent>
              {cleanupRuns?.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No cleanup runs.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cleanupRuns?.map((run) => (
                    <div
                      key={run.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {run.run_type === "quarantine"
                              ? "Quarantine"
                              : "Purge"}{" "}
                            Run
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(run.created_date).toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            run.status === "completed"
                              ? "default"
                              : run.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                      {run.summary_json && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          Affected:{" "}
                          {run.summary_json.totalQuarantined ||
                            run.summary_json.purgedCount ||
                            "N/A"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs?.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No audit logs.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditLogs?.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs"
                    >
                      <div className="font-medium">{log.action}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        By {log.user_id} at{" "}
                        {new Date(log.created_date).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}