import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@arkdata/firebase-sdk";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useBranding } from "@/lib/BrandingContext";

export default function CompanyNameModal() {
  const { user } = useAuth();
  const branding = useBranding();
  const [show, setShow] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isAdmin = user?.role === "tenant_admin" || user?.role === "super_admin" || user?.role === "platform_admin";

  useEffect(() => {
    if (!user?.tenant_id || !isAdmin) return;

    const check = async () => {
      try {
        const db = getDb();
        const tenantSnap = await getDoc(doc(db, "tenants", user.tenant_id));
        if (tenantSnap.exists()) {
          const data = tenantSnap.data();
          if (!data.name_confirmed) {
            setCompanyName(data.name || "");
            setShow(true);
          }
        }
      } catch {
        // Silently fail — don't block the app
      } finally {
        setLoaded(true);
      }
    };

    check();
  }, [user?.tenant_id, isAdmin]);

  if (!loaded || !show) return null;

  const handleSave = async () => {
    if (companyName.trim().length < 2) return;
    setSaving(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, "tenants", user.tenant_id), {
        name: companyName.trim(),
        name_confirmed: true,
      });
      setShow(false);
    } catch (err) {
      console.error("Failed to save company name:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={() => { /* Prevent dismissal */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-600" />
            </div>
            <DialogTitle className="text-xl">Welcome to {branding.app_name || "Ark Data"}!</DialogTitle>
          </div>
          <DialogDescription>
            Set your company name to get started. This will be visible to all team members.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <label className="block text-sm font-semibold mb-2">Company Name</label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company name"
            autoFocus
          />
          {companyName.trim().length > 0 && companyName.trim().length < 2 && (
            <p className="text-xs text-red-500 mt-1">Must be at least 2 characters</p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving || companyName.trim().length < 2}
            className="w-full"
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
