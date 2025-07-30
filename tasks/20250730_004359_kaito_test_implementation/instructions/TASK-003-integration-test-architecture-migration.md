# TASK-003: 統合テスト新アーキテクチャ移行

## 🎯 **タスク概要**

**優先度**: 🔥 CRITICAL - 高優先度  
**実行モード**: 直列実行 - Worker 1,2完了後に実行  
**推定時間**: 90-120分  
**依存関係**: Worker 1,2の完了が必須

新アーキテクチャ（read-only/authenticated）に対応した統合テスト層の完全移行と、エンドツーエンドワークフローの実装を行う。

## ⏳ **前提条件確認**

このタスク開始前に以下を確認：

1. **Worker 1完了確認**: 
   - 5つのテストファイルの削除クラス参照エラー解消
   - `npm test tests/kaito-api/endpoints/action-endpoints.test.ts`が通過

2. **Worker 2完了確認**:
   - read-only/authenticatedエンドポイントテスト実装完了
   - docs/kaito-api.mdとの整合性確認完了

## 📋 **必須事前読み込み**

1. **docs/kaito-api.md** - KaitoAPI仕様書（統合フロー理解用）
2. **Worker 1,2の報告書** - 前作業の成果と課題確認
3. **src/kaito-api/core/client.ts** - 統合APIクライアント
4. **REQUIREMENTS.md** - MVP要件確認（統合テスト範囲決定用）

## 🔧 **実装タスク**

### **Phase 1**: 統合テスト戦略再設計

#### **新統合テストアーキテクチャ**
```
integration/
├── auth-flow-integration.test.ts     - 認証フロー統合テスト
├── core-integration.test.ts          - コア機能統合テスト  
├── endpoints-integration-3layer.test.ts - 3層エンドポイント統合
├── workflow-integration.test.ts      - ワークフロー統合テスト
├── real-api-integration.test.ts      - 実API統合テスト
└── error-recovery-integration.test.ts - エラー回復統合テスト
```

### **Phase 2**: 高優先度統合テスト修正

#### **A. tests/kaito-api/integration/auth-flow-integration.test.ts**

**修正方針**: 2層認証アーキテクチャの統合テスト

```typescript
describe('Auth Flow Integration - 2層認証アーキテクチャ', () => {
  describe('APIキー認証 (read-only)', () => {
    it('should authenticate with API key for read-only operations', async () => {
      // APIキー認証のみでread-only操作を確認
      const client = new KaitoTwitterAPIClient({ apiKey: 'test-key' });
      // read-only操作テスト
    });
  });

  describe('V2ログイン認証 (authenticated)', () => {
    it('should require V2 login for authenticated operations', async () => {
      // V2ログイン必須の確認
      // authenticated操作テスト
    });
  });

  describe('認証レベル分離', () => {
    it('should prevent authenticated operations without V2 login', async () => {
      // 認証レベル混在の防止確認
    });
  });
});
```

#### **B. tests/kaito-api/integration/core-integration.test.ts**

**修正方針**: KaitoTwitterAPIClientの統合機能テスト

```typescript
describe('Core Integration - KaitoTwitterAPIClient統合', () => {
  describe('クライアント初期化', () => {
    it('should initialize with both authentication layers', async () => {
      // 2層認証での初期化テスト
    });
  });

  describe('エンドポイント統合', () => {
    it('should integrate read-only and authenticated endpoints', async () => {
      // read-only ↔ authenticated連携テスト
    });
  });
});
```

#### **C. tests/kaito-api/integration/endpoints-integration-3layer.test.ts**

**新規作成**: 3層エンドポイント統合テスト

```typescript
describe('3層エンドポイント統合テスト', () => {
  describe('Layer 1: HTTPClient', () => {
    it('should handle HTTP communications properly', async () => {
      // HTTP通信層テスト
    });
  });

  describe('Layer 2: エンドポイント層', () => {
    it('should coordinate read-only endpoints', async () => {
      // read-only層統合テスト
    });
    
    it('should coordinate authenticated endpoints', async () => {
      // authenticated層統合テスト
    });
  });

  describe('Layer 3: APIClient統合', () => {
    it('should provide unified interface for all operations', async () => {
      // APIクライアント統合テスト
    });
  });
});
```

### **Phase 3**: ワークフロー統合テスト

