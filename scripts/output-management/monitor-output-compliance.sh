#!/bin/bash

# monitor-output-compliance.sh
# Continuous monitoring system for output management compliance
# MVP-compliant violation detection and enforcement

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MONITOR_LOG="$ROOT_DIR/tasks/outputs/compliance-monitor.log"

# Function to print colored output
print_error() {
    echo -e "${RED}❌ MONITOR ERROR: $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: $1" >> "$MONITOR_LOG"
}

print_success() {
    echo -e "${GREEN}✅ MONITOR: $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') SUCCESS: $1" >> "$MONITOR_LOG"
}

print_warning() {
    echo -e "${YELLOW}⚠️  MONITOR WARNING: $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') WARNING: $1" >> "$MONITOR_LOG"
}

print_info() {
    echo -e "${BLUE}ℹ️  MONITOR INFO: $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') INFO: $1" >> "$MONITOR_LOG"
}

# Function to initialize monitoring
initialize_monitor() {
    print_info "Initializing output compliance monitor..."
    
    # Create log file if it doesn't exist
    mkdir -p "$(dirname "$MONITOR_LOG")"
    touch "$MONITOR_LOG"
    
    # Log start of monitoring
    echo "$(date '+%Y-%m-%d %H:%M:%S') MONITOR STARTED" >> "$MONITOR_LOG"
    
    print_success "Monitor initialized"
}

# Function to detect new violations
detect_new_violations() {
    print_info "Scanning for new violations..."
    
    local violations_found=false
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    # Check for new forbidden files in root directory
    FORBIDDEN_PATTERNS=(
        "*-analysis.md"
        "*-report.md"
        "*-output.*"
        "analysis-*.md"
        "report-*.md"
        "output-*.md"
        "*.tmp"
        "*.temp"
        "temp-*"
        "debug-*"
        "test-output*"
        "*.log"
    )
    
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        for file in "$ROOT_DIR"/$pattern; do
            if [ -f "$file" ]; then
                local basename_file=$(basename "$file")
                print_error "New violation detected: $basename_file"
                violations_found=true
                
                # Add to violations log
                echo "$(date '+%Y-%m-%d %H:%M:%S') VIOLATION: $basename_file" >> "$MONITOR_LOG"
            fi
        done
    done
    
    # Check for violations in packages directory
    for dir in "$ROOT_DIR"/packages/*/; do
        if [ -d "$dir" ]; then
            for file in "$dir"*-analysis.* "$dir"*-report.* "$dir"*-output.*; do
                if [ -f "$file" ]; then
                    print_error "Violation in packages: $(basename "$file")"
                    violations_found=true
                fi
            done
        fi
    done
    
    # Check for violations in apps directory
    for dir in "$ROOT_DIR"/apps/*/; do
        if [ -d "$dir" ]; then
            for file in "$dir"*-analysis.* "$dir"*-report.* "$dir"*-output.*; do
                if [ -f "$file" ]; then
                    # Check if it's in an approved subdirectory
                    if [[ "$file" != *"/tasks/"* && "$file" != *"/analysis/"* && "$file" != *"/reports/"* ]]; then
                        print_error "Violation in apps: $(basename "$file")"
                        violations_found=true
                    fi
                fi
            done
        fi
    done
    
    if [ "$violations_found" = true ]; then
        print_error "New violations detected!"
        return 1
    else
        print_success "No new violations found"
        return 0
    fi
}

# Function to auto-fix violations
auto_fix_violations() {
    print_info "Auto-fixing violations..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local quarantine_dir="$ROOT_DIR/tasks/outputs/quarantine-$timestamp"
    
    mkdir -p "$quarantine_dir"
    
    local files_moved=false
    
    # Move forbidden files from root directory
    FORBIDDEN_PATTERNS=(
        "*-analysis.md"
        "*-report.md"
        "*-output.*"
        "analysis-*.md"
        "report-*.md"
        "output-*.md"
        "*.tmp"
        "*.temp"
        "temp-*"
        "debug-*"
        "test-output*"
    )
    
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        for file in "$ROOT_DIR"/$pattern; do
            if [ -f "$file" ]; then
                local basename_file=$(basename "$file")
                mv "$file" "$quarantine_dir/"
                print_success "Moved $basename_file to quarantine"
                files_moved=true
            fi
        done
    done
    
    # Create violation report
    if [ "$files_moved" = true ]; then
        local report_file="$quarantine_dir/VIOLATION-REPORT-$timestamp.md"
        cat > "$report_file" << EOF
# Violation Report - $timestamp

## Auto-Fixed Violations

**Timestamp**: $(date)
**Quarantine Directory**: $quarantine_dir

## Files Moved

$(ls -la "$quarantine_dir" | grep -v "^d" | sed 's/^/- /')

## Recommended Actions

1. Review the moved files
2. Determine proper location for each file
3. Move files to appropriate locations:
   - Analysis files: tasks/analysis-results/
   - Report files: tasks/outputs/
   - Temporary files: tasks/temporary/

## Prevention

- Use proper output directories from the start
- Follow naming conventions: TASK-XXX-{name}-{type}.{ext}
- Run validation before file creation

---

**Auto-generated by monitor-output-compliance.sh**
EOF
        
        print_success "Violation report created: $report_file"
    else
        rmdir "$quarantine_dir"
        print_info "No files to move"
    fi
}

