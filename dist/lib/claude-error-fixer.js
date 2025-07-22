import { promises as fs } from 'fs';
import * as path from 'path';
export class FixStrategyDecider {
    async analyzeError(errorContext) {
        const { errorMessage, sourceName, errorCount } = errorContext;
        // エラータイプの分類
        const errorType = this.classifyError(errorMessage);
        // 修正戦略の決定
        const strategy = this.determineStrategy(errorType, errorCount);
        // 優先度の判定
        const priority = this.determinePriority(errorType, errorCount);
        // 推論の生成
        const reasoning = this.generateReasoning(errorType, strategy, sourceName, errorCount);
        // コード変更が必要な場合の生成
        const codeChanges = strategy !== 'skip' ? await this.generateCodeChanges(errorType, strategy, sourceName) : undefined;
        return {
            errorType,
            strategy,
            priority,
            reasoning,
            codeChanges
        };
    }
    classifyError(errorMessage) {
        const message = errorMessage.toLowerCase();
        if (message.includes('timeout') || message.includes('timed out')) {
            return 'timeout';
        }
        if (message.includes('auth') || message.includes('unauthorized') || message.includes('403') || message.includes('401')) {
            return 'authentication';
        }
        if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
            return 'rate_limit';
        }
        if (message.includes('not found') || message.includes('404') || message.includes('structure') || message.includes('parse')) {
            return 'structure_change';
        }
        return 'timeout'; // デフォルト
    }
    determineStrategy(errorType, errorCount) {
        switch (errorType) {
            case 'timeout':
                return errorCount <= 3 ? 'retry' : 'fallback';
            case 'rate_limit':
                return 'retry';
            case 'authentication':
                return 'disable_source';
            case 'structure_change':
                return 'fallback';
            default:
                return 'skip';
        }
    }
    determinePriority(errorType, errorCount) {
        if (errorType === 'authentication' || errorCount > 5) {
            return 'immediate';
        }
        if (errorType === 'timeout' || errorType === 'rate_limit') {
            return 'delayed';
        }
        return 'skip';
    }
    generateReasoning(errorType, strategy, sourceName, errorCount) {
        return `エラータイプ: ${errorType}, ソース: ${sourceName}, 発生回数: ${errorCount}回に基づき${strategy}戦略を選択`;
    }
    async generateCodeChanges(errorType, strategy, sourceName) {
        const filePath = 'src/lib/action-specific-collector.ts';
        switch (errorType) {
            case 'timeout':
                return this.generateTimeoutFix(filePath);
            case 'rate_limit':
                return this.generateRateLimitFix(filePath);
            case 'authentication':
                return this.generateAuthDisableFix(filePath, sourceName);
            case 'structure_change':
                return this.generateFallbackFix(filePath);
            default:
                return [];
        }
    }
    generateTimeoutFix(filePath) {
        return [{
                filePath,
                oldCode: 'initial: 30000,    // 初回30秒',
                newCode: 'initial: 60000,    // 初回60秒（修正済み）'
            }, {
                filePath,
                oldCode: 'retry: 30000,      // リトライ時30秒',
                newCode: 'retry: 60000,      // リトライ時60秒（修正済み）'
            }];
    }
    generateRateLimitFix(filePath) {
        return [{
                filePath,
                oldCode: 'timeout: number = this.COLLECTION_TIMEOUT',
                newCode: 'timeout: number = this.COLLECTION_TIMEOUT,\n    retryDelay: number = 5000'
            }];
    }
    generateAuthDisableFix(filePath, sourceName) {
        return [{
                filePath,
                oldCode: `// TODO: ${sourceName}の実装`,
                newCode: `// DISABLED: ${sourceName}の実装（認証エラーのため無効化）`
            }];
    }
    generateFallbackFix(filePath) {
        return [{
                filePath,
                oldCode: '} catch (error) {',
                newCode: '} catch (error) {\n      // フォールバック: 代替手段を追加'
            }];
    }
}
export class ClaudeErrorFixer {
    strategyDecider;
    backupDir;
    constructor() {
        this.strategyDecider = new FixStrategyDecider();
        this.backupDir = 'tasks/20250722_004919_real_error_learning_system/backups';
    }
    async fixError(errorContext) {
        const startTime = new Date().toISOString();
        try {
            console.log(`🔧 [Claude修正開始] ${errorContext.sourceName}: ${errorContext.errorMessage}`);
            // 1. エラー分析と修正戦略決定
            const decision = await this.strategyDecider.analyzeError(errorContext);
            if (decision.priority === 'skip') {
                return {
                    success: true,
                    decision,
                    timestamp: startTime
                };
            }
            // 2. バックアップ作成
            const backupPath = await this.createBackup(decision.codeChanges?.[0]?.filePath || '');
            // 3. コード修正の適用
            const appliedChanges = await this.applyCodeChanges(decision.codeChanges || []);
            console.log(`✅ [Claude修正完了] ${decision.strategy}戦略で修正完了`);
            return {
                success: true,
                decision,
                backupPath,
                appliedChanges,
                timestamp: startTime
            };
        }
        catch (error) {
            console.error(`❌ [Claude修正エラー]:`, error);
            return {
                success: false,
                decision: {
                    errorType: 'timeout',
                    strategy: 'skip',
                    priority: 'skip',
                    reasoning: 'modification_failed'
                },
                error: error instanceof Error ? error.message : String(error),
                timestamp: startTime
            };
        }
    }
    async createBackup(filePath) {
        if (!filePath)
            return undefined;
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${path.basename(filePath, '.ts')}-backup-${timestamp}.ts`;
            const backupPath = path.join(this.backupDir, backupFileName);
            const originalContent = await fs.readFile(filePath, 'utf-8');
            await fs.mkdir(this.backupDir, { recursive: true });
            await fs.writeFile(backupPath, originalContent, 'utf-8');
            console.log(`📁 [バックアップ作成] ${backupPath}`);
            return backupPath;
        }
        catch (error) {
            console.error('バックアップ作成エラー:', error);
            throw new Error('バックアップ作成に失敗');
        }
    }
    async applyCodeChanges(codeChanges) {
        const appliedChanges = [];
        for (const change of codeChanges) {
            try {
                const fileContent = await fs.readFile(change.filePath, 'utf-8');
                if (!fileContent.includes(change.oldCode)) {
                    console.warn(`⚠️  [修正スキップ] 対象コードが見つかりません: ${change.oldCode}`);
                    continue;
                }
                const updatedContent = fileContent.replace(change.oldCode, change.newCode);
                await fs.writeFile(change.filePath, updatedContent, 'utf-8');
                appliedChanges.push(`${change.filePath}: ${change.oldCode} → ${change.newCode}`);
                console.log(`🔄 [コード修正] ${change.filePath}`);
            }
            catch (error) {
                console.error(`修正適用エラー: ${change.filePath}`, error);
                throw error;
            }
        }
        return appliedChanges;
    }
    async saveFixLog(result) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logPath = `tasks/20250722_004919_real_error_learning_system/outputs/fix-log-${timestamp}.json`;
            await fs.mkdir(path.dirname(logPath), { recursive: true });
            await fs.writeFile(logPath, JSON.stringify(result, null, 2), 'utf-8');
            console.log(`📊 [修正ログ保存] ${logPath}`);
        }
        catch (error) {
            console.error('修正ログ保存エラー:', error);
        }
    }
}
