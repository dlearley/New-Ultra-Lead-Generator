"use client";

import { useState, useCallback } from "react";
import { mockOrganizations, mockUsers } from "@/lib/mock-data";
import { createAuditLog, getAuditLogs } from "@/lib/audit";
import { OrganizationsTable } from "@/components/organizations-table";
import { UsersTable } from "@/components/users-table";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { Organization, User } from "@/types";
import { AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>(
    mockOrganizations
  );
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState(getAuditLogs());

  const adminContext = {
    userId: "admin_user_1",
    isAdmin: true,
  };

  const showNotification = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 4000);
    },
    []
  );

  const handleSuspendOrg = useCallback(
    (orgId: string) => {
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId ? { ...org, status: "suspended" as const } : org
        )
      );

      const log = createAuditLog(
        adminContext,
        "SUSPEND_ORGANIZATION",
        orgId,
        {
          organizationName: organizations.find((o) => o.id === orgId)?.name,
          previousStatus: "active",
          newStatus: "suspended",
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification("success", "Organization suspended successfully");
    },
    [organizations, showNotification]
  );

  const handleRestoreOrg = useCallback(
    (orgId: string) => {
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId ? { ...org, status: "active" as const } : org
        )
      );

      const log = createAuditLog(
        adminContext,
        "RESTORE_ORGANIZATION",
        orgId,
        {
          organizationName: organizations.find((o) => o.id === orgId)?.name,
          previousStatus: "suspended",
          newStatus: "active",
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification("success", "Organization restored successfully");
    },
    [organizations, showNotification]
  );

  const handleResetMFAOrg = useCallback(
    (orgId: string) => {
      const orgName = organizations.find((o) => o.id === orgId)?.name;
      const affectedUsers = users.filter((u) => u.organizationId === orgId);

      setUsers((prev) =>
        prev.map((user) =>
          user.organizationId === orgId
            ? { ...user, mfaEnabled: false }
            : user
        )
      );

      const log = createAuditLog(
        adminContext,
        "RESET_MFA_ORGANIZATION",
        orgId,
        {
          organizationName: orgName,
          affectedUserCount: affectedUsers.length,
          userIds: affectedUsers.map((u) => u.id),
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification(
        "success",
        `MFA reset for ${affectedUsers.length} users in this organization`
      );
    },
    [organizations, users, showNotification]
  );

  const handleForceLogoutOrg = useCallback(
    (orgId: string) => {
      const orgName = organizations.find((o) => o.id === orgId)?.name;
      const affectedUsers = users.filter((u) => u.organizationId === orgId);

      const log = createAuditLog(
        adminContext,
        "FORCE_LOGOUT_ORGANIZATION",
        orgId,
        {
          organizationName: orgName,
          affectedUserCount: affectedUsers.length,
          userIds: affectedUsers.map((u) => u.id),
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification(
        "success",
        `Force logged out ${affectedUsers.length} users in this organization`
      );
    },
    [organizations, users, showNotification]
  );

  const handleImpersonateOrg = useCallback(
    (orgId: string) => {
      const orgName = organizations.find((o) => o.id === orgId)?.name;
      const log = createAuditLog(
        adminContext,
        "IMPERSONATE_ORGANIZATION",
        orgId,
        {
          organizationName: orgName,
          timestamp: new Date(),
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification("info", `Impersonating organization: ${orgName}`);
    },
    [organizations, showNotification]
  );

  const handleResetMFAUser = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, mfaEnabled: false } : u))
      );

      const log = createAuditLog(
        adminContext,
        "RESET_MFA_USER",
        userId,
        {
          userName: user.name,
          userEmail: user.email,
          organizationId: user.organizationId,
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification("success", `MFA reset for user: ${user.name}`);
    },
    [users, showNotification]
  );

  const handleForceLogoutUser = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const log = createAuditLog(
        adminContext,
        "FORCE_LOGOUT_USER",
        userId,
        {
          userName: user.name,
          userEmail: user.email,
          organizationId: user.organizationId,
        }
      );
      setAuditLogs((prev) => [...prev, log]);
      showNotification("success", `Force logged out user: ${user.name}`);
    },
    [users, showNotification]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white max-w-md ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "error"
              ? "bg-red-500"
              : "bg-blue-500"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {notification.message}
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage organizations, users, and view audit logs
          </p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Organizations</h2>
            <div className="text-sm text-gray-600">
              {organizations.filter((o) => o.status === "active").length} active
            </div>
          </div>
          <OrganizationsTable
            organizations={organizations}
            onSuspend={handleSuspendOrg}
            onRestore={handleRestoreOrg}
            onResetMFA={handleResetMFAOrg}
            onForceLogout={handleForceLogoutOrg}
            onImpersonate={handleImpersonateOrg}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Users</h2>
            <div className="text-sm text-gray-600">
              {users.length} total users
            </div>
          </div>
          <UsersTable
            users={users}
            onResetMFA={handleResetMFAUser}
            onForceLogout={handleForceLogoutUser}
            selectedOrgId={selectedOrgId || undefined}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <AuditLogViewer logs={auditLogs} />
        </div>
      </main>
    </div>
  );
}