#### **D. tests/kaito-api/integration/workflow-integration.test.ts**

**修正方針**: 実際のワークフロー統合テスト

```typescript
describe('Workflow Integration - 実ワークフロー統合', () => {
  describe('投資教育コンテンツワークフロー', () => {
    it('should execute complete educational content workflow', async () => {
      // 1. ツイート検索 (read-only)
      // 2. コンテンツ生成判断
      // 3. 投稿実行 (authenticated)
      // 4. エンゲージメント (authenticated)
    });
  });

  describe('エラー回復ワークフロー', () => {
    it('should recover from authentication failures', async () => {
      // 認証失敗からの回復テスト
    });
  });
});
```

### **Phase 4**: 実API統合テスト強化

#### **E. tests/kaito-api/integration/real-api-integration.test.ts**

**修正方針**: TwitterAPI.io実API統合テスト

```typescript
describe('Real API Integration - TwitterAPI.io統合', () => {  
  // 実API接続テスト（KAITO_API_TOKEN設定時のみ）
  const isRealAPITestEnabled = !!process.env.KAITO_API_TOKEN;
  
  describe.skipIf(!isRealAPITestEnabled)('実API統合テスト', () => {
    it('should connect to TwitterAPI.io successfully', async () => {
      // 実際のAPIエンドポイント接続確認
    });
    
    it('should handle real API rate limits', async () => {
      // 実際のレート制限対応確認
    });
  });
});
```

### **Phase 5**: パフォーマンス統合テスト

#### **F. tests/kaito-api/integration/performance-integration.test.ts**

**新規作成**: パフォーマンス統合テスト

```typescript
describe('Performance Integration - パフォーマンス統合', () => {
  describe('QPS制御統合', () => {
    it('should maintain 200 QPS limit across all endpoints', async () => {
      // TwitterAPI.io QPS制限の統合確認
    });
  });

  describe('メモリ使用量統合', () => {
    it('should manage memory efficiently in integrated operations', async () => {
      // 統合環境でのメモリ効率確認
    });
  });
});
```

## ⚠️ **重要制約**

### **統合テスト特有制約**
- **実環境近似**: 本番に近い条件での統合テスト実施
- **依存関係管理**: エンドポイント間の適切な依存関係確保
- **エラー伝播**: エラーが適切に上位層に伝播することを確認

### **MVP制約遵守**
- **基本統合のみ**: 高度な統合パターンは実装しない
- **必要最小限**: MVP要件に必要な統合機能のみテスト
- **過剰分析禁止**: 詳細パフォーマンス分析は行わない

### **出力管理規則**
- **🚫 ルートディレクトリ出力禁止**
- **出力先**: `tasks/20250730_004359_kaito_test_implementation/outputs/`のみ
- **統合ログ**: `tasks/20250730_004359_kaito_test_implementation/outputs/TASK-003-統合ログ.md`

## ✅ **完了基準**

1. **全統合テスト通過**: integration/配下の全テストが正常実行
2. **2層認証統合**: APIキー/V2ログインの適切な分離と連携確認
3. **エンドツーエンド動作**: 実際のワークフローシナリオでの動作確認
4. **エラー回復機能**: 統合環境での適切なエラーハンドリング確認

## 📊 **統合テスト成功指標**

- **統合テスト通過率**: 95%以上
- **ワークフロー完了率**: 100%（正常系）
- **エラー回復率**: 90%以上
- **パフォーマンス要件**: QPS制限内での安定動作

## 🔄 **Worker 4への引き継ぎ事項**

完了時に以下をWorker 4に引き継ぎ：

1. **統合テスト結果サマリー**
2. **発見された課題・制限事項**
3. **最終検証で確認すべきポイント**
4. **docs/kaito-api.mdとの最終整合性状況**

## 📝 **報告要件**

**報告書パス**: `tasks/20250730_004359_kaito_test_implementation/reports/REPORT-003-integration-test-architecture-migration.md`

**報告書内容**:
- 修正した統合テストファイル一覧と変更詳細
- 2層認証アーキテクチャの統合評価
- エンドツーエンドワークフロー動作結果
- パフォーマンス統合テスト結果
- Worker 4への引き継ぎ事項詳細

---
**🔄 Worker 1,2完了確認後に開始し、Worker 4に成果を引き継いでください**