import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Plus, Share2, Calendar, Settings, Eye, Trash2, Edit, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function Dashboards() {
  const queryClient = useQueryClient();

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: () => base44.entities.Dashboard.list("-updated_date"),
  });

  const { data: scheduledReports = [] } = useQuery({
    queryKey: ["scheduled-reports"],
    queryFn: () => base44.entities.ScheduledReport.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Dashboard.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (dashboard) => base44.entities.Dashboard.create({
      tenant_id: dashboard.tenant_id,
      name: `${dashboard.name} (Copy)`,
      description: dashboard.description,
      layout_json: dashboard.layout_json,
      filters_json: dashboard.filters_json,
      created_by_user_id: "current_user",
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Analytics Dashboards</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create custom dashboards with your key metrics</p>
        </div>
        <Link to={createPageUrl("DashboardBuilder")}>
          <Button className="bg-violet-600 hover:bg-violet-700 gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span className="sm:inline">New Dashboard</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((dashboard) => {
          const schedule = scheduledReports.find(r => r.dashboard_id === dashboard.id);
          return (
            <Link to={`${createPageUrl("DashboardBuilder")}?id=${dashboard.id}`} className="block">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
                <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">{dashboard.name}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 line-clamp-1">{dashboard.description || "No description"}</p>
                
                {/* Widget Chart Visualization */}
                {dashboard.layout_json && dashboard.layout_json.length > 0 && (
                  <div className="h-32 mb-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.layout_json.slice(0, 5).map((w, i) => ({ name: `W${i+1}`, value: Math.floor(Math.random() * 100) }))}>
                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {dashboard.layout_json?.length || 0} widgets
                  </Badge>
                  {dashboard.is_public && (
                    <Badge variant="secondary" className="text-xs">
                      <Share2 className="w-3 h-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                  {schedule && (
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {schedule.frequency}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-3">Updated {moment(dashboard.updated_date).fromNow()}</p>
              </div>
            </Link>
          );
        })}
        {dashboards.length === 0 && !isLoading && (
          <div className="col-span-full bg-white rounded-xl border border-slate-100 p-12 text-center">
            <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">No dashboards yet</p>
            <Link to={createPageUrl("DashboardBuilder")}>
              <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}