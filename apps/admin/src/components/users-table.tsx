"use client";

import { useState, useMemo } from "react";
import { User, UserRole } from "@/types";
import { ChevronDown, Search, Lock, LogOut } from "lucide-react";

interface UsersTableProps {
  users: User[];
  onResetMFA: (userId: string) => void;
  onForceLogout: (userId: string) => void;
  selectedOrgId?: string;
}

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800",
  member: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

export function UsersTable({
  users,
  onResetMFA,
  onForceLogout,
  selectedOrgId,
}: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "role" | "lastActivity">("name");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesOrg = !selectedOrgId || user.organizationId === selectedOrgId;
      return matchesSearch && matchesRole && matchesOrg;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "role":
          return a.role.localeCompare(b.role);
        case "lastActivity":
          return (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [users, searchTerm, roleFilter, sortBy, selectedOrgId]);

  const formatDate = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "role" | "lastActivity")}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="role">Role</option>
            <option value="lastActivity">Last Activity</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">User</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Role</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Last Activity</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">MFA</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Connectors</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSorted.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      setExpandedRow(expandedRow === user.id ? null : user.id)
                    }
                    className="flex items-center gap-2 text-left hover:text-blue-600"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transform transition-transform ${
                        expandedRow === user.id ? "rotate-180" : ""
                      }`}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${roleColors[user.role]}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900">{formatDate(user.lastActivity)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    user.mfaEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {user.mfaEnabled ? "Enabled" : "Disabled"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900 text-xs">{user.connectorsEnabled.join(", ") || "None"}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      setExpandedRow(expandedRow === user.id ? null : user.id)
                    }
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    {expandedRow === user.id ? "Hide" : "Show"}
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
            Actions for {filteredAndSorted.find((u) => u.id === expandedRow)?.name}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onResetMFA(expandedRow);
                setExpandedRow(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded text-sm font-medium"
            >
              <Lock className="h-4 w-4" />
              Reset MFA
            </button>
            <button
              onClick={() => {
                onForceLogout(expandedRow);
                setExpandedRow(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              Force Logout
            </button>
          </div>
        </div>
      )}

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found matching your search criteria.
        </div>
      )}
    </div>
  );
}