# Function to send notifications
send_notifications() {
    local violation_count=$1
    local message=$2
    
    if [ "$violation_count" -gt 0 ]; then
        print_warning "Notification: $message"
        
        # Create notification file
        local notification_file="$ROOT_DIR/tasks/outputs/notification-$(date +%Y%m%d-%H%M%S).md"
        cat > "$notification_file" << EOF
# 🚨 Output Management Violation Alert

**Time**: $(date)
**Violations Found**: $violation_count
**Message**: $message

## Immediate Actions Required

1. Run: \`scripts/output-management/validate-output-compliance.sh --cleanup\`
2. Review quarantined files
3. Move files to proper locations
4. Update development practices

## Prevention

- Always check output destination before file creation
- Use approved output directories only
- Follow naming conventions

---

**Auto-generated by monitoring system**
EOF
        
        print_info "Notification saved: $notification_file"
    fi
}

# Function to generate status report
generate_status_report() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local report_file="$ROOT_DIR/tasks/outputs/compliance-status-$timestamp.md"
    
    print_info "Generating status report..."
    
    cat > "$report_file" << EOF
# Output Management Compliance Status

**Generated**: $(date)
**Monitor Script**: monitor-output-compliance.sh

## Current Status

### Directory Status
- Root Directory: $([ -z "$(find "$ROOT_DIR" -maxdepth 1 -name "*-analysis.*" -o -name "*-report.*" -o -name "*-output.*" 2>/dev/null)" ] && echo "✅ Clean" || echo "❌ Violations")
- Packages Directory: $([ -z "$(find "$ROOT_DIR/packages" -name "*-analysis.*" -o -name "*-report.*" -o -name "*-output.*" 2>/dev/null)" ] && echo "✅ Clean" || echo "❌ Violations")
- Apps Directory: $([ -z "$(find "$ROOT_DIR/apps" -name "*-analysis.*" -o -name "*-report.*" -o -name "*-output.*" 2>/dev/null | grep -v '/tasks/' | grep -v '/analysis/' | grep -v '/reports/')" ] && echo "✅ Clean" || echo "❌ Violations")

### Approved Directories
- tasks/outputs/: $([ -d "$ROOT_DIR/tasks/outputs" ] && echo "✅ Exists" || echo "❌ Missing")
- tasks/analysis-results/: $([ -d "$ROOT_DIR/tasks/analysis-results" ] && echo "✅ Exists" || echo "❌ Missing")
- tasks/temporary/: $([ -d "$ROOT_DIR/tasks/temporary" ] && echo "✅ Exists" || echo "❌ Missing")

### File Counts
- Output Files: $(find "$ROOT_DIR/tasks" -name "*-output.*" 2>/dev/null | wc -l)
- Analysis Files: $(find "$ROOT_DIR/tasks" -name "*-analysis.*" 2>/dev/null | wc -l)
- Report Files: $(find "$ROOT_DIR/tasks" -name "*-report.*" 2>/dev/null | wc -l)
- Temporary Files: $(find "$ROOT_DIR/tasks" -name "*.tmp" -o -name "*.temp" 2>/dev/null | wc -l)

## Recent Activity

### Last 24 Hours
$(tail -n 50 "$MONITOR_LOG" | grep "$(date -d '24 hours ago' '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d')" | tail -n 10)

### Violations Summary
$(grep "VIOLATION:" "$MONITOR_LOG" | tail -n 10)

## Recommendations

1. **If violations found**: Run \`scripts/output-management/validate-output-compliance.sh --cleanup\`
2. **For prevention**: Follow output management rules strictly
3. **Regular monitoring**: Schedule this monitor to run periodically

---

**Status Report Generated Automatically**
EOF
    
    print_success "Status report generated: $report_file"
}

# Function for continuous monitoring mode
continuous_monitoring() {
    local interval=${1:-300} # Default 5 minutes
    
    print_info "Starting continuous monitoring (interval: ${interval}s)"
    
    while true; do
        local violations=0
        
        # Check for violations
        if ! detect_new_violations; then
            violations=$((violations + 1))
        fi
        
        # Auto-fix if violations found
        if [ $violations -gt 0 ]; then
            auto_fix_violations
            send_notifications $violations "Output management violations detected and auto-fixed"
        fi
        
        # Generate status report every hour
        if [ $(($(date +%M) % 60)) -eq 0 ]; then
            generate_status_report
        fi
        
        # Wait for next check
        sleep "$interval"
    done
}

# Function to run one-time scan
one_time_scan() {
    print_info "Running one-time compliance scan..."
    
    local violations=0
    
    # Detect violations
    if ! detect_new_violations; then
        violations=$((violations + 1))
    fi
    
    # Auto-fix if requested
    if [ "$1" = "--fix" ]; then
        auto_fix_violations
        send_notifications $violations "Violations auto-fixed during one-time scan"
    fi
    
    # Generate status report
    generate_status_report
    
    # Return appropriate exit code
    if [ $violations -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --continuous [INTERVAL]  Run continuous monitoring (default: 300s)"
    echo "  --scan                   Run one-time scan"
    echo "  --scan --fix             Run one-time scan with auto-fix"
    echo "  --status                 Generate status report only"
    echo "  --help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --continuous 60       # Monitor every minute"
    echo "  $0 --scan               # One-time scan"
    echo "  $0 --scan --fix         # Scan and auto-fix"
    echo "  $0 --status             # Generate status report"
}

# Main execution
main() {
    # Initialize monitor
    initialize_monitor
    
    case "$1" in
        --continuous)
            continuous_monitoring "$2"
            ;;
        --scan)
            one_time_scan "$2"
            ;;
        --status)
            generate_status_report
            ;;
        --help)
            show_usage
            ;;
        *)
            echo "🔍 Output Management Compliance Monitor"
            echo "======================================"
            echo ""
            show_usage
            echo ""
            print_info "For immediate scan, use: $0 --scan"
            print_info "For continuous monitoring, use: $0 --continuous"
            ;;
    esac
}

# Run main function with all arguments
main "$@"