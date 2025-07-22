import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
// ファイルサイズ制限（行数）
const FILE_SIZE_LIMITS = {
    'claude-summary.yaml': 50,
    'system-state.yaml': 30,
    'decision-context.yaml': 40,
    'current-decisions.yaml': 60,
    'current-analysis.yaml': 40,
    'account-analysis-data.yaml': 60,
    'daily-action-data.yaml': 100
};
export class FileSizeMonitorSystem {
    dataDir;
    archiveDir;
    constructor() {
        this.dataDir = join(process.cwd(), 'data');
        this.archiveDir = join(this.dataDir, 'archives');
    }
    async checkFileSizes() {
        console.log('🔍 [ファイルサイズ監視] 制限チェック開始...');
        for (const [fileName, limit] of Object.entries(FILE_SIZE_LIMITS)) {
            await this.checkSingleFile(fileName, limit);
        }
        console.log('✅ [ファイルサイズ監視] チェック完了');
    }
    async checkSingleFile(fileName, limit) {
        try {
            const filePath = this.getFullPath(fileName);
            if (!existsSync(filePath)) {
                return; // ファイルが存在しない場合はスキップ
            }
            const content = readFileSync(filePath, 'utf8');
            const lineCount = content.split('\n').length;
            if (lineCount > limit) {
                const reason = `ファイルサイズ制限超過: ${lineCount}行 > ${limit}行`;
                console.warn(`⚠️ [制限超過] ${fileName}: ${reason}`);
                await this.triggerAutoArchive(filePath, reason);
            }
            else {
                console.log(`✅ [制限内] ${fileName}: ${lineCount}/${limit}行`);
            }
        }
        catch (error) {
            console.error(`❌ [監視エラー] ${fileName}:`, error);
        }
    }
    async triggerAutoArchive(filePath, reason) {
        try {
            const fileName = filePath.split('/').pop() || 'unknown';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // アーカイブファイル名を生成
            const archiveFileName = `${fileName.replace('.yaml', '')}-${timestamp}.yaml`;
            const archiveSubDir = this.getArchiveSubDir(fileName);
            // アーカイブディレクトリの存在確認・作成
            this.ensureArchiveDirExists(archiveSubDir);
            const archivePath = join(archiveSubDir, archiveFileName);
            // 元ファイルをアーカイブに移動
            const originalContent = readFileSync(filePath, 'utf8');
            writeFileSync(archivePath, originalContent);
            // 軽量版を作成
            await this.createLightweightVersion(filePath, fileName);
            console.log(`🗄️ [自動アーカイブ] ${fileName} → ${archiveFileName}`);
            console.log(`📝 [理由] ${reason}`);
        }
        catch (error) {
            console.error('❌ [自動アーカイブエラー]:', error);
            console.error(`📍 [エラー詳細] ファイル: ${filePath.split('/').pop() || 'unknown'}, パス: ${filePath}`);
        }
    }
    async createLightweightVersion(filePath, fileName) {
        try {
            if (fileName === 'account-analysis-data.yaml') {
                // 最新の分析データのみ残す
                const defaultAnalysis = {
                    timestamp: new Date().toISOString(),
                    followers: { current: 0, change_24h: 0, growth_rate: '0.0%' },
                    engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: 100.0 },
                    performance: { posts_today: 0, target_progress: '0%' },
                    health: { status: 'healthy', quality_score: 70 }
                };
                writeFileSync(filePath, yaml.dump(defaultAnalysis, { indent: 2 }));
            }
            else if (fileName === 'current-decisions.yaml') {
                // 空の決定テンプレートを作成
                const defaultDecision = {
                    timestamp: new Date().toISOString(),
                    actionDecisions: [],
                    context: { accountHealth: 70, marketOpportunities: 0, actionSuggestions: 0 },
                    strategy: 'lightweight_mode',
                    dailyTarget: 15,
                    actionBreakdown: { original_post: 0, quote_tweet: 0, retweet: 0, reply: 0, total: 0 }
                };
                writeFileSync(filePath, yaml.dump(defaultDecision, { indent: 2 }));
            }
            else if (fileName === 'daily-action-data.yaml') {
                // 基本的なアクションログを作成
                const defaultActionData = [{
                        timestamp: new Date().toISOString(),
                        totalActions: 0,
                        successfulActions: 0,
                        errors: []
                    }];
                writeFileSync(filePath, yaml.dump(defaultActionData, { indent: 2 }));
            }
            console.log(`✨ [軽量版作成] ${fileName} を制限内サイズで再作成`);
        }
        catch (error) {
            console.error(`❌ [軽量版作成エラー] ${fileName}:`, error);
        }
    }
    getFullPath(fileName) {
        // ファイル名に応じて適切なパスを返す
        if (fileName.includes('current-')) {
            return join(this.dataDir, 'current', fileName);
        }
        else if (fileName.includes('system-state') || fileName.includes('decision-context')) {
            return join(this.dataDir, 'core', fileName);
        }
        return join(this.dataDir, fileName);
    }
    ensureArchiveDirExists(archiveSubDir) {
        if (!existsSync(archiveSubDir)) {
            mkdirSync(archiveSubDir, { recursive: true });
            console.log(`📁 [ディレクトリ作成] ${archiveSubDir}`);
        }
    }
    getArchiveSubDir(fileName) {
        // ファイル名に応じて適切なアーカイブサブディレクトリを返す
        if (fileName.includes('analysis')) {
            return join(this.archiveDir, 'analysis');
        }
        else if (fileName.includes('decision')) {
            return join(this.archiveDir, 'decisions');
        }
        else if (fileName.includes('action')) {
            return join(this.archiveDir, 'actions');
        }
        return join(this.archiveDir, 'general');
    }
    // 定期実行用メソッド
    async startPeriodicMonitoring(intervalMinutes = 30) {
        console.log(`🕐 [定期監視開始] ${intervalMinutes}分間隔でファイルサイズ監視を開始`);
        // 即座に1回実行
        await this.checkFileSizes();
        // 定期実行を設定
        setInterval(async () => {
            await this.checkFileSizes();
        }, intervalMinutes * 60 * 1000);
    }
}
// グローバルインスタンス
export const fileSizeMonitor = new FileSizeMonitorSystem();
