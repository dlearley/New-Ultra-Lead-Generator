// apps/web/src/app/alerts/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

interface Alert {
  id: string
  name: string
  condition: string
  frequency: string
  lastRun: string
  status: 'active' | 'paused'
  notifications: number
}

export default function AlertsPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      name: 'New Tech Companies',
      condition: 'Industry = Technology AND Created > 7 days',
      frequency: 'Daily',
      lastRun: '2 hours ago',
      status: 'active',
      notifications: 12,
    },
    {
      id: '2',
      name: 'High Value Leads',
      condition: 'Revenue > $10M AND Employees > 100',
      frequency: 'Weekly',
      lastRun: '1 day ago',
      status: 'active',
      notifications: 3,
    },
    {
      id: '3',
      name: 'Competitor Activity',
      condition: 'Company name contains competitor',
      frequency: 'Real-time',
      lastRun: '5 minutes ago',
      status: 'paused',
      notifications: 0,
    },
  ])

  const toggleAlertStatus = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id 
        ? { ...alert, status: alert.status === 'active' ? 'paused' : 'active' }
        : alert
    ))
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Alerts</h1>
              <p className="mt-2 text-gray-600">
                Get notified when new leads match your criteria
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + Create Alert
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">{alerts.filter(a => a.status === 'active').length}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">{alerts.reduce((sum, a) => sum + a.notifications, 0)}</div>
              <div className="text-sm text-gray-600">Notifications Today</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">156</div>
              <div className="text-sm text-gray-600">Leads Matched (7 days)</div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Alerts</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{alert.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          alert.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">{alert.condition}</div>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span>⏰ {alert.frequency}</span>
                        <span>🕐 Last run: {alert.lastRun}</span>
                        {alert.notifications > 0 && (
                          <span className="text-blue-600 font-medium">
                            🔔 {alert.notifications} new matches
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleAlertStatus(alert.id)}
                        className={`px-3 py-1 text-sm rounded ${
                          alert.status === 'active'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {alert.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        ⚙️
                      </button>
                      <button className="text-red-400 hover:text-red-600">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty State - Show if no alerts */}
          {alerts.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first alert to get notified about new leads
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
