# ワーカーB指示書: Playwright Account Analyzer新規作成

## 🎯 **ミッション**  
自アカウント分析専用のplaywright-account.ts新規作成

## 📋 **作業内容**

### 1. ファイル作成
```
作成先: src/collectors/playwright-account.ts
```

### 2. 機能実装

#### 自アカウント分析機能
```typescript
// 必要機能
class PlaywrightAccountCollector {
  // 自アカウント投稿履歴分析
  analyzeOwnPosts(): Promise<CollectionResult>
  
  // エンゲージメント分析
  analyzeEngagement(): Promise<CollectionResult>
  
  // フォロワー動向分析
  analyzeFollowerTrends(): Promise<CollectionResult>
}
```

## 🔧 **技術要件**

### 疎結合設計準拠
```typescript
// 統一インターフェース
interface CollectionResult {
  source: 'playwright-account';
  data: AccountAnalysisData[];
  metadata: {
    timestamp: Date;
    quality: number;
    accountId: string;
  };
}

// 設定駆動制御
interface AccountConfig {
  username: string;
  analysisDepth: number;
  metrics: string[];
}
```

### Playwright統合
- **ブラウザ管理**: PlaywrightBrowserManager利用
- **認証処理**: OAuthクライアント連携
- **メモリ管理**: リークPrevention統合

### 実データ収集
- **必須**: 実アカウントデータ収集のみ
- **禁止**: モック・テストデータ
- **認証**: X-Client経由での認証済みアクセス

## 📊 **分析対象**
1. **投稿履歴**: 過去投稿のパフォーマンス分析
2. **エンゲージメント**: いいね・リツイート・返信分析
3. **フォロワー動向**: フォロワー増減・属性分析
4. **最適投稿時間**: エンゲージメント時間帯分析

## 🔒 **セキュリティ**
- 認証情報の安全な取り扱い
- ログに機密情報出力禁止
- レート制限厳守

## ✅ **完了条件**
- src/collectors/playwright-account.ts として配置
- 疎結合設計完全準拠
- 自アカウント分析機能実装完了
- 実データ収集動作確認完了