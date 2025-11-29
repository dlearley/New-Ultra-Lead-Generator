# Admin Dashboard - Tenant & User Management Phase 7 Part 1

This is the admin dashboard application for the prospecting platform, built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features

### Organization Management
- **Organization Listing**: Display all organizations with status, plan, and usage information
- **Status Filtering**: Filter organizations by active, suspended, or inactive status
- **Search**: Search organizations by name or ID
- **Sorting**: Sort by name, status, or user count
- **Organization Actions**:
  - Suspend/Restore organizations
  - Reset MFA for all users in organization
  - Force logout all users in organization
  - Impersonate organization sessions

### User Management
- **User Listing**: Display all users with roles, activity status, and connector information
- **Role Filtering**: Filter users by admin, member, or viewer roles
- **Search**: Search users by name or email
- **Sorting**: Sort by name, role, or last activity
- **User Actions**:
  - Reset MFA for individual users
  - Force logout individual users
  - View user details and enabled connectors
  - Monitor last activity timestamp

### Audit Logging
- **Action Tracking**: Every admin action is logged to the audit trail
- **Audit Details**: View comprehensive details of each action
- **Log Filtering**: Filter logs by action type, actor, or target
- **Timestamp Tracking**: Track when actions occurred

### Security & Access Control
- **RBAC Middleware**: Enforce admin-only access via middleware
- **Admin Authentication**: Verify admin status before granting access
- **Audit Trail**: Complete audit trail for compliance
- **Protected Actions**: All sensitive operations require admin verification

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **Component Library**: Radix UI primitives
- **Icons**: Lucide React
- **API**: Next.js API Routes with RBAC middleware
- **Testing**: Playwright

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev:admin
```

Open [http://localhost:3001](http://localhost:3001) to see the application.

### Build

```bash
npm run build
```

### Testing

Run Playwright e2e tests:

```bash
npm run test:admin:e2e
```

## Project Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── organizations/
│   │   │   │   ├── route.ts                    # List organizations
│   │   │   │   └── [id]/
│   │   │   │       ├── suspend/route.ts        # Suspend organization
│   │   │   │       ├── restore/route.ts        # Restore organization
│   │   │   │       ├── reset-mfa/route.ts      # Reset MFA for org
│   │   │   │       ├── force-logout/route.ts   # Force logout org users
│   │   │   │       └── impersonate/route.ts    # Impersonate organization
│   │   │   ├── users/
│   │   │   │   ├── route.ts                    # List users
│   │   │   │   └── [id]/
│   │   │   │       ├── reset-mfa/route.ts      # Reset MFA for user
│   │   │   │       └── force-logout/route.ts   # Force logout user
│   │   │   └── audit/
│   │   │       └── route.ts                    # Get audit logs
│   │   ├── layout.tsx                          # Root layout
│   │   ├── page.tsx                            # Admin dashboard
│   │   └── globals.css                         # Global styles
│   ├── components/
│   │   ├── organizations-table.tsx             # Organizations table with actions
│   │   ├── users-table.tsx                     # Users table with actions
│   │   └── audit-log-viewer.tsx                # Audit log viewer
│   ├── lib/
│   │   ├── audit.ts                            # Audit logging utilities
│   │   ├── mock-data.ts                        # Mock organizations and users
│   │   └── utils.ts                            # Common utilities
│   ├── types/
│   │   └── index.ts                            # TypeScript types
│   └── middleware/
│       └── rbac.ts                             # RBAC middleware
├── e2e/
│   └── admin.spec.ts                           # Playwright e2e tests
└── playwright.config.ts
```

## API Endpoints

### Organizations
- `GET /api/organizations` - List all organizations (with optional status filter)
- `POST /api/organizations/[id]/suspend` - Suspend organization
- `POST /api/organizations/[id]/restore` - Restore organization
- `POST /api/organizations/[id]/reset-mfa` - Reset MFA for all users
- `POST /api/organizations/[id]/force-logout` - Force logout all users
- `POST /api/organizations/[id]/impersonate` - Impersonate organization

### Users
- `GET /api/users` - List all users (with optional role or organization filter)
- `POST /api/users/[id]/reset-mfa` - Reset MFA for user
- `POST /api/users/[id]/force-logout` - Force logout user

### Audit
- `GET /api/audit` - Get audit logs (with optional filters)

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## RBAC Implementation

Admin access is enforced via middleware that checks for:
- `x-admin-user` header (user ID)
- `x-is-admin` header (boolean)

The `withAdminMiddleware` wrapper automatically validates these headers and returns a 403 Forbidden response if the user is not an admin.

## Testing Strategy

### E2E Tests (Playwright)
- Organization CRUD operations
- User action operations (MFA reset, force logout)
- Organization status changes
- Audit log generation and viewing
- Search and filter functionality
- Pagination and sorting
- Admin-only access verification

Run tests:
```bash
npm run test:admin:e2e
```

## Audit Logging

Every action performed in the admin dashboard is logged to the audit trail with:
- **Action**: Type of action performed (e.g., SUSPEND_ORGANIZATION)
- **Actor**: Admin user ID who performed the action
- **Target**: Organization or User ID affected
- **Details**: Additional context about the action
- **Timestamp**: When the action occurred

## Future Enhancements

- User creation and deletion
- Organization plan upgrades/downgrades
- Custom reports and exports
- Advanced audit log filtering and search
- Real-time activity monitoring
- Admin role customization
- Batch operations
