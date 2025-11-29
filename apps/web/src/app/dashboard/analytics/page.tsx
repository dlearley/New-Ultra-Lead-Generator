'use client';

import { useQuery } from 'react-query';
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';
import { getSyncJobs } from '@/lib/api';

export default function AnalyticsPage() {
  const { data: syncJobsData } = useQuery(
    'syncJobsAnalytics',
    () => getSyncJobs({ limit: 1000 }) // Get more data for analytics
  );

  const syncJobs = syncJobsData?.jobs || [];

  // Calculate analytics
  const totalJobs = syncJobs.length;
  const completedJobs = syncJobs.filter(job => job.status === 'COMPLETED').length;
  const failedJobs = syncJobs.filter(job => job.status === 'FAILED').length;
  const pendingJobs = syncJobs.filter(job => job.status === 'PENDING').length;
  const processingJobs = syncJobs.filter(job => job.status === 'PROCESSING').length;

  const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  // CRM type breakdown
  const crmTypeStats = syncJobs.reduce((acc, job) => {
    acc[job.crmType] = (acc[job.crmType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      name: 'Total Sync Jobs',
      value: totalJobs,
      icon: ChartBarIcon,
      color: 'blue',
    },
    {
      name: 'Successful Syncs',
      value: completedJobs,
      icon: CheckCircleIcon,
      color: 'green',
    },
    {
      name: 'Failed Syncs',
      value: failedJobs,
      icon: XCircleIcon,
      color: 'red',
    },
    {
      name: 'Pending/Processing',
      value: pendingJobs + processingJobs,
      icon: ClockIcon,
      color: 'yellow',
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor your CRM integration performance and sync statistics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const colorClasses = getColorClasses(stat.color);
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${colorClasses.bg} rounded-lg p-3`}>
                    <stat.icon className={`h-6 w-6 ${colorClasses.text}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Success Rate and CRM Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Success Rate */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Success Rate</h3>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-gray-200"></div>
                <div 
                  className="absolute top-0 left-0 w-32 h-32 rounded-full border-8 border-green-500 border-t-transparent border-r-transparent transform rotate-45"
                  style={{
                    borderRightColor: 'transparent',
                    borderTopColor: 'transparent',
                    transform: `rotate(${(successRate / 100) * 360 - 90}deg)`,
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">Success Rate</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-green-600 font-medium">{completedJobs} Successful</p>
              </div>
              <div className="text-center">
                <p className="text-red-600 font-medium">{failedJobs} Failed</p>
              </div>
            </div>
          </div>
        </div>

        {/* CRM Type Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">CRM Type Distribution</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {Object.entries(crmTypeStats).map(([crmType, count]) => {
                const percentage = totalJobs > 0 ? (count / totalJobs) * 100 : 0;
                const crmColors = {
                  SALESFORCE: 'blue',
                  HUBSPOT: 'orange',
                  PIPEDRIVE: 'red',
                };
                const color = crmColors[crmType as keyof typeof crmColors] || 'gray';
                const colorClasses = getColorClasses(color);
                
                return (
                  <div key={crmType}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">{crmType}</span>
                      <span className="text-sm text-gray-500">{count} jobs ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${colorClasses.bg} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity Summary</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">{totalJobs}</div>
              <p className="text-sm text-gray-600">Total Jobs Processed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{successRate.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Overall Success Rate</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{Object.keys(crmTypeStats).length}</div>
              <p className="text-sm text-gray-600">Active CRM Integrations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}