import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { listMyTeamUsers, inviteUserFn, deleteTenantUser, updateUserRoleFn } from "@arkdata/firebase-sdk";
import { UserPlus, Trash2, MoreHorizontal } from "lucide-react";
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
  analyst: "Analyst",
  operator: "Operator",
  read_only: "Viewer",
};

export default function TeamMembers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

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

  const inviteMutation = useMutation({
    mutationFn: () => inviteUserFn(inviteForm.email, tenantId, inviteForm.role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-team-users"] });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Team Members
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage who has access to your workspace
          </p>
        </div>
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No members yet. Invite someone to get started.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-600/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                            {(u.display_name || u.email)?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {u.display_name || "—"}
                        </span>
                        {u.id === user?.id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>
                        )}
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
                      {u.id !== user?.id && (
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
                              Change Role
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
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="read_only">Viewer</SelectItem>
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
            <DialogTitle>Change Role</DialogTitle>
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
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="read_only">Viewer</SelectItem>
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
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
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
