# Auth SSO MFA System

A comprehensive authentication system with SSO, MFA, and session management built with Next.js, NextAuth, Prisma, and PostgreSQL.

## Features

### Authentication Methods
- **Email & Password**: Traditional credentials-based authentication
- **SSO Providers**: Google, Microsoft, LinkedIn OAuth integration
- **Multi-Factor Authentication (MFA)**:
  - TOTP (Time-based One-Time Password) using authenticator apps
  - SMS verification (via Twilio)
  - Email verification
  - Backup codes for account recovery

### Session Management
- JWT-based session strategy with refresh token rotation
- Device tracking and management
- Active session listing with device information
- Session revocation capabilities
- Redis-ready architecture for scalability

### Security Features
- Password strength validation
- Secure password hashing with bcrypt
- MFA enforcement toggles
- Session timeout management
- Device fingerprinting

### Testing
- Comprehensive unit and integration tests
- Authentication flow testing
- MFA challenge verification testing
- Session management testing
- API endpoint testing

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/auth/          # API routes
│   │   ├── auth/              # Auth pages
│   │   └── globals.css
│   ├── components/
│   │   └── providers/
│   ├── lib/
│   │   └── auth/              # Authentication utilities
│   └── __tests__/             # Test files
├── prisma/
│   └── schema.prisma          # Database schema
└── package.json
```

## Setup Instructions

### 1. Environment Setup

Copy the environment template:
```bash
cp apps/web/.env.example apps/web/.env.local
```

Configure the following environment variables:

#### Database
```env
DATABASE_URL="postgresql://username:password@localhost:5432/auth_db"
```

#### NextAuth
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

#### OAuth Providers
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
```

#### Redis (for session storage)
```env
REDIS_URL="redis://localhost:6379"
```

#### Email (for password reset and email MFA)
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

#### SMS (Twilio for SMS MFA)
```env
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

#### App Settings
```env
APP_NAME="Auth SSO MFA"
APP_URL="http://localhost:3000"
```

### 2. Database Setup

Install Prisma CLI and generate the database schema:
```bash
cd apps/web
npm install
npx prisma generate
npx prisma db push
```

### 3. Install Dependencies

From the root directory:
```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Usage

### Registration and Login
1. Navigate to `/auth/signup` to create a new account
2. Use `/auth/signin` to log in with credentials or OAuth providers
3. If MFA is enabled, you'll be prompted for verification

### MFA Setup
1. After logging in, visit `/auth/mfa`
2. Click "Enable MFA" to generate a TOTP secret
3. Scan the QR code with your authenticator app
4. Enter the verification code to enable MFA
5. Save the backup codes securely

### Session Management
1. Visit `/auth/sessions` to view active sessions
2. Revoke individual sessions or all other sessions
3. View device information and last access times

### OAuth Provider Setup

#### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### Microsoft
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
4. Grant delegated permissions for user profile

#### LinkedIn
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new application
3. Add redirect URI: `http://localhost:3000/api/auth/callback/linkedin`
4. Request r_liteprofile and r_emailaddress permissions

## Testing

Run the test suite:
```bash
cd apps/web
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/mfa-challenge` - MFA challenge handling

### MFA Management
- `POST /api/auth/mfa` - Enable/disable MFA

### Session Management
- `GET /api/auth/sessions` - Get user sessions
- `DELETE /api/auth/sessions` - Revoke sessions

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Database Security**: Use connection pooling and SSL
3. **Session Security**: Implement proper token rotation and expiration
4. **MFA Backup Codes**: Store backup codes securely
5. **Rate Limiting**: Implement rate limiting on auth endpoints
6. **HTTPS**: Always use HTTPS in production

## Production Deployment

1. **Database**: Use a managed PostgreSQL service
2. **Redis**: Use a managed Redis service for session storage
3. **Environment**: Configure all required environment variables
4. **Domain**: Update `NEXTAUTH_URL` to your production domain
5. **SSL**: Ensure SSL certificates are properly configured
6. **Monitoring**: Set up logging and monitoring for auth events

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.