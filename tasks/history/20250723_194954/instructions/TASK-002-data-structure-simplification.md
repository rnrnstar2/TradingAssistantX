# TASK-002: データ構造簡素化

## 🎯 目的
現在の複雑なデータ構造を新しいMVP要件に合わせて簡素化する

## 📋 実装対象
- `src/types/` 配下の型定義ファイル群
- `data/` 配下のデータファイル構造

## 🚨 現状分析
複雑な型定義とデータ階層が存在しているが、MVP要件では「基本的なデータ管理」「シンプルなファイル保存のみ」となっている。

## ✅ MVP要件（REQUIREMENTS.md準拠）

### データ管理の簡素化方針
- **設定ファイル** (data/config/): RSS設定、投稿設定など
- **現在データ** (data/current/): 最新の投稿データ、アカウント状況
- **アーカイブ** (data/archives/): 過去の投稿履歴

### 簡素化原則
- 複雑な階層移動は実装しない
- 基本的なファイル保存のみ
- 手動でのデータ整理で十分

## 🔧 実装指示

### 1. 型定義の簡素化 (src/types/)

#### 必須型定義のみ残す
```typescript
// core-types.ts - MVPコア型
export interface SystemContext {
  followerCount: number;
  lastPostTime: Date | null;
  rssDataAvailable: boolean;
}

export interface ClaudeAction {
  type: 'collect_data' | 'create_post' | 'analyze' | 'wait';
  reason: string;
}

// post-types.ts - 投稿関連型
export interface PostData {
  content: string;
  timestamp: Date;
  followerCount: number;
}
```

#### 削除すべき複雑型定義
- 過度に抽象化された型
- 将来拡張用の型定義
- 複雑な戦略・分析関連型
- 使用されていない型定義

### 2. データファイル構造の簡素化

#### data/current/ の簡素化
必要最小限のファイルのみ：
- `account-status.yaml`: フォロワー数、基本状況
- `active-strategy.yaml`: 現在のアクション状態
- `posting-data.yaml`: 最新の投稿データ

#### data/config/ の確認
MVP要件に必要な設定のみ残す：
- RSS設定
- 投稿間隔設定
- 基本的な認証設定

### 3. 不要ファイルの削除

#### 削除対象の特定
```bash
# 以下のファイルがMVP要件外なら削除候補
src/types/integration-types.ts
src/types/decision-types.ts
src/types/system-types.ts
```

#### data/ 配下の整理
- 複雑な学習データファイル
- 不要な分析結果ファイル
- 使用されていないアーカイブ

## 🚫 MVP制約（実装禁止）

### 過剰設計の防止
- 複雑な型階層の作成禁止
- 将来拡張を想定した型定義禁止
- 現在使用しない型の定義禁止

### データ構造制約
- 複雑なネストされたデータ構造禁止
- 高度な分析用データスキーマ禁止
- 動的なデータ構造変更機能禁止

## 📁 出力制約
- **型定義**: `src/types/` 配下のファイル整理
- **データ構造**: `data/` 配下の簡素化
- **削除作業**: git rmを使用して適切に削除
- **出力禁止**: ルートディレクトリへの新規ファイル作成

## 🎯 完了条件
1. 型定義がMVP要件のみに簡素化
2. データ構造が基本的なファイル保存のみ
3. 不要な複雑型定義の削除完了
4. TypeScript strict モード通過

## 📋 実装後報告書
実装完了後、以下を作成：
`tasks/20250723_194954/reports/REPORT-002-data-structure-simplification.md`

**報告内容**:
- 削除した型定義ファイル一覧
- 簡素化したデータ構造
- MVPデータフロー確認結果
- TypeScript コンパイル確認結果