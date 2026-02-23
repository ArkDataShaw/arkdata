import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb, getTenantId } from "@arkdata/firebase-sdk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Moon, Globe, Mail, Bell, Database, Key, Webhook, Lock,
} from "lucide-react";

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

const digestOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "off", label: "Off" },
];

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "tenant_admin" || user?.role === "super_admin";

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [timezone, setTimezone] = useState("America/New_York");
  const [emailDigest, setEmailDigest] = useState("off");
  const [loading, setLoading] = useState(true);

  // Load user preferences from Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const tid = await getTenantId();
        const db = getDb();
        const userDoc = await getDoc(doc(db, "tenants", tid, "users", user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.timezone) setTimezone(data.timezone);
          if (data.email_digest) setEmailDigest(data.email_digest);
        }
      } catch {
        // Defaults are fine
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) load();
  }, [user?.id]);

  const handleDarkModeToggle = (checked) => {
    setDarkMode(checked);
    localStorage.setItem("darkMode", JSON.stringify(checked));
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const savePreference = async (field, value) => {
    try {
      const tid = await getTenantId();
      const db = getDb();
      await updateDoc(doc(db, "tenants", tid, "users", user.id), {
        [field]: value,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to save preference:", err);
    }
  };

  const handleTimezoneChange = (value) => {
    setTimezone(value);
    savePreference("timezone", value);
  };

  const handleDigestChange = (value) => {
    setEmailDigest(value);
    savePreference("email_digest", value);
  };

  const workspaceCards = [
    { icon: Bell, title: "Notifications", description: "Configure alert channels and thresholds" },
    { icon: Database, title: "Data Retention", description: "Set retention policies for raw events and cold storage" },
    { icon: Key, title: "API Keys", description: "Manage API keys for programmatic access" },
    { icon: Webhook, title: "Webhooks", description: "Configure outbound webhook endpoints" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your preferences and workspace configuration</p>
      </div>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Personal settings that apply to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-slate-500" />
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-slate-500">Toggle between light and dark themes</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />
          </div>

          {/* Timezone */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-slate-500" />
              <div>
                <Label className="text-sm font-medium">Timezone</Label>
                <p className="text-xs text-slate-500">Used for reports and scheduled actions</p>
              </div>
            </div>
            <Select value={timezone} onValueChange={handleTimezoneChange} disabled={loading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Digest */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-500" />
              <div>
                <Label className="text-sm font-medium">Email Digest</Label>
                <p className="text-xs text-slate-500">Receive a summary of activity</p>
              </div>
            </div>
            <Select value={emailDigest} onValueChange={handleDigestChange} disabled={loading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {digestOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Configure workspace-level settings for your team"
              : "Contact your team admin to change these settings"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspaceCards.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 opacity-60"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
            </div>
          ))}
          {!isAdmin && (
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>Contact your team admin to change these settings</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
