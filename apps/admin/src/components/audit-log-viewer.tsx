"use client";

import { AuditLog } from "@/types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedLogs = [...logs].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Action</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Actor</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Target</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">Timestamp</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900 font-medium">{log.action}</td>
                <td className="px-6 py-4 text-gray-700">{log.actor}</td>
                <td className="px-6 py-4 text-gray-700">{log.target}</td>
                <td className="px-6 py-4 text-gray-700 text-xs">{formatDate(log.timestamp)}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    {expandedId === log.id ? "Hide" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          {sortedLogs.find((l) => l.id === expandedId) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">
                Details for {sortedLogs.find((l) => l.id === expandedId)?.action}
              </h4>
              <pre className="bg-white border border-gray-300 rounded p-4 text-xs overflow-auto">
                {JSON.stringify(
                  sortedLogs.find((l) => l.id === expandedId)?.details,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}

      {sortedLogs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No audit logs available.
        </div>
      )}
    </div>
  );
}
