import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  getTenant, listTenantUsers, inviteUserFn,
  updateTenantLimitsFn, deleteTenantUser,
} from "@arkdata/firebase-sdk";
import {
  ArrowLeft, Users, Settings, UserPlus, Trash2, MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
  analyst: "Member",
  operator: "Member",
  read_only: "Member",
};

export default function AdminTenantDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("id");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "read_only" });
  const [resetLink, setResetLink] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["admin-tenant", tenantId],
    queryFn: () => getTenant(tenantId),
    enabled: !!tenantId,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-tenant-users", tenantId],
    queryFn: () => listTenantUsers(tenantId),
    enabled: !!tenantId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteUserFn(inviteForm.email, tenantId, inviteForm.role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "read_only" });
      // Show the password reset link so admin can share it with the user
      if (data.reset_link) {
        setResetLink(data.reset_link);
      } else {
        toast({ title: "User invited", description: "User account created." });
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (uid) => deleteTenantUser(uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      setDeleteUserId(null);
      toast({ title: "User removed" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [limits, setLimits] = useState(null);
  const limitsToEdit = limits || tenant?.limits || {};

  const limitsMutation = useMutation({
    mutationFn: () => updateTenantLimitsFn(tenantId, limitsToEdit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      setLimits(null);
      toast({ title: "Limits updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!tenantId) {
    return (
      <div className="p-6">
        <p className="text-slate-500">No tenant ID provided.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost" size="icon"
          onClick={() => navigate(createPageUrl("AdminTenants"))}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {tenantLoading ? "Loading..." : tenant?.name || "Unknown Team"}
          </h1>
          {tenant && (
            <p className="text-sm text-slate-500 mt-0.5">
              {tenant.plan} plan &middot; {tenant.active_users || 0} members
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1.5" />
            Members
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Settings className="w-4 h-4 mr-1.5" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{users.length} members</p>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Invite Member
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No members yet
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                              <span className="text-xs font-semibold text-violet-600">
                                {(u.display_name || u.email)?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="font-medium text-slate-900">
                              {u.display_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize text-xs">
                            {roleLabels[u.role] || u.role}
                          </Badge>
                        </td>
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
                                onClick={() => navigate(createPageUrl("AdminUserDetail") + `?id=${u.id}`)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteUserId(u.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Remove
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
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "monthly_pixel_limit", label: "Monthly Pixel Limit" },
                { key: "pixel_resolution_limit", label: "Pixel Resolution Limit" },
                { key: "max_domains", label: "Max Domains" },
                { key: "max_users", label: "Max Users" },
                { key: "max_dashboards", label: "Max Dashboards" },
                { key: "api_requests_per_day", label: "API Requests / Day" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label className="text-sm text-slate-600 min-w-[180px]">{label}</Label>
                  <Input
                    type="number"
                    className="max-w-[160px]"
                    value={limitsToEdit[key] ?? ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setLimits({ ...limitsToEdit, [key]: isNaN(val) ? 0 : val });
                    }}
                  />
                </div>
              ))}
              <div className="pt-2">
                <Button
                  onClick={() => limitsMutation.mutate()}
                  disabled={limitsMutation.isPending || !limits}
                  size="sm"
                >
                  {limitsMutation.isPending ? "Saving..." : "Save Limits"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              They'll receive a password reset email to set up their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Owner</SelectItem>
                  <SelectItem value="read_only">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteForm.email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user from this team and delete their account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteUserId)}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Link Dialog — shown after successful invite */}
      <Dialog open={!!resetLink} onOpenChange={(open) => !open && setResetLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Invited</DialogTitle>
            <DialogDescription>
              Share this password reset link with the user so they can set their
              password and log in. This link expires in 1 hour.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-3 break-all text-sm font-mono text-slate-700 dark:text-slate-300 select-all">
              {resetLink}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(resetLink);
                toast({ title: "Copied to clipboard" });
              }}
            >
              Copy Link
            </Button>
            <Button onClick={() => setResetLink(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
