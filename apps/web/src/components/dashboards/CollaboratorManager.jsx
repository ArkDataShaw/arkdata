import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Eye, MessageSquare, Edit3 } from "lucide-react";

const permissionIcons = {
  view: Eye,
  comment: MessageSquare,
  edit: Edit3
};

export default function CollaboratorManager({ dashboardId, tenantId, currentUserEmail }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const queryClient = useQueryClient();

  const { data: collaborators = [] } = useQuery({
    queryKey: ["collaborators", dashboardId],
    queryFn: () => base44.entities.DashboardCollaborator.filter({ dashboard_id: dashboardId }),
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.DashboardCollaborator.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", dashboardId] });
      setEmail("");
      setPermission("view");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.DashboardCollaborator.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators", dashboardId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, permission }) => base44.entities.DashboardCollaborator.update(id, { permission }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators", dashboardId] }),
  });

  const handleAdd = () => {
    if (!email.trim()) return;
    addMutation.mutate({
      tenant_id: tenantId,
      dashboard_id: dashboardId,
      user_email: email.trim(),
      permission,
      invited_by: currentUserEmail
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          Share ({collaborators.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Collaborators</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Collaborator */}
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="comment">Comment</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Collaborator List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {collaborators.map((collab) => {
              const Icon = permissionIcons[collab.permission];
              return (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {collab.user_email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={collab.permission}
                      onValueChange={(val) => updateMutation.mutate({ id: collab.id, permission: val })}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View</SelectItem>
                        <SelectItem value="comment">Comment</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeMutation.mutate(collab.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {collaborators.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                No collaborators yet
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}