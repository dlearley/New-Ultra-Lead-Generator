'use client';

import { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { getSyncJobs } from '@/lib/api';
import { SyncJobTable } from '@/components/sync-jobs/SyncJobTable';

export default function SyncJobsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    crmType: '',
    search: '',
  });

  const { data: syncJobsData, isLoading, refetch } = useQuery(
    ['syncJobs', filters],
    () => getSyncJobs(filters),
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset to page 1 when changing filters
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Jobs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor the status of your lead synchronization jobs across all CRM platforms
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          className="btn-outline"
          disabled={isLoading}
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="form-input pl-10"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="form-input"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="RETRYING">Retrying</option>
              </select>
            </div>

            {/* CRM Type Filter */}
            <div>
              <select
                value={filters.crmType}
                onChange={(e) => handleFilterChange('crmType', e.target.value)}
                className="form-input"
              >
                <option value="">All CRM Types</option>
                <option value="SALESFORCE">Salesforce</option>
                <option value="HUBSPOT">HubSpot</option>
                <option value="PIPEDRIVE">Pipedrive</option>
              </select>
            </div>

            {/* Results per page */}
            <div>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="form-input"
              >
                <option value="10">10 results</option>
                <option value="20">20 results</option>
                <option value="50">50 results</option>
                <option value="100">100 results</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Jobs Table */}
      <SyncJobTable 
        syncJobsData={syncJobsData}
        isLoading={isLoading}
        onPageChange={(page) => handleFilterChange('page', page.toString())}
      />
    </div>
  );
}