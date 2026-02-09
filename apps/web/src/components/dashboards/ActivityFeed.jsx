import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Activity, Plus, Trash2, Move, Edit3, MessageSquare, Check, Filter, Type } from "lucide-react";
import moment from "moment";

const actionIcons = {
  widget_added: Plus,
  widget_removed: Trash2,
  widget_moved: Move,
  widget_edited: Edit3,
  comment_added: MessageSquare,
  comment_resolved: Check,
  dashboard_renamed: Type,
  filter_changed: Filter,
};

const actionLabels = {
  widget_added: "added a widget",
  widget_removed: "removed a widget",
  widget_moved: "moved a widget",
  widget_edited: "edited a widget",
  comment_added: "added a comment",
  comment_resolved: "resolved a comment",
  dashboard_renamed: "renamed the dashboard",
  filter_changed: "changed filters",
};

export default function ActivityFeed({ dashboardId }) {
  const { data: activities = [] } = useQuery({
    queryKey: ["dashboard-activities", dashboardId],
    queryFn: () => base44.entities.DashboardActivity.filter({ dashboard_id: dashboardId }, "-created_date", 50),
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Activity className="w-4 h-4" />
          Activity
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Dashboard Activity</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = actionIcons[activity.action] || Activity;
              return (
                <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      <span className="font-medium">{activity.user_name}</span>
                      {" "}
                      <span className="text-slate-600 dark:text-slate-400">
                        {actionLabels[activity.action] || activity.action}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {moment(activity.created_date).fromNow()}
                    </p>
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                No activity yet
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}