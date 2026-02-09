import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye } from "lucide-react";

export default function RealtimePresence({ dashboardId, currentUser }) {
  const [activities, setActivities] = useState([]);
  const [activeUsers, setActiveUsers] = useState(new Map());

  useEffect(() => {
    // Subscribe to dashboard activities
    const unsubscribe = base44.entities.DashboardActivity.subscribe((event) => {
      if (event.data.dashboard_id === dashboardId) {
        setActivities(prev => [event.data, ...prev].slice(0, 10));
        
        // Track active users (last 2 minutes)
        const now = Date.now();
        setActiveUsers(prev => {
          const updated = new Map(prev);
          updated.set(event.data.user_email, {
            name: event.data.user_name,
            lastSeen: now
          });
          return updated;
        });
      }
    });

    // Clean up stale users every 30 seconds
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActiveUsers(prev => {
        const updated = new Map();
        prev.forEach((user, email) => {
          if (now - user.lastSeen < 120000) { // 2 minutes
            updated.set(email, user);
          }
        });
        return updated;
      });
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(cleanup);
    };
  }, [dashboardId]);

  const otherUsers = Array.from(activeUsers.entries())
    .filter(([email]) => email !== currentUser.email)
    .map(([email, user]) => user);

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex items-center -space-x-2">
          {otherUsers.slice(0, 3).map((user, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border-2 border-white dark:border-slate-900 cursor-pointer">
                  <span className="text-xs font-semibold text-white">
                    {user.name?.charAt(0) || "?"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.name} is viewing</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {otherUsers.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-900">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                +{otherUsers.length - 3}
              </span>
            </div>
          )}
        </div>
      </TooltipProvider>
      <Badge variant="outline" className="text-xs gap-1">
        <Eye className="w-3 h-3" />
        {otherUsers.length} viewing
      </Badge>
    </div>
  );
}