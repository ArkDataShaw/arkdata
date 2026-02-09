import React, { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataTable({
  columns,
  data,
  isLoading,
  onRowClick,
  pageSize = 15,
  emptyMessage = "No data found",
  emptyIcon: EmptyIcon
}) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const sorted = React.useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortCol] ?? "";
      const bVal = b[sortCol] ?? "";
      if (typeof aVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                    col.sortable && "cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none"
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={col.width ? { width: col.width } : {}}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                    {EmptyIcon && <EmptyIcon className="w-10 h-10" />}
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => (
                <TableRow
                  key={row.id || i}
                  className={cn(
                    "border-b border-slate-50 dark:border-slate-800 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className="py-3 text-sm text-slate-700 dark:text-slate-300">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}