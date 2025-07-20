#!/bin/bash

# enforcement-config.sh
# Central configuration for output management enforcement
# MVP-compliant enforcement settings and violation handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Function to print colored output
print_error() {
    echo -e "${RED}❌ ENFORCEMENT: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ ENFORCEMENT: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ENFORCEMENT: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  ENFORCEMENT: $1${NC}"
}

# Enforcement Configuration
ENFORCEMENT_CONFIG() {
    cat << 'EOF'
# Output Management Enforcement Configuration

## Violation Severity Levels

### CRITICAL (Auto-block)
- Root directory pollution
- Package directory pollution
- Apps directory pollution (outside approved subdirs)

### HIGH (Auto-fix + notification)
- Incorrect naming convention
- Files in unapproved locations
- Missing timestamp in temporary files

### MEDIUM (Warning + guidance)
- Excessive temporary files
- Missing cleanup after task completion
- Unclear file purposes

### LOW (Informational)
- Optimization opportunities
- Best practice suggestions

## Auto-Fix Actions

### Level 1 - Immediate Fix
- Move files to quarantine directory
- Create violation report
- Send notification

### Level 2 - Guided Fix
- Show proper locations
- Suggest commands
- Require manual confirmation

### Level 3 - Warning Only
- Log violation
- Provide guidance
- Allow continuation

## Enforcement Points

### Pre-commit Hook
- Block commits with violations
- Provide fix suggestions
- Generate violation report

### Continuous Monitoring
- Scan every 5 minutes
- Auto-fix critical violations
- Generate status reports

### Manual Validation
- On-demand scanning
- Detailed compliance reports
- Cleanup utilities

## Exception Handling

### Approved Exceptions
- Build outputs in designated dirs
- Temporary files during active development
- Legacy files being migrated

### Exception Process
1. Document exception in enforcement log
2. Set time-limited approval
3. Plan remediation
4. Review regularly

EOF
}

# Function to check enforcement status
check_enforcement_status() {
    print_info "Checking enforcement system status..."
    
    local status_ok=true
    
    # Check if validation scripts exist
    if [ ! -f "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh" ]; then
        print_error "Validation script missing"
        status_ok=false
    fi
    
    # Check if pre-commit hook is installed
    if [ ! -f "$ROOT_DIR/.git/hooks/pre-commit" ]; then
        print_error "Pre-commit hook not installed"
        status_ok=false
    fi
    
    # Check if approved directories exist
    APPROVED_DIRS=(
        "$ROOT_DIR/tasks/outputs"
        "$ROOT_DIR/tasks/analysis-results"
        "$ROOT_DIR/tasks/temporary"
    )
    
    for dir in "${APPROVED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            print_error "Approved directory missing: $dir"
            status_ok=false
        fi
    done
    
    # Check if monitoring log exists
    if [ ! -f "$ROOT_DIR/tasks/outputs/compliance-monitor.log" ]; then
        print_warning "Monitoring log not found - monitoring not active"
    fi
    
    if [ "$status_ok" = true ]; then
        print_success "Enforcement system is properly configured"
        return 0
    else
        print_error "Enforcement system configuration issues found"
        return 1
    fi
}

# Function to apply enforcement actions
apply_enforcement_action() {
    local severity=$1
    local violation_type=$2
    local file_path=$3
    
    print_info "Applying enforcement action: $severity for $violation_type"
    
    case "$severity" in
        CRITICAL)
            print_error "CRITICAL violation: $violation_type"
            print_error "File: $file_path"
            
            # Auto-fix: Move to quarantine
            local timestamp=$(date +%Y%m%d-%H%M%S)
            local quarantine_dir="$ROOT_DIR/tasks/outputs/quarantine-$timestamp"
            mkdir -p "$quarantine_dir"
            
            if [ -f "$file_path" ]; then
                mv "$file_path" "$quarantine_dir/"
                print_success "Moved to quarantine: $quarantine_dir/$(basename "$file_path")"
            fi
            
            # Create violation report
            create_violation_report "$severity" "$violation_type" "$file_path" "$quarantine_dir"
            ;;
            
        HIGH)
            print_warning "HIGH violation: $violation_type"
            print_warning "File: $file_path"
            
            # Suggest fix
            suggest_fix "$violation_type" "$file_path"
            ;;
            
        MEDIUM)
            print_warning "MEDIUM violation: $violation_type"
            print_info "File: $file_path"
            
            # Provide guidance
            provide_guidance "$violation_type" "$file_path"
            ;;
            
        LOW)
            print_info "LOW violation: $violation_type"
            print_info "File: $file_path"
            
            # Log for reference
            log_violation "$severity" "$violation_type" "$file_path"
            ;;
    esac
}

# Function to create violation report
create_violation_report() {
    local severity=$1
    local violation_type=$2
    local file_path=$3
    local quarantine_dir=$4
    
    local report_file="$quarantine_dir/VIOLATION-REPORT-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Violation Report - $severity

**Timestamp**: $(date)
**Violation Type**: $violation_type
**Original File**: $file_path
**Quarantine Directory**: $quarantine_dir

## Violation Details

**Severity**: $severity
**Type**: $violation_type
**Reason**: $(get_violation_reason "$violation_type")

## Actions Taken

- [x] File moved to quarantine
- [x] Violation report created
- [x] Enforcement log updated

## Next Steps

1. Review the quarantined file
2. Determine proper location:
   - Analysis files: tasks/analysis-results/
   - Report files: tasks/outputs/
   - Temporary files: tasks/temporary/
3. Move file to appropriate location
4. Update development practices

## Prevention

- Follow output management rules strictly
- Use approved directories only
- Check output destination before file creation
- Run validation before committing

---

**Auto-generated by enforcement system**
EOF
    
    print_success "Violation report created: $report_file"
}

