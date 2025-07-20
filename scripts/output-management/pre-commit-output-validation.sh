#!/bin/bash

# pre-commit-output-validation.sh
# Pre-commit hook to prevent root directory pollution
# MVP-compliant output management enforcement

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Function to print colored output
print_error() {
    echo -e "${RED}❌ PRE-COMMIT BLOCKED: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ PRE-COMMIT: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  PRE-COMMIT WARNING: $1${NC}"
}

print_info() {
    echo -e "ℹ️  PRE-COMMIT INFO: $1"
}

# Function to check staged files for forbidden patterns
check_staged_files() {
    print_info "Checking staged files for output management violations..."
    
    # Get list of staged files
    STAGED_FILES=$(git diff --cached --name-only --diff-filter=A 2>/dev/null || echo "")
    
    if [ -z "$STAGED_FILES" ]; then
        print_info "No staged files to check"
        return 0
    fi
    
    VIOLATIONS_FOUND=false
    
    # Check each staged file
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            # Check if file is in forbidden location
            case "$file" in
                # Root directory violations
                *-analysis.md|*-report.md|*-output.*|analysis-*.md|report-*.md|output-*.md)
                    if [[ "$file" != tasks/* ]]; then
                        print_error "Forbidden output file in root area: $file"
                        VIOLATIONS_FOUND=true
                    fi
                    ;;
                # Temporary files in root
                *.tmp|*.temp|temp-*|debug-*|test-output*)
                    if [[ "$file" != tasks/* ]]; then
                        print_error "Temporary file in root area: $file"
                        VIOLATIONS_FOUND=true
                    fi
                    ;;
                # Package pollution
                packages/*/*-analysis.*|packages/*/*-report.*|packages/*/*-output.*)
                    print_error "Output file in packages directory: $file"
                    VIOLATIONS_FOUND=true
                    ;;
                # Apps pollution  
                apps/*/*-analysis.*|apps/*/*-report.*|apps/*/*-output.*)
                    if [[ "$file" != apps/*/tasks/* && "$file" != apps/*/analysis/* && "$file" != apps/*/reports/* ]]; then
                        print_error "Output file in apps directory: $file"
                        VIOLATIONS_FOUND=true
                    fi
                    ;;
            esac
        fi
    done <<< "$STAGED_FILES"
    
    if [ "$VIOLATIONS_FOUND" = true ]; then
        print_error "Output management violations detected in staged files!"
        return 1
    else
        print_success "No output management violations in staged files"
        return 0
    fi
}

# Function to check for existing violations in repository
check_existing_violations() {
    print_info "Checking for existing output management violations..."
    
    # Run the main validation script
    if "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh"; then
        print_success "No existing violations found"
        return 0
    else
        print_error "Existing violations found - commit blocked"
        print_info "Run: scripts/output-management/validate-output-compliance.sh --cleanup"
        return 1
    fi
}

# Function to suggest proper output locations
suggest_proper_locations() {
    print_info "Suggested proper output locations:"
    echo ""
    echo "📂 For task-related outputs:"
    echo "   tasks/\$(date +%Y%m%d-%H%M%S)/outputs/"
    echo "   tasks/\$(date +%Y%m%d-%H%M%S)/analysis/"
    echo "   tasks/\$(date +%Y%m%d-%H%M%S)/reports/"
    echo ""
    echo "📂 For general outputs:"
    echo "   tasks/outputs/"
    echo "   tasks/analysis-results/"
    echo "   tasks/temporary/"
    echo ""
    echo "📂 For app-specific outputs:"
    echo "   apps/{app-name}/tasks/"
    echo "   apps/{app-name}/analysis/"
    echo "   apps/{app-name}/reports/"
    echo ""
}

# Function to create approved output directories if they don't exist
ensure_approved_directories() {
    print_info "Ensuring approved output directories exist..."
    
    APPROVED_DIRS=(
        "$ROOT_DIR/tasks/outputs"
        "$ROOT_DIR/tasks/analysis-results"
        "$ROOT_DIR/tasks/temporary"
    )
    
    for dir in "${APPROVED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created approved output directory: $dir"
        fi
    done
}

# Function to provide help for fixing violations
provide_help() {
    echo ""
    echo "🔧 How to fix output management violations:"
    echo ""
    echo "1. Move files to approved locations:"
    echo "   mv your-analysis.md tasks/outputs/"
    echo "   mv your-report.json tasks/analysis-results/"
    echo ""
    echo "2. Use proper naming conventions:"
    echo "   TASK-001-feature-name-analysis.md"
    echo "   TASK-001-feature-name-output.json"
    echo ""
    echo "3. Auto-cleanup existing violations:"
    echo "   scripts/output-management/validate-output-compliance.sh --cleanup"
    echo ""
    echo "4. Check compliance:"
    echo "   scripts/output-management/validate-output-compliance.sh"
    echo ""
}

# Main execution
main() {
    echo "🔍 Pre-commit Output Management Validation"
    echo "=========================================="
    
    # Ensure approved directories exist
    ensure_approved_directories
    
    # Check staged files
    local staged_violations=0
    check_staged_files || staged_violations=1
    
    # Check existing violations
    local existing_violations=0
    check_existing_violations || existing_violations=1
    
    # If any violations found, block commit
    if [ $staged_violations -eq 1 ] || [ $existing_violations -eq 1 ]; then
        echo ""
        print_error "COMMIT BLOCKED: Output management violations detected!"
        suggest_proper_locations
        provide_help
        exit 1
    else
        print_success "All output management checks passed - commit allowed"
        exit 0
    fi
}

# Run main function
main "$@"