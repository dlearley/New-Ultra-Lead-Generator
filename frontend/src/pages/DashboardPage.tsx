import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  DatabaseIcon,
  FlagIcon,
  CreditCardIcon,
  ChartBarIcon,
  EyeIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

const DashboardPage: React.FC = () => {
  const { lastMessage } = useWebSocket();

  const { data: healthSummary } = useQuery(
    'healthSummary',
    () => apiService.getHealthSummary(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: moderationStats } = useQuery(
    'moderationStats',
    () => apiService.getModerationStats(),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  const { data: dataQualitySummary } = useQuery(
    'dataQualitySummary',
    () => apiService.getDataQualitySummary(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const stats = [
    {
      name: 'Data Sources',
      href: '/data-sources',
      icon: DatabaseIcon,
      color: 'bg-blue-500',
      count: healthSummary?.data?.dataSources?.length || 0,
    },
    {
      name: 'Feature Flags',
      href: '/feature-flags',
      icon: FlagIcon,
      color: 'bg-purple-500',
      count: '0', // TODO: Get from API
    },
    {
      name: 'Plans',
      href: '/plans',
      icon: CreditCardIcon,
      color: 'bg-green-500',
      count: '0', // TODO: Get from API
    },
    {
      name: 'Data Quality',
      href: '/data-quality',
      icon: ChartBarIcon,
      color: 'bg-yellow-500',
      count: dataQualitySummary?.data?.total_records || 0,
    },
    {
      name: 'Moderation Queue',
      href: '/moderation',
      icon: EyeIcon,
      color: 'bg-indigo-500',
      count: moderationStats?.data?.pending_items || 0,
    },
    {
      name: 'Health Issues',
      href: '/health',
      icon: HeartIcon,
      color: 'bg-red-500',
      count: healthSummary?.data?.unresolved_count || 0,
    },
  ];

  const recentHealthLogs = healthSummary?.data?.dataSources?.filter(
    (ds: any) => ds.error_count > 0
  ).slice(0, 5) || [];

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your data sources and system health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Real-time Updates */}
      {lastMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                Last update: {new Date(lastMessage.timestamp).toLocaleTimeString()} - {lastMessage.type}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Sources Health */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Data Sources Health</h3>
          </div>
          <div className="card-body">
            {recentHealthLogs.length > 0 ? (
              <div className="space-y-3">
                {recentHealthLogs.map((dataSource: any) => (
                  <div key={dataSource.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        dataSource.error_count > 5 ? 'bg-red-500' :
                        dataSource.error_count > 0 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dataSource.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{dataSource.health_status?.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{dataSource.error_count} errors</p>
                      <p className="text-xs text-gray-500">Last 24h</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">All data sources are healthy</p>
            )}
          </div>
        </div>

        {/* Moderation Queue */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Moderation Queue</h3>
          </div>
          <div className="card-body">
            {moderationStats?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{moderationStats.data.pending_items}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{moderationStats.data.approved_items}</p>
                    <p className="text-sm text-gray-600">Approved</p>
                  </div>
                </div>
                {moderationStats.data.items_last_24h > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      {moderationStats.data.items_last_24h} items in the last 24 hours
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading moderation stats...</p>
            )}
          </div>
        </div>

        {/* Data Quality Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Data Quality Overview</h3>
          </div>
          <div className="card-body">
            {dataQualitySummary?.data ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <span className="text-lg font-bold text-gray-900">
                    {Math.round(dataQualitySummary.data.avg_score || 0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Excellent</p>
                    <p className="font-bold text-green-600">{dataQualitySummary.data.excellent || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Good</p>
                    <p className="font-bold text-blue-600">{dataQualitySummary.data.good || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fair</p>
                    <p className="font-bold text-yellow-600">{dataQualitySummary.data.fair || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Poor</p>
                    <p className="font-bold text-red-600">{dataQualitySummary.data.poor || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading data quality stats...</p>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          </div>
          <div className="card-body">
            {healthSummary?.data ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Logs</span>
                  <span className="text-lg font-bold text-gray-900">{healthSummary.data.total_logs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Errors</span>
                  <span className="text-lg font-bold text-red-600">{healthSummary.data.unresolved_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Warnings</span>
                  <span className="text-lg font-bold text-yellow-600">{healthSummary.data.warning_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Affected Data Sources</span>
                  <span className="text-lg font-bold text-gray-900">{healthSummary.data.affected_data_sources}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading system health...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;