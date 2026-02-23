import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@arkdata/firebase-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const roleLabels = {
  super_admin: "Super Admin",
  tenant_admin: "Owner",
  read_only: "Member",
};

export default function Profile() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company: "",
    bio: "",
  });

  const isOwner = authUser?.role === "tenant_admin" || authUser?.role === "super_admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Fetch tenant name
        let company = "";
        if (currentUser.tenant_id) {
          const db = getDb();
          const tenantSnap = await getDoc(doc(db, "tenants", currentUser.tenant_id));
          if (tenantSnap.exists()) {
            company = tenantSnap.data().name || "";
            setTenantName(company);
          }
        }

        setFormData({
          full_name: currentUser.name || "",
          phone: currentUser.phone || "",
          company,
          bio: currentUser.bio || "",
        });
      } catch (error) {
        console.error("Failed to load user:", error);
        setMessage({ type: "error", text: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Update user profile (name + phone + bio persisted to Firestore)
      await base44.auth.updateMe({
        name: formData.full_name,
        phone: formData.phone,
        bio: formData.bio,
      });

      // If owner and company name changed, update tenant doc
      if (isOwner && formData.company && formData.company !== tenantName && authUser?.tenant_id) {
        const db = getDb();
        await updateDoc(doc(db, "tenants", authUser.tenant_id), {
          name: formData.company,
          name_confirmed: true,
        });
        setTenantName(formData.company);
      }

      setMessage({ type: "success", text: "Profile saved successfully!" });
      setUser(prev => ({ ...prev, name: formData.full_name }));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setMessage({ type: "error", text: error.message || "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex gap-3 p-4 rounded-lg ${
          message.type === "success"
            ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900"
            : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <p className={message.type === "success" ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
            {message.text}
          </p>
        </div>
      )}

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-white">
                {(user?.name || user?.email)?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium">{user?.email}</p>
              <Badge className="mt-2" variant="secondary">
                {roleLabels[authUser?.role] || authUser?.role || "Member"}
              </Badge>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Full Name</label>
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Phone</label>
            <Input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Company
              {!isOwner && (
                <span className="text-xs font-normal text-slate-400 ml-2">
                  (Only owners can change this)
                </span>
              )}
            </label>
            <Input
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your company name"
              disabled={!isOwner}
              className={!isOwner ? "bg-slate-50 dark:bg-slate-900" : ""}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Bio</label>
            <Textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              className="min-h-24"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
            <p className="font-mono text-sm">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
            <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
