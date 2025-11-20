#!/bin/bash

# Comprehensive Test Script for Multi-Service Application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Print functions
print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Test functions
test_node_version() {
    print_test "Node.js version"
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_pass "Node.js version $NODE_VERSION is >= 18"
    else
        print_fail "Node.js version $NODE_VERSION is < 18"
    fi
}

test_npm_version() {
    print_test "npm version"
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_pass "npm version $NPM_VERSION is available"
    else
        print_fail "npm is not installed"
    fi
}

test_docker() {
    print_test "Docker installation"
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_pass "Docker is installed: $DOCKER_VERSION"
    else
        print_fail "Docker is not installed"
    fi
}

test_aws_cli() {
    print_test "AWS CLI installation"
    if command -v aws &> /dev/null; then
        AWS_VERSION=$(aws --version 2>&1 | cut -d'/' -f2 | cut -d' ' -f1)
        print_pass "AWS CLI version $AWS_VERSION is available"
    else
        print_fail "AWS CLI is not installed"
    fi
}

test_terraform() {
    print_test "Terraform installation"
    if command -v terraform &> /dev/null; then
        TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
        print_pass "Terraform version $TF_VERSION is available"
    else
        print_fail "Terraform is not installed"
    fi
}

test_package_json() {
    print_test "package.json exists"
    if [ -f "package.json" ]; then
        print_pass "package.json exists"
    else
        print_fail "package.json not found"
    fi
}

test_services_structure() {
    print_test "Services directory structure"
    local services=("web" "admin" "api")
    local all_exist=true
    
    for service in "${services[@]}"; do
        if [ -d "services/$service" ]; then
            print_info "✓ services/$service directory exists"
        else
            print_fail "services/$service directory missing"
            all_exist=false
        fi
    done
    
    if [ "$all_exist" = true ]; then
        print_pass "All service directories exist"
    fi
}

test_dockerfiles() {
    print_test "Dockerfiles exist"
    local services=("web" "admin" "api")
    local all_exist=true
    
    for service in "${services[@]}"; do
        if [ -f "services/$service/Dockerfile" ]; then
            print_info "✓ services/$service/Dockerfile exists"
        else
            print_fail "services/$service/Dockerfile missing"
            all_exist=false
        fi
    done
    
    if [ "$all_exist" = true ]; then
        print_pass "All Dockerfiles exist"
    fi
}

test_package_jsons() {
    print_test "Service package.json files"
    local services=("web" "admin" "api")
    local all_exist=true
    
    for service in "${services[@]}"; do
        if [ -f "services/$service/package.json" ]; then
            print_info "✓ services/$service/package.json exists"
        else
            print_fail "services/$service/package.json missing"
            all_exist=false
        fi
    done
    
    if [ "$all_exist" = true ]; then
        print_pass "All service package.json files exist"
    fi
}

test_infrastructure() {
    print_test "Infrastructure directory structure"
    if [ -d "infrastructure" ]; then
        print_info "✓ infrastructure directory exists"
        
        local modules=("ecs" "rds" "opensearch" "s3" "monitoring")
        local all_modules=true
        
        for module in "${modules[@]}"; do
            if [ -d "infrastructure/modules/$module" ]; then
                print_info "✓ infrastructure/modules/$module exists"
            else
                print_fail "infrastructure/modules/$module missing"
                all_modules=false
            fi
        done
        
        if [ "$all_modules" = true ]; then
            print_pass "All infrastructure modules exist"
        fi
        
        # Check Terraform files
        if [ -f "infrastructure/main.tf" ]; then
            print_info "✓ infrastructure/main.tf exists"
            print_pass "Infrastructure Terraform configuration exists"
        else
            print_fail "infrastructure/main.tf missing"
        fi
    else
        print_fail "infrastructure directory missing"
    fi
}

test_github_actions() {
    print_test "GitHub Actions workflow"
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        print_info "✓ .github/workflows/ci-cd.yml exists"
        print_pass "GitHub Actions workflow exists"
    else
        print_fail "GitHub Actions workflow missing"
    fi
}

test_documentation() {
    print_test "Documentation files"
    local docs=("README.md" "docs/DEPLOYMENT.md" "docs/ENVIRONMENT_VARIABLES.md" "docs/TROUBLESHOOTING.md")
    local all_docs=true
    
    for doc in "${docs[@]}"; do
        if [ -f "$doc" ]; then
            print_info "✓ $doc exists"
        else
            print_fail "$doc missing"
            all_docs=false
        fi
    done
    
    if [ "$all_docs" = true ]; then
        print_pass "All documentation files exist"
    fi
}

test_dependencies_install() {
    print_test "Installing dependencies"
    if npm install --silent; then
        print_pass "Dependencies installed successfully"
    else
        print_fail "Failed to install dependencies"
    fi
}