# Function to suggest fix
suggest_fix() {
    local violation_type=$1
    local file_path=$2
    
    print_info "Suggested fix for $violation_type:"
    
    case "$violation_type" in
        "root_directory_pollution")
            echo "  mv \"$file_path\" \"tasks/outputs/\""
            echo "  # Or move to appropriate subdirectory"
            ;;
        "incorrect_naming")
            echo "  # Use proper naming convention:"
            echo "  mv \"$file_path\" \"tasks/outputs/TASK-001-$(basename "$file_path")\""
            ;;
        "unapproved_location")
            echo "  # Move to approved location:"
            echo "  mv \"$file_path\" \"tasks/outputs/\""
            ;;
    esac
}

# Function to provide guidance
provide_guidance() {
    local violation_type=$1
    local file_path=$2
    
    print_info "Guidance for $violation_type:"
    
    case "$violation_type" in
        "excessive_temp_files")
            echo "  # Clean up temporary files:"
            echo "  rm -f tasks/temporary/*.tmp"
            echo "  rm -f tasks/*/temporary/*.tmp"
            ;;
        "missing_cleanup")
            echo "  # Implement cleanup in your workflow:"
            echo "  # Add cleanup step to task completion"
            ;;
        "unclear_purpose")
            echo "  # Use descriptive naming:"
            echo "  # TASK-001-feature-name-analysis.md"
            echo "  # 20250716-dependency-analysis.json"
            ;;
    esac
}

# Function to get violation reason
get_violation_reason() {
    local violation_type=$1
    
    case "$violation_type" in
        "root_directory_pollution")
            echo "File created in project root directory, which is forbidden"
            ;;
        "package_directory_pollution")
            echo "File created in packages directory, which is forbidden"
            ;;
        "apps_directory_pollution")
            echo "File created in apps directory outside approved subdirectories"
            ;;
        "incorrect_naming")
            echo "File does not follow required naming convention"
            ;;
        "unapproved_location")
            echo "File created in location not approved for outputs"
            ;;
        "excessive_temp_files")
            echo "Too many temporary files accumulating"
            ;;
        "missing_cleanup")
            echo "Temporary files not cleaned up after task completion"
            ;;
        "unclear_purpose")
            echo "File name does not clearly indicate its purpose"
            ;;
        *)
            echo "Unknown violation type"
            ;;
    esac
}

# Function to log violation
log_violation() {
    local severity=$1
    local violation_type=$2
    local file_path=$3
    
    local log_file="$ROOT_DIR/tasks/outputs/enforcement.log"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$severity] $violation_type: $file_path" >> "$log_file"
}

# Function to install enforcement system
install_enforcement() {
    print_info "Installing enforcement system..."
    
    # Make all scripts executable
    chmod +x "$ROOT_DIR/scripts/output-management"/*.sh
    
    # Install pre-commit hook
    "$ROOT_DIR/scripts/output-management/setup-output-validation.sh"
    
    # Create initial compliance report
    "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh"
    
    print_success "Enforcement system installed"
}

# Function to test enforcement
test_enforcement() {
    print_info "Testing enforcement system..."
    
    # Create a test violation
    local test_file="$ROOT_DIR/test-violation.md"
    echo "This is a test violation" > "$test_file"
    
    # Run validation
    if "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh"; then
        print_error "Validation should have failed for test violation"
    else
        print_success "Validation correctly detected test violation"
    fi
    
    # Clean up test file
    rm -f "$test_file"
    
    print_success "Enforcement system test completed"
}

# Function to show enforcement status
show_enforcement_status() {
    print_info "Output Management Enforcement Status"
    echo "===================================="
    echo ""
    
    # Check system status
    if check_enforcement_status; then
        echo "✅ System Status: Active"
    else
        echo "❌ System Status: Issues Found"
    fi
    
    # Show recent violations
    echo ""
    echo "Recent Violations:"
    if [ -f "$ROOT_DIR/tasks/outputs/enforcement.log" ]; then
        tail -n 10 "$ROOT_DIR/tasks/outputs/enforcement.log"
    else
        echo "No violations logged"
    fi
    
    # Show available commands
    echo ""
    echo "Available Commands:"
    echo "  validate-output-compliance.sh       # Manual validation"
    echo "  validate-output-compliance.sh --cleanup # Auto-fix violations"
    echo "  monitor-output-compliance.sh --scan # One-time scan"
    echo "  monitor-output-compliance.sh --continuous # Continuous monitoring"
    echo "  enforcement-config.sh --test        # Test enforcement"
    echo "  enforcement-config.sh --install     # Install system"
}

# Main execution
main() {
    case "$1" in
        --install)
            install_enforcement
            ;;
        --test)
            test_enforcement
            ;;
        --status)
            show_enforcement_status
            ;;
        --check)
            check_enforcement_status
            ;;
        --config)
            ENFORCEMENT_CONFIG
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --install     Install enforcement system"
            echo "  --test        Test enforcement system"
            echo "  --status      Show enforcement status"
            echo "  --check       Check system configuration"
            echo "  --config      Show enforcement configuration"
            echo "  --help        Show this help message"
            ;;
        *)
            echo "🛡️  Output Management Enforcement System"
            echo "========================================"
            echo ""
            show_enforcement_status
            echo ""
            print_info "Use --help for available commands"
            ;;
    esac
}

# Run main function with all arguments
main "$@"