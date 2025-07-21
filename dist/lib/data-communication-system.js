"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCommunicationSystem = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class DataCommunicationSystem {
    dataDir;
    messagesDir;
    intermediateDir;
    constructor(dataDir = 'data') {
        this.dataDir = dataDir;
        this.messagesDir = (0, path_1.join)(dataDir, 'messages');
        this.intermediateDir = (0, path_1.join)(dataDir, 'intermediate');
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.dataDir, this.messagesDir, this.intermediateDir].forEach(dir => {
            if (!(0, fs_1.existsSync)(dir)) {
                (0, fs_1.mkdirSync)(dir, { recursive: true });
            }
        });
    }
    async shareData(filename, data) {
        try {
            const filePath = (0, path_1.join)(this.dataDir, filename);
            const content = JSON.stringify(data, null, 2);
            (0, fs_1.writeFileSync)(filePath, content, 'utf8');
        }
        catch (error) {
            console.error(`データ共有エラー (${filename}):`, error);
            throw error;
        }
    }
    async readSharedData(filename) {
        try {
            const filePath = (0, path_1.join)(this.dataDir, filename);
            if (!(0, fs_1.existsSync)(filePath)) {
                return null;
            }
            const content = (0, fs_1.readFileSync)(filePath, 'utf8');
            return JSON.parse(content);
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
            const messageFile = `message-${message.id}.json`;
            const filePath = (0, path_1.join)(this.messagesDir, messageFile);
            (0, fs_1.writeFileSync)(filePath, JSON.stringify(message, null, 2), 'utf8');
        }
        catch (error) {
            console.error(`メッセージ送信エラー:`, error);
            throw error;
        }
    }
    async readMessages(recipientId) {
        try {
            const messages = [];
            const files = (0, fs_1.readdirSync)(this.messagesDir).filter(f => f.startsWith('message-'));
            for (const file of files) {
                const filePath = (0, path_1.join)(this.messagesDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const message = JSON.parse(content);
                if (!recipientId || message.to === recipientId || !message.to) {
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
            const files = (0, fs_1.readdirSync)(this.messagesDir).filter(f => f.startsWith('message-'));
            for (const file of files) {
                const filePath = (0, path_1.join)(this.messagesDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const message = JSON.parse(content);
                if (now - message.timestamp > maxAgeMs) {
                    (0, fs_1.unlinkSync)(filePath);
                }
            }
        }
        catch (error) {
            console.error('メッセージクリーンアップエラー:', error);
        }
    }
    async saveIntermediateResult(result) {
        try {
            const filename = `intermediate-${result.taskId}-${result.id}.json`;
            const filePath = (0, path_1.join)(this.intermediateDir, filename);
            (0, fs_1.writeFileSync)(filePath, JSON.stringify(result, null, 2), 'utf8');
        }
        catch (error) {
            console.error(`中間結果保存エラー:`, error);
            throw error;
        }
    }
    async readIntermediateResult(taskId, resultId) {
        try {
            const pattern = resultId ? `intermediate-${taskId}-${resultId}.json` : `intermediate-${taskId}-`;
            const files = (0, fs_1.readdirSync)(this.intermediateDir).filter(f => f.startsWith(pattern));
            if (files.length === 0) {
                return null;
            }
            // 最新の結果を返す
            const latestFile = files.sort().pop();
            if (!latestFile) {
                return null;
            }
            const filePath = (0, path_1.join)(this.intermediateDir, latestFile);
            const content = (0, fs_1.readFileSync)(filePath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error(`中間結果読み取りエラー:`, error);
            return null;
        }
    }
    async listIntermediateResults(taskId) {
        try {
            const pattern = `intermediate-${taskId}-`;
            const files = (0, fs_1.readdirSync)(this.intermediateDir).filter(f => f.startsWith(pattern));
            const results = [];
            for (const file of files) {
                const filePath = (0, path_1.join)(this.intermediateDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const result = JSON.parse(content);
                results.push(result);
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
            const files = (0, fs_1.readdirSync)(this.intermediateDir).filter(f => f.startsWith('intermediate-'));
            for (const file of files) {
                const filePath = (0, path_1.join)(this.intermediateDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const result = JSON.parse(content);
                if (result.expiresAt && now > result.expiresAt) {
                    (0, fs_1.unlinkSync)(filePath);
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
}
exports.DataCommunicationSystem = DataCommunicationSystem;
