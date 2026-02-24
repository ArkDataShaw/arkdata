import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { listAllTenants, getTenant } from "@arkdata/firebase-sdk";
import { Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function PartnerCredits() {
  const { user } = useAuth();
  const [teamFilter, setTeamFilter] = useState("all");

  // Fetch partner's own tenant (the account ceiling)
  const { data: partnerTenant } = useQuery({
    queryKey: ["partner-tenant", user?.tenant_id],
    queryFn: () => getTenant(user.tenant_id),
    enabled: !!user?.tenant_id,
  });

  // Fetch all child tenants
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => listAllTenants(),
  });

  // Filter out the partner's own tenant to get only children
  const childTenants = useMemo(
    () => tenants.filter((t) => t.id !== user?.tenant_id),
    [tenants, user?.tenant_id]
  );

  // Compute allocations
  const stats = useMemo(() => {
    const filtered = teamFilter === "all"
      ? childTenants
      : childTenants.filter((t) => t.id === teamFilter);

    const allocatedPixels = filtered.reduce(
      (sum, t) => sum + (t.monthly_pixel_limit || t.limits?.monthly_pixel_limit || 0), 0
    );
    const allocatedResolutions = filtered.reduce(
      (sum, t) => sum + (t.pixel_resolution_limit || t.limits?.pixel_resolution_limit || 0), 0
    );
    const currentUsageDomains = filtered.reduce(
      (sum, t) => sum + (t.domain_count || 0), 0
    );
    const currentUsageUsers = filtered.reduce(
      (sum, t) => sum + (t.active_users || 0), 0
    );

    const accountPixelLimit = partnerTenant?.monthly_pixel_limit
      || partnerTenant?.limits?.monthly_pixel_limit || 0;
    const accountResolutionLimit = partnerTenant?.pixel_resolution_limit
      || partnerTenant?.limits?.pixel_resolution_limit || 0;

    return {
      allocatedPixels,
      allocatedResolutions,
      currentUsageDomains,
      currentUsageUsers,
      accountPixelLimit,
      accountResolutionLimit,
    };
  }, [childTenants, teamFilter, partnerTenant]);

  const pctAllocPixels = stats.accountPixelLimit
    ? Math.min(100, Math.round((stats.allocatedPixels / stats.accountPixelLimit) * 100))
    : 0;
  const pctAllocResolutions = stats.accountResolutionLimit
    ? Math.min(100, Math.round((stats.allocatedResolutions / stats.accountResolutionLimit) * 100))
    : 0;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            White-label Credits
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resource allocation across your teams
          </p>
        </div>
        <div className="w-56">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {childTenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Credit Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrichments Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-violet-500" />
              Enrichments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Allocated to Teams</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {stats.allocatedPixels.toLocaleString()} / {stats.accountPixelLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={pctAllocPixels} className="h-3" />
              <p className="text-xs text-slate-400">{pctAllocPixels}% allocated</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Current Usage</span>
                <Badge variant="outline" className="text-xs">
                  {stats.currentUsageDomains} active domains
                </Badge>
              </div>
              <Progress value={0} className="h-3" />
              <p className="text-xs text-slate-400">
                Enrichment event counts not yet tracked — will update automatically
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500">
                Account Limit: <span className="font-semibold text-slate-900 dark:text-white">{stats.accountPixelLimit.toLocaleString()} contacts</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pixels Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-500" />
              Pixels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Allocated to Teams</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {stats.allocatedResolutions.toLocaleString()} / {stats.accountResolutionLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={pctAllocResolutions} className="h-3" />
              <p className="text-xs text-slate-400">{pctAllocResolutions}% allocated</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Current Usage</span>
                <Badge variant="outline" className="text-xs">
                  {stats.currentUsageUsers} active users
                </Badge>
              </div>
              <Progress value={0} className="h-3" />
              <p className="text-xs text-slate-400">
                Resolution event counts not yet tracked — will update automatically
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500">
                Account Resolution Limit: <span className="font-semibold text-slate-900 dark:text-white">{stats.accountResolutionLimit.toLocaleString()} resolutions per pixel</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
