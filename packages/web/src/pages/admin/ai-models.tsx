import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

const AiModelsPage: React.FC = () => {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    version: '',
  });

  const { data: models, refetch: refetchModels } = useQuery({
    queryKey: ['aiModels', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(`/api/admin/ai-models/organization/${organizationId}/all`);
      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: !!organizationId,
  });

  const { data: metrics } = useQuery({
    queryKey: ['aiModelMetrics', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(
        `/api/admin/ai-models/organization/${organizationId}/metrics`,
      );
      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: !!organizationId,
  });

  const { data: activeModel } = useQuery({
    queryKey: ['activeAiModel', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(
        `/api/admin/ai-models/organization/${organizationId}/active`,
      );
      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: !!organizationId,
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...data,
        }),
      });
      if (!response.ok) throw new Error('Failed to create model');
      return response.json();
    },
    onSuccess: () => {
      setShowForm(false);
      setFormData({ name: '', provider: 'openai', version: '' });
      refetchModels();
    },
  });

  const switchModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetch('/api/admin/ai-models/switch-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });
      if (!response.ok) throw new Error('Failed to switch model');
      return response.json();
    },
    onSuccess: () => {
      refetchModels();
    },
  });

  const handleCreateModel = (e: React.FormEvent) => {
    e.preventDefault();
    createModelMutation.mutate(formData);
  };

  const handleSwitchActive = (modelId: string) => {
    switchModelMutation.mutate(modelId);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'beta':
        return 'bg-yellow-100 text-yellow-800';
      case 'deprecated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Model Management</h1>

      {/* Organization Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Organization</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Organization ID"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded flex-1"
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => refetchModels()}
          >
            Load Models
          </button>
        </div>
      </div>

      {/* Active Model Section */}
      {activeModel && (
        <div className="bg-green-50 rounded-lg shadow p-6 mb-6 border-2 border-green-200">
          <h2 className="text-xl font-semibold mb-4">Currently Active Model</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Model Name</h3>
              <p className="text-lg font-bold text-gray-900">{activeModel.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Version</h3>
              <p className="text-lg font-bold text-gray-900">{activeModel.version}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Provider</h3>
              <p className="text-lg font-bold text-gray-900">{activeModel.provider}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(
                  activeModel.status,
                )}`}
              >
                {activeModel.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Section */}
      {metrics && metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Model Performance Metrics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Latency (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Error Rate (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Success Rate (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Requests
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.map((metric: any) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {metric.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{metric.provider}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {metric.averageLatencyMs.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {metric.errorRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-green-600 font-semibold">
                        {(metric.successRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {metric.totalRequests.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Models List */}
      {models && models.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Available Models</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Add Model'}
            </button>
          </div>

          {/* Add Model Form */}
          {showForm && (
            <div className="bg-gray-50 p-4 rounded mb-6 border border-gray-200">
              <form onSubmit={handleCreateModel} className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Model Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded"
                  required
                />
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="cohere">Cohere</option>
                  <option value="local">Local</option>
                </select>
                <input
                  type="text"
                  placeholder="Version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded"
                  required
                />
                <button
                  type="submit"
                  disabled={createModelMutation.isPending}
                  className="col-span-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {createModelMutation.isPending ? 'Creating...' : 'Create Model'}
                </button>
              </form>
            </div>
          )}

          {/* Models Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {models.map((model: any) => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {model.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{model.provider}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{model.version}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                          model.status,
                        )}`}
                      >
                        {model.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!model.isActive && (
                        <button
                          onClick={() => handleSwitchActive(model.id)}
                          disabled={switchModelMutation.isPending}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {switchModelMutation.isPending ? 'Switching...' : 'Switch Active'}
                        </button>
                      )}
                      {model.isActive && (
                        <span className="text-green-600 font-semibold">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!models && organizationId && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Loading models...
        </div>
      )}
    </div>
  );
};

export default AiModelsPage;
