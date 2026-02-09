import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import moment from "moment";

export default function Reports() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["sync-jobs"],
    queryFn: () => base44.entities.SyncJob.filter({ type: "export" }, "-created_date", 50),
  });

  const exportTypes = [
    { label: "Visitors Export", description: "Export all identified visitors with contact details", icon: "👥" },
    { label: "Companies Export", description: "Export all identified companies with metadata", icon: "🏢" },
    { label: "Sessions Export", description: "Export session data with UTM & conversion info", icon: "📊" },
    { label: "Lost Traffic Export", description: "Export non-converted visitor data", icon: "⚠️" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Reports & Exports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate and download data exports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportTypes.map((type) => (
          <div key={type.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg flex-shrink-0">
              {type.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{type.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{type.description}</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Generate Export
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Export History</h3>
        </div>
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            No exports yet. Generate your first export above.
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {jobs.map((job) => (
              <div key={job.id} className="px-5 py-3 flex items-center gap-4">
                <FileText className="w-4 h-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{moment(job.created_date).format("MMM D, YYYY h:mm A")}</p>
                </div>
                <StatusBadge status={job.status} />
                {job.records_processed > 0 && (
                  <span className="text-xs text-slate-500">{job.records_processed} records</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}