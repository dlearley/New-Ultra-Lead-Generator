#!/bin/bash

# Multi-Service Application Setup Script

set -e

echo "🚀 Setting up Multi-Service Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install Terraform 1.0+"
        exit 1
    fi
    
    print_status "All prerequisites are installed ✅"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully ✅"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Lint check
    print_status "Running linter..."
    npm run lint
    
    # Type check
    print_status "Running type check..."
    npm run type-check
    
    # Unit tests
    print_status "Running unit tests..."
    npm run test
    
    if [ $? -eq 0 ]; then
        print_status "All tests passed ✅"
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Build services
build_services() {
    print_status "Building all services..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_status "Services built successfully ✅"
    else
        print_error "Failed to build services"
        exit 1
    fi
}

# Build Docker images
build_docker() {
    print_status "Building Docker images..."
    npm run docker:build
    
    if [ $? -eq 0 ]; then
        print_status "Docker images built successfully ✅"
    else
        print_error "Failed to build Docker images"
        exit 1
    fi
}

# Setup infrastructure
setup_infrastructure() {
    print_status "Setting up infrastructure..."
    
    cd infrastructure
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Plan infrastructure
    print_status "Planning infrastructure..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    echo ""
    read -p "Do you want to apply the infrastructure plan? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Applying infrastructure..."
        terraform apply tfplan
        print_status "Infrastructure deployed successfully ✅"
    else
        print_warning "Infrastructure deployment skipped"
    fi
    
    cd ..
}

# Start development servers
start_dev() {
    print_status "Starting development servers..."
    npm run dev &
    
    print_status "Development servers starting..."
    print_status "Web Service: http://localhost:3000"
    print_status "Admin Service: http://localhost:3001"
    print_status "API Service: http://localhost:3002"
    print_status "API Health: http://localhost:3002/api/health"
}

# Show help
show_help() {
    echo "Multi-Service Application Setup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -i, --install      Install dependencies only"
    echo "  -t, --test         Run tests only"
    echo "  -b, --build        Build services only"
    echo "  -d, --docker       Build Docker images only"
    echo "  -f, --infra        Setup infrastructure only"
    echo "  -s, --start        Start development servers only"
    echo "  --all              Run all steps (default)"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run all setup steps"
    echo "  $0 -i              # Install dependencies only"
    echo "  $0 -t              # Run tests only"
    echo "  $0 -b              # Build services only"
    echo "  $0 -d              # Build Docker images only"
    echo "  $0 -f              # Setup infrastructure only"
    echo "  $0 -s              # Start development servers only"
}

# Main script logic
main() {
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -i|--install)
            check_prerequisites
            install_dependencies
            ;;
        -t|--test)
            check_prerequisites
            run_tests
            ;;
        -b|--build)
            check_prerequisites
            build_services
            ;;
        -d|--docker)
            check_prerequisites
            build_docker
            ;;
        -f|--infra)
            check_prerequisites
            setup_infrastructure
            ;;
        -s|--start)
            check_prerequisites
            start_dev
            ;;
        --all|"")
            check_prerequisites
            install_dependencies
            run_tests
            build_services
            build_docker
            
            echo ""
            print_warning "Infrastructure setup skipped. Run with -f flag to setup infrastructure."
            echo ""
            read -p "Do you want to setup infrastructure now? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                setup_infrastructure
            fi
            
            echo ""
            read -p "Do you want to start development servers? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                start_dev
            fi
            
            print_status "Setup complete! 🎉"
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"