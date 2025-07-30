# TASK-001: 削除されたクラス参照エラーの緊急修正

## 🎯 **タスク概要**

**優先度**: 🔥 CRITICAL - 高優先度  
**実行モード**: 並列実行 - Worker 2と同時実行可能  
**推定時間**: 45-60分  

削除されたクラス（ActionEndpoints, TweetEndpoints等）を参照している5つのテストファイルの修正を行い、新しいアーキテクチャ（read-only/authenticated）に対応させる。

## 📋 **必須事前読み込み**

1. **docs/kaito-api.md** - KaitoAPI仕様書（必須）
   - TwitterAPI.io統合の詳細仕様
   - エンドポイント設計とWebドキュメントリンク
   - 認証アーキテクチャ（APIキー + V2ログイン）

2. **src/kaito-api/endpoints/read-only/** - 新しい読み取り専用エンドポイント
3. **src/kaito-api/endpoints/authenticated/** - 新しい認証必須エンドポイント
4. **src/kaito-api/core/client.ts** - 統合APIクライアント

## 🚨 **問題状況**

以下5つのテストファイルが削除されたクラスを参照してテスト実行が失敗している：

```
tests/kaito-api/endpoints/action-endpoints.test.ts
tests/kaito-api/integration/compatibility-integration.test.ts  
tests/kaito-api/integration/error-recovery-integration.test.ts
tests/kaito-api/integration/full-stack-integration.test.ts
tests/kaito-api/integration/endpoints-integration.test.ts
```

**削除されたクラス**：
- `ActionEndpoints` (src/kaito-api/endpoints/action-endpoints.ts)
- `TweetEndpoints` (src/kaito-api/endpoints/tweet-endpoints.ts)
- その他旧アーキテクチャのクラス

## 🔧 **実装タスク**

### **Phase 1**: エラー確認と影響範囲特定

1. **エラー詳細確認**
```bash
npm test kaito-api 2>&1 | head -50
```

2. **削除クラス参照箇所の完全特定**
```bash
grep -r "ActionEndpoints\|TweetEndpoints" tests/kaito-api/ --include="*.test.ts"
```

### **Phase 2**: テストファイル修正戦略

#### **対象ファイル別修正方針**：

**A. tests/kaito-api/endpoints/action-endpoints.test.ts**
- **修正方針**: `authenticated/engagement.ts`のEngagementManagementクラスに置き換え
- **テスト対象**: retweet, like, quoteTweet機能
- **新インポート**: 
  ```typescript
  import { EngagementManagement } from '../../../src/kaito-api/endpoints/authenticated/engagement';
  ```

**B. tests/kaito-api/integration/compatibility-integration.test.ts**
- **修正方針**: KaitoTwitterAPIClientの統合テストに変更
- **テスト対象**: 新旧APIの互換性確認
- **新インポート**:
  ```typescript
  import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
  ```

**C. tests/kaito-api/integration/error-recovery-integration.test.ts**  
- **修正方針**: AuthManagerとHttpClientのエラー回復テスト
- **テスト対象**: 認証失敗・ネットワークエラー回復
- **新インポート**:
  ```typescript
  import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
  ```

**D. tests/kaito-api/integration/full-stack-integration.test.ts**
- **修正方針**: 全機能統合テスト（read-only + authenticated）
- **テスト対象**: エンドツーエンドワークフロー
- **新インポート**:
  ```typescript
  import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
  import * as readOnly from '../../../src/kaito-api/endpoints/read-only';
  import * as authenticated from '../../../src/kaito-api/endpoints/authenticated';
  ```

**E. tests/kaito-api/integration/endpoints-integration.test.ts**
- **修正方針**: エンドポイント層統合テスト
- **テスト対象**: read-only ↔ authenticated連携
- **新インポート**:
  ```typescript
  import * as readOnly from '../../../src/kaito-api/endpoints/read-only';
  import * as authenticated from '../../../src/kaito-api/endpoints/authenticated';  
  ```

### **Phase 3**: 修正実装

各ファイルに対して以下の手順で修正：

1. **古いインポート削除**
2. **新しいクラス・インポート追加** 
3. **テストロジック調整**（新APIに対応）
4. **型定義更新**（新しい型に対応）
5. **モック更新**（新しいメソッドシグネチャに対応）

### **Phase 4**: 動作確認

```bash
# 修正後の動作確認
npm test tests/kaito-api/endpoints/action-endpoints.test.ts
npm test tests/kaito-api/integration/compatibility-integration.test.ts  
npm test tests/kaito-api/integration/error-recovery-integration.test.ts
npm test tests/kaito-api/integration/full-stack-integration.test.ts
npm test tests/kaito-api/integration/endpoints-integration.test.ts
```

## ⚠️ **重要制約**

### **MVP制約遵守**
- 過剰実装禁止 - 基本機能テストのみ
- 統計・分析機能追加禁止
- パフォーマンス最適化は最小限

### **出力管理規則**
- **🚫 ルートディレクトリ出力禁止**
- **出力先**: `tasks/20250730_004359_kaito_test_implementation/outputs/`のみ許可
- **修正ログ**: `tasks/20250730_004359_kaito_test_implementation/outputs/TASK-001-修正ログ.md`に記録

### **技術制約**
- **TypeScript strict**: 型安全性100%遵守
- **既存テスト構造維持**: 既存のテストケース構造を最大限維持
- **後方互換性**: 既存の正常なテストに影響を与えない

## ✅ **完了基準**

1. **エラー解消**: 5つのテストファイルのimportエラーが完全解消
2. **テスト通過**: 修正した全テストファイルが正常実行
3. **型安全性**: TypeScript strict checkの完全通過
4. **機能性**: 新アーキテクチャのメソッドが正しく呼び出される

## 📝 **報告要件**

完了時に以下を含む報告書を作成：

**報告書パス**: `tasks/20250730_004359_kaito_test_implementation/reports/REPORT-001-fix-deleted-class-references.md`

**報告書内容**:
- 修正した5ファイルの詳細変更内容
- 新旧アーキテクチャの対応関係
- テスト実行結果（before/after）
- 発見した追加課題（あれば）
- 実行時間と効率性評価

---
**🔥 このタスクは緊急度が高く、Worker 2と並列実行してください**