# TASK-004: TwitterAPI.io 3層認証統合テスト・検証

## 🎯 タスク概要

Phase 2-3で実装された3層認証システムの統合テスト・検証を実行し、TwitterAPI.ioの3つの認証レベル（APIキー・V1ログイン・V2ログイン）が正常に動作することを確認します。既存main.tsとの互換性も検証します。

## 📋 実装要件

### 1. 統合テストスイート作成

#### A. 認証フロー統合テスト
**ファイル**: `tests/kaito-api/integration/auth-flow-integration.test.ts`
```typescript
describe('3層認証統合テスト', () => {
  describe('APIキー認証フロー', () => {
    test('ユーザー情報取得が成功する', async () => {
      // APIキー認証のみでユーザー情報取得
    });
    
    test('ツイート検索が成功する', async () => {
      // APIキー認証のみでツイート検索
    });
    
    test('投稿機能がエラーになる', async () => {
      // APIキー認証のみでは投稿不可を確認
    });
  });
  
  describe('V1ログイン認証フロー', () => {
    test('2段階認証プロセスが成功する', async () => {
      // Step1 + Step2の完全な認証フロー
    });
    
    test('基本投稿が成功する', async () => {
      // auth_sessionを使用した投稿
    });
    
    test('エンゲージメントが成功する', async () => {
      // いいね・リツイート機能
    });
  });
  
  describe('V2ログイン認証フロー', () => {
    test('1段階認証プロセスが成功する', async () => {
      // user_login_v2での認証
    });
    
    test('高機能投稿が成功する', async () => {
      // login_cookieを使用した高機能投稿
    });
    
    test('DM送信が成功する', async () => {
      // V2専用のDM機能
    });
  });
});
```

#### B. エンドポイント統合テスト
**ファイル**: `tests/kaito-api/integration/endpoints-integration.test.ts`
```typescript
describe('エンドポイント認証レベル統合テスト', () => {
  describe('public/ エンドポイント', () => {
    test('全てのpublicエンドポイントがAPIキー認証のみで動作', async () => {
      // user-info, tweet-search, trends, follower-info
    });
  });
  
  describe('v1-auth/ エンドポイント', () => {
    test('全てのV1エンドポイントがauth_sessionで動作', async () => {
      // tweet-actions-v1, engagement-v1, quote-tweet-v1
    });
  });
  
  describe('v2-auth/ エンドポイント', () => {
    test('全てのV2エンドポイントがlogin_cookieで動作', async () => {
      // tweet-actions-v2, dm-management, community-management, advanced-features
    });
  });
});
```

#### C. 互換性テスト
**ファイル**: `tests/kaito-api/integration/compatibility-integration.test.ts`
```typescript
describe('後方互換性統合テスト', () => {
  test('既存のimportパスが正常動作', async () => {
    // import { KaitoTwitterAPIClient } from './kaito-api';
    // 既存のコードが変更なしで動作することを確認
  });
  
  test('main-workflows/での動作継続', async () => {
    // main-workflows/配下のファイルでの動作確認
  });
  
  test('shared/types.tsとの互換性', async () => {
    // 型定義の互換性確認
  });
});
```

### 2. 実API動作確認テスト

#### A. 実認証テスト
**ファイル**: `tests/kaito-api/real-api/real-auth-test.ts`
```typescript
describe('実TwitterAPI.io認証テスト', () => {
  beforeAll(async () => {
    // 実際の環境変数確認
    expect(process.env.KAITO_API_TOKEN).toBeDefined();
    expect(process.env.X_USERNAME).toBeDefined();
    // ... その他必要な環境変数
  });
  
  test('実APIキー認証', async () => {
    // 実際のTwitterAPI.ioでAPIキー認証テスト
  });
  
  test('実V1ログイン認証', async () => {
    // 実際のTwitterAPI.ioでV1ログイン認証テスト
    // 2FAコード生成・使用も含む
  });
  
  test('実V2ログイン認証', async () => {
    // 実際のTwitterAPI.ioでV2ログイン認証テスト
  });
});
```

