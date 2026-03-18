#!/bin/bash
# Test script for New-Ultra-Lead-Generator API
# Run this after starting the API server

set -e

echo "==================================="
echo "New-Ultra-Lead-Generator API Tests"
echo "==================================="
echo ""

API_URL="http://localhost:3001"
echo "Testing against: $API_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to make API calls
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    local expected_status=${5:-200}
    
    echo "Testing: $method $endpoint"
    
    if [ -n "$data" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: $auth_header" \
                -d "$data" 2>/dev/null || echo "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" 2>/dev/null || echo "\n000")
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Authorization: $auth_header" 2>/dev/null || echo "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" 2>/dev/null || echo "\n000")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        echo "Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "==================================="
echo "1. AUTHENTICATION TESTS"
echo "==================================="
echo ""

# Test 1: Health check
echo "Test 1.1: Health Check"
test_endpoint "GET" "/health" "" "" 200 || true
echo ""

# Test 2: Register new user
echo "Test 1.2: Register User"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test_'$(date +%s)'@example.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "User"
    }')

echo "Register Response: $REGISTER_RESPONSE"

# Extract tokens from response
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Registered and got tokens"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} - Registration failed"
    ((TESTS_FAILED++))
    echo "Cannot continue without authentication"
    exit 1
fi
echo ""

# Test 3: Login
echo "Test 1.3: Login"
test_endpoint "POST" "/auth/login" '{
    "email": "test@example.com",
    "password": "password123"
}' "" 200 || true
echo ""

# Test 4: Get Profile (Protected)
echo "Test 1.4: Get Profile (Protected)"
test_endpoint "GET" "/auth/me" "" "Bearer $ACCESS_TOKEN" 200 || true
echo ""

# Test 5: Refresh Token
echo "Test 1.5: Refresh Token"
test_endpoint "POST" "/auth/refresh" "{\"refreshToken\": \"$REFRESH_TOKEN\"}" "" 200 || true
echo ""

echo "==================================="
echo "2. AI OUTREACH TESTS"
echo "==================================="
echo ""

# Test 6: Generate Email Outreach
echo "Test 2.1: Generate Email Outreach"
test_endpoint "POST" "/ai/outreach/email" '{
    "leadName": "John Smith",
    "leadCompany": "Acme Corp",
    "leadTitle": "VP of Sales",
    "productName": "Ultra Lead Gen",
    "valueProposition": "10x your lead generation",
    "tone": "professional"
}' "Bearer $ACCESS_TOKEN" 200 || true
echo ""

# Test 7: Generate LinkedIn Outreach
echo "Test 2.2: Generate LinkedIn Outreach"
test_endpoint "POST" "/ai/outreach/linkedin" '{
    "leadName": "Jane Doe",
    "leadCompany": "Tech Startup",
    "leadTitle": "CEO",
    "tone": "friendly"
}' "Bearer $ACCESS_TOKEN" 200 || true
echo ""

echo "==================================="
echo "3. AI SUMMARY TESTS"
echo "==================================="
echo ""

# Test 8: Generate Summary
echo "Test 3.1: Generate Business Summary"
test_endpoint "POST" "/ai/summary" '{
    "type": "business",
    "content": "Acme Corporation is a leading technology company founded in 2020. They specialize in AI-powered lead generation solutions for B2B sales teams. The company has grown 500% year-over-year and now serves over 1,000 enterprise customers worldwide. Their flagship product, Ultra Lead Gen, uses advanced machine learning algorithms to identify and qualify high-intent leads from multiple data sources. The company recently raised $50M in Series B funding and is expanding into European markets.",
    "title": "Acme Corp Overview",
    "maxLength": "medium",
    "focus": "growth and product"
}' "Bearer $ACCESS_TOKEN" 200 || true
echo ""

echo "==================================="
echo "4. PROTECTED ROUTE TESTS"
echo "==================================="
echo ""

# Test 9: Access without token (should fail)
echo "Test 4.1: Access AI without token (should fail)"
test_endpoint "POST" "/ai/outreach/email" '{
    "leadName": "Test",
    "leadCompany": "Test Corp"
}' "" 401 || true
echo ""

# Test 10: Logout
echo "Test 4.2: Logout"
test_endpoint "POST" "/auth/logout" "{\"refreshToken\": \"$REFRESH_TOKEN\"}" "Bearer $ACCESS_TOKEN" 200 || true
echo ""

echo "==================================="
echo "TEST SUMMARY"
echo "==================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check output above.${NC}"
    exit 1
fi
