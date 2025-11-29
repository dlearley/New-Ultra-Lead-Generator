import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Auth SSO MFA
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Authentication system with SSO, MFA, and session management
            </p>
            
            <div className="bg-white shadow rounded-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Dashboard
              </h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-900">User Info</h3>
                  <p className="text-gray-600">Email: {session.user?.email}</p>
                  <p className="text-gray-600">Name: {session.user?.name}</p>
                  <p className="text-gray-600">MFA Enabled: {session.user?.mfaEnabled ? 'Yes' : 'No'}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center">
                  <a
                    href="/auth/mfa"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    MFA Settings
                  </a>
                  <a
                    href="/auth/sessions"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Session Management
                  </a>
                  <a
                    href="/api/auth/signout"
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}