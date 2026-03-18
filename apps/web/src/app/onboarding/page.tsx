// apps/web/src/app/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Ultra Lead Gen',
    description: 'Let\'s get you set up in just a few steps',
  },
  {
    id: 'organization',
    title: 'Your Organization',
    description: 'Set up your company profile',
  },
  {
    id: 'crm',
    title: 'Connect Your CRM',
    description: 'Integrate with Salesforce, HubSpot, or Pipedrive',
  },
  {
    id: 'preferences',
    title: 'Your Preferences',
    description: 'Customize your experience',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start finding leads',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    organizationName: '',
    industry: '',
    companySize: '',
    crmType: '',
    notifications: true,
    weeklyDigest: true,
  })

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/dashboard')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{steps[0].title}</h2>
            <p className="text-gray-600 mb-8">{steps[0].description}</p>
            <div className="space-y-4 max-w-md mx-auto text-left">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">🔍</div>
                <div>
                  <div className="font-medium">Smart Search</div>
                  <div className="text-sm text-gray-600">Find leads with AI-powered search</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">🤖</div>
                <div>
                  <div className="font-medium">AI Outreach</div>
                  <div className="text-sm text-gray-600">Generate personalized messages</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">🔗</div>
                <div>
                  <div className="font-medium">CRM Integration</div>
                  <div className="text-sm text-gray-600">Sync with your existing tools</div>
                </div>
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{steps[1].title}</h2>
            <div className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select industry...</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
                <select
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select size...</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{steps[2].title}</h2>
            <p className="text-gray-600 mb-6">{steps[2].description}</p>
            
            <div className="space-y-4">
              {[
                { id: 'salesforce', name: 'Salesforce', icon: '☁️', color: 'bg-blue-100' },
                { id: 'hubspot', name: 'HubSpot', icon: '🟠', color: 'bg-orange-100' },
                { id: 'pipedrive', name: 'Pipedrive', icon: '🟢', color: 'bg-green-100' },
              ].map((crm) => (
                <button
                  key={crm.id}
                  onClick={() => setFormData({ ...formData, crmType: crm.id })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    formData.crmType === crm.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${crm.color} rounded-lg flex items-center justify-center text-2xl`}>
                      {crm.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{crm.name}</div>
                      <div className="text-sm text-gray-600">Connect your {crm.name} account</div>
                    </div>
                    {formData.crmType === crm.id && <div className="text-blue-500">✓</div>}
                  </div>
                </button>
              ))}
              
              <button
                onClick={() => setFormData({ ...formData, crmType: 'none' })}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  formData.crmType === 'none'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold">Skip for now</div>
                  <div className="text-sm text-gray-600">You can connect your CRM later</div>
                </div>
              </button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{steps[3].title}</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-600">Get notified about new leads and alerts</div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, notifications: !formData.notifications })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.notifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Weekly Digest</div>
                  <div className="text-sm text-gray-600">Receive a summary of your leads every week</div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, weeklyDigest: !formData.weeklyDigest })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.weeklyDigest ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.weeklyDigest ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{steps[4].title}</h2>
            <p className="text-gray-600 mb-8">{steps[4].description}</p>
            
            <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto text-left">
              <h3 className="font-semibold mb-4">What's next?</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Search for leads</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Create lead lists</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Set up alerts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Connect your CRM</span>
                </li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Go to Dashboard' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
