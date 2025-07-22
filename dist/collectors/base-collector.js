/**
 * 疎結合設計基底クラス
 * データソース独立性と意思決定分岐容易性を確保
 */
/**
 * 疎結合設計基底クラス
 * 各データソースは完全独立動作を実現
 */
export class BaseCollector {
    config;
    constructor(config) {
        this.config = config;
    }
    // 共通メソッド - 基底クラス実装
    validateConfig(config) {
        return config && typeof config === 'object';
    }
    handleError(error, source) {
        console.error(`[${source}] Collection error:`, error);
        return {
            source,
            data: [],
            metadata: this.createMetadata(source, 0),
            success: false,
            error: error.message
        };
    }
    createMetadata(sourceType, count, processingTime) {
        return {
            timestamp: new Date().toISOString(),
            count,
            sourceType,
            processingTime: processingTime || 0,
            config: this.config
        };
    }
    // 設定駆動制御サポート
    isEnabled() {
        return this.config.enabled;
    }
    getTimeout() {
        return this.config.timeout || 10000; // デフォルト10秒
    }
    getMaxRetries() {
        return this.config.retries || 3; // デフォルト3回
    }
    // タイムアウト付きexecute
    async executeWithTimeout(operation, timeoutMs) {
        const timeout = timeoutMs || this.getTimeout();
        return Promise.race([
            operation(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout))
        ]);
    }
    // リトライ機能付きexecute
    async executeWithRetry(operation, maxRetries) {
        const retries = maxRetries || this.getMaxRetries();
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < retries) {
                    const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                    console.warn(`[${this.getSourceType()}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
                }
            }
        }
        throw lastError;
    }
}
