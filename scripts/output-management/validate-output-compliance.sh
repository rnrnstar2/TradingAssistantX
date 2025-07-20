#!/bin/bash

# validate-output-compliance.sh
# MVP-compliant output management validation script
# Prevents root directory pollution and enforces output directory structure

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
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_info() {
    echo -e "ℹ️  INFO: $1"
}

# Function to check for forbidden files in root directory
check_root_directory_pollution() {
    print_info "Checking root directory for pollution..."
    
    # Forbidden patterns in root directory
    FORBIDDEN_PATTERNS=(
        "*-analysis.md"
        "*-report.md"
        "*-output.*"
        "analysis-*.md"
        "report-*.md"
        "output-*.md"
        "temp-*"
        "*.tmp"
        "*.temp"
        "debug-*"
        "test-output*"
        "result-*"
        "*.log"
    )
    
    VIOLATIONS_FOUND=false
    
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if ls "$ROOT_DIR"/$pattern 2>/dev/null; then
            print_error "Found forbidden files matching pattern: $pattern"
            VIOLATIONS_FOUND=true
        fi
    done
    
    # Check for specific analysis and report files
    if [ -f "$ROOT_DIR/analysis-result.md" ]; then
        print_error "Found analysis-result.md in root directory"
        VIOLATIONS_FOUND=true
    fi
    
    if [ -f "$ROOT_DIR/report.json" ]; then
        print_error "Found report.json in root directory"
        VIOLATIONS_FOUND=true
    fi
    
    if [ "$VIOLATIONS_FOUND" = true ]; then
        print_error "Root directory pollution detected!"
        return 1
    else
        print_success "Root directory is clean"
        return 0
    fi
}

# Function to check for forbidden files in packages directory
check_packages_directory_pollution() {
    print_info "Checking packages directory for pollution..."
    
    VIOLATIONS_FOUND=false
    
    # Check for output files in packages directory
    for dir in "$ROOT_DIR"/packages/*/; do
        if [ -d "$dir" ]; then
            if ls "$dir"*-analysis.* "$dir"*-report.* "$dir"*-output.* 2>/dev/null; then
                print_error "Found forbidden output files in: $dir"
                VIOLATIONS_FOUND=true
            fi
        fi
    done
    
    if [ "$VIOLATIONS_FOUND" = true ]; then
        print_error "Packages directory pollution detected!"
        return 1
    else
        print_success "Packages directory is clean"
        return 0
    fi
}

# Function to check for forbidden files in apps directory
check_apps_directory_pollution() {
    print_info "Checking apps directory for pollution..."
    
    VIOLATIONS_FOUND=false
    
    # Check for output files in apps root directory
    for dir in "$ROOT_DIR"/apps/*/; do
        if [ -d "$dir" ]; then
            if ls "$dir"*-analysis.* "$dir"*-report.* "$dir"*-output.* 2>/dev/null; then
                print_error "Found forbidden output files in: $dir"
                VIOLATIONS_FOUND=true
            fi
        fi
    done
    
    if [ "$VIOLATIONS_FOUND" = true ]; then
        print_error "Apps directory pollution detected!"
        return 1
    else
        print_success "Apps directory is clean"
        return 0
    fi
}

# Function to validate approved output directories exist
validate_approved_output_directories() {
    print_info "Validating approved output directories..."
    
    APPROVED_DIRS=(
        "$ROOT_DIR/tasks/outputs"
        "$ROOT_DIR/tasks/analysis-results"
        "$ROOT_DIR/tasks/temporary"
    )
    
    for dir in "${APPROVED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            print_warning "Approved output directory does not exist: $dir"
            mkdir -p "$dir"
            print_success "Created approved output directory: $dir"
        fi
    done
}

# Function to check for properly structured task outputs
validate_task_output_structure() {
    print_info "Validating task output directory structure..."
    
    # Check for task timestamp directories
    TASK_DIRS=$(find "$ROOT_DIR/tasks" -maxdepth 1 -type d -name "[0-9]*-[0-9]*" 2>/dev/null || true)
    
    if [ -z "$TASK_DIRS" ]; then
        print_info "No task timestamp directories found"
        return 0
    fi
    
    VIOLATIONS_FOUND=false
    
    for task_dir in $TASK_DIRS; do
        # Check if task directory has proper subdirectories
        if [ -d "$task_dir" ]; then
            # Create expected subdirectories if they don't exist
            expected_dirs=("outputs" "analysis" "reports" "temporary")
            
            for subdir in "${expected_dirs[@]}"; do
                if [ ! -d "$task_dir/$subdir" ]; then
                    mkdir -p "$task_dir/$subdir"
                    print_success "Created missing subdirectory: $task_dir/$subdir"
                fi
            done
        fi
    done
    
    if [ "$VIOLATIONS_FOUND" = true ]; then
        return 1
    else
        print_success "Task output structure is valid"
        return 0
    fi
}

