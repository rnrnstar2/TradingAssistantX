import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { writeYamlSafe, loadYamlSafe } from '../utils/yaml-utils';
export class DataCommunicationSystem {
    dataDir;
    messagesDir;
    intermediateDir;
    parallelSessionsDir;
    mergedResultsDir;
    sessionId;
    constructor(dataDir = 'data', sessionId) {
        this.dataDir = dataDir;
        this.messagesDir = join(dataDir, 'messages');
        this.intermediateDir = join(dataDir, 'intermediate');
        this.parallelSessionsDir = join(dataDir, 'parallel_sessions');
        this.mergedResultsDir = join(dataDir, 'merged_results');
        this.sessionId = sessionId;
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.dataDir, this.messagesDir, this.intermediateDir, this.parallelSessionsDir, this.mergedResultsDir].forEach(dir => {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        });
        // セッションID指定時は専用ディレクトリ作成
        if (this.sessionId) {
            const sessionDir = this.getSessionDirectory();
            if (!existsSync(sessionDir)) {
                mkdirSync(sessionDir, { recursive: true });
            }
        }
    }
    async shareData(filename, data) {
        try {
            // セッションIDが指定されている場合は専用ディレクトリに保存
            const filePath = this.sessionId
                ? join(this.getSessionDirectory(), filename)
                : join(this.dataDir, filename);
            // YAMLファイル名に変更
            const yamlFilePath = filePath.replace(/\.[^.]+$/, '.yaml');
            writeYamlSafe(yamlFilePath, data);
        }
        catch (error) {
            console.error(`データ共有エラー (${filename}):`, error);
            throw error;
        }
    }
    async readSharedData(filename) {
        try {
            // セッションIDが指定されている場合は専用ディレクトリから読み込み
            const filePath = this.sessionId
                ? join(this.getSessionDirectory(), filename)
                : join(this.dataDir, filename);
            // YAMLファイル名を試行
            const yamlFilePath = filePath.replace(/\.[^.]+$/, '.yaml');
            if (existsSync(yamlFilePath)) {
                return loadYamlSafe(yamlFilePath);
            }
            // 従来のJSONファイルもサポート（後方互換性）
            if (existsSync(filePath)) {
                const content = readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            }
            return null;
        }
        catch (error) {
            console.error(`データ読み取りエラー (${filename}):`, error);
            return null;
        }
    }
    async updateSharedData(filename, updater) {
        try {
            const currentData = await this.readSharedData(filename);
            const updatedData = updater(currentData);
            await this.shareData(filename, updatedData);
        }
        catch (error) {
            console.error(`データ更新エラー (${filename}):`, error);
            throw error;
        }
    }
    async sendMessage(message) {
        try {
            const messageFile = `message-${message.id}.yaml`;
            const filePath = join(this.messagesDir, messageFile);
            writeYamlSafe(filePath, message);
        }
        catch (error) {
            console.error(`メッセージ送信エラー:`, error);
            throw error;
        }
    }
    async readMessages(recipientId) {
        try {
            const messages = [];
            const files = readdirSync(this.messagesDir).filter(f => f.startsWith('message-'));
            for (const file of files) {
                const filePath = join(this.messagesDir, file);
                let message = null;
                if (file.endsWith('.yaml')) {
                    message = loadYamlSafe(filePath);
                }
                else if (file.endsWith('.json')) {
                    // 後方互換性のためJSONも読み込み
                    const content = readFileSync(filePath, 'utf8');
                    message = JSON.parse(content);
                }
                if (message && (!recipientId || message.to === recipientId || !message.to)) {
                    messages.push(message);
                }
            }
            return messages.sort((a, b) => a.timestamp - b.timestamp);
        }
        catch (error) {
            console.error('メッセージ読み取りエラー:', error);
            return [];
        }
    }
    async cleanupOldMessages(maxAgeMs = 24 * 60 * 60 * 1000) {
        try {
            const now = Date.now();
            const files = readdirSync(this.messagesDir).filter(f => f.startsWith('message-'));
            for (const file of files) {
                const filePath = join(this.messagesDir, file);
                let message = null;
                if (file.endsWith('.yaml')) {
                    message = loadYamlSafe(filePath);
                }
                else if (file.endsWith('.json')) {
                    // 後方互換性のためJSONも読み込み
                    const content = readFileSync(filePath, 'utf8');
                    message = JSON.parse(content);
                }
                if (message && now - message.timestamp > maxAgeMs) {
                    unlinkSync(filePath);
                }
            }
        }
        catch (error) {
            console.error('メッセージクリーンアップエラー:', error);
        }
    }
    async saveIntermediateResult(result) {
        try {
            const filename = `intermediate-${result.taskId}-${result.id}.yaml`;
            const filePath = join(this.intermediateDir, filename);
            writeYamlSafe(filePath, result);
        }
        catch (error) {
            console.error(`中間結果保存エラー:`, error);
            throw error;
        }
    }
    async readIntermediateResult(taskId, resultId) {
        try {
            const pattern = resultId ? `intermediate-${taskId}-${resultId}` : `intermediate-${taskId}-`;
            const files = readdirSync(this.intermediateDir).filter(f => f.startsWith(pattern) && (f.endsWith('.yaml') || f.endsWith('.json')));
            if (files.length === 0) {
                return null;
            }
            // 最新の結果を返す（YAMLを優先）
            const latestFile = files.sort().pop();
            if (!latestFile) {
                return null;
            }
            const filePath = join(this.intermediateDir, latestFile);
            if (latestFile.endsWith('.yaml')) {
                return loadYamlSafe(filePath);
            }
            else {
                // 後方互換性のためJSONも読み込み
                const content = readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            console.error(`中間結果読み取りエラー:`, error);
            return null;
        }
    }
    async listIntermediateResults(taskId) {
        try {
            const pattern = `intermediate-${taskId}-`;
            const files = readdirSync(this.intermediateDir).filter(f => f.startsWith(pattern));
            const results = [];
            for (const file of files) {
                const filePath = join(this.intermediateDir, file);
                let result = null;
                if (file.endsWith('.yaml')) {
                    result = loadYamlSafe(filePath);
                }
                else if (file.endsWith('.json')) {
                    // 後方互換性のためJSONも読み込み
                    const content = readFileSync(filePath, 'utf8');
                    result = JSON.parse(content);
                }
                if (result) {
                    results.push(result);
                }
            }
            return results.sort((a, b) => a.timestamp - b.timestamp);
        }
        catch (error) {
            console.error(`中間結果一覧取得エラー:`, error);
            return [];
        }
    }
    async cleanupExpiredResults() {
        try {
            const now = Date.now();
            const files = readdirSync(this.intermediateDir).filter(f => f.startsWith('intermediate-'));
            for (const file of files) {
                const filePath = join(this.intermediateDir, file);
                let result = null;
                if (file.endsWith('.yaml')) {
                    result = loadYamlSafe(filePath);
                }
                else if (file.endsWith('.json')) {
                    // 後方互換性のためJSONも読み込み
                    const content = readFileSync(filePath, 'utf8');
                    result = JSON.parse(content);
                }
                if (result && result.expiresAt && now > result.expiresAt) {
                    unlinkSync(filePath);
                }
            }
        }
        catch (error) {
            console.error('期限切れ結果クリーンアップエラー:', error);
        }
    }
    async broadcastStatus(from, status, data) {
        const message = {
            id: Date.now().toString(),
            type: 'status',
            from,
            data: { status, ...data },
            timestamp: Date.now()
        };
        await this.sendMessage(message);
    }
    async notifyResult(from, to, result) {
        const message = {
            id: Date.now().toString(),
            type: 'result',
            from,
            to,
            data: result,
            timestamp: Date.now()
        };
        await this.sendMessage(message);
    }
    async notifyError(from, error, data) {
        const message = {
            id: Date.now().toString(),
            type: 'error',
            from,
            data: { error, ...data },
            timestamp: Date.now()
        };
        await this.sendMessage(message);
    }
    getDataDirectory() {
        return this.dataDir;
    }
    getMessagesDirectory() {
        return this.messagesDir;
    }
    getIntermediateDirectory() {
        return this.intermediateDir;
    }
    // 並列セッション対応メソッド
    getSessionDirectory() {
        if (!this.sessionId) {
            throw new Error('SessionID is not set');
        }
        return join(this.parallelSessionsDir, this.sessionId);
    }
    getParallelSessionsDirectory() {
        return this.parallelSessionsDir;
    }
    getMergedResultsDirectory() {
        return this.mergedResultsDir;
    }
    async saveMergedResult(filename, data) {
        try {
            const yamlFilename = filename.replace(/\.[^.]+$/, '.yaml');
            const filePath = join(this.mergedResultsDir, yamlFilename);
            writeYamlSafe(filePath, data);
        }
        catch (error) {
            console.error(`マージ結果保存エラー (${filename}):`, error);
            throw error;
        }
    }
    async getAllSessionResults(filename) {
        try {
            const results = [];
            if (!existsSync(this.parallelSessionsDir)) {
                return results;
            }
            const sessionDirs = readdirSync(this.parallelSessionsDir);
            for (const sessionDir of sessionDirs) {
                const sessionPath = join(this.parallelSessionsDir, sessionDir);
                const filePath = join(sessionPath, filename);
                // YAMLファイルを優先して確認
                const yamlFilePath = filePath.replace(/\.[^.]+$/, '.yaml');
                if (existsSync(yamlFilePath)) {
                    const data = loadYamlSafe(yamlFilePath);
                    if (data) {
                        results.push({ sessionId: sessionDir, data });
                    }
                }
                else if (existsSync(filePath)) {
                    // 後方互換性のためJSONも確認
                    const content = readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    results.push({ sessionId: sessionDir, data });
                }
            }
            return results;
        }
        catch (error) {
            console.error('セッション結果収集エラー:', error);
            return [];
        }
    }
    async mergeAllSessionResults(filename, mergeFilename) {
        try {
            const allResults = await this.getAllSessionResults(filename);
            const mergedData = {
                timestamp: new Date().toISOString(),
                totalSessions: allResults.length,
                sessionResults: allResults,
                mergedAt: Date.now()
            };
            await this.saveMergedResult(mergeFilename, mergedData);
            console.log(`✅ [データ統合] ${allResults.length}セッションの結果を${mergeFilename}に統合完了`);
        }
        catch (error) {
            console.error('セッション結果統合エラー:', error);
            throw error;
        }
    }
}
