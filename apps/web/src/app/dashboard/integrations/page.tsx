'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { testCrmConnection, getCrmTypes } from '@/lib/api';
import toast from 'react-hot-toast';

const crmConfigurations = {
  SALESFORCE: {
    name: 'Salesforce',
    description: 'Connect to Salesforce CRM for lead management',
    color: 'blue',
    icon: 'SF',
  },
  HUBSPOT: {
    name: 'HubSpot',
    description: 'Integrate with HubSpot for marketing and sales',
    color: 'orange',
    icon: 'HS',
  },
  PIPEDRIVE: {
    name: 'Pipedrive',
    description: 'Sync with Pipedrive for sales pipeline management',
    color: 'red',
    icon: 'PD',
  },
};

export default function IntegrationsPage() {
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  const { data: crmTypes } = useQuery('crmTypes', getCrmTypes);

  const testConnectionMutation = useMutation(testCrmConnection, {
    onSuccess: (data, crmType) => {
      if (data.success) {
        toast.success(`${crmConfigurations[crmType as keyof typeof crmConfigurations].name} connection successful!`);
      } else {
        toast.error(`${crmConfigurations[crmType as keyof typeof crmConfigurations].name} connection failed: ${data.message}`);
      }
    },
    onError: (error: any, crmType) => {
      toast.error(`Failed to test ${crmConfigurations[crmType as keyof typeof crmConfigurations].name} connection`);
    },
    onSettled: () => {
      setTestingConnection(null);
    }
  });

  const handleTestConnection = (crmType: string) => {
    setTestingConnection(crmType);
    testConnectionMutation.mutate(crmType);
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200'
      },
      orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200'
      },
      red: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200'
      },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM Integrations</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure and manage your CRM platform connections
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {crmTypes?.map((crmType: string) => {
          const config = crmConfigurations[crmType as keyof typeof crmConfigurations];
          const colorClasses = getColorClasses(config.color);
          
          return (
            <div key={crmType} className="card">
              <div className="card-body">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center mr-4`}>
                    <span className={`text-lg font-bold ${colorClasses.text}`}>{config.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                    <p className="text-sm text-gray-500">{crmType}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  {config.description}
                </p>

                <div className="space-y-3">
                  <div className={`p-3 border ${colorClasses.border} rounded-lg ${colorClasses.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">Configured</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestConnection(crmType)}
                    disabled={testingConnection === crmType}
                    className="w-full btn-outline flex items-center justify-center"
                  >
                    {testingConnection === crmType ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </button>

                  <button className="w-full btn-primary">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup Instructions */}
      <div className="card mt-8">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Setup Instructions</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Salesforce Setup</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Create a Connected App in Salesforce Setup</li>
                <li>Enable OAuth 2.0 and specify the callback URL</li>
                <li>Note down the Consumer Key and Consumer Secret</li>
                <li>Generate a Security Token from your user settings</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">HubSpot Setup</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Create a Private App in HubSpot</li>
                <li>Configure the required scopes (crm.objects.contacts.write)</li>
                <li>Generate an access token</li>
                <li>Copy the access token to your configuration</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Pipedrive Setup</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Go to Company Settings > API in Pipedrive</li>
                <li>Generate a new API token</li>
                <li>Note down your company domain</li>
                <li>Configure the integration with your credentials</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}