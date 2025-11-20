import React from 'react';
import Link from 'next/link';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Admin Panel
          </h1>
          <p className="text-xl text-gray-600">
            Manage billing, audit logs, and AI models with comprehensive insights
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Billing Card */}
          <Link href="/admin/billing">
            <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Billing & Usage</h2>
              <p className="text-gray-600 mb-4">
                Track organization billing status, usage metrics, and spending patterns
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Search and filter by status/plan</li>
                <li>✓ Export billing data</li>
                <li>✓ Monitor usage alerts</li>
                <li>✓ Visualize spending trends</li>
              </ul>
            </div>
          </Link>

          {/* Audit Card */}
          <Link href="/admin/audit">
            <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit & Compliance</h2>
              <p className="text-gray-600 mb-4">
                Comprehensive audit logs for compliance and security tracking
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Search by org, user, action</li>
                <li>✓ Filter by date range</li>
                <li>✓ Export audit logs</li>
                <li>✓ View audit statistics</li>
              </ul>
            </div>
          </Link>

          {/* AI Models Card */}
          <Link href="/admin/ai-models">
            <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Model Management</h2>
              <p className="text-gray-600 mb-4">
                Manage AI models, providers, and performance metrics
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Set active model versions</li>
                <li>✓ Toggle providers</li>
                <li>✓ Monitor latency/errors</li>
                <li>✓ Track performance metrics</li>
              </ul>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">🔒 Security</h3>
              <p className="text-gray-600">
                Role-based access control (RBAC) with granular permissions. Support for
                admin, billing manager, compliance officer, AI model manager, and viewer roles.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">📊 Analytics</h3>
              <p className="text-gray-600">
                Real-time usage trends, spending analysis, and performance metrics
                visualization with interactive charts.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">📝 Compliance</h3>
              <p className="text-gray-600">
                Comprehensive audit logging of all administrative actions with detailed
                timestamps, IP addresses, and user information.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">💾 Data Export</h3>
              <p className="text-gray-600">
                Export billing and audit data in JSON or CSV formats for external
                analysis and compliance reporting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
