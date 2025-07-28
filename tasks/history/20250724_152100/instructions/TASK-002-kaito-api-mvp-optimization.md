# TASK-002: KaitoAPI MVP最適化・過剰実装削減

## 🎯 タスク概要

現在の13ファイル実装を、REQUIREMENTS.mdに準拠した11ファイル構成に最適化し、MVP要件のみに特化します。

## 📋 現状分析

### 現在の問題点
- **ファイル数超過**: 13ファイル実装 vs 要求11ファイル
- **過剰実装**: MVP要件を超えた高度分析機能
- **複雑性過多**: 詳細メトリクス、統計分析等の不要機能
- **構造不整合**: REQUIREMENTS.mdとの微細な差異

### 実装状況確認済みファイル
```
現在: 13ファイル
├── action-executor.ts          # [要削除] - endpoints/配下に統合
├── core/client.ts              # [保持] - API認証・QPS制御・リクエスト管理
├── core/config.ts              # [保持] - API設定・エンドポイント管理
├── endpoints/action-endpoints.ts        # [保持] - 投稿・いいね・RT・画像アップロード
├── endpoints/community-endpoints.ts     # [保持] - コミュニティ情報・メンバー・投稿
├── endpoints/list-endpoints.ts          # [保持] - リスト投稿・フォロワー・メンバー
├── endpoints/login-endpoints.ts         # [保持] - 認証・ログイン・2FA対応
├── endpoints/trend-endpoints.ts         # [保持] - トレンド情報取得（WOEID対応）
├── endpoints/tweet-endpoints.ts         # [保持] - ツイート検索・詳細・リプライ・引用
├── endpoints/user-endpoints.ts          # [保持] - ユーザー情報・フォロー関係・検索
├── endpoints/webhook-endpoints.ts       # [保持] - フィルタルール管理・リアルタイム処理
├── search-engine.ts           # [要削除] - endpoints/tweet-endpoints.tsに統合
└── utils/response-handler.ts  # [保持] - レスポンス処理・エラーハンドリング
```

**削減対象**: action-executor.ts, search-engine.ts (2ファイル削減 → 11ファイル)

## 🏗️ 実装要件

### 目標構成（REQUIREMENTS.md準拠）
```
src/kaito-api/                 # KaitoTwitterAPI完全分離アーキテクチャ (11ファイル)
├── core/                      # 基盤機能 (2ファイル)
│   ├── client.ts              # API認証・QPS制御・リクエスト管理
│   └── config.ts              # API設定・エンドポイント管理
├── endpoints/                 # エンドポイント別分離 (8ファイル)
│   ├── user-endpoints.ts      # ユーザー情報・フォロー関係・検索
│   ├── tweet-endpoints.ts     # ツイート検索・詳細・リプライ・引用
│   ├── community-endpoints.ts # コミュニティ情報・メンバー・投稿
│   ├── list-endpoints.ts      # リスト投稿・フォロワー・メンバー
│   ├── trend-endpoints.ts     # トレンド情報取得（WOEID対応）
│   ├── login-endpoints.ts     # 認証・ログイン・2FA対応
│   ├── action-endpoints.ts    # 投稿・いいね・RT・画像アップロード
│   └── webhook-endpoints.ts   # フィルタルール管理・リアルタイム処理
└── utils/                     # ユーティリティ (1ファイル)
    └── response-handler.ts    # レスポンス処理・エラーハンドリング
```

### MVP制約遵守
- **過剰機能削除**: 詳細統計、高度分析機能の除去
- **シンプル化**: 基本機能のみ保持
- **実用性重視**: 動作確実性を最優先

## 📝 詳細実装指示

### 1. action-executor.ts 削除・統合

**目的**: 重複機能の統合によるファイル数削減

**作業内容**:
1. **action-executor.ts** の機能を **endpoints/action-endpoints.ts** に統合
2. 重複する教育的投稿機能は統合時に重複排除
3. 統合後のaction-endpoints.tsは教育的価値検証機能を保持

**統合手順**:
```typescript
// endpoints/action-endpoints.ts に以下機能を確認・統合
- createEducationalPost() - 既存実装確認・重複排除
- retweetEducationalContent() - 既存実装確認・重複排除  
- likeEducationalContent() - 既存実装確認・重複排除
- 頻度制御機能 - 統合・最適化
- コンテンツ検証機能 - 統合・最適化
```

### 2. search-engine.ts 削除・統合

**目的**: 検索機能の論理的配置による構造最適化

**作業内容**:
1. **search-engine.ts** の検索機能を **endpoints/tweet-endpoints.ts** に統合
2. ツイート検索とトレンド検索の統合管理
3. 検索ロジックの簡素化・MVP特化

