// apps/web/src/app/map/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function MapPage() {
  const { user } = useAuth()
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Territory Map</h1>
            <p className="mt-2 text-gray-600">
              View and manage your sales territories
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <p className="text-gray-600 mb-4">
                      Interactive map visualization coming soon
                    </p>
                    <p className="text-sm text-gray-500">
                      MapLibre GL integration in progress
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Territories List */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Territories
                </h2>
                <div className="space-y-3">
                  {['North Region', 'South Region', 'West Region'].map((territory) => (
                    <button
                      key={territory}
                      onClick={() => setSelectedTerritory(territory)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTerritory === territory
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{territory}</div>
                      <div className="text-sm text-gray-500">1,234 leads</div>
                    </button>
                  ))}
                </div>
                
                <button className="w-full mt-4 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors">
                  + Create New Territory
                </button>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Territory Stats</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Leads</span>
                    <span className="font-semibold">3,702</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coverage Area</span>
                    <span className="font-semibold">3 states</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-semibold">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