#### B. 実機能テスト
**ファイル**: `tests/kaito-api/real-api/real-function-test.ts`
```typescript
describe('実TwitterAPI.io機能テスト', () => {
  test('実際のツイート投稿（V1）', async () => {
    // 実際にツイートを投稿し、削除までを確認
  });
  
  test('実際のツイート投稿（V2）', async () => {
    // V2 APIでの実際の投稿・削除
  });
  
  test('実際のエンゲージメント', async () => {
    // いいね・リツイートの実行・取り消し
  });
  
  test('実際の検索・情報取得', async () => {
    // APIキー認証での各種情報取得
  });
});
```

### 3. パフォーマンス・制限テスト

#### A. QPS制御テスト
**ファイル**: `tests/kaito-api/performance/qps-control.test.ts`
```typescript
describe('QPS制御テスト', () => {
  test('200 QPS制限の遵守', async () => {
    // 実際に200リクエスト/秒で制限されることを確認
  });
  
  test('認証レベル問わずQPS制御適用', async () => {
    // 全認証レベルでQPS制御が機能することを確認
  });
});
```

#### B. レート制限テスト
**ファイル**: `tests/kaito-api/performance/rate-limit.test.ts`
```typescript
describe('レート制限テスト', () => {
  test('TwitterAPI.ioレート制限の適切な処理', async () => {
    // 429エラーの適切なハンドリング確認
  });
  
  test('レート制限回復後の自動再開', async () => {
    // レート制限解除後の処理継続確認
  });
});
```

### 4. main.ts互換性検証

#### A. 既存システム統合テスト
**ファイル**: `tests/integration/main-system-integration.test.ts`
```typescript
describe('main.ts既存システム統合テスト', () => {
  test('30分間隔実行での3層認証動作', async () => {
    // メインループでの認証切り替え確認
  });
  
  test('Claude判断システムとの統合', async () => {
    // Claudeの判断に基づく認証レベル別アクション実行
  });
  
  test('データ管理システムとの統合', async () => {
    // data/current/、data/history/での動作確認
  });
});
```

## 🔧 検証スクリプト

### A. 自動検証スクリプト
**ファイル**: `scripts/validate-3layer-auth.ts`
```typescript
#!/usr/bin/env ts-node

/**
 * 3層認証システム自動検証スクリプト
 */
async function validate3LayerAuth(): Promise<void> {
  console.log('🔍 3層認証システム検証開始...');
  
  // 1. 環境変数確認
  const envCheck = validateEnvironmentVariables();
  console.log(`📋 環境変数チェック: ${envCheck ? '✅' : '❌'}`);
  
  // 2. 型定義整合性確認
  const typeCheck = await validateTypeDefinitions();
  console.log(`📊 型定義チェック: ${typeCheck ? '✅' : '❌'}`);
  
  // 3. 認証フロー確認
  const authCheck = await validateAuthenticationFlows();
  console.log(`🔐 認証フローチェック: ${authCheck ? '✅' : '❌'}`);
  
  // 4. エンドポイント動作確認
  const endpointCheck = await validateEndpoints();
  console.log(`🚀 エンドポイントチェック: ${endpointCheck ? '✅' : '❌'}`);
  
  // 5. 互換性確認
  const compatCheck = await validateCompatibility();
  console.log(`🔄 互換性チェック: ${compatCheck ? '✅' : '❌'}`);
  
  const allPassed = envCheck && typeCheck && authCheck && endpointCheck && compatCheck;
  console.log(`\n🎯 総合結果: ${allPassed ? '✅ 全検証通過' : '❌ 検証失敗'}`);
  
  if (!allPassed) {
    process.exit(1);
  }
}

// 実行
validate3LayerAuth().catch(console.error);
```

