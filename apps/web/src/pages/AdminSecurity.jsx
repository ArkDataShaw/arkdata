import React from "react";
import { Lock, Trash2, Shield, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSecurity() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Security & Compliance</h1>
        <p className="text-sm text-slate-500 mt-1">Data retention, deletion requests, and security settings</p>
      </div>

      {/* Data Retention */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Data Retention Policy</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Raw Events Retention</Label>
            <Select defaultValue="90">
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Session Data Retention</Label>
            <Select defaultValue="180">
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Visitor Profiles Retention</Label>
            <Select defaultValue="365">
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="never">Never delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">Save Policy</Button>
      </div>

      {/* Deletion Requests */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-semibold text-slate-900">Data Deletion Request</h3>
        </div>
        <p className="text-xs text-slate-500">Process GDPR/CCPA deletion requests for specific visitors or people</p>
        <div className="flex gap-2">
          <Input placeholder="Enter email or visitor ID to delete" className="max-w-md" />
          <Button variant="destructive">Process Deletion</Button>
        </div>
      </div>

      {/* Security Overview */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900">Security Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: "Tenant Isolation", status: "Active", ok: true },
            { label: "PII Encryption", status: "Enabled", ok: true },
            { label: "API Rate Limiting", status: "Enabled", ok: true },
            { label: "Audit Logging", status: "Active", ok: true },
            { label: "Token Encryption", status: "AES-256", ok: true },
            { label: "IP Hashing", status: "SHA-256", ok: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-700">{item.label}</span>
              <span className={`text-xs font-medium ${item.ok ? "text-emerald-600" : "text-red-600"}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}