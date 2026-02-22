import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

/**
 * Role-based route guard.
 * Renders children only if the user has one of the allowed roles.
 * Otherwise redirects to /Home.
 *
 * Usage:
 *   <RequireRole roles={['super_admin', 'tenant_admin']}>
 *     <AdminPage />
 *   </RequireRole>
 */
export default function RequireRole({ roles, children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/Home" replace />;
  }

  return children;
}
