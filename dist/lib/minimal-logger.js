/**
 * 簡潔なログシステム
 * コンテキスト圧迫抑制・最小情報システム用
 */
export class MinimalLogger {
    static instance;
    essentialKeywords = ['開始', '完了', 'エラー', '判断', '実行', '成功', '失敗'];
    static getInstance() {
        if (!MinimalLogger.instance) {
            MinimalLogger.instance = new MinimalLogger();
        }
        return MinimalLogger.instance;
    }
    /**
     * 冗長な実行ログを排除
     */
    log(level, message, data) {
        if (level === 'info' && !this.isEssentialInfo(message)) {
            return; // 不要な情報ログはスキップ
        }
        // 簡潔な形式でのみ出力
        const timestamp = new Date().toISOString().slice(11, 19); // HH:mm:ss
        const logMessage = this.formatMessage(timestamp, level, message, data);
        console.log(logMessage);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, data) {
        this.log('error', message, data);
    }
    /**
     * 必須情報の判定
     */
    isEssentialInfo(message) {
        return this.essentialKeywords.some(keyword => message.includes(keyword));
    }
    /**
     * ログメッセージのフォーマット
     */
    formatMessage(timestamp, level, message, data) {
        let formattedMessage = `${timestamp} ${level.toUpperCase()}: ${message}`;
        if (data && level !== 'info') {
            // エラーや警告の場合のみデータを含める
            const dataStr = this.formatData(data);
            if (dataStr.length < 100) { // 100文字以下のデータのみ表示
                formattedMessage += ` ${dataStr}`;
            }
        }
        return formattedMessage;
    }
    /**
     * データの簡潔なフォーマット
     */
    formatData(data) {
        if (typeof data === 'string') {
            return data.slice(0, 50); // 50文字に制限
        }
        if (typeof data === 'object') {
            try {
                const jsonStr = JSON.stringify(data);
                return jsonStr.slice(0, 80); // 80文字に制限
            }
            catch {
                return '[Object]';
            }
        }
        return String(data).slice(0, 50);
    }
    /**
     * パフォーマンス重視の軽量ログ
     */
    performance(action, startTime) {
        const duration = Date.now() - startTime;
        if (duration > 1000) { // 1秒以上の処理のみログ
            this.info(`${action}完了: ${duration}ms`);
        }
    }
    /**
     * Claude判断ログ（必須）
     */
    decision(decision, reason) {
        this.info(`判断: ${decision} - ${reason.slice(0, 50)}`);
    }
    /**
     * システム状態ログ（必須）
     */
    systemStatus(status, detail) {
        const level = status === 'critical' ? 'error' : status === 'warning' ? 'warn' : 'info';
        this.log(level, `システム状態: ${status}`, detail);
    }
    /**
     * メモリ使用量監視
     */
    memoryUsage() {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        if (heapUsedMB > 100) {
            this.warn(`メモリ使用量高: ${heapUsedMB}MB`);
        }
    }
}
// シングルトンインスタンスをエクスポート
export const logger = MinimalLogger.getInstance();
