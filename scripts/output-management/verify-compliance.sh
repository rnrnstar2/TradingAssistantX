#!/bin/bash

# verify-compliance.sh
# Simple verification system for output management compliance
# MVP-compliant comprehensive compliance verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Verification results
VERIFICATION_RESULTS=()
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to print colored output
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${CYAN}🔍 $1${NC}"
}

# Function to record verification result
record_result() {
    local test_name=$1
    local status=$2
    local message=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        VERIFICATION_RESULTS+=("✅ $test_name: $message")
        print_success "$test_name: $message"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        VERIFICATION_RESULTS+=("❌ $test_name: $message")
        print_error "$test_name: $message"
    fi
}

# Function to verify system installation
verify_system_installation() {
    print_header "Verifying System Installation"
    
    # Check if validation script exists
    if [ -f "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh" ]; then
        record_result "Validation Script" "PASS" "validate-output-compliance.sh exists"
    else
        record_result "Validation Script" "FAIL" "validate-output-compliance.sh missing"
    fi
    
    # Check if pre-commit hook exists
    if [ -f "$ROOT_DIR/scripts/output-management/pre-commit-output-validation.sh" ]; then
        record_result "Pre-commit Hook Script" "PASS" "pre-commit-output-validation.sh exists"
    else
        record_result "Pre-commit Hook Script" "FAIL" "pre-commit-output-validation.sh missing"
    fi
    
    # Check if monitoring script exists
    if [ -f "$ROOT_DIR/scripts/output-management/monitor-output-compliance.sh" ]; then
        record_result "Monitoring Script" "PASS" "monitor-output-compliance.sh exists"
    else
        record_result "Monitoring Script" "FAIL" "monitor-output-compliance.sh missing"
    fi
    
    # Check if enforcement config exists
    if [ -f "$ROOT_DIR/scripts/output-management/enforcement-config.sh" ]; then
        record_result "Enforcement Config" "PASS" "enforcement-config.sh exists"
    else
        record_result "Enforcement Config" "FAIL" "enforcement-config.sh missing"
    fi
    
    # Check if setup script exists
    if [ -f "$ROOT_DIR/scripts/output-management/setup-output-validation.sh" ]; then
        record_result "Setup Script" "PASS" "setup-output-validation.sh exists"
    else
        record_result "Setup Script" "FAIL" "setup-output-validation.sh missing"
    fi
    
    # Check if scripts are executable
    local scripts=(
        "validate-output-compliance.sh"
        "pre-commit-output-validation.sh"
        "monitor-output-compliance.sh"
        "enforcement-config.sh"
        "setup-output-validation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -x "$ROOT_DIR/scripts/output-management/$script" ]; then
            record_result "Script Executable: $script" "PASS" "Script is executable"
        else
            record_result "Script Executable: $script" "FAIL" "Script is not executable"
        fi
    done
}

# Function to verify directory structure
verify_directory_structure() {
    print_header "Verifying Directory Structure"
    
    # Check if output management directory exists
    if [ -d "$ROOT_DIR/scripts/output-management" ]; then
        record_result "Output Management Directory" "PASS" "scripts/output-management/ exists"
    else
        record_result "Output Management Directory" "FAIL" "scripts/output-management/ missing"
    fi
    
    # Check approved output directories
    local approved_dirs=(
        "tasks/outputs"
        "tasks/analysis-results"
        "tasks/temporary"
    )
    
    for dir in "${approved_dirs[@]}"; do
        if [ -d "$ROOT_DIR/$dir" ]; then
            record_result "Approved Directory: $dir" "PASS" "Directory exists"
        else
            record_result "Approved Directory: $dir" "FAIL" "Directory missing"
        fi
    done
    
    # Check if task timestamp directories have proper structure
    local task_dirs=$(find "$ROOT_DIR/tasks" -maxdepth 1 -type d -name "[0-9]*-[0-9]*" 2>/dev/null | head -3)
    
    if [ -n "$task_dirs" ]; then
        for task_dir in $task_dirs; do
            local expected_subdirs=("outputs" "analysis" "reports" "temporary")
            
            for subdir in "${expected_subdirs[@]}"; do
                if [ -d "$task_dir/$subdir" ]; then
                    record_result "Task Structure: $(basename "$task_dir")/$subdir" "PASS" "Subdirectory exists"
                else
                    record_result "Task Structure: $(basename "$task_dir")/$subdir" "FAIL" "Subdirectory missing"
                fi
            done
        done
    else
        record_result "Task Directories" "PASS" "No task directories found (acceptable)"
    fi
}

# Function to verify git integration
verify_git_integration() {
    print_header "Verifying Git Integration"
    
    # Check if git hooks directory exists
    if [ -d "$ROOT_DIR/.git/hooks" ]; then
        record_result "Git Hooks Directory" "PASS" ".git/hooks/ exists"
    else
        record_result "Git Hooks Directory" "FAIL" ".git/hooks/ missing"
    fi
    
    # Check if pre-commit hook is installed
    if [ -f "$ROOT_DIR/.git/hooks/pre-commit" ]; then
        record_result "Pre-commit Hook Installed" "PASS" ".git/hooks/pre-commit exists"
        
        # Check if it references our validation script
        if grep -q "output-management" "$ROOT_DIR/.git/hooks/pre-commit"; then
            record_result "Pre-commit Hook Content" "PASS" "References output-management"
        else
            record_result "Pre-commit Hook Content" "FAIL" "Does not reference output-management"
        fi
    else
        record_result "Pre-commit Hook Installed" "FAIL" ".git/hooks/pre-commit missing"
    fi
    
    # Check gitignore for temporary files
    if [ -f "$ROOT_DIR/.gitignore" ]; then
        if grep -q "tasks/temporary/" "$ROOT_DIR/.gitignore"; then
            record_result "Gitignore Temp Files" "PASS" "Temporary files ignored"
        else
            record_result "Gitignore Temp Files" "FAIL" "Temporary files not ignored"
        fi
    else
        record_result "Gitignore File" "FAIL" ".gitignore missing"
    fi
}

# Function to verify template integration
verify_template_integration() {
    print_header "Verifying Template Integration"
    
    # Check if instruction template has output management rules
    if [ -f "$ROOT_DIR/tasks/templates/instruction-template.md" ]; then
        if grep -q "出力管理規則" "$ROOT_DIR/tasks/templates/instruction-template.md"; then
            record_result "Instruction Template" "PASS" "Contains output management rules"
        else
            record_result "Instruction Template" "FAIL" "Missing output management rules"
        fi
    else
        record_result "Instruction Template" "FAIL" "Template file missing"
    fi
    
    # Check if report template has compliance checks
    if [ -f "$ROOT_DIR/tasks/templates/report-template.md" ]; then
        if grep -q "出力管理規則遵守確認" "$ROOT_DIR/tasks/templates/report-template.md"; then
            record_result "Report Template" "PASS" "Contains compliance checks"
        else
            record_result "Report Template" "FAIL" "Missing compliance checks"
        fi
    else
        record_result "Report Template" "FAIL" "Template file missing"
    fi
}

# Function to verify documentation integration
verify_documentation_integration() {
    print_header "Verifying Documentation Integration"
    
    # Check if CLAUDE.md has output management rules
    if [ -f "$ROOT_DIR/CLAUDE.md" ]; then
        if grep -q "出力管理規則" "$ROOT_DIR/CLAUDE.md"; then
            record_result "CLAUDE.md Integration" "PASS" "Contains output management rules"
        else
            record_result "CLAUDE.md Integration" "FAIL" "Missing output management rules"
        fi
    else
        record_result "CLAUDE.md" "FAIL" "CLAUDE.md missing"
    fi
    
    # Check if output management guide exists
    if [ -f "$ROOT_DIR/docs/guides/output-management-rules.md" ]; then
        record_result "Output Management Guide" "PASS" "Guide document exists"
    else
        record_result "Output Management Guide" "FAIL" "Guide document missing"
    fi
    
    # Check if manager role has output management requirements
    if [ -f "$ROOT_DIR/docs/roles/manager-role.md" ]; then
        if grep -q "出力管理規則" "$ROOT_DIR/docs/roles/manager-role.md"; then
            record_result "Manager Role Integration" "PASS" "Contains output management requirements"
        else
            record_result "Manager Role Integration" "FAIL" "Missing output management requirements"
        fi
    else
        record_result "Manager Role Doc" "FAIL" "Manager role doc missing"
    fi
    
    # Check if worker role has output management requirements
    if [ -f "$ROOT_DIR/docs/roles/worker-role.md" ]; then
        if grep -q "出力管理規則" "$ROOT_DIR/docs/roles/worker-role.md"; then
            record_result "Worker Role Integration" "PASS" "Contains output management requirements"
        else
            record_result "Worker Role Integration" "FAIL" "Missing output management requirements"
        fi
    else
        record_result "Worker Role Doc" "FAIL" "Worker role doc missing"
    fi
}

# Function to verify current compliance
verify_current_compliance() {
    print_header "Verifying Current Compliance"
    
    # Check for violations in root directory
    local root_violations=$(find "$ROOT_DIR" -maxdepth 1 -name "*-analysis.*" -o -name "*-report.*" -o -name "*-output.*" -o -name "*.tmp" -o -name "*.temp" 2>/dev/null | wc -l)
    
    if [ "$root_violations" -eq 0 ]; then
        record_result "Root Directory" "PASS" "No violations found"
    else
        record_result "Root Directory" "FAIL" "$root_violations violations found"
    fi
    
    # Check for violations in packages directory
    local package_violations=$(find "$ROOT_DIR/packages" -name "*-analysis.*" -o -name "*-report.*" -o -name "*-output.*" 2>/dev/null | wc -l)
    
    if [ "$package_violations" -eq 0 ]; then
        record_result "Packages Directory" "PASS" "No violations found"
    else
        record_result "Packages Directory" "FAIL" "$package_violations violations found"
    fi
    
    # Check for violations in apps directory (excluding approved subdirs)
    local app_violations=$(find "$ROOT_DIR/apps" -name "*-analysis.*" -o -name "*-report.*" -o -name "*-output.*" 2>/dev/null | grep -v '/tasks/' | grep -v '/analysis/' | grep -v '/reports/' | wc -l)
    
    if [ "$app_violations" -eq 0 ]; then
        record_result "Apps Directory" "PASS" "No violations found"
    else
        record_result "Apps Directory" "FAIL" "$app_violations violations found"
    fi
}

# Function to test system functionality
test_system_functionality() {
    print_header "Testing System Functionality"
    
    # Test validation script
    if [ -x "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh" ]; then
        if "$ROOT_DIR/scripts/output-management/validate-output-compliance.sh" > /dev/null 2>&1; then
            record_result "Validation Script Function" "PASS" "Script runs successfully"
        else
            record_result "Validation Script Function" "FAIL" "Script execution failed"
        fi
    else
        record_result "Validation Script Function" "FAIL" "Script not executable"
    fi
    
    # Test monitoring script
    if [ -x "$ROOT_DIR/scripts/output-management/monitor-output-compliance.sh" ]; then
        if "$ROOT_DIR/scripts/output-management/monitor-output-compliance.sh" --help > /dev/null 2>&1; then
            record_result "Monitoring Script Function" "PASS" "Script runs successfully"
        else
            record_result "Monitoring Script Function" "FAIL" "Script execution failed"
        fi
    else
        record_result "Monitoring Script Function" "FAIL" "Script not executable"
    fi
    
    # Test enforcement config
    if [ -x "$ROOT_DIR/scripts/output-management/enforcement-config.sh" ]; then
        if "$ROOT_DIR/scripts/output-management/enforcement-config.sh" --help > /dev/null 2>&1; then
            record_result "Enforcement Config Function" "PASS" "Script runs successfully"
        else
            record_result "Enforcement Config Function" "FAIL" "Script execution failed"
        fi
    else
        record_result "Enforcement Config Function" "FAIL" "Script not executable"
    fi
}

# Function to generate verification report
generate_verification_report() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local report_file="$ROOT_DIR/tasks/outputs/verification-report-$timestamp.md"
    
    print_info "Generating verification report..."
    
    # Ensure output directory exists
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Output Management Compliance Verification Report

**Generated**: $(date)
**Script**: verify-compliance.sh
**Total Checks**: $TOTAL_CHECKS
**Passed**: $PASSED_CHECKS
**Failed**: $FAILED_CHECKS

## Summary

$(if [ $FAILED_CHECKS -eq 0 ]; then
    echo "✅ **FULLY COMPLIANT** - All verification checks passed"
else
    echo "❌ **COMPLIANCE ISSUES** - $FAILED_CHECKS checks failed"
fi)

## Detailed Results

EOF
    
    # Add detailed results
    for result in "${VERIFICATION_RESULTS[@]}"; do
        echo "$result" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

## Recommendations

$(if [ $FAILED_CHECKS -gt 0 ]; then
    echo "### Immediate Actions Required"
    echo "1. Fix failed checks listed above"
    echo "2. Run setup script: \`scripts/output-management/setup-output-validation.sh\`"
    echo "3. Verify integration with: \`scripts/output-management/verify-compliance.sh\`"
    echo "4. Clean up any existing violations: \`scripts/output-management/validate-output-compliance.sh --cleanup\`"
    echo ""
fi)

### Maintenance
- Run regular compliance checks
- Monitor for new violations
- Update templates as needed
- Keep documentation synchronized

### Usage
- Use \`scripts/output-management/validate-output-compliance.sh\` for daily validation
- Use \`scripts/output-management/monitor-output-compliance.sh --continuous\` for automated monitoring
- Use \`scripts/output-management/verify-compliance.sh\` for comprehensive verification

## Next Steps

1. **If compliant**: System is ready for use
2. **If non-compliant**: Address failed checks and re-run verification
3. **For ongoing use**: Schedule regular compliance monitoring

---

**Auto-generated by compliance verification system**
EOF
    
    print_success "Verification report generated: $report_file"
}

# Function to show compliance score
show_compliance_score() {
    local score=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    
    echo ""
    print_header "Compliance Score"
    echo "================="
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}🎉 PERFECT COMPLIANCE: 100% ($PASSED_CHECKS/$TOTAL_CHECKS)${NC}"
    elif [ $FAILED_CHECKS -le 3 ]; then
        echo -e "${YELLOW}⚠️  GOOD COMPLIANCE: $score% ($PASSED_CHECKS/$TOTAL_CHECKS)${NC}"
    else
        echo -e "${RED}❌ POOR COMPLIANCE: $score% ($PASSED_CHECKS/$TOTAL_CHECKS)${NC}"
    fi
    
    echo ""
    echo "Summary:"
    echo "- Total checks: $TOTAL_CHECKS"
    echo "- Passed: $PASSED_CHECKS"
    echo "- Failed: $FAILED_CHECKS"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick       Run quick compliance check"
    echo "  --full        Run full verification (default)"
    echo "  --report      Generate detailed report"
    echo "  --score       Show compliance score only"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0            # Full verification"
    echo "  $0 --quick    # Quick check"
    echo "  $0 --report   # Generate report"
    echo "  $0 --score    # Show score only"
}

# Function to run quick check
run_quick_check() {
    print_header "Quick Compliance Check"
    
    verify_current_compliance
    test_system_functionality
    
    show_compliance_score
}

# Function to run full verification
run_full_verification() {
    print_header "Full Compliance Verification"
    
    verify_system_installation
    verify_directory_structure
    verify_git_integration
    verify_template_integration
    verify_documentation_integration
    verify_current_compliance
    test_system_functionality
    
    show_compliance_score
}

# Main execution
main() {
    case "$1" in
        --quick)
            run_quick_check
            ;;
        --full)
            run_full_verification
            ;;
        --report)
            run_full_verification
            generate_verification_report
            ;;
        --score)
            run_full_verification > /dev/null 2>&1
            show_compliance_score
            ;;
        --help)
            show_usage
            ;;
        *)
            echo "🔍 Output Management Compliance Verification"
            echo "============================================"
            echo ""
            run_full_verification
            
            # Generate report by default
            generate_verification_report
            
            echo ""
            print_info "For detailed report, check: tasks/outputs/verification-report-*.md"
            print_info "For help, use: $0 --help"
            ;;
    esac
    
    # Exit with appropriate code
    if [ $FAILED_CHECKS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function with all arguments
main "$@"