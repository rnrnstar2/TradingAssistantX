# TASK-003: メインワークフロー・ログイン統合

## 🎯 タスク概要
- **担当**: Worker3
- **フェーズ**: Phase 2（直列実行 - Phase 1完了後）
- **優先度**: HIGH
- **期限**: Phase 1完了次第実行

## 🔄 依存関係
- **前提**: TASK-001、TASK-002の完了必須
- **連携**: Worker4（TASK-004）と並行して実行可能

## 🚨 現在の問題
システム起動時にログイン処理が実行されておらず、投稿時にログイン認証が失敗している。

### 問題箇所の特定
```typescript
// src/main-workflows/core/action-executor.ts:131 (推定)
if (!process.env.KAITO_API_TOKEN) {
  // 開発環境用モック投稿を実行
  // → 実際の投稿は行われない
  console.log('🧪 モック投稿実行中...');
  return mockPost();
}
```

## 🔧 実装要件

### Phase 3-A: システム起動時ログイン統合

#### main.ts またはsystem-lifecycle.ts修正
```typescript
// ✅ システム起動時のログイン実行
import { AuthManager } from './kaito-api/core/auth-manager';

async function initializeSystem(): Promise<void> {
  console.log('🚀 システム初期化開始...');
  
  // 1. 環境変数検証
  validateEnvironmentVariables();
  
  // 2. ログイン実行
  const authManager = new AuthManager();
  const loginResult = await authManager.login();
  
  if (!loginResult.success) {
    throw new Error(`ログイン失敗: ${loginResult.error}`);
  }
  
  console.log('✅ システム初期化完了 - ログイン成功');
  console.log(`🔐 login_cookie取得: ${loginResult.login_cookie?.substring(0, 10)}...`);
}
```

### Phase 3-B: メインワークフロー統合

#### SchedulerManager統合
```typescript
// src/main-workflows/scheduler-manager.ts
class SchedulerManager {
  private authManager: AuthManager;
  
  constructor() {
    this.authManager = new AuthManager();
  }
  
  async executeMainLoop(): Promise<void> {
    // 1. ログイン状態確認
    if (!this.authManager.isUserSessionValid()) {
      console.log('🔄 セッション期限切れ - 再ログイン実行');
      await this.authManager.login();
    }
    
    // 2. 通常のワークフロー実行
    await this.runWorkflowCycle();
  }
}
```

### Phase 3-C: ActionExecutor修正

#### モック投稿の無効化
```typescript
// src/main-workflows/core/action-executor.ts
async executeAction(decision: ClaudeDecision): Promise<ExecutionResult> {
  // ❌ 削除する部分
  // if (!process.env.KAITO_API_TOKEN) {
  //   return mockPost();
  // }
  
  // ✅ 実際の投稿実行
  if (decision.action === 'post') {
    console.log('📝 実際の投稿を実行中...');
    
    // ログイン状態確認
    if (!this.authManager.isUserSessionValid()) {
      await this.authManager.login();
    }
    
    // 投稿実行
    const result = await this.kaitoApi.post(decision.parameters.content);
    return {
      success: result.success,
      action: 'post',
      tweetId: result.tweetId,
      error: result.error
    };
  }
}
```

## 📋 実装ステップ

### Step 1: システム初期化修正
1. `src/main.ts`または`system-lifecycle.ts`にログイン処理追加
2. 環境変数検証の統合
3. 起動時エラーハンドリングの強化

### Step 2: SchedulerManager統合
1. AuthManagerインスタンスの統合
2. 30分間隔実行前のセッション確認
3. セッション期限切れ時の自動再ログイン

### Step 3: ActionExecutor修正
1. モック投稿ロジックの削除
2. 実際の投稿前のログイン状態確認
3. 投稿失敗時の適切なエラーハンドリング

### Step 4: エラーハンドリング強化
1. ログイン失敗時のシステム停止
2. セッション期限切れ時の自動回復
3. 投稿失敗時のリトライ機構

## ✅ 完了条件
- [ ] システム起動時に自動ログインが実行される
- [ ] 30分間隔実行前にセッション状態が確認される
- [ ] モック投稿が無効化され、実際の投稿が実行される
- [ ] セッション期限切れ時に自動再ログインされる
- [ ] TypeScriptコンパイルエラーなし
- [ ] npm run lint 通過

## 🚫 制約・注意事項
- **既存ワークフロー保持**: 30分間隔実行の基本構造は変更しない
- **エラー継続性**: ログイン失敗時もシステムが適切に動作
- **ログ出力**: セキュリティに配慮したログ出力
- **MVP制約**: 最小限の実装のみ

## ⚠️ 重要な統合ポイント
- **TASK-001**: 環境変数検証システムとの連携
- **TASK-002**: 新API仕様とlogin_cookieの使用
- **TASK-004**: login_cookie管理システムとの協調

## 📄 報告書要件
完了後、以下を含む報告書を作成：
- システム初期化フローの変更内容
- メインワークフローへの統合方法
- モック投稿から実投稿への切り替え詳細
- 動作確認結果とテスト結果

## 📁 出力先
- 報告書: `tasks/20250728_184021_kaito_login_integration/reports/REPORT-003-main-workflow-login-integration.md`
- 実装ログ: `tasks/20250728_184021_kaito_login_integration/outputs/`配下

## 🔄 実行タイミング
- **開始条件**: TASK-001、TASK-002の完了確認後
- **並列可能**: TASK-004（login_cookie管理）と並行実行可能
- **完了判定**: システム起動→ログイン→実投稿の一連の流れが動作