**統合手順**:
```typescript
// endpoints/tweet-endpoints.ts に以下機能を統合
- searchTweets() - 基本ツイート検索
- searchTrends() - トレンド検索  
- advancedSearch() - 高度検索（MVP範囲内のみ）
- 検索フィルタリング - 教育的コンテンツ重視
```

### 3. 過剰実装機能の削減

**削減対象機能**:

#### core/client.ts から削除
- 詳細メトリクス機能（getDetailedMetrics）
- 高度な統計分析機能
- 複雑なパフォーマンス監視機能
- 過度なサーキットブレーカー機能

**保持する機能**:
- 基本認証・QPS制御
- 基本レート制限管理
- シンプルなエラーハンドリング
- 基本的な投稿・RT・いいね機能

#### endpoints/action-endpoints.ts から簡素化
- 教育的価値検証は保持（MVP要件）
- 頻度制御は基本レベルに簡素化
- 過度な品質スコア計算は削除
- 基本的なスパム検出のみ保持

### 4. MVP要件適合性確認

**確認項目**:
- [ ] **基本アクション**: 投稿・RT・いいね・アカウント情報取得
- [ ] **認証・接続**: 基本的なAPI認証
- [ ] **投稿検索**: シンプルな投稿検索・トレンド取得
- [ ] **教育的価値**: 基本的な教育コンテンツ判定
- [ ] **エラーハンドリング**: 基本的なエラー対応

**削除対象**:
- [ ] 詳細統計分析機能
- [ ] 高度なメトリクス収集
- [ ] 複雑なパフォーマンス追跡
- [ ] 過度な品質評価システム

## 🔧 技術要件

### ファイル統合手順
1. **機能重複確認**: 統合対象の機能重複をチェック
2. **段階的統合**: 一度に全ての変更を行わず段階的実施
3. **テスト確認**: 統合後の動作確認
4. **不要ファイル削除**: 統合完了後に元ファイル削除

### 品質確保
- **TypeScript strict**: 型安全性確保
- **ESLint通過**: コード品質確保
- **基本テスト**: 主要機能の動作確認

### MVP制約準拠
- **シンプル設計**: 複雑な抽象化を避ける
- **実用性重視**: 動作確実性を最優先
- **必要最小限**: MVP要件のみ実装

## 📊 具体的作業手順

### Step 1: action-executor.ts 統合
1. action-executor.ts の実装内容を確認
2. endpoints/action-endpoints.ts の既存実装を確認
3. 重複機能の排除・統合
4. action-executor.ts 削除
5. 動作確認テスト

### Step 2: search-engine.ts 統合  
1. search-engine.ts の検索機能を分析
2. endpoints/tweet-endpoints.ts への統合設計
3. 検索ロジックの移行・簡素化
4. search-engine.ts 削除
5. 検索機能テスト

### Step 3: 過剰実装削減
1. core/client.ts の過剰機能特定
2. MVP要件との照合・削減実施
3. endpoints/action-endpoints.ts の簡素化
4. 全体的な動作確認

### Step 4: 最終確認
1. ファイル数確認（11ファイル）
2. MVP要件適合性確認
3. 基本機能テスト実行
4. パフォーマンス確認

## 🚨 注意事項

### 機能保持必須
- **教育的価値検証**: MVP要件として必須保持
- **基本認証・API呼び出し**: 削除禁止
- **エラーハンドリング**: 基本レベル必須
- **頻度制御**: 基本的な制御は保持

### 削除OK
- **詳細統計・分析**: MVP超過機能
- **高度メトリクス**: 過剰実装
- **複雑な品質評価**: MVP超過
- **パフォーマンス監視詳細**: 過剰実装

### コード品質
- **段階的変更**: 大規模変更を避ける
- **テスト実行**: 各段階での動作確認
- **バックアップ**: 変更前ファイルのバックアップ

## 📁 出力管理

### ファイル出力先
- **修正ファイル**: `src/kaito-api/` 配下で直接修正
- **削除ファイル**: バックアップ後に削除
- **ログ出力**: `tasks/20250724_152100/logs/kaito-api-optimization.log`

### 完了報告
**報告書作成先**: `tasks/20250724_152100/reports/REPORT-002-kaito-api-mvp-optimization.md`

**報告内容**:
- 削減したファイルと統合先
- 削除した過剰機能一覧
- 保持した必須機能一覧
- ファイル数削減結果（13→11）
- MVP要件適合性確認結果
- テスト実行結果

## ⏰ 実行優先度: 高（並列実行可能）

このタスクは他のタスクと並列実行可能です。Claude SDK統合と同時進行で効率化を図れます。