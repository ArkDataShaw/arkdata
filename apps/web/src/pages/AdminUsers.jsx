import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  listAllTenants, updateUserRoleFn, deleteTenantUser, impersonateUserFn,
} from "@arkdata/firebase-sdk";
import {
  Shield, Users, Search, MoreHorizontal, UserCog, Trash2, Eye, LogIn,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  read_only: "Member",
};

const roleBadgeColors = {
  super_admin: "bg-red-100 text-red-700",
  tenant_admin: "bg-violet-100 text-violet-700",
  read_only: "bg-slate-100 text-slate-700",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Role change state
  const [roleDialogUser, setRoleDialogUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  // Delete state
  const [deleteUser, setDeleteUser] = useState(null);

  // Impersonate state
  const [impersonateTarget, setImpersonateTarget] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  // Fetch all tenants, then flatten their users
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => listAllTenants(),
  });

  // For each tenant, we'll also need users — but to keep it simple,
  // we'll use the existing entity proxy for the cross-tenant user list
  // Since we need users across all tenants, we'll fetch per-tenant
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-all-users", tenants.map((t) => t.id).join(",")],
    queryFn: async () => {
      const { listTenantUsers } = await import("@arkdata/firebase-sdk");
      const results = await Promise.all(
        tenants.map(async (t) => {
          const users = await listTenantUsers(t.id);
          return users.map((u) => ({ ...u, tenant_name: t.name, tenant_id: t.id }));
        })
      );
      return results.flat();
    },
    enabled: tenants.length > 0,
  });

  const isLoading = tenantsLoading || usersLoading;

  const filtered = allUsers.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(s) ||
      u.display_name?.toLowerCase().includes(s) ||
      u.tenant_name?.toLowerCase().includes(s)
    );
  });

  const roleChangeMutation = useMutation({
    mutationFn: () => updateUserRoleFn(roleDialogUser.id, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      setRoleDialogUser(null);
      setNewRole("");
      toast({ title: "Role updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTenantUser(deleteUser.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setDeleteUser(null);
      toast({ title: "User deleted" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => impersonateUserFn(impersonateTarget.id),
    onSuccess: (data) => {
      toast({ title: "Impersonating", description: `Signed in as ${data.target_user.email}` });
      setImpersonateTarget(null);
      setConfirmText("");
      // Reload to pick up new auth state
      window.location.href = "/";
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Users & Roles</h1>
        <p className="text-sm text-slate-500 mt-1">
          {allUsers.length} {allUsers.length === 1 ? "user" : "users"} across all teams
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, email, or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    {search ? "No users match your search" : "No users yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={`${u.tenant_id}-${u.id}`} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-violet-600">
                            {(u.display_name || u.email)?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.display_name || "—"}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${roleBadgeColors[u.role] || roleBadgeColors.read_only}`}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.tenant_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.created_at
                        ? moment(u.created_at.toDate ? u.created_at.toDate() : u.created_at).format("MMM D, YYYY")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(createPageUrl("AdminUserDetail") + `?id=${u.id}&tenant=${u.tenant_id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRoleDialogUser(u);
                              setNewRole(u.role);
                            }}
                          >
                            <UserCog className="w-4 h-4 mr-1.5" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setImpersonateTarget(u)}
                          >
                            <LogIn className="w-4 h-4 mr-1.5" />
                            Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteUser(u)}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {roleDialogUser?.display_name || roleDialogUser?.email}
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
                <SelectItem value="read_only">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>Cancel</Button>
            <Button
              onClick={() => roleChangeMutation.mutate()}
              disabled={roleChangeMutation.isPending || newRole === roleDialogUser?.role}
            >
              {roleChangeMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteUser?.display_name || deleteUser?.email} and
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

      {/* Impersonate Confirmation (requires typing CONFIRM) */}
      <Dialog open={!!impersonateTarget} onOpenChange={(open) => {
        if (!open) { setImpersonateTarget(null); setConfirmText(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>
              You will be signed in as {impersonateTarget?.display_name || impersonateTarget?.email}.
              Type <strong>CONFIRM</strong> to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder='Type "CONFIRM" to continue'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImpersonateTarget(null); setConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => impersonateMutation.mutate()}
              disabled={confirmText !== "CONFIRM" || impersonateMutation.isPending}
            >
              {impersonateMutation.isPending ? "Signing in..." : "Impersonate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
