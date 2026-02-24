import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  getTenant, listTenantUsers, listAllTenants, inviteUserFn, createTenantFn,
  updateTenantLimitsFn, updateTenantBrandingFn, deleteTenantUser,
  updateUserRoleFn, impersonateUserFn,
  addDomainFn, removeDomainFn, verifyDomainFn,
  uploadBrandingAsset, deleteBrandingAsset,
  getDb,
} from "@arkdata/firebase-sdk";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowLeft, Users, Settings, UserPlus, Trash2, MoreHorizontal, Palette,
  Eye, UserCog, LogIn, Layers, Plus, Globe, CheckCircle, Clock, Upload, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  platform_admin: "Platform Admin",
  super_admin: "Super Admin",
  tenant_admin: "Owner",
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
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [roleDialogUser, setRoleDialogUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [impersonateTarget, setImpersonateTarget] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

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

  // Fetch child teams for partner tenants
  const { data: allTenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => listAllTenants(),
  });
  const childTeams = allTenants.filter((t) => t.parent_tenant_id === tenantId);

  const createTeamMutation = useMutation({
    mutationFn: () => createTenantFn(newTeamName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setCreateTeamOpen(false);
      const createdName = newTeamName;
      setNewTeamName("");
      toast({ title: "Team created", description: `${createdName} has been created.` });
      if (data?.tenant_id) {
        navigate(createPageUrl("AdminTenantDetail") + `?id=${data.tenant_id}`);
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteUserFn(inviteForm.email, tenantId, inviteForm.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      toast({ title: "Invite sent", description: `Invite sent to ${inviteForm.email}` });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "read_only" });
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

  const roleChangeMutation = useMutation({
    mutationFn: () => updateUserRoleFn(roleDialogUser.id, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant-users", tenantId] });
      setRoleDialogUser(null);
      setNewRole("");
      toast({ title: "Role updated" });
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
      window.location.href = "/";
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

  // Branding state (for top-level partner tenants)
  const [brandingForm, setBrandingForm] = useState(null);
  const brandingToEdit = brandingForm || tenant?.branding || {};
  const isTopLevelPartner = tenant && !tenant.parent_tenant_id;
  const [companyName, setCompanyName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const logoInputRef = useRef(null);
  const iconInputRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);

  // Initialize company name from tenant data
  React.useEffect(() => {
    if (tenant?.branding?.app_name) setCompanyName(tenant.branding.app_name);
  }, [tenant?.branding?.app_name]);

  // Fetch custom domains for this tenant
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ["custom-domains", tenantId],
    queryFn: async () => {
      const db = getDb();
      const snap = await getDocs(collection(db, "tenants", tenantId, "custom_domains"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!tenantId && !!isTopLevelPartner,
  });

  const brandingMutation = useMutation({
    mutationFn: (branding) => updateTenantBrandingFn(tenantId, branding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      toast({ title: "Branding updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: () => addDomainFn(tenantId, newDomain.trim()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains", tenantId] });
      setNewDomain("");
      toast({ title: "Domain added", description: `Add TXT record: ${data.verification_token}` });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeDomainMutation = useMutation({
    mutationFn: (domainId) => removeDomainFn(tenantId, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains", tenantId] });
      toast({ title: "Domain removed" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: (domainId) => verifyDomainFn(tenantId, domainId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains", tenantId] });
      if (result.verified) {
        toast({ title: "Domain verified" });
      } else {
        toast({ title: "Not verified", description: result.message, variant: "destructive" });
      }
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
          onClick={() => navigate(createPageUrl(isTopLevelPartner ? "AdminPartners" : "AdminTenants"))}
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

      <Tabs defaultValue={isTopLevelPartner ? "teams" : "members"}>
        <TabsList>
          {isTopLevelPartner && (
            <TabsTrigger value="teams">
              <Layers className="w-4 h-4 mr-1.5" />
              Teams
            </TabsTrigger>
          )}
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1.5" />
            Members
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Settings className="w-4 h-4 mr-1.5" />
            Permissions
          </TabsTrigger>
          {isTopLevelPartner && (
            <TabsTrigger value="branding">
              <Palette className="w-4 h-4 mr-1.5" />
              Branding
            </TabsTrigger>
          )}
        </TabsList>

        {/* Teams Tab (partner only) */}
        {isTopLevelPartner && (
          <TabsContent value="teams" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{childTeams.length} {childTeams.length === 1 ? "team" : "teams"}</p>
              <Button size="sm" onClick={() => setCreateTeamOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Team
              </Button>
            </div>
            {childTeams.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No teams yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {childTeams.map((team) => (
                  <Card key={team.id} className="flex flex-col">
                    <CardContent className="p-5 flex flex-col flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {team.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {team.active_users || 0} members
                      </p>
                      <div className="mt-auto pt-4">
                        <Button
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                          onClick={() => navigate(createPageUrl("AdminTenantDetail") + `?id=${team.id}`)}
                        >
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

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
                                onClick={() => navigate(createPageUrl("AdminUserDetail") + `?id=${u.id}&tenant=${tenantId}`)}
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
                                onClick={() => setDeleteUserId(u.id)}
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
        {/* Branding Tab */}
        {isTopLevelPartner && (
          <TabsContent value="branding" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Company Name */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Company Name</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Analytics"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => brandingMutation.mutate({ app_name: companyName.trim() })}
                        disabled={!companyName.trim() || brandingMutation.isPending}
                      >
                        Set
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Domains */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Custom Domains
                    </CardTitle>
                    <CardDescription>Add custom domains and verify DNS ownership.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {domains.length > 0 && (
                      <div className="border rounded-lg divide-y dark:border-slate-800 dark:divide-slate-800">
                        <div className="grid grid-cols-[1fr_100px_100px] px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                          <span>Domain</span>
                          <span>Status</span>
                          <span className="text-right">Actions</span>
                        </div>
                        {domains.map((d) => (
                          <div key={d.id} className="grid grid-cols-[1fr_100px_100px] items-center px-4 py-3">
                            <span className="text-sm text-slate-900 dark:text-white truncate">{d.domain}</span>
                            <span>
                              {d.status === "verified" ? (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge
                                  className="bg-amber-100 text-amber-700 text-xs cursor-pointer"
                                  onClick={() => verifyDomainMutation.mutate(d.id)}
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </span>
                            <span className="text-right">
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => removeDomainMutation.mutate(d.id)}
                                className="text-red-500 hover:text-red-700 h-8 px-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {domains.length === 0 && !domainsLoading && (
                      <p className="text-sm text-slate-400">No custom domains configured.</p>
                    )}
                    <div className="flex items-center gap-3">
                      <Input
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="app.yourdomain.com"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => addDomainMutation.mutate()}
                        disabled={!newDomain.trim() || addDomainMutation.isPending}
                      >
                        {addDomainMutation.isPending ? "Adding..." : "Add Domain"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Logo Upload */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Logo</CardTitle>
                    <CardDescription>Recommended: square PNG or SVG, at least 128x128px.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {brandingToEdit.logo_url ? (
                        <div className="relative">
                          <img src={brandingToEdit.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded border border-slate-200 dark:border-slate-700" />
                          <button
                            onClick={async () => {
                              try {
                                await deleteBrandingAsset("logo");
                                await updateTenantBrandingFn(tenantId, { logo_url: "" });
                                queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
                                toast({ title: "Logo cleared" });
                              } catch (err) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLogoUploading(true);
                            try {
                              const url = await uploadBrandingAsset(file, "logo");
                              await updateTenantBrandingFn(tenantId, { logo_url: url });
                              queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
                              toast({ title: "Logo uploaded" });
                            } catch (err) {
                              toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                            } finally {
                              setLogoUploading(false);
                              if (logoInputRef.current) logoInputRef.current.value = "";
                            }
                          }}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                          {logoUploading ? "Uploading..." : "Upload Logo"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Site Icon Upload */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Site Icon</CardTitle>
                    <CardDescription>Recommended: 48x48 PNG. Used as the browser favicon.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {brandingToEdit.favicon_url ? (
                        <div className="relative">
                          <img src={brandingToEdit.favicon_url} alt="Favicon" className="w-12 h-12 object-contain rounded border border-slate-200 dark:border-slate-700" />
                          <button
                            onClick={async () => {
                              try {
                                await deleteBrandingAsset("favicon");
                                await updateTenantBrandingFn(tenantId, { favicon_url: "" });
                                queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
                                toast({ title: "Site icon cleared" });
                              } catch (err) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <Upload className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <input
                          ref={iconInputRef}
                          type="file"
                          accept="image/png,image/x-icon,image/svg+xml"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIconUploading(true);
                            try {
                              const url = await uploadBrandingAsset(file, "favicon");
                              await updateTenantBrandingFn(tenantId, { favicon_url: url });
                              queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
                              toast({ title: "Site icon uploaded" });
                            } catch (err) {
                              toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                            } finally {
                              setIconUploading(false);
                              if (iconInputRef.current) iconInputRef.current.value = "";
                            }
                          }}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" onClick={() => iconInputRef.current?.click()} disabled={iconUploading}>
                          {iconUploading ? "Uploading..." : "Upload Icon"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Brand Settings (colors + email) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Brand Settings
                    </CardTitle>
                    <CardDescription>Colors and email branding.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandingToEdit.primary_color || "#0f172a"}
                          onChange={(e) => setBrandingForm({ ...brandingToEdit, primary_color: e.target.value })}
                          className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        />
                        <Input
                          value={brandingToEdit.primary_color || ""}
                          onChange={(e) => setBrandingForm({ ...brandingToEdit, primary_color: e.target.value })}
                          placeholder="#0f172a"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Accent Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandingToEdit.accent_color || "#7c3aed"}
                          onChange={(e) => setBrandingForm({ ...brandingToEdit, accent_color: e.target.value })}
                          className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        />
                        <Input
                          value={brandingToEdit.accent_color || ""}
                          onChange={(e) => setBrandingForm({ ...brandingToEdit, accent_color: e.target.value })}
                          placeholder="#7c3aed"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Email Logo URL</Label>
                      <Input
                        value={brandingToEdit.email_logo_url || ""}
                        onChange={(e) => setBrandingForm({ ...brandingToEdit, email_logo_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Email Footer Text</Label>
                      <Input
                        value={brandingToEdit.email_footer_text || ""}
                        onChange={(e) => setBrandingForm({ ...brandingToEdit, email_footer_text: e.target.value })}
                        placeholder="Your Brand · yourdomain.com"
                      />
                    </div>
                    <div className="pt-3">
                      <Button
                        onClick={() => brandingMutation.mutate({
                          primary_color: brandingToEdit.primary_color || "",
                          accent_color: brandingToEdit.accent_color || "",
                          email_logo_url: brandingToEdit.email_logo_url || "",
                          email_footer_text: brandingToEdit.email_footer_text || "",
                        })}
                        disabled={brandingMutation.isPending || !brandingForm}
                      >
                        {brandingMutation.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview */}
              <div>
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <div
                        className="p-4 flex items-center gap-3"
                        style={{ backgroundColor: brandingToEdit.primary_color || "#0f172a" }}
                      >
                        {brandingToEdit.logo_url ? (
                          <img src={brandingToEdit.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                            <Palette className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <span className="font-semibold text-white text-sm">
                          {brandingToEdit.app_name || "Your Brand"}
                        </span>
                      </div>
                      <div className="p-3 space-y-1 bg-slate-50 dark:bg-slate-900">
                        {["Overview", "Visitors", "Analytics"].map((label) => (
                          <div key={label} className="px-3 py-2 rounded text-xs text-slate-600 dark:text-slate-400">
                            {label}
                          </div>
                        ))}
                        <div
                          className="px-3 py-2 rounded text-xs font-medium"
                          style={{
                            backgroundColor: (brandingToEdit.accent_color || "#7c3aed") + "20",
                            color: brandingToEdit.accent_color || "#7c3aed",
                          }}
                        >
                          Active Page
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
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

      {/* Impersonate Confirmation */}
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

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user from this team and remove their account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteUserId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Team Dialog (for partner tenants) */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Create a new team under {tenant?.name || "this partner"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g. Acme Corp"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTeamMutation.mutate()}
              disabled={!newTeamName.trim() || createTeamMutation.isPending}
            >
              {createTeamMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
