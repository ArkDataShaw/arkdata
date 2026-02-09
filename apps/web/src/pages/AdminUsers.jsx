import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function AdminUsers() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list("-created_date"),
  });

  const columns = [
    {
      key: "full_name",
      label: "Name",
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-violet-600">{val?.charAt(0) || "?"}</span>
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{val || "—"}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (val) => <Badge variant="outline" className="capitalize text-xs">{val}</Badge>,
    },
    {
      key: "created_date",
      label: "Joined",
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500">{moment(val).format("MMM D, YYYY")}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Roles</h1>
        <p className="text-sm text-slate-500 mt-1">Manage internal and tenant users</p>
      </div>
      <DataTable columns={columns} data={users} isLoading={isLoading} emptyMessage="No users" emptyIcon={Users} />
    </div>
  );
}