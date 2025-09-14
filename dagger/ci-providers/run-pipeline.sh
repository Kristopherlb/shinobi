#!/bin/bash
set -euo pipefail

# Shinobi Platform CI Pipeline Runner
# Universal script that can be used by any CI provider to run the platform pipeline

# Default configuration
ENVIRONMENT=${ENVIRONMENT:-"dev"}
COMPLIANCE_FRAMEWORK=${COMPLIANCE_FRAMEWORK:-"commercial"}
OUTPUT_FORMAT=${OUTPUT_FORMAT:-"json"}
SKIP_VALIDATE=${SKIP_VALIDATE:-"false"}
SKIP_TEST=${SKIP_TEST:-"false"}
SKIP_AUDIT=${SKIP_AUDIT:-"false"}
SKIP_PLAN=${SKIP_PLAN:-"false"}
SKIP_DEPLOY=${SKIP_DEPLOY:-"false"}
FIPS_COMPLIANCE=${FIPS_COMPLIANCE:-"false"}
DAGGER_MTLS_ENABLED=${DAGGER_MTLS_ENABLED:-"false"}
RESULTS_DIR=${RESULTS_DIR:-"./pipeline-results"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Print usage information
usage() {
    cat << EOF
🥷 Shinobi Platform CI Pipeline Runner

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV        Target environment (dev|staging|prod) [default: dev]
    -c, --compliance FRAMEWORK   Compliance framework (commercial|fedramp-moderate|fedramp-high) [default: commercial]
    -f, --format FORMAT          Output format (json|yaml|pretty) [default: json]
    -r, --results-dir DIR        Results directory [default: ./pipeline-results]
    --skip-validate              Skip validation step
    --skip-test                  Skip testing step
    --skip-audit                 Skip audit step
    --skip-plan                  Skip planning step
    --skip-deploy                Skip deployment step
    --fips-compliance            Use FIPS-compliant base images
    --mtls-enabled               Enable mTLS for Dagger Engine Pool
    --help                       Show this help message

Environment Variables:
    AWS_ACCESS_KEY_ID            AWS access key for deployment
    AWS_SECRET_ACCESS_KEY        AWS secret key for deployment
    AWS_DEFAULT_REGION           AWS region [default: us-east-1]
    GITHUB_TOKEN                 GitHub token for repository access

Examples:
    # Run full pipeline for development
    $0 --environment dev

    # Run pipeline with FedRAMP compliance
    $0 --environment prod --compliance fedramp-high --fips-compliance

    # Run validation and testing only
    $0 --skip-audit --skip-plan --skip-deploy

    # Run with mTLS enabled
    $0 --mtls-enabled --environment staging
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -c|--compliance)
                COMPLIANCE_FRAMEWORK="$2"
                shift 2
                ;;
            -f|--format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            -r|--results-dir)
                RESULTS_DIR="$2"
                shift 2
                ;;
            --skip-validate)
                SKIP_VALIDATE="true"
                shift
                ;;
            --skip-test)
                SKIP_TEST="true"
                shift
                ;;
            --skip-audit)
                SKIP_AUDIT="true"
                shift
                ;;
            --skip-plan)
                SKIP_PLAN="true"
                shift
                ;;
            --skip-deploy)
                SKIP_DEPLOY="true"
                shift
                ;;
            --fips-compliance)
                FIPS_COMPLIANCE="true"
                shift
                ;;
            --mtls-enabled)
                DAGGER_MTLS_ENABLED="true"
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Validate configuration
validate_config() {
    log_info "Validating configuration..."
    
    # Validate environment
    case $ENVIRONMENT in
        dev|staging|prod)
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
            exit 1
            ;;
    esac
    
    # Validate compliance framework
    case $COMPLIANCE_FRAMEWORK in
        commercial|fedramp-moderate|fedramp-high)
            ;;
        *)
            log_error "Invalid compliance framework: $COMPLIANCE_FRAMEWORK. Must be commercial, fedramp-moderate, or fedramp-high"
            exit 1
            ;;
    esac
    
    # Validate output format
    case $OUTPUT_FORMAT in
        json|yaml|pretty)
            ;;
        *)
            log_error "Invalid output format: $OUTPUT_FORMAT. Must be json, yaml, or pretty"
            exit 1
            ;;
    esac
    
    # Check for required tools
    for tool in node npm tsx dagger; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    log_success "Configuration validation passed"
}

