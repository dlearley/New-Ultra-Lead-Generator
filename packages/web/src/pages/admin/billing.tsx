import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const BillingPage: React.FC = () => {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  const { data: billings, isLoading, refetch } = useQuery({
    queryKey: ['billings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/billing');
      return response.json();
    },
    enabled: false,
  });

  const { data: billingStatus } = useQuery({
    queryKey: ['billingStatus', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(`/api/admin/billing/${organizationId}/status`);
      return response.json();
    },
    enabled: !!organizationId,
  });

  const { data: usage } = useQuery({
    queryKey: ['usage', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(`/api/admin/usage/${organizationId}`);
      return response.json();
    },
    enabled: !!organizationId,
  });

  const handleSearch = async () => {
    const criteria: any = {};
    if (searchStatus) criteria.status = searchStatus;
    
    const response = await fetch('/api/admin/billing/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria),
    });

    if (response.ok) {
      refetch();
    }
  };

  const handleExport = async () => {
    const response = await fetch('/api/admin/billing/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: exportFormat }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const chartData = [
    { month: 'Jan', spend: 1000, apiCalls: 50000 },
    { month: 'Feb', spend: 1200, apiCalls: 60000 },
    { month: 'Mar', spend: 1100, apiCalls: 55000 },
    { month: 'Apr', spend: 1400, apiCalls: 70000 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Billing & Usage Management</h1>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Billing Records</h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Organization ID"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">All Status</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
            <option value="delinquent">Delinquent</option>
          </select>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Billing Status Card */}
      {billingStatus && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                billingStatus.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : billingStatus.status === 'trial'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {billingStatus.status.toUpperCase()}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Plan</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{billingStatus.plan}</p>
          </div>
        </div>
      )}

      {/* Usage Charts */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Usage Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="apiCalls"
              stroke="#8884d8"
              name="API Calls"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Spending Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Spending</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="spend" fill="#82ca9d" name="Spend ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Export Data</h2>
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

export default BillingPage;
