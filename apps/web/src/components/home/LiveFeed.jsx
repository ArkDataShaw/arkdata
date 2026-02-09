import React from "react";
import { Users, Building2, Clock, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import moment from "moment";

export default function LiveFeed({ visitors = [] }) {
  const recent = visitors
    .filter(v => v.identity_status !== "anonymous")
    .sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at))
    .slice(0, 8);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Identified Feed</h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">{recent.length} recent</span>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {recent.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            No identified visitors yet
          </div>
        ) : (
          recent.map((v) => (
            <div key={v.id} className="px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0">
                {v.identity_status === "identified_company" ? (
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-violet-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {v.visitor_cookie_id?.slice(0, 12) || "Visitor"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={v.identity_status} />
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {moment(v.last_seen_at).fromNow()}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}