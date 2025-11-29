import Link from 'next/link';
import { 
  UserGroupIcon, 
  DocumentTextIcon, 
  CogIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">CRM Integration Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your CRM integrations, field mappings, and lead synchronization
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link href="/dashboard/integrations" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                <CogIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Integrations</h3>
                <p className="text-sm text-gray-500">Configure CRM connections</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/field-mappings" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Field Mappings</h3>
                <p className="text-sm text-gray-500">Map lead fields to CRM fields</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/sync-jobs" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Sync Jobs</h3>
                <p className="text-sm text-gray-500">View sync status and logs</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/analytics" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-500">View sync statistics</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Sync Activity</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Salesforce sync completed</span>
                </div>
                <span className="text-xs text-gray-500">2 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">HubSpot sync completed</span>
                </div>
                <span className="text-xs text-gray-500">5 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Pipedrive sync in progress</span>
                </div>
                <span className="text-xs text-gray-500">8 minutes ago</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Integration Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-blue-600">SF</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Salesforce</p>
                    <p className="text-xs text-gray-500">Connected</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-orange-600">HS</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">HubSpot</p>
                    <p className="text-xs text-gray-500">Connected</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-red-600">PD</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pipedrive</p>
                    <p className="text-xs text-gray-500">Not configured</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}