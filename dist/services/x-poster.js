import { createHmac, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
/**
 * X API投稿システム
 * OAuth 1.0a認証を使用してX(Twitter)への投稿を管理
 */
export class XPoster {
    credentials;
    API_BASE_URL = 'https://api.twitter.com';
    TWEET_ENDPOINT = '/2/tweets';
    MAX_TWEET_LENGTH = 280;
    MAX_RETRIES = 3;
    RETRY_DELAY = 2000; // 2秒
    constructor(apiKey, apiSecret, accessToken, accessTokenSecret) {
        this.credentials = {
            consumerKey: apiKey,
            consumerSecret: apiSecret,
            accessToken,
            accessTokenSecret
        };
    }
    /**
     * X(Twitter)への投稿を実行
     */
    async postToX(content) {
        try {
            // コンテンツのフォーマット
            const formattedContent = await this.formatPost(content);
            // バリデーション
            const validation = await this.validatePost(formattedContent);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: `Validation failed: ${validation.issues.join(', ')}`,
                    timestamp: new Date(),
                    finalContent: formattedContent
                };
            }
            // 投稿実行（リトライ付き）
            let lastError = '';
            for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
                try {
                    const result = await this.executePost(formattedContent);
                    if (result.success) {
                        // 投稿結果を記録
                        await this.trackPostResult(result.postId, formattedContent, true);
                        return {
                            success: true,
                            postId: result.postId,
                            timestamp: new Date(),
                            finalContent: formattedContent,
                            metrics: {
                                contentLength: formattedContent.length,
                                hashtagCount: this.countHashtags(formattedContent)
                            }
                        };
                    }
                    else {
                        lastError = result.error || `Attempt ${attempt} failed`;
                    }
                }
                catch (error) {
                    lastError = `Network error on attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
                // 最後の試行でなければ待機
                if (attempt < this.MAX_RETRIES) {
                    await this.delay(this.RETRY_DELAY * attempt);
                }
            }
            // 全ての試行が失敗
            await this.trackPostResult(null, formattedContent, false, lastError);
            return {
                success: false,
                error: `Failed after ${this.MAX_RETRIES} attempts: ${lastError}`,
                timestamp: new Date(),
                finalContent: formattedContent
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage,
                timestamp: new Date(),
                finalContent: content.content
            };
        }
    }
    /**
     * 投稿内容のバリデーション
     */
    async validatePost(content) {
        const issues = [];
        const suggestions = [];
        const charCount = content.length;
        // 文字数制限チェック
        if (charCount > this.MAX_TWEET_LENGTH) {
            issues.push(`Content too long: ${charCount} characters (max: ${this.MAX_TWEET_LENGTH})`);
            suggestions.push('Shorten the content or remove some hashtags');
        }
        // 空コンテンツチェック
        if (charCount === 0) {
            issues.push('Content is empty');
        }
        // 最小文字数チェック
        if (charCount < 10) {
            issues.push('Content too short (minimum 10 characters recommended)');
            suggestions.push('Add more meaningful content');
        }
        // ハッシュタグチェック
        const hashtagCount = this.countHashtags(content);
        if (hashtagCount > 3) {
            issues.push(`Too many hashtags: ${hashtagCount} (recommended: 1-3)`);
            suggestions.push('Reduce the number of hashtags for better engagement');
        }
        // URL妥当性チェック
        const urls = content.match(/https?:\/\/[^\s]+/g);
        if (urls && urls.length > 2) {
            issues.push('Too many URLs detected');
            suggestions.push('Limit URLs to 1-2 per tweet');
        }
        return {
            isValid: issues.length === 0,
            charCount,
            issues,
            suggestions
        };
    }
    /**
     * 投稿内容のフォーマット
     */
    async formatPost(content) {
        let formattedContent = content.content.trim();
        // ハッシュタグの最適化
        if (content.hashtags && content.hashtags.length > 0) {
            // 既存のハッシュタグを削除（重複を避けるため）
            formattedContent = formattedContent.replace(/#\w+/g, '').trim();
            // 最適なハッシュタグを追加（最大3個）
            const optimizedHashtags = content.hashtags.slice(0, 3);
            // 改行でハッシュタグを分離
            if (formattedContent.length + optimizedHashtags.join(' ').length + 2 <= this.MAX_TWEET_LENGTH) {
                formattedContent += '\n\n' + optimizedHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            }
        }
        // 文字数オーバー時の自動調整
        if (formattedContent.length > this.MAX_TWEET_LENGTH) {
            // ハッシュタグ部分を分離
            const parts = formattedContent.split('\n\n');
            const mainContent = parts[0];
            const hashtags = parts[1] || '';
            // メインコンテンツを短縮
            const availableLength = this.MAX_TWEET_LENGTH - hashtags.length - 4; // 改行とスペース分
            if (mainContent.length > availableLength) {
                const shortenedContent = mainContent.substring(0, availableLength - 3) + '...';
                formattedContent = hashtags ? `${shortenedContent}\n\n${hashtags}` : shortenedContent;
            }
        }
        return formattedContent.trim();
    }
    /**
     * 投稿結果の追跡・記録
     */
    async trackPostResult(postId, content, success, error) {
        try {
            const postingDataPath = path.join(process.cwd(), 'data', 'posting-data.yaml');
            // 投稿履歴データの構造
            const postRecord = {
                id: postId || `failed-${Date.now()}`,
                content,
                timestamp: Date.now(),
                success,
                ...(error && { error }),
                ...(success && postId && {
                    metrics: {
                        contentLength: content.length,
                        hashtagCount: this.countHashtags(content)
                    }
                })
            };
            // 既存データの読み込み（簡単な追記処理）
            let existingData = '';
            try {
                existingData = await fs.readFile(postingDataPath, 'utf-8');
            }
            catch {
                // ファイルが存在しない場合は新規作成
            }
            // 新しい投稿記録を追加
            const newEntry = `
  - id: "${postRecord.id}"
    content: "${content.replace(/"/g, '\\"')}"
    timestamp: ${postRecord.timestamp}
    success: ${postRecord.success}${error ? `
    error: "${error.replace(/"/g, '\\"')}"` : ''}${postRecord.metrics ? `
    metrics:
      contentLength: ${postRecord.metrics.contentLength}
      hashtagCount: ${postRecord.metrics.hashtagCount}` : ''}`;
            // ファイルの更新
            if (existingData.includes('posting_history:')) {
                // 既存のposting_historyセクションに追記
                const updatedData = existingData.replace(/(posting_history:\s*(?:\n {2}- .*)*)/, `$1${newEntry}`);
                await fs.writeFile(postingDataPath, updatedData, 'utf-8');
            }
            else {
                // 新規ファイル作成
                const newData = `# Posting Data Management
version: "1.1.0"
lastUpdated: "${new Date().toISOString()}"

posting_history:${newEntry}

execution_summary:
  total_posts: 1
  successful_posts: ${success ? 1 : 0}
  failed_posts: ${success ? 0 : 1}
  last_execution: ${postRecord.timestamp}
  
current_status:
  is_running: false
  last_error: ${error ? `"${error.replace(/"/g, '\\"')}"` : 'null'}
  next_scheduled: null`;
                await fs.writeFile(postingDataPath, newData, 'utf-8');
            }
        }
        catch (trackError) {
            console.warn('Failed to track post result:', trackError);
            // 追跡エラーは投稿の成功/失敗に影響しない
        }
    }
    /**
     * 実際のX API投稿実行
     */
    async executePost(content) {
        try {
            const url = `${this.API_BASE_URL}${this.TWEET_ENDPOINT}`;
            const postData = JSON.stringify({ text: content });
            // OAuth 1.0a認証ヘッダーの生成
            const authHeader = this.generateOAuth1Header('POST', url, {});
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'User-Agent': 'TradingAssistantX/1.0'
                },
                body: postData
            });
            if (!response.ok) {
                const errorData = await response.text();
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorData}`
                };
            }
            const result = await response.json();
            return {
                success: true,
                postId: result.data?.id || 'unknown'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown network error'
            };
        }
    }
    /**
     * OAuth1.0a Authorizationヘッダーを生成
     */
    generateOAuth1Header(method, url, params) {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = randomBytes(16).toString('hex');
        // OAuth署名に含めるパラメータ
        const oauthParams = {
            oauth_consumer_key: this.credentials.consumerKey,
            oauth_token: this.credentials.accessToken,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: timestamp.toString(),
            oauth_nonce: nonce,
            oauth_version: '1.0'
        };
        // リクエストパラメータとOAuthパラメータを結合（署名計算用）
        const allParams = { ...params, ...oauthParams };
        // パラメータを正規化
        const normalizedParams = this.normalizeParameters(allParams);
        // 署名ベース文字列を生成
        const signatureBaseString = this.createSignatureBaseString(method, url, normalizedParams);
        // 署名キーを生成
        const signingKey = `${this.percentEncode(this.credentials.consumerSecret)}&${this.percentEncode(this.credentials.accessTokenSecret)}`;
        // HMAC-SHA1署名を生成
        const hmac = createHmac('sha1', signingKey);
        hmac.update(signatureBaseString);
        const signature = hmac.digest('base64');
        // Authorizationヘッダーに含めるパラメータ（署名を追加）
        const authParams = {
            ...oauthParams,
            oauth_signature: signature
        };
        // Authorizationヘッダー文字列を生成
        const headerParts = Object.keys(authParams)
            .sort()
            .map(key => `${this.percentEncode(key)}="${this.percentEncode(authParams[key])}"`)
            .join(', ');
        return `OAuth ${headerParts}`;
    }
    /**
     * RFC 3986に準拠したパーセントエンコーディング
     */
    percentEncode(str) {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }
    /**
     * OAuth1.0aパラメータを正規化
     */
    normalizeParameters(params) {
        const sortedKeys = Object.keys(params).sort();
        const encodedParams = sortedKeys.map(key => {
            return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
        });
        return encodedParams.join('&');
    }
    /**
     * OAuth1.0a署名ベース文字列を生成
     */
    createSignatureBaseString(method, url, normalizedParams) {
        return [
            method.toUpperCase(),
            this.percentEncode(url),
            this.percentEncode(normalizedParams)
        ].join('&');
    }
    /**
     * ハッシュタグ数をカウント
     */
    countHashtags(content) {
        const hashtags = content.match(/#\w+/g);
        return hashtags ? hashtags.length : 0;
    }
    /**
     * 遅延ユーティリティ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 投稿時間の最適化チェック
     * content-strategy.yamlの設定を参考に最適な投稿時間かどうかを判定
     */
    async isOptimalPostingTime() {
        try {
            const configPath = path.join(process.cwd(), 'data', 'content-strategy.yaml');
            const configContent = await fs.readFile(configPath, 'utf-8');
            // 簡易的なYAMLパース（optimal_timesの抽出）
            const optimalTimesMatch = configContent.match(/optimal_times:\s*((?:\s*-\s*'[^']+'\s*)+)/);
            if (!optimalTimesMatch) {
                return { isOptimal: true, reason: 'No optimal times configuration found' };
            }
            const timesText = optimalTimesMatch[1];
            const times = timesText.match(/'([^']+)'/g)?.map(time => time.replace(/'/g, '')) || [];
            if (times.length === 0) {
                return { isOptimal: true, reason: 'No optimal times defined' };
            }
            const now = new Date();
            // 現在時刻が最適時間の範囲内かチェック（±30分の余裕）
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            for (const optimalTime of times) {
                const [hours, minutes] = optimalTime.split(':').map(Number);
                const optimalMinutes = hours * 60 + minutes;
                // ±30分の範囲内なら最適
                if (Math.abs(currentMinutes - optimalMinutes) <= 30) {
                    return { isOptimal: true, reason: `Within optimal time range of ${optimalTime}` };
                }
            }
            // 次の最適時間を計算
            const nextOptimal = times
                .map(time => {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            })
                .sort((a, b) => a - b)
                .find(time => time > currentMinutes);
            const nextOptimalTime = nextOptimal
                ? `${Math.floor(nextOptimal / 60).toString().padStart(2, '0')}:${(nextOptimal % 60).toString().padStart(2, '0')}`
                : times[0]; // 翌日の最初の時間
            return {
                isOptimal: false,
                nextOptimalTime,
                reason: 'Current time is not within optimal posting hours'
            };
        }
        catch (error) {
            console.warn('Failed to check optimal posting time:', error);
            return { isOptimal: true, reason: 'Could not load posting time configuration' };
        }
    }
}
/**
 * 環境変数からX Poster インスタンスを作成するヘルパー関数
 */
export function createXPosterFromEnv() {
    const requiredEnvVars = [
        'X_API_KEY',
        'X_API_SECRET',
        'X_ACCESS_TOKEN',
        'X_ACCESS_TOKEN_SECRET'
    ];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
    return new XPoster(process.env.X_API_KEY, process.env.X_API_SECRET, process.env.X_ACCESS_TOKEN, process.env.X_ACCESS_TOKEN_SECRET);
}
export default XPoster;
