import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useBranding } from "@/lib/BrandingContext";
import {
  updateTenantBrandingFn,
  getTenantBranding,
  addDomainFn,
  removeDomainFn,
  verifyDomainFn,
  uploadBrandingAsset,
  deleteBrandingAsset,
  getDb,
} from "@arkdata/firebase-sdk";
import { collection, getDocs } from "firebase/firestore";
import { Palette, Trash2, CheckCircle, Clock, Upload, X, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function PartnerBranding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentBranding = useBranding();
  const [form, setForm] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const logoInputRef = useRef(null);
  const iconInputRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);

  // Load initial branding
  useEffect(() => {
    if (!user?.tenant_id) return;
    getTenantBranding(user.tenant_id).then((result) => {
      const data = result || {};
      setForm(data);
      setCompanyName(data.app_name || "");
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user?.tenant_id]);

  // Fetch custom domains
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ["custom-domains", user?.tenant_id],
    queryFn: async () => {
      const db = getDb();
      const snap = await getDocs(collection(db, "tenants", user.tenant_id, "custom_domains"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!user?.tenant_id,
  });

  // Save branding mutation (shared)
  const saveBranding = useMutation({
    mutationFn: (branding) => updateTenantBrandingFn(user.tenant_id, branding),
    onSuccess: (_, branding) => {
      const merged = { ...form, ...branding };
      setForm(merged);
      localStorage.setItem("arkdata_branding", JSON.stringify(merged));
      toast({ title: "Branding updated", description: "Changes will apply on next page load." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Company name
  const handleSetCompanyName = () => {
    if (!companyName.trim()) return;
    saveBranding.mutate({ app_name: companyName.trim() });
  };

  // Domain management
  const addDomainMutation = useMutation({
    mutationFn: () => addDomainFn(user.tenant_id, newDomain.trim()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      setNewDomain("");
      toast({
        title: "Domain added",
        description: `Add TXT record: ${data.verification_token}`,
      });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeDomainMutation = useMutation({
    mutationFn: (domainId) => removeDomainFn(user.tenant_id, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast({ title: "Domain removed" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: (domainId) => verifyDomainFn(user.tenant_id, domainId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
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

  // Logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadBrandingAsset(file, "logo");
      await updateTenantBrandingFn(user.tenant_id, { logo_url: url });
      setForm((prev) => ({ ...prev, logo_url: url }));
      localStorage.setItem("arkdata_branding", JSON.stringify({ ...form, logo_url: url }));
      toast({ title: "Logo uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleLogoClear = async () => {
    try {
      await deleteBrandingAsset("logo");
      await updateTenantBrandingFn(user.tenant_id, { logo_url: "" });
      setForm((prev) => ({ ...prev, logo_url: "" }));
      localStorage.setItem("arkdata_branding", JSON.stringify({ ...form, logo_url: "" }));
      toast({ title: "Logo cleared" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Icon upload
  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconUploading(true);
    try {
      const url = await uploadBrandingAsset(file, "favicon");
      await updateTenantBrandingFn(user.tenant_id, { favicon_url: url });
      setForm((prev) => ({ ...prev, favicon_url: url }));
      localStorage.setItem("arkdata_branding", JSON.stringify({ ...form, favicon_url: url }));
      toast({ title: "Site icon uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIconUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  const handleIconClear = async () => {
    try {
      await deleteBrandingAsset("favicon");
      await updateTenantBrandingFn(user.tenant_id, { favicon_url: "" });
      setForm((prev) => ({ ...prev, favicon_url: "" }));
      localStorage.setItem("arkdata_branding", JSON.stringify({ ...form, favicon_url: "" }));
      toast({ title: "Site icon cleared" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Save remaining fields (colors + email)
  const handleSaveSettings = () => {
    saveBranding.mutate({
      primary_color: form.primary_color || "",
      accent_color: form.accent_color || "",
      email_logo_url: form.email_logo_url || "",
      email_footer_text: form.email_footer_text || "",
    });
  };

  if (!loaded) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize the look and feel of the platform for your team and clients.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Company Name */}
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
                  onClick={handleSetCompanyName}
                  disabled={!companyName.trim() || saveBranding.isPending}
                >
                  Set
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Custom Domains */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Custom Domains
              </CardTitle>
              <CardDescription>
                Add custom domains and verify DNS ownership.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Domain List */}
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
                          variant="ghost"
                          size="sm"
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

              {/* Add Domain */}
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

          {/* 3. Logo Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logo</CardTitle>
              <CardDescription>Recommended: square PNG or SVG, at least 128x128px.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <div className="relative">
                    <img src={form.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded border border-slate-200 dark:border-slate-700" />
                    <button
                      onClick={handleLogoClear}
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
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Site Icon Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Site Icon</CardTitle>
              <CardDescription>Recommended: 48x48 PNG. Used as the browser favicon.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {form.favicon_url ? (
                  <div className="relative">
                    <img src={form.favicon_url} alt="Favicon" className="w-12 h-12 object-contain rounded border border-slate-200 dark:border-slate-700" />
                    <button
                      onClick={handleIconClear}
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
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={iconUploading}
                  >
                    {iconUploading ? "Uploading..." : "Upload Icon"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Brand Settings (colors + email) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Brand Settings
              </CardTitle>
              <CardDescription>
                Colors and email branding for your team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Primary Color */}
              <div className="space-y-1.5">
                <Label className="text-sm">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color || "#0f172a"}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                  />
                  <Input
                    value={form.primary_color || ""}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    placeholder="#0f172a"
                    className="flex-1"
                  />
                </div>
              </div>
              {/* Accent Color */}
              <div className="space-y-1.5">
                <Label className="text-sm">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accent_color || "#7c3aed"}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                  />
                  <Input
                    value={form.accent_color || ""}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    placeholder="#7c3aed"
                    className="flex-1"
                  />
                </div>
              </div>
              {/* Email Logo URL */}
              <div className="space-y-1.5">
                <Label className="text-sm">Email Logo URL</Label>
                <Input
                  value={form.email_logo_url || ""}
                  onChange={(e) => setForm({ ...form, email_logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              {/* Email Footer Text */}
              <div className="space-y-1.5">
                <Label className="text-sm">Email Footer Text</Label>
                <Input
                  value={form.email_footer_text || ""}
                  onChange={(e) => setForm({ ...form, email_footer_text: e.target.value })}
                  placeholder="Your Brand · yourdomain.com"
                />
              </div>
              <div className="pt-3">
                <Button
                  onClick={handleSaveSettings}
                  disabled={saveBranding.isPending}
                >
                  {saveBranding.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                {/* Mock sidebar header */}
                <div
                  className="p-4 flex items-center gap-3"
                  style={{ backgroundColor: form.primary_color || "#0f172a" }}
                >
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Logo"
                      className="w-8 h-8 object-contain rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                      <Palette className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="font-semibold text-white text-sm">
                    {form.app_name || "Your Brand"}
                  </span>
                </div>
                {/* Mock nav items */}
                <div className="p-3 space-y-1 bg-slate-50 dark:bg-slate-900">
                  {["Overview", "Visitors", "Analytics"].map((label) => (
                    <div
                      key={label}
                      className="px-3 py-2 rounded text-xs text-slate-600 dark:text-slate-400"
                    >
                      {label}
                    </div>
                  ))}
                  <div
                    className="px-3 py-2 rounded text-xs font-medium"
                    style={{
                      backgroundColor: (form.accent_color || "#7c3aed") + "20",
                      color: form.accent_color || "#7c3aed",
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
    </div>
  );
}
