import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { listAllTenants, createTenantFn } from "@arkdata/firebase-sdk";
import { Layers, Plus, Search, Users, Globe, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const planColors = {
  trial: "bg-amber-100 text-amber-700",
  starter: "bg-blue-100 text-blue-700",
  professional: "bg-violet-100 text-violet-700",
  enterprise: "bg-emerald-100 text-emerald-700",
};

export default function AdminTenants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setCreateOpen(false);
      setNewTenant({ name: "", plan: "trial", trialDays: 14 });
      toast({ title: "Tenant created", description: `${newTenant.name} has been created.` });
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teams</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="flex gap-4 mt-3">
                  <div className="h-4 bg-slate-100 rounded w-16" />
                  <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tenant) => (
            <Link
              key={tenant.id}
              to={createPageUrl("AdminTenantDetail") + `?id=${tenant.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{tenant.name}</p>
                        <p className="text-xs text-slate-400">ID: {tenant.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${planColors[tenant.plan] || planColors.trial}`}>
                      {tenant.plan || "trial"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-5 text-xs text-slate-500 mt-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {tenant.active_users || 0} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {tenant.domain_count || 0} domains
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      {tenant.created_at
                        ? moment(tenant.created_at.toDate ? tenant.created_at.toDate() : tenant.created_at).format("MMM D, YYYY")
                        : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
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