### B. 段階的検証スクリプト
**ファイル**: `scripts/step-by-step-validation.ts`
```typescript
/**
 * 段階的検証スクリプト
 * Phase 2-3の実装状況を段階的に確認
 */
async function stepByStepValidation(): Promise<void> {
  console.log('📝 段階的検証開始...\n');
  
  // Step 1: 認証コア実装確認
  console.log('Step 1: 認証コア実装確認');
  await validateAuthCore();
  
  // Step 2: 型定義分離確認
  console.log('\nStep 2: 型定義分離確認');
  await validateTypesSeparation();
  
  // Step 3: エンドポイント再構築確認
  console.log('\nStep 3: エンドポイント再構築確認');
  await validateEndpointsRebuild();
  
  // Step 4: 統合動作確認
  console.log('\nStep 4: 統合動作確認');
  await validateIntegration();
  
  console.log('\n🎉 段階的検証完了');
}
```

## 📊 検証レポート生成

### A. 検証結果レポート
**ファイル**: `scripts/generate-validation-report.ts`
```typescript
/**
 * 検証結果レポート生成
 * 全テスト結果をMarkdown形式で出力
 */
interface ValidationResult {
  phase: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  timestamp: string;
}

async function generateValidationReport(): Promise<void> {
  const results: ValidationResult[] = await runAllValidations();
  
  const reportContent = generateMarkdownReport(results);
  
  await writeFile(
    'tasks/20250728-1911/reports/VALIDATION-REPORT.md',
    reportContent
  );
  
  console.log('📋 検証レポート生成完了');
}
```

## ✅ 完了基準

### 1. 認証フロー検証
- ✅ APIキー認証: 読み取り機能のみ動作、投稿機能はエラー
- ✅ V1ログイン認証: 2段階認証完了、基本投稿・エンゲージメント成功
- ✅ V2ログイン認証: 1段階認証完了、高機能投稿・DM・コミュニティ機能成功

### 2. システム統合検証
- ✅ main.ts: 既存のメインループが3層認証で正常動作
- ✅ main-workflows: 認証レベル別アクション実行が正常動作
- ✅ データ管理: current/history/ディレクトリでの正常動作

### 3. パフォーマンス検証
- ✅ QPS制御: 200 QPS制限が全認証レベルで遵守
- ✅ レート制限: TwitterAPI.ioレート制限の適切な処理
- ✅ メモリ使用量: 認証オーバーヘッドの最小化

### 4. 品質検証
- ✅ TypeScript: strict設定で全ファイルエラーなし
- ✅ テストカバレッジ: 各認証レベル90%以上
- ✅ 実API動作: 実際のTwitterAPI.ioでの動作確認

## 🚨 重要制約

### セキュリティ検証
- **認証情報保護**: テスト中の秘密情報適切管理
- **セッション管理**: 期限切れセッションの適切な検出・更新
- **権限分離**: 認証レベル別の機能制限が確実に機能

### 実API使用制約
- **コスト管理**: テスト実行時の$0.15/1k tweets監視
- **レート制限**: テスト実行によるレート制限消費の最小化
- **実データ保護**: テスト用データの適切な削除

### システム影響制約
- **既存システム無影響**: テスト実行が本番システムに影響しない
- **ロールバック準備**: 問題発生時の迅速な復旧体制
- **段階的検証**: 一度に全てをテストせず段階的に実行

## 📋 出力先

- **テストファイル**: `tests/kaito-api/integration/` 配下
- **検証スクリプト**: `scripts/` 配下
- **検証レポート**: `tasks/20250728-1911/reports/VALIDATION-REPORT.md`
- **最終報告書**: `tasks/20250728-1911/reports/REPORT-004-integration-validation.md`

## ⚠️ 注意事項

1. **実API使用**: モックではなく実際のTwitterAPI.io使用必須
2. **本物の認証情報**: テスト用の実際の認証情報使用
3. **段階的実行**: 全テストを一度に実行せず、段階的に検証
4. **影響確認**: テスト実行が既存システムに与える影響の監視

---

**重要**: この統合テスト・検証は、3層認証アーキテクチャの最終確認です。実際のTwitterAPI.ioでの動作確認を通じて、システムの確実な動作を保証してください。