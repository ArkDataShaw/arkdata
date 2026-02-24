import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { confirmPasswordReset, getAuth } from "firebase/auth";
import { getAuthInstance } from "@arkdata/firebase-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useBranding } from "@/lib/BrandingContext";

export default function ResetPassword() {
  const branding = useBranding();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const passwordsMatch = password === confirmPw;
  const isValid = password.length >= 8 && passwordsMatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || !oobCode) return;

    setStatus("loading");
    try {
      const auth = getAuthInstance();
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      if (err.code === "auth/expired-action-code") {
        setErrorMsg("This link has expired. Please ask your admin for a new invite.");
      } else if (err.code === "auth/invalid-action-code") {
        setErrorMsg("This link is invalid or has already been used.");
      } else {
        setErrorMsg(err.message || "Something went wrong. Please try again.");
      }
    }
  }

  if (!oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold">Invalid Link</h2>
            <p className="text-sm text-slate-500 mt-2">
              This password reset link is missing required parameters.
            </p>
            <Button className="mt-4" onClick={() => { window.location.href = "/login"; }}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold">Password Set</h2>
            <p className="text-sm text-slate-500 mt-2">
              Your password has been set. You can now log in to your account.
            </p>
            <Button className="mt-4" onClick={() => { window.location.href = "/login"; }}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={branding.logo_url || "/logo.png"} alt={branding.app_name || "Ark Data"} className="w-12 h-12 mx-auto mb-2 object-contain" />
          <CardTitle className="text-xl">Set Your Password</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Welcome to {branding.app_name || "Ark Data"}. Create a password to access your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
              {confirmPw && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords don't match</p>
              )}
            </div>

            {status === "error" && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || status === "loading"}
            >
              {status === "loading" ? "Setting Password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
