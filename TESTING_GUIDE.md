# Testing Guide - New-Ultra-Lead-Generator

## 🧪 How to Test the Application

### Prerequisites
- PostgreSQL running
- Redis running (for BullMQ)
- Node.js >= 20
- pnpm installed

---

## Quick Start Testing

### 1. Start Infrastructure
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
# or
pnpm docker:up
```

### 2. Setup Database
```bash
cd apps/api

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Run migrations (IMPORTANT - adds User/RefreshToken tables)
npx prisma migrate dev --name add_auth

# Optional: Seed with test data
npx prisma db seed
```

### 3. Start API Server
```bash
cd apps/api
pnpm dev

# Server should start on http://localhost:3001
```

### 4. Run Automated Tests
```bash
# From project root
./test-api.sh
```

---

## Manual Testing

### Test Authentication Flow

#### 1. Register a User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "USER"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900
}
```

#### 2. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 3. Get Profile (Protected)
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Test AI Outreach (Protected)
```bash
curl -X POST http://localhost:3001/ai/outreach/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "leadName": "John Smith",
    "leadCompany": "Acme Corp",
    "leadTitle": "VP of Sales",
    "productName": "Ultra Lead Gen",
    "valueProposition": "10x lead generation",
    "tone": "professional"
  }'
```

#### 5. Test AI Summary (Protected)
```bash
curl -X POST http://localhost:3001/ai/summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "type": "business",
    "content": "Long business description here...",
    "title": "Company Overview",
    "maxLength": "medium"
  }'
```

#### 6. Refresh Token
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 7. Logout
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## Frontend Testing

### Start Web App
```bash
cd apps/web
pnpm dev
```

### Test Flows

1. **Registration**
   - Go to http://localhost:3000/auth/signup
   - Fill in form
   - Submit
   - Should redirect to /dashboard

2. **Login**
   - Go to http://localhost:3000/auth/signin
   - Enter credentials
   - Submit
   - Should redirect to /dashboard

3. **Protected Routes**
   - Try accessing /dashboard without logging in
   - Should redirect to /auth/signin

4. **Logout**
   - Click logout button
   - Should redirect to /auth/signin
   - Try accessing /dashboard
   - Should redirect to login

---

## Database Verification

### Check Users Table
```bash
cd apps/api
npx prisma studio
# or
npx prisma db execute --stdin <<EOF
SELECT * FROM "users";
EOF
```

### Check Refresh Tokens
```sql
SELECT * FROM "refresh_tokens";
```

---

## Troubleshooting

### "Database connection failed"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection string in apps/api/.env
# Should match your Docker setup
```

### "JWT errors"
```bash
# Check JWT_SECRET is set
cat apps/api/.env | grep JWT_SECRET

# Should not be the default value in production
```

### "Prisma schema not found"
```bash
cd apps/api
npx prisma generate
```

### "Migration needed"
```bash
cd apps/api
npx prisma migrate dev --name add_auth
```

---

## Expected Test Results

| Endpoint | Method | Auth | Expected Status |
|----------|--------|------|-----------------|
| /auth/register | POST | No | 201 Created |
| /auth/login | POST | No | 200 OK |
| /auth/me | GET | Yes | 200 OK |
| /auth/refresh | POST | No | 200 OK |
| /auth/logout | POST | Yes | 200 OK |
| /ai/outreach | POST | Yes | 200 OK |
| /ai/summary | POST | Yes | 200 OK |

---

## Performance Testing

### Load Test with Artillery
```bash
# Install artillery
npm install -g artillery

# Create test config
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Login flow"
    requests:
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
EOF

# Run test
artillery run load-test.yml
```

---

## Security Testing

### Test SQL Injection
```bash
curl -X POST http://localhost:3001/auth/login \
  -d '{
    "email": "test@example.com\'; DROP TABLE users; --",
    "password": "password123"
  }'

# Should fail gracefully without executing SQL
```

### Test XSS
```bash
curl -X POST http://localhost:3001/ai/summary \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "content": "<script>alert('xss')</script>",
    "type": "business"
  }'

# Should sanitize or escape HTML
```

---

## CI/CD Testing

### GitHub Actions
Create `.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: ./test-api.sh
```

---

## Test Coverage

### Current Status
- ✅ Auth endpoints: 5/5 tested
- ✅ AI endpoints: 4/4 tested
- ⚠️ Unit tests: Need to add
- ⚠️ E2E tests: Need to add

### Recommended Test Additions
1. Unit tests for auth service
2. Unit tests for AI service
3. E2E tests with Playwright
4. Load tests for AI endpoints
5. Security penetration tests

---

## Success Criteria

✅ **Authentication Works**
- Register creates user
- Login returns tokens
- Protected routes require auth
- Token refresh works
- Logout invalidates tokens

✅ **AI Generation Works**
- Outreach generation returns content
- Summary generation returns content
- Different tones work
- Different lengths work
- Errors handled gracefully

✅ **Security**
- No SQL injection vulnerabilities
- No XSS vulnerabilities
- Passwords hashed
- Tokens secure

---

**Test Script Location:** `test-api.sh`  
**Last Updated:** March 17, 2025
