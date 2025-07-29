# TASK-009: Kaito APIクライアント初期化問題の修正

## 🎯 タスク概要
KaitoApiClientのhttpClientが初期化されていない問題を修正し、API認証が正常に動作するようにする

## 📋 実装内容

### 1. 問題の原因
- KaitoApiClientのコンストラクタではhttpClientが初期化されない
- initializeWithConfig()メソッドを呼ばないとhttpClientがnullのまま
- main-workflow.tsでは単にnew KaitoApiClient()しているだけ

### 2. main-workflow.ts の修正

#### 現在のコード
```typescript
private static kaitoClient = new KaitoApiClient();
```

#### 修正後のコード
```typescript
private static kaitoClient: KaitoApiClient;

// 静的初期化ブロックを追加
static {
  this.initializeKaitoClient();
}

private static async initializeKaitoClient(): Promise<void> {
  try {
    // KaitoAPIConfigManagerを使用して設定を生成
    const configManager = new KaitoAPIConfigManager();
    const apiConfig = await configManager.generateConfig('dev');
    
    // クライアントを作成
    this.kaitoClient = new KaitoApiClient();
    
    // 重要: initializeWithConfigを呼んでhttpClientを初期化
    this.kaitoClient.initializeWithConfig(apiConfig);
    
    console.log('✅ KaitoApiClient初期化完了');
  } catch (error) {
    console.error('❌ KaitoApiClient初期化エラー:', error);
    // デフォルトクライアントを作成（エラー時でも動作継続）
    this.kaitoClient = new KaitoApiClient();
  }
}
```

### 3. インポート追加
```typescript
import { KaitoApiClient } from '../kaito-api';
import { KaitoAPIConfigManager } from '../kaito-api/core/config';
```

### 4. 代替案（シンプル版）
静的初期化が複雑な場合は、execute()メソッドの最初で初期化：

```typescript
static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
  // 初回実行時に初期化
  if (!this.kaitoClientInitialized) {
    await this.initializeKaitoClient();
    this.kaitoClientInitialized = true;
  }
  
  // 既存のコード...
}

private static kaitoClientInitialized = false;
```

## ⚠️ 注意事項
- 非同期初期化のため、静的初期化ブロックでは難しい場合がある
- エラーハンドリングを適切に行い、初期化失敗でも動作継続できるようにする
- 環境変数（X_USERNAME等）が設定されていることが前提

## 🔧 技術要件
- TypeScript async/await
- KaitoAPIConfigManagerの正しい使用
- エラーハンドリング

## 📂 成果物
- 更新: `src/workflows/main-workflow.ts`

## ✅ 完了条件
- [ ] httpClientが正しく初期化される
- [ ] getAccountInfo()がエラーなく実行される
- [ ] pnpm devが正常に動作する