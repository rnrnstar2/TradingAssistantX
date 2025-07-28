# TASK-006: kaito-api 統合単体テスト作成

## 🎯 **タスク概要**

**対象範囲**: `src/kaito-api/` 全体
**出力先**: `tests/kaito-api/integration/`
**優先度**: 中（システム全体動作保証）
**依存関係**: TASK-001～005完了後実行

kaito-api全体の連携動作確認と実際のAPIコール動作検証を行う統合テストを作成する。

## 📋 **実装対象**

### 統合テスト対象範囲
1. **Core統合** (`core/client.ts` + `core/config.ts`)
   - ConfigManager → Client初期化の連携
   - 設定適用 → API認証 → 動作確認の流れ
   - エラー伝播・回復機能の統合確認

2. **Endpoints統合** (全endpointsクラス連携)
   - ActionEndpoints ↔ TweetEndpoints連携
   - 教育的投稿 → 検索 → エンゲージメントの一連フロー
   - エンドポイント間のデータ受け渡し

3. **Full Stack統合** (core + endpoints + types)
   - 完全なAPIワークフロー実行
   - 型安全性を保った実際のデータフロー
   - エラーハンドリングの全段階確認

4. **Real API統合** (実際のKaito Twitter API呼び出し)
   - 実環境でのAPI接続テスト
   - レート制限・QPS制御の実動作確認
   - 認証・コスト追跡の実データ確認

## 🧪 **テスト仕様**

### ファイル構成
```
tests/kaito-api/integration/
├── core-integration.test.ts         # Core間連携テスト
├── endpoints-integration.test.ts    # Endpoints間連携テスト
├── full-stack-integration.test.ts   # 全体連携テスト
├── real-api-integration.test.ts     # 実API統合テスト
├── workflow-integration.test.ts     # ワークフロー統合テスト
└── error-recovery-integration.test.ts # エラー回復統合テスト
```

### テストケース設計

#### Core統合テスト (`core-integration.test.ts`)
- **Config→Client初期化フロー**:
  - KaitoAPIConfigManager設定生成
  - KaitoTwitterAPIClient初期化
  - 設定値の正確な引き継ぎ確認

- **認証→API準備フロー**:
  - 設定読み込み → 認証実行 → API準備完了
  - 各段階でのエラーハンドリング
  - 設定変更時の再初期化

- **エラー伝播テスト**:
  - Config生成エラー → Client初期化失敗
  - 認証失敗 → API操作不可状態
  - 適切なエラーメッセージ伝播

#### Endpoints統合テスト (`endpoints-integration.test.ts`)
- **教育的投稿ワークフロー**:
  - ActionEndpoints教育的投稿作成
  - TweetEndpoints投稿検索・取得
  - 投稿ID連携の正確性確認

- **エンゲージメント連携フロー**:
  - TweetEndpoints検索 → 候補取得
  - ActionEndpoints教育的価値判定
  - 適切な投稿への教育的エンゲージメント

- **データ受け渡し検証**:
  - エンドポイント間での型安全なデータ交換
  - ID参照の整合性確認
  - 時間情報の一貫性確認

#### Full Stack統合テスト (`full-stack-integration.test.ts`)
- **完全ワークフローテスト**:
  - 設定読み込み → 認証 → 投稿作成 → 検索 → エンゲージメント
  - 全段階での型安全性確保
  - 実データフローの完全追跡

- **MVP要件統合確認**:
  - 30分間隔投稿システムの基盤動作
  - 教育的価値判定システムの統合動作
  - レート制限・QPS制御の全体適用

- **エラー回復フロー**:
  - 部分的失敗からの回復
  - 代替手段での継続実行
  - システム全体の安定性確保

#### Real API統合テスト (`real-api-integration.test.ts`)
- **実環境接続テスト**:
  - 実際のKaito TwitterAPI への接続
  - 認証トークンを使用した実認証
  - ヘルスチェックでの接続確認

- **実データ操作テスト**:
  - 実際の投稿作成（テスト投稿）
  - 実際のツイート検索実行
  - 実際のエンゲージメント操作

- **制限・コスト管理テスト**:
  - 実レート制限での動作確認
  - 実QPS制御での待機動作
  - 実コスト計算の正確性

- **⚠️ 実API注意事項**:
  - テスト専用アカウント使用
  - 最小限のAPI使用（コスト考慮）
  - テスト投稿の自動削除

#### ワークフロー統合テスト (`workflow-integration.test.ts`)
- **MVP投稿ワークフロー**:
  - アカウント情報取得 → 状況分析 → 投稿判断 → 実行
  - 教育的価値検証 → コンテンツ生成 → 投稿実行
  - 結果記録 → 学習データ更新

