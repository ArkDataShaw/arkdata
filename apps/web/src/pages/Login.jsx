import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, checkAppState } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [resetSent, setResetSent] = useState(false);

  // If already authenticated, redirect to home
  if (!isLoadingAuth && isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await base44.auth.signIn(email, password);
      await checkAppState();
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      await base44.auth.sendPasswordResetEmail(email.trim());
      setResetSent(true);
    } catch (err) {
      // Don't reveal whether email exists — always show success
      setResetSent(true);
    } finally {
      setLoading(false);
    }
  };

  const switchToForgot = () => {
    setMode("forgot");
    setError("");
    setResetSent(false);
  };

  const switchToLogin = () => {
    setMode("login");
    setError("");
    setResetSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ArkData</CardTitle>
          <CardDescription>
            {mode === "login" ? "Sign in to your account" : "Reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : resetSent ? (
            <div className="flex flex-col items-center py-4 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
              <p className="text-sm text-slate-700 text-center">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox.
              </p>
              <button
                onClick={switchToLogin}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <p className="text-sm text-slate-500">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <button
                type="button"
                onClick={switchToLogin}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline w-full justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
