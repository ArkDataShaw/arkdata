import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { listAllTenants, createPartnerTenantFn, getDb } from "@arkdata/firebase-sdk";
import { collection, getDocs } from "firebase/firestore";
import { Building2, Plus, Search, Users, Globe, Calendar, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function AdminPartners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: "", maxTeams: 10, adminEmail: "",
  });

  const { data: allTenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => listAllTenants(),
  });

  // Only show top-level partners (parent_tenant_id === null), excluding arkdata
  const partners = allTenants.filter(
    (t) => t.parent_tenant_id === null && t.id !== "arkdata"
  );

  // Fetch actual domain counts per partner
  const { data: domainCounts = {} } = useQuery({
    queryKey: ["admin-partner-domain-counts", partners.map((t) => t.id).join(",")],
    enabled: partners.length > 0,
    queryFn: async () => {
      const db = getDb();
      const counts = {};
      await Promise.all(
        partners.map(async (t) => {
          try {
            const snap = await getDocs(collection(db, "tenants", t.id, "domains"));
            counts[t.id] = snap.size;
          } catch {
            counts[t.id] = 0;
          }
        })
      );
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createPartnerTenantFn(
      newPartner.name,
      newPartner.maxTeams,
      newPartner.adminEmail || undefined
    ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setCreateOpen(false);
      const createdName = newPartner.name;
      setNewPartner({ name: "", maxTeams: 10, adminEmail: "" });
      toast({ title: "Partner created", description: `${createdName} has been created.` });
      if (data?.tenant_id) {
        navigate(createPageUrl("AdminTenantDetail") + `?id=${data.tenant_id}`);
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = partners.filter(
    (t) => !search || t.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Partners
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {partners.length} {partners.length === 1 ? "partner" : "partners"} registered
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Partner
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search partners..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Partner Cards Grid */}
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
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {search ? "No partners match your search" : "No partners yet"}
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
                        <Building2 className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{tenant.name}</p>
                        <p className="text-xs text-slate-400">ID: {tenant.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                    <Badge className="text-xs bg-indigo-100 text-indigo-700">
                      Partner
                    </Badge>
                  </div>

                  <div className="flex items-center gap-5 text-xs text-slate-500 mt-4">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {tenant.limits?.max_teams ?? "—"} teams allowed
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {tenant.active_users || 0} users
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      {tenant.created_at
                        ? moment(tenant.created_at.toDate ? tenant.created_at.toDate() : tenant.created_at).format("MMM D, YYYY")
                        : "\u2014"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Partner Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Partner</DialogTitle>
            <DialogDescription>
              Set up a new partner / whitelabel tenant. Optionally invite an admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="partner-name">Partner Name</Label>
              <Input
                id="partner-name"
                placeholder="e.g. Acme Corp"
                value={newPartner.name}
                onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-teams">Max Teams</Label>
              <Input
                id="max-teams"
                type="number"
                min={1}
                value={newPartner.maxTeams}
                onChange={(e) => setNewPartner({ ...newPartner, maxTeams: parseInt(e.target.value, 10) || 1 })}
              />
              <p className="text-xs text-slate-400">
                Number of sub-accounts this partner can create. Can be changed later.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email (optional)</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@partner.com"
                value={newPartner.adminEmail}
                onChange={(e) => setNewPartner({ ...newPartner, adminEmail: e.target.value })}
              />
              <p className="text-xs text-slate-400">
                If provided, this user will be invited as super_admin of the new partner.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newPartner.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
