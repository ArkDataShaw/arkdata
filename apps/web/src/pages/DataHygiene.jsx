import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, AlertTriangle, Trash2, RotateCcw } from "lucide-react";

import {
  getTenantHygieneSettings,
  togglePixelOnlyMode,
} from "@/functions/pixelOnlyFilters";
import {
  previewCleanup,
  runCleanup,
  purgeQuarantinedData,
  restoreQuarantinedEntity,
} from "@/functions/dataHygieneCleanup";

export default function DataHygiene() {
  const [tenant, setTenant] = useState(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = useState("");
  const queryClient = useQueryClient();

  // Fetch current user and tenant
  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const tenants = await base44.entities.Tenant.filter(
        { created_by: user.email },
        "created_date",
        1
      );
      if (tenants?.[0]) {
        setTenant(tenants[0]);
      }
    })();
  }, []);

  // Fetch hygiene settings
  const { data: settings } = useQuery(
    ["hygieneSettings", tenant?.id],
    () => getTenantHygieneSettings(tenant?.id),
    { enabled: !!tenant, refetchInterval: 5000 }
  );

  // Fetch preview data
  const { data: preview, isLoading: previewLoading } = useQuery(
    ["cleanupPreview", tenant?.id],
    () => previewCleanup(tenant?.id),
    { enabled: !!tenant }
  );

  // Fetch cleanup runs
  const { data: cleanupRuns } = useQuery(
    ["cleanupRuns", tenant?.id],
    () =>
      base44.entities.DataCleanupRun.filter(
        { tenant_id: tenant?.id },
        "-created_date",
        10
      ),
    { enabled: !!tenant }
  );

  // Fetch quarantine snapshots
  const { data: snapshots } = useQuery(
    ["quarantineSnapshots", tenant?.id],
    () =>
      base44.entities.QuarantineSnapshot.filter(
        { tenant_id: tenant?.id, purged_at: null },
        "-created_date",
        100
      ),
    { enabled: !!tenant }
  );

  // Toggle pixel-only mode
  const toggleMode = useMutation({
    mutationFn: (enabled) => togglePixelOnlyMode(tenant?.id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries(["hygieneSettings"]);
    },
  });

  // Run cleanup
  const cleanup = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return runCleanup(tenant?.id, user.id, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["cleanupRuns"]);
      queryClient.invalidateQueries(["cleanupPreview"]);
      queryClient.invalidateQueries(["quarantineSnapshots"]);
    },
  });

  // Purge data
  const purge = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return purgeQuarantinedData(tenant?.id, user.id);
    },
    onSuccess: () => {
      setShowPurgeModal(false);
      setPurgeConfirmation("");
      queryClient.invalidateQueries(["cleanupRuns"]);
      queryClient.invalidateQueries(["quarantineSnapshots"]);
    },
  });

  // Restore entity
  const restore = useMutation({
    mutationFn: ({ entityType, entityId }) =>
      restoreQuarantinedEntity(tenant?.id, entityType, entityId, "user"),
    onSuccess: () => {
      queryClient.invalidateQueries(["quarantineSnapshots"]);
      queryClient.invalidateQueries(["cleanupPreview"]);
    },
  });

  if (!tenant) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2">Data Hygiene</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage pixel-only data mode and clean non-pixel sourced records.
        </p>
      </div>

      {/* Pixel-Only Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pixel-Only Mode</span>
            <Switch
              checked={settings?.pixel_only_mode || false}
              onCheckedChange={(checked) => toggleMode.mutate(checked)}
              disabled={toggleMode.isPending}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            When enabled, only pixel-derived data is shown in UI, analytics,
            and billing. Non-pixel data is automatically cleaned.
          </p>

          {settings?.pixel_only_mode && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-3">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                ✓ Pixel-only mode is <strong>ACTIVE</strong>
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                Enforcement: <strong>{settings?.pixel_only_enforcement}</strong>
                | Retention: <strong>{settings?.quarantine_retention_days}</strong> days
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Cleanup Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                <div className="text-lg font-bold">
                  {preview.peopleToQuarantine}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Non-pixel people
                </div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                <div className="text-lg font-bold">
                  {preview.companiesToQuarantine}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Non-pixel companies
                </div>
              </div>
            </div>

            {preview.samplePeople?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Sample People to Quarantine</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {preview.samplePeople.map((p) => (
                    <div
                      key={p.id}
                      className="text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded"
                    >
                      <div className="font-medium">{p.email}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Source: {p.source}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => cleanup.mutate()}
              disabled={cleanup.isPending || preview.totalEntitiesAffected === 0}
              className="w-full"
            >
              {cleanup.isPending ? "Quarantining..." : "Run Quarantine Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cleanup Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {cleanupRuns?.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No cleanup runs yet.
            </p>
          ) : (
            <div className="space-y-2">
              {cleanupRuns?.map((run) => (
                <div
                  key={run.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {run.run_type === "quarantine" ? "Quarantine" : "Purge"} Run
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quarantined Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quarantined Data ({snapshots?.length || 0})</span>
            {snapshots?.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowPurgeModal(true)}
                disabled={purge.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Purge All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots?.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No quarantined data.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {snapshots?.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {snap.entity_type}: {snap.entity_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Quarantined{" "}
                      {new Date(snap.created_date).toLocaleDateString()}
                    </div>
                  </div>
                  {snap.can_restore && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        restore.mutate({
                          entityType: snap.entity_type,
                          entityId: snap.entity_id,
                        })
                      }
                      disabled={restore.isPending}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purge Confirmation Modal */}
      <AlertDialog open={showPurgeModal} onOpenChange={setShowPurgeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge Quarantined Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {snapshots?.length || 0} quarantined
              entities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Type "PURGE" to confirm:
            </p>
            <input
              type="text"
              value={purgeConfirmation}
              onChange={(e) => setPurgeConfirmation(e.target.value)}
              className="mt-2 w-full px-2 py-1 border rounded text-sm"
              placeholder="PURGE"
            />
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => purge.mutate()}
              disabled={purgeConfirmation !== "PURGE" || purge.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {purge.isPending ? "Purging..." : "Purge"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}