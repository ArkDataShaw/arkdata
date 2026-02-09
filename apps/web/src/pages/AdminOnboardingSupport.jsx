import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RotateCcw, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminOnboardingSupport() {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetType, setResetType] = useState("user"); // user or tenant
  const queryClient = useQueryClient();

  const { data: tenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date", 100),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!selectedTenant,
  });

  const { data: onboardingStats = {} } = useQuery({
    queryKey: ["onboarding-health"],
    queryFn: async () => {
      const flows = await base44.entities.OnboardingFlow.filter({
        status: "published",
      });

      if (flows.length === 0) {
        return { totalFlows: 0, completedTenants: 0, avgCompletion: 0 };
      }

      const allTaskStatuses = await base44.entities.OnboardingTaskStatus.list(
        "-updated_at",
        10000
      );
      const completedTenants = new Set(
        allTaskStatuses
          .filter((s) => s.status === "complete")
          .map((s) => s.tenant_id)
      ).size;

      return {
        totalFlows: flows.length,
        completedTenants,
        avgCompletion: Math.round(
          (allTaskStatuses.filter((s) => s.status === "complete").length /
            (allTaskStatuses.length || 1)) *
            100
        ),
      };
    },
  });

  const resetUserOnboardingMutation = useMutation({
    mutationFn: async (userId) => {
      // Delete user state
      const userStates = await base44.entities.OnboardingUserState.filter({
        user_id: userId,
      });

      for (const state of userStates) {
        await base44.entities.OnboardingUserState.delete(state.id);
      }

      // Delete user-scoped task statuses
      const taskStatuses = await base44.entities.OnboardingTaskStatus.filter({
        user_id: userId,
      });

      for (const status of taskStatuses) {
        await base44.entities.OnboardingTaskStatus.delete(status.id);
      }

      // Log audit
      await base44.entities.AuditLog.create({
        action: "reset_onboarding",
        entity_type: "OnboardingUserState",
        entity_id: userId,
        details: `Admin reset onboarding for user ${userId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-user-state"] });
      queryClient.invalidateQueries({
        queryKey: ["onboarding-task-statuses"],
      });
      setShowResetDialog(false);
      alert("Onboarding reset successfully for user");
    },
  });

  const resetTenantOnboardingMutation = useMutation({
    mutationFn: async (tenantId) => {
      // Delete workspace state
      const workspaceStates =
        await base44.entities.OnboardingWorkspaceState.filter({
          tenant_id: tenantId,
        });

      for (const state of workspaceStates) {
        await base44.entities.OnboardingWorkspaceState.delete(state.id);
      }

      // Delete all task statuses for tenant
      const taskStatuses = await base44.entities.OnboardingTaskStatus.filter({
        tenant_id: tenantId,
      });

      for (const status of taskStatuses) {
        await base44.entities.OnboardingTaskStatus.delete(status.id);
      }

      // Delete all user states for tenant
      const userStates = await base44.entities.OnboardingUserState.filter({
        tenant_id: tenantId,
      });

      for (const state of userStates) {
        await base44.entities.OnboardingUserState.delete(state.id);
      }

      // Log audit
      await base44.entities.AuditLog.create({
        action: "reset_onboarding_tenant",
        entity_type: "OnboardingWorkspaceState",
        entity_id: tenantId,
        details: `Admin reset onboarding for entire tenant ${tenantId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-user-state"] });
      queryClient.invalidateQueries({
        queryKey: ["onboarding-task-statuses"],
      });
      setShowResetDialog(false);
      alert("Onboarding reset successfully for tenant");
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Onboarding Support
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Admin tools for managing customer onboarding
        </p>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
            Total Flows
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {onboardingStats.totalFlows}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
            Tenants Completed
          </p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {onboardingStats.completedTenants}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
            Avg Completion
          </p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {onboardingStats.avgCompletion}%
          </p>
        </Card>
      </div>

      {/* Reset Tools */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Reset Onboarding
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Reset User */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Reset for User
            </h3>
            <div className="space-y-3">
              <select
                value={selectedTenant || ""}
                onChange={(e) => {
                  setSelectedTenant(e.target.value);
                  setSelectedUser(null);
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">Select tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {selectedTenant && (
                <select
                  value={selectedUser || ""}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                >
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
              )}

              <Button
                disabled={!selectedUser}
                onClick={() => {
                  setResetType("user");
                  setShowResetDialog(true);
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset User
              </Button>
            </div>
          </div>

          {/* Reset Tenant */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Reset for Tenant
            </h3>
            <div className="space-y-3">
              <select
                value={selectedTenant || ""}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">Select tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <Button
                disabled={!selectedTenant}
                onClick={() => {
                  setResetType("tenant");
                  setShowResetDialog(true);
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Tenant
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertCircle className="w-5 h-5" />
              Confirm Reset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {resetType === "user"
                ? `Reset all onboarding progress for user ${selectedUser}?`
                : `Reset all onboarding progress for tenant ${selectedTenant}? This affects all users.`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will delete onboarding state and task statuses but won't affect actual data (domains, integrations, etc.).
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (resetType === "user") {
                    resetUserOnboardingMutation.mutate(selectedUser);
                  } else {
                    resetTenantOnboardingMutation.mutate(selectedTenant);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}