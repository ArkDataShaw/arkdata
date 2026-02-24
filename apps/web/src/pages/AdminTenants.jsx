import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { listAllTenants, createTenantFn } from "@arkdata/firebase-sdk";
import { Layers, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function AdminTenants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", plan: "trial", trialDays: 14 });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => listAllTenants(),
  });

  const createMutation = useMutation({
    mutationFn: () => createTenantFn(
      newTenant.name,
      newTenant.plan,
      undefined,
      newTenant.plan === "trial" ? newTenant.trialDays : undefined
    ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setCreateOpen(false);
      const createdName = newTenant.name;
      setNewTenant({ name: "", plan: "trial", trialDays: 14 });
      toast({ title: "Tenant created", description: `${createdName} has been created.` });
      if (data?.tenant_id) {
        navigate(createPageUrl("AdminTenantDetail") + `?id=${data.tenant_id}`);
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = tenants.filter(
    (t) => !search || t.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Teams
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tenants.length} {tenants.length === 1 ? "team" : "teams"} registered
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Team
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tenant Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {search ? "No teams match your search" : "No teams yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((tenant) => (
            <Card key={tenant.id} className="flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <p className="font-semibold text-slate-900 dark:text-white truncate">
                  {tenant.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Created on{" "}
                  {tenant.created_at
                    ? moment(tenant.created_at.toDate ? tenant.created_at.toDate() : tenant.created_at).format("MMM D, YYYY")
                    : "—"}
                </p>
                <div className="mt-auto pt-4">
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                    onClick={() => navigate(createPageUrl("AdminTenantDetail") + `?id=${tenant.id}`)}
                  >
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Tenant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Set up a new team. You can invite members after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Team Name</Label>
              <Input
                id="tenant-name"
                placeholder="e.g. Acme Corp"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select
                value={newTenant.plan}
                onValueChange={(val) => setNewTenant({ ...newTenant, plan: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newTenant.plan === "trial" && (
              <div className="space-y-2">
                <Label>Trial Duration</Label>
                <Select
                  value={String(newTenant.trialDays)}
                  onValueChange={(val) => setNewTenant({ ...newTenant, trialDays: parseInt(val, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="21">21 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="45">45 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="75">75 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTenant.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
