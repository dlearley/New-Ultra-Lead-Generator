"use client";

import { useState, useMemo } from "react";
import { Organization, OrgStatus } from "@/types";
import { ChevronDown, Search, Zap, Eye, Slash2, LogOut, UserCheck } from "lucide-react";

interface OrganizationsTableProps {
  organizations: Organization[];
  onSuspend: (orgId: string) => void;
  onRestore: (orgId: string) => void;
  onResetMFA: (orgId: string) => void;
  onForceLogout: (orgId: string) => void;
  onImpersonate: (orgId: string) => void;
}

const statusColors: Record<OrgStatus, string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-800",
};

const planColors: Record<string, string> = {
  free: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-orange-100 text-orange-800",
};

export function OrganizationsTable({
  organizations,
  onSuspend,
  onRestore,
  onResetMFA,
  onForceLogout,
  onImpersonate,
}: OrganizationsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrgStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "status" | "users">("name");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    let filtered = organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return a.status.localeCompare(b.status);
        case "users":
          return b.usage.users - a.usage.users;
        default:
          return 0;
      }
    });

    return sorted;
  }, [organizations, searchTerm, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by organization name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrgStatus | "all")}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "status" | "users")}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="users">Users</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Organization</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Plan</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Users</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Requests</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Storage</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSorted.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      setExpandedRow(expandedRow === org.id ? null : org.id)
                    }
                    className="flex items-center gap-2 text-left hover:text-blue-600"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transform transition-transform ${
                        expandedRow === org.id ? "rotate-180" : ""
                      }`}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-xs text-gray-500">{org.id}</div>
                    </div>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      planColors[org.plan] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[org.status]}`}>
                    {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900">{org.usage.users}</td>
                <td className="px-6 py-4 text-gray-900">{org.usage.requests.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-900">{org.usage.storage}MB</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      setExpandedRow(expandedRow === org.id ? null : org.id)
                    }
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    {expandedRow === org.id ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedRow && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3">
          <h4 className="font-semibold text-gray-900 mb-4">
            Actions for {filteredAndSorted.find((o) => o.id === expandedRow)?.name}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {filteredAndSorted.find((o) => o.id === expandedRow)?.status === "active" ? (
              <button
                onClick={() => {
                  onSuspend(expandedRow);
                  setExpandedRow(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium"
              >
                <Slash2 className="h-4 w-4" />
                Suspend Organization
              </button>
            ) : (
              <button
                onClick={() => {
                  onRestore(expandedRow);
                  setExpandedRow(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium"
              >
                <Zap className="h-4 w-4" />
                Restore Organization
              </button>
            )}
            <button
              onClick={() => {
                onResetMFA(expandedRow);
                setExpandedRow(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded text-sm font-medium"
            >
              <UserCheck className="h-4 w-4" />
              Reset MFA for All Users
            </button>
            <button
              onClick={() => {
                onForceLogout(expandedRow);
                setExpandedRow(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              Force Logout All Users
            </button>
            <button
              onClick={() => {
                onImpersonate(expandedRow);
                setExpandedRow(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-sm font-medium"
            >
              <Eye className="h-4 w-4" />
              Impersonate Organization
            </button>
          </div>
        </div>
      )}

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No organizations found matching your search criteria.
        </div>
      )}
    </div>
  );
}