# Function to generate compliance report
generate_compliance_report() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local report_file="$ROOT_DIR/tasks/outputs/output-compliance-report-$timestamp.md"
    
    print_info "Generating compliance report: $report_file"
    
    cat > "$report_file" << EOF
# Output Management Compliance Report

**Generated**: $(date)
**Script**: validate-output-compliance.sh

## 📋 Compliance Status

### Root Directory Status
$(check_root_directory_pollution && echo "✅ CLEAN" || echo "❌ VIOLATIONS FOUND")

### Packages Directory Status
$(check_packages_directory_pollution && echo "✅ CLEAN" || echo "❌ VIOLATIONS FOUND")

### Apps Directory Status
$(check_apps_directory_pollution && echo "✅ CLEAN" || echo "❌ VIOLATIONS FOUND")

## 📂 Approved Output Directories

### Task Output Directories
\`\`\`
$(find "$ROOT_DIR/tasks" -maxdepth 2 -type d -name "outputs" -o -name "analysis" -o -name "reports" -o -name "temporary" 2>/dev/null | sort)
\`\`\`

### General Output Directories
\`\`\`
tasks/outputs/
tasks/analysis-results/
tasks/temporary/
\`\`\`

## 🔍 Recent Files Check

### Files in Root Directory
\`\`\`
$(ls -la "$ROOT_DIR" | grep -E '\.(md|json|txt|log|tmp|temp)$' | head -20)
\`\`\`

### Files in Tasks Directory
\`\`\`
$(find "$ROOT_DIR/tasks" -name "*.md" -o -name "*.json" -o -name "*.txt" -o -name "*.log" | head -20)
\`\`\`

## 📊 Summary

- **Total Task Sessions**: $(find "$ROOT_DIR/tasks" -maxdepth 1 -type d -name "[0-9]*-[0-9]*" | wc -l)
- **Output Files**: $(find "$ROOT_DIR/tasks" -name "*-output.*" | wc -l)
- **Analysis Files**: $(find "$ROOT_DIR/tasks" -name "*-analysis.*" | wc -l)
- **Report Files**: $(find "$ROOT_DIR/tasks" -name "*-report.*" | wc -l)

---

**Note**: This report is automatically generated to ensure compliance with output management rules.
EOF

    print_success "Compliance report generated: $report_file"
}

# Function to clean up violations
cleanup_violations() {
    print_info "Cleaning up violations..."
    
    # Move any forbidden files from root to appropriate locations
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    CLEANUP_DIR="$ROOT_DIR/tasks/outputs/cleanup-$TIMESTAMP"
    
    mkdir -p "$CLEANUP_DIR"
    
    # Find and move forbidden files
    MOVED_FILES=false
    
    # Check for analysis files
    for file in "$ROOT_DIR"/*-analysis.*; do
        if [ -f "$file" ]; then
            mv "$file" "$CLEANUP_DIR/"
            print_success "Moved $(basename "$file") to $CLEANUP_DIR"
            MOVED_FILES=true
        fi
    done
    
    # Check for report files
    for file in "$ROOT_DIR"/*-report.*; do
        if [ -f "$file" ]; then
            mv "$file" "$CLEANUP_DIR/"
            print_success "Moved $(basename "$file") to $CLEANUP_DIR"
            MOVED_FILES=true
        fi
    done
    
    # Check for output files
    for file in "$ROOT_DIR"/*-output.*; do
        if [ -f "$file" ]; then
            mv "$file" "$CLEANUP_DIR/"
            print_success "Moved $(basename "$file") to $CLEANUP_DIR"
            MOVED_FILES=true
        fi
    done
    
    if [ "$MOVED_FILES" = true ]; then
        print_success "Cleanup completed. Files moved to: $CLEANUP_DIR"
    else
        rmdir "$CLEANUP_DIR"
        print_info "No violations found - no cleanup needed"
    fi
}

# Main execution
main() {
    echo "🔍 Output Management Compliance Validator"
    echo "=========================================="
    
    # Validate approved directories exist
    validate_approved_output_directories
    
    # Check for violations
    local violations=0
    
    check_root_directory_pollution || violations=$((violations + 1))
    check_packages_directory_pollution || violations=$((violations + 1))
    check_apps_directory_pollution || violations=$((violations + 1))
    validate_task_output_structure || violations=$((violations + 1))
    
    # Generate compliance report
    generate_compliance_report
    
    # If --cleanup flag is provided, clean up violations
    if [ "$1" = "--cleanup" ]; then
        cleanup_violations
    fi
    
    # Final result
    if [ $violations -eq 0 ]; then
        print_success "All output management compliance checks passed!"
        exit 0
    else
        print_error "Found $violations compliance violations"
        print_info "Run with --cleanup flag to automatically fix violations"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"