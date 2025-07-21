# TASK-002: Playwrightアカウント情報収集システム実装

## 🎯 課題概要

X API認証問題（403 Forbidden）により、`AccountAnalyzer.analyzeCurrentStatus()` でアカウント情報取得が失敗している。Playwrightを使用してWebスクレイピングでアカウント情報を収集し、X API依存を解消する。

## 🔍 現在の問題

### 失敗箇所
`src/lib/account-analyzer.ts` Line 56:
```typescript
const accountInfo = await this.xClient.getMyAccountInfo(); // ❌ 403 Forbidden
```

### 必要なアカウント情報
```typescript
interface AccountInfo {
  username: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  // その他のメタデータ
}
```

## 📋 実装要件

### Task 2A: Playwright アカウント情報収集クラス作成
`src/lib/playwright-account-collector.ts` を新規作成

**基本機能**:
- Playwrightでx.com/[username]にアクセス
- フォロワー数、フォロー数、ツイート数を抽出
- プロフィール情報の取得
- 最近の投稿履歴収集

**実装構造**:
```typescript
export class PlaywrightAccountCollector {
  async collectAccountInfo(username?: string): Promise<AccountInfo> {
    // Playwrightブラウザ起動
    // プロフィールページアクセス
    // 各種情報の抽出
  }
  
  async collectRecentPosts(username?: string, limit: number = 10): Promise<PostInfo[]> {
    // 最近の投稿履歴を取得
  }
  
  private async extractFollowerStats(page: Page): Promise<{followers: number, following: number, tweets: number}> {
    // フォロワー統計の抽出
  }
}
```

### Task 2B: AccountAnalyzer修正
`src/lib/account-analyzer.ts` の `analyzeCurrentStatus()` メソッド修正

**Line 55-56修正**:
```typescript
// 修正前
const accountInfo = await this.xClient.getMyAccountInfo();

// 修正後
const playwrightCollector = new PlaywrightAccountCollector();
const accountInfo = await playwrightCollector.collectAccountInfo();
```

**フォールバック戦略**:
1. **Primary**: Playwright収集
2. **Fallback**: モックデータまたはキャッシュデータ
3. **Error Handling**: 適切なデフォルト値

### Task 2C: 既存Enhanced-Info-Collectorとの統合
`src/lib/enhanced-info-collector.ts` のPlaywright使用パターンを参考にして実装統一

**共通Playwrightセットアップ**:
- ブラウザ設定の共通化
- ヘッドレスモード設定
- エラーハンドリングパターン統一

## 🔧 技術仕様

### Playwright設定
```typescript
// ブラウザ設定例
const browser = await playwright.chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
});
```

### CSS セレクター例（X.com構造）
```typescript
// プロフィール統計の一般的なセレクター
const selectors = {
  followers: '[data-testid="UserName"] a[href*="/followers"] span',
  following: '[data-testid="UserName"] a[href*="/following"] span', 
  tweets: '[data-testid="UserTweets-count"]',
  username: '[data-testid="UserName"] span',
  bio: '[data-testid="UserDescription"]'
};
```

### エラーハンドリング
```typescript
try {
  const accountInfo = await playwrightCollector.collectAccountInfo();
  return accountInfo;
} catch (playwrightError) {
  console.warn('Playwright収集失敗、フォールバック実行:', playwrightError);
  
  // キャッシュからの復旧
  const cachedInfo = await this.getCachedAccountInfo();
  if (cachedInfo) return cachedInfo;
  
  // デフォルト値
  return this.getDefaultAccountInfo();
}
```

## 🎯 データ収集戦略

### アカウント情報収集
1. **プロフィールページ**: `https://x.com/[username]`
2. **統計情報抽出**: フォロワー数、フォロー数、ツイート数
3. **プロフィール情報**: 名前、バイオ、アイコン
4. **アクティビティ情報**: 最終投稿時間、最近の活動

### パフォーマンス最適化
- **ページ読み込み待機**: `waitForLoadState('networkidle')`
- **要素待機**: `waitForSelector()` でセレクター確認
- **タイムアウト設定**: 30秒でタイムアウト
- **リトライ機構**: 3回までリトライ

## 📊 期待される出力形式

### AccountInfo構造
```typescript
interface PlaywrightAccountInfo {
  username: string;
  display_name: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  bio: string;
  verified: boolean;
  created_at: string; // 推定値または取得可能な場合
  last_tweet_time?: number; // タイムスタンプ
}
```

### 収集ログ例
```
🎭 [Playwright収集開始] アカウント情報を収集中...
🔍 [プロフィールアクセス] https://x.com/username
📊 [統計抽出] フォロワー: 1,234、フォロー: 567、ツイート: 890
✅ [収集完了] アカウント情報を正常に取得
```

## 🚨 注意事項

### セレクター変更対応
- X.comのUIは頻繁に変更されるため、セレクターの柔軟性を確保
- 複数のセレクターパターンを用意
- フォールバック用の代替抽出方法

### レート制限対策
- リクエスト間隔の制御（2-3秒間隔）
- User-Agentの設定
- 適切なRefererヘッダー

### プライバシー配慮
- 公開情報のみ収集
- ログイン不要な情報に限定
- 規約遵守の確認

## ✅ 完了確認基準

### 1. 単体テスト
```bash
# PlaywrightAccountCollector単体テスト
# 実際のアカウント情報収集確認
```

### 2. 統合テスト
```bash
# pnpm dev実行
# AccountAnalyzer正常動作確認
# Step 2完了まで到達確認
```

### 3. エラーハンドリング確認
- Playwright失敗時のフォールバック動作
- ネットワークエラー時の適切な処理
- タイムアウト時のエラーハンドリング

## 📦 依存関係

### 既存パッケージ活用
```json
{
  "playwright": "^1.40.0" // 既にインストール済み
}
```

### インポート例
```typescript
import { chromium, Page, Browser } from 'playwright';
import type { AccountInfo } from '../types/index';
```

## 🔄 実装順序

1. **第1段階**: PlaywrightAccountCollector基本クラス作成
2. **第2段階**: AccountAnalyzer修正とフォールバック実装
3. **第3段階**: エラーハンドリングとキャッシュ機能
4. **第4段階**: 統合テストとログ改善

---

**完了報告書ファイル**: `tasks/20250721_145259/reports/REPORT-002-playwright-account-info-collector.md`