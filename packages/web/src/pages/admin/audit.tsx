import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const AuditPage: React.FC = () => {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', organizationId, userId, action, startDate, endDate],
    queryFn: async () => {
      if (!searchTriggered) return null;

      const criteria: any = {};
      if (organizationId) criteria.organizationId = organizationId;
      if (userId) criteria.userId = userId;
      if (action) criteria.action = action;
      if (startDate) criteria.startDate = new Date(startDate);
      if (endDate) criteria.endDate = new Date(endDate);

      const response = await fetch('/api/admin/audit-logs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      });

      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: searchTriggered,
  });

  const { data: stats } = useQuery({
    queryKey: ['auditStats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(`/api/admin/audit-logs/stats/${organizationId}`);
      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: !!organizationId,
  });

  const handleSearch = () => {
    setSearchTriggered(true);
    refetch();
  };

  const handleExport = async () => {
    const criteria: any = {};
    if (organizationId) criteria.organizationId = organizationId;
    if (startDate) criteria.startDate = new Date(startDate);
    if (endDate) criteria.endDate = new Date(endDate);
    if (action) criteria.action = action;
    criteria.format = exportFormat;

    const response = await fetch('/api/admin/audit-logs/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const actionOptions = [
    'create',
    'read',
    'update',
    'delete',
    'export',
    'login',
    'logout',
    'permission_change',
    'billing_update',
    'model_switch',
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Audit & Compliance Logs</h1>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Audit Logs</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Organization ID"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">All Actions</option>
            {actionOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Audit Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Logs</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Recent Activity</h3>
              <p className="text-sm text-gray-600 mt-2">
                {stats.recentActivity?.length || 0} recent actions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      {auditLogs && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditLogs.data?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.userId || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.resourceType}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Export Audit Logs</h2>
        <div className="flex gap-4">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
