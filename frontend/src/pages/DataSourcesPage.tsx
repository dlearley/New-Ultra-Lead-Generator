import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  PowerIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { DataSource } from '../types';
import DataSourceModal from '../components/DataSourceModal';

const DataSourcesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['dataSources', searchTerm, filters],
    () => apiService.getDataSources(),
    {
      select: (response) => {
        let filteredData = response.data || [];
        
        if (searchTerm) {
          filteredData = filteredData.filter((ds: DataSource) =>
            ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ds.connector.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        if (filters.type) {
          filteredData = filteredData.filter((ds: DataSource) => ds.type === filters.type);
        }
        
        if (filters.status) {
          filteredData = filteredData.filter((ds: DataSource) => 
            filters.status === 'enabled' ? ds.enabled : !ds.enabled
          );
        }
        
        return filteredData;
      },
    }
  );

  const deleteMutation = useMutation(apiService.deleteDataSource, {
    onSuccess: () => {
      queryClient.invalidateQueries('dataSources');
      toast.success('Data source deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete data source');
    },
  });

  const toggleMutation = useMutation(apiService.toggleDataSource, {
    onSuccess: () => {
      queryClient.invalidateQueries('dataSources');
      toast.success('Data source status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update data source status');
    },
  });

  const handleEdit = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this data source?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id);
  };

  const getStatusBadge = (dataSource: DataSource) => {
    if (!dataSource.enabled) {
      return <span className="badge badge-gray">Disabled</span>;
    }
    
    const status = dataSource.healthStatus.status;
    switch (status) {
      case 'healthy':
        return <span className="badge badge-success">Healthy</span>;
      case 'degraded':
        return <span className="badge badge-warning">Degraded</span>;
      case 'unhealthy':
        return <span className="badge badge-error">Unhealthy</span>;
      default:
        return <span className="badge badge-gray">Unknown</span>;
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading data sources</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
            <p className="text-gray-600">Manage your data source configurations</p>
          </div>
          <button
            onClick={() => {
              setEditingDataSource(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Data Source
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="input pl-10"
              placeholder="Search data sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="file">File</option>
              <option value="stream">Stream</option>
            </select>
            
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Connector</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Health</th>
                <th className="table-header-cell">Rate Limit</th>
                <th className="table-header-cell">Last Check</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No data sources found
                  </td>
                </tr>
              ) : (
                data?.map((dataSource: DataSource) => (
                  <tr key={dataSource.id}>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">{dataSource.name}</p>
                        <p className="text-sm text-gray-500">ID: {dataSource.id.slice(0, 8)}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-info capitalize">{dataSource.type}</span>
                    </td>
                    <td className="table-cell">{dataSource.connector}</td>
                    <td className="table-cell">{getStatusBadge(dataSource)}</td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getStatusDot(dataSource.healthStatus.status)}`} />
                        <div>
                          <p className="text-sm capitalize">{dataSource.healthStatus.status}</p>
                          <p className="text-xs text-gray-500">{dataSource.healthStatus.errorRate}% error rate</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm">
                        <p>{dataSource.rateLimit.requestsPerMinute}/min</p>
                        <p className="text-gray-500">{dataSource.rateLimit.currentUsage.minute} current</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      {dataSource.lastHealthCheck ? (
                        <div className="text-sm">
                          {new Date(dataSource.lastHealthCheck).toLocaleDateString()}
                          <p className="text-gray-500">
                            {new Date(dataSource.lastHealthCheck).toLocaleTimeString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(dataSource)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(dataSource.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={dataSource.enabled ? 'Disable' : 'Enable'}
                        >
                          <PowerIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dataSource.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Source Modal */}
      {showModal && (
        <DataSourceModal
          dataSource={editingDataSource}
          onClose={() => {
            setShowModal(false);
            setEditingDataSource(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingDataSource(null);
            queryClient.invalidateQueries('dataSources');
          }}
        />
      )}
    </div>
  );
};

export default DataSourcesPage;