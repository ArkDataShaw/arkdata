import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { listMyTeamUsers, inviteUserFn, deleteTenantUser, updateUserRoleFn } from "@arkdata/firebase-sdk";
import { getTenantId, getDb } from "@arkdata/firebase-sdk";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { PlusCircle, MoreHorizontal, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  read_only: "Member",
};

const roleBadgeColors = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  tenant_admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  read_only: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function RoleBadge({ role }) {
  return (
    <Badge className={`text-xs ${roleBadgeColors[role] || roleBadgeColors.read_only}`}>
      {roleLabels[role] || role}
    </Badge>
  );
}

export default function TeamMembers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "read_only" });
  const [resetLink, setResetLink] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [roleEditUser, setRoleEditUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["my-team-users"],
    queryFn: () => listMyTeamUsers(),
    enabled: !!tenantId,
  });

  // Fetch pending invitations from tenants/{tid}/invitations subcollection
  const { data: invitations = [] } = useQuery({
    queryKey: ["my-team-invitations", tenantId],
    queryFn: async () => {
      const tid = await getTenantId();
      const db = getDb();
      const snap = await getDocs(
        query(collection(db, "tenants", tid, "invitations"), where("status", "==", "pending"))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!tenantId,
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const filteredInvitations = useMemo(() => {
    if (!inviteSearchQuery.trim()) return invitations;
    const q = inviteSearchQuery.toLowerCase();
    return invitations.filter((inv) => (inv.email || "").toLowerCase().includes(q));
  }, [invitations, inviteSearchQuery]);

  const inviteMutation = useMutation({
    mutationFn: () => inviteUserFn(inviteForm.email, tenantId, inviteForm.role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-team-users"] });
      queryClient.invalidateQueries({ queryKey: ["my-team-invitations"] });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "read_only" });
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
      queryClient.invalidateQueries({ queryKey: ["my-team-users"] });
      setDeleteUserId(null);
      toast({ title: "Member removed" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ uid, role }) => updateUserRoleFn(uid, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-team-users"] });
      setRoleEditUser(null);
      setNewRole("");
      toast({ title: "Role updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const tid = await getTenantId();
      const db = getDb();
      await deleteDoc(doc(db, "tenants", tid, "invitations", inviteId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-team-invitations"] });
      toast({ title: "Invitation revoked" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isAdmin = user?.role === "tenant_admin" || user?.role === "super_admin";

  return (
    <div className="p-6 space-y-6">
      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Team Members</CardTitle>
              <CardDescription>Here you can manage the members of your team.</CardDescription>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setInviteOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 rounded-full px-5"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Invite Members
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined at</th>
                  <th className="px-4 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      {searchQuery ? "No members match your search." : "No members yet. Invite someone to get started."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                              {(u.display_name || u.email)?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-200">
                            {u.display_name || "—"}
                          </span>
                          {u.id === user?.id && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">You</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                        {u.created_at
                          ? moment(u.created_at.toDate ? u.created_at.toDate() : u.created_at).format("M/D/YYYY")
                          : "—"}
                      </td>
                      <td className="px-4 py-4">
                        {u.id !== user?.id && isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => { setRoleEditUser(u); setNewRole(u.role); }}
                              >
                                Update Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteUserId(u.id)}
                              >
                                Remove from Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites Card */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Pending Invites</CardTitle>
            <CardDescription>Here you can manage the pending invitations to your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search Invitations"
                value={inviteSearchQuery}
                onChange={(e) => setInviteSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Invitations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Invited at</th>
                    <th className="px-4 py-3 font-medium">Expires at</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvitations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    filteredInvitations.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {(inv.email)?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="text-slate-700 dark:text-slate-300">{inv.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <RoleBadge role={inv.role} />
                        </td>
                        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                          {inv.invited_at
                            ? moment(inv.invited_at.toDate ? inv.invited_at.toDate() : inv.invited_at).format("M/D/YYYY")
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                          {inv.expires_at
                            ? moment(inv.expires_at.toDate ? inv.expires_at.toDate() : inv.expires_at).format("M/D/YYYY")
                            : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-600 dark:text-green-400">
                            {inv.status === "pending" ? "Active" : inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => revokeInviteMutation.mutate(inv.id)}
                              >
                                Revoke Invitation
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
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Add a new member to your team. They'll receive a link to set up their account.
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

      {/* Change Role Dialog */}
      <Dialog open={!!roleEditUser} onOpenChange={(open) => !open && setRoleEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Role</DialogTitle>
            <DialogDescription>
              Update the role for {roleEditUser?.display_name || roleEditUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_admin">Owner</SelectItem>
                <SelectItem value="read_only">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleEditUser(null)}>Cancel</Button>
            <Button
              onClick={() => roleMutation.mutate({ uid: roleEditUser.id, role: newRole })}
              disabled={roleMutation.isPending || newRole === roleEditUser?.role}
            >
              {roleMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user from your team and delete their account.
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

      {/* Reset Link Dialog */}
      <Dialog open={!!resetLink} onOpenChange={(open) => !open && setResetLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Invited</DialogTitle>
            <DialogDescription>
              Share this link with the user so they can set their password and log in.
              This link expires in 1 hour.
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
            <Button onClick={() => setResetLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