- **エンゲージメントワークフロー**:
  - 検索実行 → 候補評価 → 教育的価値判定 → エンゲージメント
  - 頻度制御 → 実行判定 → エンゲージメント実行

- **エラー処理ワークフロー**:
  - 各段階でのエラー発生 → 適切な代替処理
  - システム継続性の確保

#### エラー回復統合テスト (`error-recovery-integration.test.ts`)
- **ネットワークエラー回復**:
  - 一時的なネットワーク障害からの回復
  - リトライ機能の実動作確認
  - 指数バックオフの実際の動作

- **認証エラー回復**:
  - トークン期限切れ → 再認証実行
  - 認証失敗 → 代替認証方法
  - 認証状態の適切な管理

- **API制限エラー回復**:
  - レート制限発生 → 適切な待機
  - QPS制限発生 → 自動調整
  - 制限解除後の正常動作復帰

## 🔧 **技術要件**

### テスト環境
- **実API接続**: 実際のKaito Twitter API使用
- **テスト専用設定**: 本番に影響しない設定
- **環境変数**: テスト用API認証情報

### モック戦略
- **部分的モック**: 実APIとモックの組み合わせ
- **段階的テスト**: モック → 部分実API → 完全実API
- **コスト制御**: 高コスト操作のモック化

### 並列実行制御
- **実API制限考慮**: レート制限を考慮したテスト順序
- **リソース競合回避**: 共有リソースアクセスの制御
- **テスト独立性**: 各テストの完全な独立性確保

## 📊 **品質基準**

### 統合動作確認
- **エンドツーエンド成功**: 完全ワークフローの成功実行
- **エラー処理確認**: 全段階でのエラー処理動作
- **パフォーマンス確認**: レスポンス時間・資源使用量

### 実API動作確認
- **接続安定性**: 実API接続の安定した動作
- **制限遵守**: レート制限・QPS制限の適切な遵守
- **コスト効率**: テスト実行のコスト最小化

## 🚀 **実装手順**

### Phase 1: Core統合テスト
1. **Config-Client統合**
   - 設定生成 → Client初期化テスト
   - エラー伝播テスト

2. **認証統合**
   - 認証フロー統合テスト
   - 認証エラー処理テスト

### Phase 2: Endpoints統合テスト
3. **Action-Tweet統合**
   - 投稿 → 検索連携テスト
   - エンゲージメント連携テスト

4. **データフロー統合**
   - エンドポイント間データ受け渡し
   - 型安全性統合確認

### Phase 3: Full Stack & Real API
5. **完全ワークフロー統合**
   - MVP要件統合テスト
   - エラー回復統合テスト

6. **実API統合テスト**
   - 段階的実API導入
   - コスト管理実API テスト

## ⚠️ **重要な制約**

### MVP制約遵守
- **基本機能統合**: 現在実装されている機能の統合のみ
- **過剰統合禁止**: 将来機能を想定した統合テストは作成しない
- **実用性重視**: 実際のMVP動作に必要な統合のみ

### 実API制約
- **コスト管理**: テスト実行コストの最小化
- **レート制限遵守**: 実API制限の厳格な遵守
- **テスト専用**: 本番データに影響しないテスト実行

### 依存関係制約
- **前提条件**: TASK-001～005完了後の実行
- **単体テスト基盤**: 各単体テストの成功が前提
- **独立実行**: 統合テスト自体の独立実行可能性

## 📝 **成果物**

### 必須ファイル
1. `tests/kaito-api/integration/core-integration.test.ts` - Core統合テスト
2. `tests/kaito-api/integration/endpoints-integration.test.ts` - Endpoints統合テスト
3. `tests/kaito-api/integration/full-stack-integration.test.ts` - 全体統合テスト
4. `tests/kaito-api/integration/real-api-integration.test.ts` - 実API統合テスト
5. `tests/kaito-api/integration/workflow-integration.test.ts` - ワークフロー統合テスト
6. `tests/kaito-api/integration/error-recovery-integration.test.ts` - エラー回復統合テスト

### 実行確認事項
- MVP要件の統合動作確認
- 実API環境での動作確認
- エラー処理・回復機能の確認
- パフォーマンス・コスト効率の確認

## 🎯 **完了判定基準**

- [ ] Core間（Config-Client）統合が正常に動作する
- [ ] Endpoints間連携が正確に動作する
- [ ] 完全なMVPワークフローが実行できる
- [ ] 実API環境での動作が確認できる
- [ ] エラー処理・回復機能が統合レベルで動作する
- [ ] レート制限・QPS制御が実環境で動作する
- [ ] テスト実行コストが管理されている
- [ ] 全統合テストが独立して実行できる

**完了時は `tasks/20250724_213715_kaito_api_unittest/reports/REPORT-006-integration-unittest.md` に報告書を作成してください。**