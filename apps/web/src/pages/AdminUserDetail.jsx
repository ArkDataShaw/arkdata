import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  listTenantUsers, getTenant, updateUserRoleFn, deleteTenantUser,
} from "@arkdata/firebase-sdk";
import {
  ArrowLeft, Mail, Shield, Calendar, Building2, UserCog, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const roleLabels = {
  super_admin: "Super Admin",
  tenant_admin: "Owner",
  analyst: "Analyst",
  operator: "Operator",
  read_only: "Viewer",
};

const roleBadgeColors = {
  super_admin: "bg-red-100 text-red-700",
  tenant_admin: "bg-violet-100 text-violet-700",
  analyst: "bg-blue-100 text-blue-700",
  operator: "bg-amber-100 text-amber-700",
  read_only: "bg-slate-100 text-slate-700",
};

export default function AdminUserDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");
  const tenantId = searchParams.get("tenant");

  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ["admin-tenant", tenantId],
    queryFn: () => getTenant(tenantId),
    enabled: !!tenantId,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-tenant-users", tenantId],
    queryFn: () => listTenantUsers(tenantId),
    enabled: !!tenantId,
  });

  const user = users.find((u) => u.id === userId);

  const roleChangeMutation = useMutation({
    mutationFn: () => updateUserRoleFn(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant-users", tenantId] });
      setRoleOpen(false);
      toast({ title: "Role updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTenantUser(userId),
    onSuccess: () => {
      toast({ title: "User deleted" });
      navigate(createPageUrl("AdminUsers"));
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!userId || !tenantId) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Missing user or tenant ID.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("AdminUsers"))}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <p className="text-slate-500 mt-4">User not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost" size="icon"
          onClick={() => navigate(createPageUrl("AdminUsers"))}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {user.display_name || user.email}
          </h1>
          <p className="text-sm text-slate-500">User Details</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-xl font-bold text-violet-600">
                {(user.display_name || user.email)?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {user.display_name || "—"}
              </p>
              <Badge className={`text-xs ${roleBadgeColors[user.role] || roleBadgeColors.read_only}`}>
                {roleLabels[user.role] || user.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              {user.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="w-4 h-4 text-slate-400" />
              {roleLabels[user.role] || user.role}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              Joined {user.created_at
                ? moment(user.created_at.toDate ? user.created_at.toDate() : user.created_at).format("MMM D, YYYY")
                : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-slate-900">{tenant?.name || tenantId}</p>
              <p className="text-xs text-slate-400">{tenant?.plan || "—"} plan</p>
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {roleLabels[user.role] || user.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setRoleOpen(true); setNewRole(user.role); }}
        >
          <UserCog className="w-4 h-4 mr-1.5" />
          Change Role
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Delete User
        </Button>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {user.display_name || user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="tenant_admin">Owner</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="read_only">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => roleChangeMutation.mutate()}
              disabled={roleChangeMutation.isPending || newRole === user.role}
            >
              {roleChangeMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {user.display_name || user.email} and
              remove them from their team. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
