#!/usr/bin/env node
/**
 * Real Error Learning Command Line Interface
 * Manual execution interface for the error learning process
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
// Import dependencies
// import { 
//   runAllDataSourceTests, 
//   SourceTestResult,
//   DataSourceError,
//   DATA_SOURCE_TESTS 
// } from '../../tests/real-execution';
import { ClaudeErrorFixer } from '../lib/claude-error-fixer';
// 仮の実装
const runAllDataSourceTests = async () => {
    return [];
};
const DATA_SOURCE_TESTS = {};
class RealErrorLearningCLI {
    outputDir;
    claudeFixer;
    constructor() {
        this.outputDir = path.join(process.cwd(), 'tasks/20250722_004919_real_error_learning_system/outputs');
        this.claudeFixer = new ClaudeErrorFixer();
    }
    async init() {
        await fs.mkdir(this.outputDir, { recursive: true });
    }
    parseArgs() {
        const args = process.argv.slice(2);
        if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
            return { command: 'help' };
        }
        const command = args[0];
        const options = {};
        // Parse options
        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            switch (arg) {
                case '--timeout':
                    options.timeout = parseInt(args[++i]) || 30000;
                    break;
                case '--parallel':
                    options.parallel = true;
                    break;
                case '--no-fixes':
                    options.skipFixes = true;
                    break;
                case '--verbose':
                    options.verbose = true;
                    break;
                default:
                    if (command === 'source' && !options.sourceName) {
                        options.sourceName = arg;
                    }
                    break;
            }
        }
        return {
            command,
            sourceName: options.sourceName,
            options
        };
    }
    async runAllSources(session, options = {}) {
        this.log('🚀 Starting full error learning cycle...', options.verbose);
        // Phase 1: Execute all tests
        this.log('📊 Phase 1: Executing all data source tests...', options.verbose);
        const testConfig = {
            timeout: options.timeout || 30000,
            maxRetries: 1,
            parallel: options.parallel || false
        };
        const testResults = await runAllDataSourceTests(testConfig);
        session.results.originalTests = Object.values(testResults);
        // Identify errors
        const errors = session.results.originalTests
            .filter(result => !result.success && result.error)
            .map(result => ({
            sourceName: result.sourceName,
            error: result.error
        }));
        session.results.errors = errors;
        this.log(`Found ${errors.length} errors in ${session.results.originalTests.length} sources`, true);
        // Phase 2: Apply fixes (unless skipped)
        if (!options.skipFixes && errors.length > 0) {
            this.log('🔧 Phase 2: Applying fixes...', options.verbose);
            for (const error of errors) {
                const errorContext = {
                    sourceName: error.sourceName,
                    errorMessage: error.error.details || `${error.error.category} error`,
                    errorCount: 1,
                    lastOccurred: new Date().toISOString(),
                    errorCode: error.error.category
                };
                try {
                    const fixResult = await this.claudeFixer.fixError(errorContext);
                    session.results.fixes.push(fixResult);
                    if (fixResult.success) {
                        this.log(`✅ Fixed ${error.sourceName}: ${fixResult.decision.strategy}`, options.verbose);
                    }
                    else {
                        this.log(`❌ Failed to fix ${error.sourceName}: ${fixResult.error}`, options.verbose);
                    }
                }
                catch (err) {
                    this.log(`⚠️  Error processing ${error.sourceName}: ${err}`, true);
                }
            }
            // Phase 3: Verify fixes
            this.log('✅ Phase 3: Verifying fixes...', options.verbose);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for changes
            const verificationResults = await runAllDataSourceTests(testConfig);
            session.results.verificationTests = Object.values(verificationResults);
            // Calculate improvement
            this.calculateImprovement(session);
        }
        this.log(`🎉 Completed full cycle in ${session.duration || 0}ms`, true);
    }
    async runSpecificSource(session, sourceName, options = {}) {
        this.log(`🎯 Testing specific source: ${sourceName}`, options.verbose);
        const testFunction = DATA_SOURCE_TESTS[sourceName];
        if (!testFunction) {
            throw new Error(`Unknown data source: ${sourceName}. Available: ${Object.keys(DATA_SOURCE_TESTS).join(', ')}`);
        }
        const testConfig = {
            timeout: options.timeout || 30000,
            maxRetries: 1
        };
        try {
            const result = await testFunction(testConfig);
            session.results.originalTests = [result];
            if (!result.success && result.error) {
                session.results.errors = [{
                        sourceName: result.sourceName,
                        error: result.error
                    }];
                if (!options.skipFixes) {
                    // Apply fix
                    const errorContext = {
                        sourceName: result.sourceName,
                        errorMessage: result.error.details || `${result.error.category} error`,
                        errorCount: 1,
                        lastOccurred: new Date().toISOString(),
                        errorCode: result.error.category
                    };
                    const fixResult = await this.claudeFixer.fixError(errorContext);
                    session.results.fixes = [fixResult];
                    // Verify
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const verifyResult = await testFunction(testConfig);
                    session.results.verificationTests = [verifyResult];
                    this.calculateImprovement(session);
                }
            }
            else {
                this.log(`✅ Source ${sourceName} is working correctly`, true);
            }
        }
        catch (error) {
            throw new Error(`Failed to test ${sourceName}: ${error}`);
        }
    }
    async fixOnlyMode(session, options = {}) {
        this.log('🔧 Fix-only mode: Applying pending fixes...', options.verbose);
        // Look for recent error logs
        const logFiles = await fs.readdir(this.outputDir);
        const recentLogs = logFiles
            .filter(file => file.startsWith('integration-report-') && file.endsWith('.json'))
            .sort()
            .reverse()
            .slice(0, 3); // Last 3 reports
        if (recentLogs.length === 0) {
            this.log('⚠️  No recent error reports found. Run --run-all first.', true);
            return;
        }
        // Process recent errors
        for (const logFile of recentLogs) {
            try {
                const logPath = path.join(this.outputDir, logFile);
                const logData = JSON.parse(await fs.readFile(logPath, 'utf-8'));
                if (logData.originalErrors && logData.originalErrors.length > 0) {
                    this.log(`Processing errors from ${logFile}...`, options.verbose);
                    for (const errorSummary of logData.originalErrors) {
                        const errorContext = {
                            sourceName: errorSummary.sourceName,
                            errorMessage: errorSummary.error.details || errorSummary.error.category,
                            errorCount: 1,
                            lastOccurred: new Date().toISOString()
                        };
                        const fixResult = await this.claudeFixer.fixError(errorContext);
                        session.results.fixes.push(fixResult);
                    }
                }
            }
            catch (err) {
                this.log(`⚠️  Error processing ${logFile}: ${err}`, options.verbose);
            }
        }
        this.log(`Applied ${session.results.fixes.length} fixes`, true);
    }
    async generateReport(session) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.outputDir, `learning-session-${timestamp}.json`);
        // Generate comprehensive report
        const report = {
            ...session,
            endTime: new Date().toISOString(),
            summary: {
                totalSources: session.results.originalTests.length,
                errorsFound: session.results.errors.length,
                fixesApplied: session.results.fixes.length,
                successfulFixes: session.results.fixes.filter(f => f.success).length,
                finalErrorCount: session.results.verificationTests.filter(r => !r.success).length,
                overallImprovement: session.results.improvement.errorsFixed > 0
            }
        };
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        session.outputFiles.push(reportPath);
        // Also save a fix history file
        const historyPath = path.join(this.outputDir, 'fix-history.json');
        let history = { sessions: [] };
        try {
            const existingHistory = await fs.readFile(historyPath, 'utf-8');
            history = JSON.parse(existingHistory);
        }
        catch {
            // File doesn't exist, start fresh
        }
        history.sessions.push({
            sessionId: session.sessionId,
            timestamp: session.startTime,
            command: session.command,
            errorsFixed: session.results.improvement.errorsFixed,
            status: session.status
        });
        // Keep only last 20 sessions
        history.sessions = history.sessions.slice(-20);
        await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
        session.outputFiles.push(historyPath);
        this.log(`📄 Report saved: ${reportPath}`, true);
    }
    calculateImprovement(session) {
        const originalErrors = session.results.originalTests.filter(r => !r.success).length;
        const finalErrors = session.results.verificationTests.filter(r => !r.success).length;
        const originalAvgTime = session.results.originalTests.reduce((sum, r) => sum + r.performanceMetrics.responseTime, 0) / session.results.originalTests.length;
        const finalAvgTime = session.results.verificationTests.reduce((sum, r) => sum + r.performanceMetrics.responseTime, 0) / session.results.verificationTests.length;
        session.results.improvement = {
            errorsFixed: originalErrors - finalErrors,
            errorsRemaining: finalErrors,
            performanceGain: ((originalAvgTime - finalAvgTime) / originalAvgTime) * 100
        };
    }
    log(message, show = false) {
        if (show) {
            console.log(message);
        }
    }
    showHelp() {
        console.log(`
🤖 Real Error Learning System - Command Line Interface

Usage:
  tsx src/scripts/real-error-learning.ts <command> [options]

Commands:
  run-all           Run complete error learning cycle on all data sources
  source <name>     Test specific data source (yahoo_finance, bloomberg, reddit, coingecko_api, hackernews_api)
  fix-only          Apply fixes from recent error reports
  report            Generate summary report from recent sessions
  help              Show this help message

Options:
  --timeout <ms>    Set timeout per test (default: 30000)
  --parallel        Run tests in parallel (default: sequential)
  --no-fixes        Skip fix application, only detect errors
  --verbose         Show detailed output

Examples:
  tsx src/scripts/real-error-learning.ts run-all --verbose
  tsx src/scripts/real-error-learning.ts source yahoo_finance --timeout 45000
  tsx src/scripts/real-error-learning.ts fix-only --verbose
  tsx src/scripts/real-error-learning.ts report

Output Directory:
  tasks/20250722_004919_real_error_learning_system/outputs/
`);
    }
    async execute() {
        await this.init();
        const args = this.parseArgs();
        if (args.command === 'help') {
            this.showHelp();
            return;
        }
        const session = {
            sessionId: `session-${Date.now()}`,
            startTime: new Date().toISOString(),
            command: args.command,
            results: {
                originalTests: [],
                errors: [],
                fixes: [],
                verificationTests: [],
                improvement: {
                    errorsFixed: 0,
                    errorsRemaining: 0,
                    performanceGain: 0
                }
            },
            status: 'running',
            outputFiles: []
        };
        const startTime = performance.now();
        try {
            switch (args.command) {
                case 'run-all':
                    await this.runAllSources(session, args.options);
                    break;
                case 'source':
                    if (!args.sourceName) {
                        throw new Error('Source name required. Use: source <name>');
                    }
                    await this.runSpecificSource(session, args.sourceName, args.options);
                    break;
                case 'fix-only':
                    await this.fixOnlyMode(session, args.options);
                    break;
                case 'report':
                    // Just generate a summary report
                    const logFiles = await fs.readdir(this.outputDir);
                    const recentReports = logFiles.filter(f => f.startsWith('learning-session-')).sort().reverse().slice(0, 5);
                    console.log('📊 Recent Learning Sessions:');
                    for (const file of recentReports) {
                        console.log(`  - ${file}`);
                    }
                    return;
                default:
                    throw new Error(`Unknown command: ${args.command}. Use --help for usage.`);
            }
            session.status = 'completed';
            session.endTime = new Date().toISOString();
            session.duration = performance.now() - startTime;
            await this.generateReport(session);
            // Final summary
            console.log('\n🎉 Learning Session Completed');
            console.log(`Duration: ${Math.round(session.duration / 1000)}s`);
            console.log(`Errors Fixed: ${session.results.improvement.errorsFixed}`);
            console.log(`Errors Remaining: ${session.results.improvement.errorsRemaining}`);
            console.log(`Output Files: ${session.outputFiles.length}`);
        }
        catch (error) {
            session.status = 'failed';
            session.endTime = new Date().toISOString();
            session.duration = performance.now() - startTime;
            await this.generateReport(session);
            console.error(`❌ Error: ${error}`);
            process.exit(1);
        }
    }
}
// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const cli = new RealErrorLearningCLI();
    cli.execute().catch(console.error);
}