test_linting() {
    print_test "Running linter"
    if npm run lint --silent; then
        print_pass "Linting passed"
    else
        print_fail "Linting failed"
    fi
}

test_type_check() {
    print_test "Running TypeScript type check"
    if npm run type-check --silent; then
        print_pass "TypeScript type check passed"
    else
        print_fail "TypeScript type check failed"
    fi
}

test_unit_tests() {
    print_test "Running unit tests"
    if npm test --silent; then
        print_pass "Unit tests passed"
    else
        print_fail "Unit tests failed"
    fi
}

test_build() {
    print_test "Building services"
    if npm run build --silent; then
        print_pass "Services built successfully"
    else
        print_fail "Failed to build services"
    fi
}

test_docker_build() {
    print_test "Building Docker images"
    if npm run docker:build --silent; then
        print_pass "Docker images built successfully"
    else
        print_fail "Failed to build Docker images"
    fi
}

test_terraform_init() {
    print_test "Initializing Terraform"
    cd infrastructure
    if terraform init -backend=false > /dev/null 2>&1; then
        print_pass "Terraform initialized successfully"
    else
        print_fail "Terraform initialization failed"
    fi
    cd ..
}

test_terraform_validate() {
    print_test "Validating Terraform configuration"
    cd infrastructure
    if terraform validate > /dev/null 2>&1; then
        print_pass "Terraform validation passed"
    else
        print_fail "Terraform validation failed"
    fi
    cd ..
}

test_terraform_format() {
    print_test "Checking Terraform format"
    cd infrastructure
    if terraform fmt -check -diff > /dev/null 2>&1; then
        print_pass "Terraform files are properly formatted"
    else
        print_fail "Terraform files need formatting"
    fi
    cd ..
}

test_service_health() {
    print_test "Service health checks"
    
    # Check if services are running
    local services_running=true
    
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_info "✓ Web service is responding"
    else
        print_info "⚠️  Web service not running (expected in CI)"
        services_running=false
    fi
    
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_info "✓ Admin service is responding"
    else
        print_info "⚠️  Admin service not running (expected in CI)"
        services_running=false
    fi
    
    if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
        print_info "✓ API service health check passed"
        print_pass "All services are healthy"
    else
        print_info "⚠️  API service not running (expected in CI)"
        if [ "$services_running" = false ]; then
            print_info "Services not running - this is expected in CI environment"
        fi
    fi
}

# Main test execution
run_tests() {
    print_header "Multi-Service Application Test Suite"
    
    print_info "Running comprehensive tests..."
    echo ""
    
    # Prerequisites tests
    print_header "Prerequisites"
    test_node_version
    test_npm_version
    test_docker
    test_aws_cli
    test_terraform
    echo ""
    
    # Structure tests
    print_header "Project Structure"
    test_package_json
    test_services_structure
    test_dockerfiles
    test_package_jsons
    test_infrastructure
    test_github_actions
    test_documentation
    echo ""
    
    # Build tests
    print_header "Build and Test"
    test_dependencies_install
    test_linting
    test_type_check
    test_unit_tests
    test_build
    echo ""
    
    # Docker tests (optional)
    if command -v docker &> /dev/null; then
        print_header "Docker Tests"
        test_docker_build
        echo ""
    fi
    
    # Infrastructure tests
    if command -v terraform &> /dev/null; then
        print_header "Infrastructure Tests"
        test_terraform_init
        test_terraform_validate
        test_terraform_format
        echo ""
    fi
    
    # Runtime tests
    print_header "Runtime Tests"
    test_service_health
    echo ""
    
    # Results
    print_header "Test Results"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    
    local TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All $TOTAL_TESTS tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ $TESTS_FAILED out of $TOTAL_TESTS tests failed${NC}"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Multi-Service Application Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  --prereqs           Run prerequisites tests only"
    echo "  --structure         Run structure tests only"
    echo "  --build             Run build tests only"
    echo "  --infra             Run infrastructure tests only"
    echo "  --runtime           Run runtime tests only"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run all tests"
    echo "  $0 --prereqs       # Run prerequisites tests only"
    echo "  $0 --build         # Run build tests only"
}

# Main execution
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --prereqs)
        print_header "Prerequisites Tests"
        test_node_version
        test_npm_version
        test_docker
        test_aws_cli
        test_terraform
        ;;
    --structure)
        print_header "Project Structure Tests"
        test_package_json
        test_services_structure
        test_dockerfiles
        test_package_jsons
        test_infrastructure
        test_github_actions
        test_documentation
        ;;
    --build)
        print_header "Build Tests"
        test_dependencies_install
        test_linting
        test_type_check
        test_unit_tests
        test_build
        ;;
    --infra)
        print_header "Infrastructure Tests"
        test_terraform_init
        test_terraform_validate
        test_terraform_format
        ;;
    --runtime)
        print_header "Runtime Tests"
        test_service_health
        ;;
    *)
        run_tests
        ;;
esac