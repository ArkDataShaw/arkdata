import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getImpersonationOrigin, clearImpersonationOrigin, endImpersonationFn } from "@arkdata/firebase-sdk";
import { LogOut, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Checks if the current session is an active impersonation.
 * Returns true if impersonating, false otherwise.
 * Also cleans up stale localStorage if the origin matches the current user.
 */
export function useImpersonation(user) {
  const [isImpersonating, setIsImpersonating] = useState(() => {
    const origin = getImpersonationOrigin();
    return !!origin && !!user && origin.admin_uid !== user?.id;
  });

  useEffect(() => {
    const check = () => {
      const origin = getImpersonationOrigin();
      if (!origin || !user) {
        setIsImpersonating(false);
        return;
      }
      // Stale data — admin is viewing their own account normally
      if (origin.admin_uid === user.id) {
        clearImpersonationOrigin();
        setIsImpersonating(false);
        return;
      }
      setIsImpersonating(true);
    };

    check();

    // Re-check when localStorage changes (e.g., from another tab or after impersonation switch)
    const handleStorage = (e) => {
      if (e.key === "arkdata_impersonation_origin") check();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.id]);

  return isImpersonating;
}

export default function ImpersonationBanner({ visible, onDismiss }) {
  const { user } = useAuth();
  const [returning, setReturning] = useState(false);
  const origin = getImpersonationOrigin();

  if (!visible || !origin || !user) return null;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await endImpersonationFn();
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to end impersonation:", err);
      setReturning(false);
    }
  };

  return (
    <div className="bg-amber-500 text-slate-900 px-4 py-1.5 flex items-center justify-between text-sm font-medium z-50 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">
          Viewing as <strong>{user.name || user.email}</strong>
          {user.tenant_id && <span className="opacity-75"> ({user.tenant_id})</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="bg-white/90 hover:bg-white text-slate-900 border-slate-900/20 h-7 text-xs font-semibold"
          onClick={handleReturn}
          disabled={returning}
        >
          <LogOut className="w-3.5 h-3.5 mr-1" />
          {returning ? "Returning..." : "Return to Admin"}
        </Button>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-amber-600/30 transition-colors"
          aria-label="Minimize"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