# Setup pipeline environment
setup_environment() {
    log_info "Setting up pipeline environment..."
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Initialize Dagger project if needed
    if [ ! -f "dagger.json" ]; then
        log_info "Initializing Dagger project..."
        dagger project init --name=shinobi-platform
    fi
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    log_success "Environment setup completed"
}

# Run the pipeline
run_pipeline() {
    log_info "Starting Shinobi Platform Pipeline..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Compliance Framework: $COMPLIANCE_FRAMEWORK"
    log_info "Output Format: $OUTPUT_FORMAT"
    log_info "Results Directory: $RESULTS_DIR"
    
    # Build command arguments
    local cmd_args=()
    
    # Add skip flags
    [ "$SKIP_VALIDATE" = "true" ] && cmd_args+=(--skip-validate)
    [ "$SKIP_TEST" = "true" ] && cmd_args+=(--skip-test)
    [ "$SKIP_AUDIT" = "true" ] && cmd_args+=(--skip-audit)
    [ "$SKIP_PLAN" = "true" ] && cmd_args+=(--skip-plan)
    [ "$SKIP_DEPLOY" = "true" ] && cmd_args+=(--skip-deploy)
    
    # Add compliance flags
    [ "$FIPS_COMPLIANCE" = "true" ] && cmd_args+=(--fips-compliance)
    [ "$DAGGER_MTLS_ENABLED" = "true" ] && cmd_args+=(--mtls-enabled)
    
    # Run the pipeline
    if tsx dagger/pipelines/platform-pipeline.ts "${cmd_args[@]}"; then
        log_success "Pipeline completed successfully!"
        return 0
    else
        log_error "Pipeline failed!"
        return 1
    fi
}

# Generate pipeline summary
generate_summary() {
    log_info "Generating pipeline summary..."
    
    local summary_file="$RESULTS_DIR/pipeline-summary.json"
    local status=$1
    
    cat > "$summary_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "compliance_framework": "$COMPLIANCE_FRAMEWORK",
    "output_format": "$OUTPUT_FORMAT",
    "status": "$status",
    "steps": {
        "validate": $([ "$SKIP_VALIDATE" = "true" ] && echo "skipped" || echo "completed"),
        "test": $([ "$SKIP_TEST" = "true" ] && echo "skipped" || echo "completed"),
        "audit": $([ "$SKIP_AUDIT" = "true" ] && echo "skipped" || echo "completed"),
        "plan": $([ "$SKIP_PLAN" = "true" ] && echo "skipped" || echo "completed"),
        "deploy": $([ "$SKIP_DEPLOY" = "true" ] && echo "skipped" || echo "completed")
    },
    "configuration": {
        "fips_compliance": $FIPS_COMPLIANCE,
        "mtls_enabled": $DAGGER_MTLS_ENABLED
    }
}
EOF
    
    log_success "Pipeline summary generated: $summary_file"
}

# Main execution
main() {
    log_info "🥷 Shinobi Platform CI Pipeline Runner"
    
    # Parse arguments
    parse_args "$@"
    
    # Validate configuration
    validate_config
    
    # Setup environment
    setup_environment
    
    # Run pipeline
    if run_pipeline; then
        generate_summary "success"
        log_success "Pipeline execution completed successfully!"
        exit 0
    else
        generate_summary "failure"
        log_error "Pipeline execution failed!"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
