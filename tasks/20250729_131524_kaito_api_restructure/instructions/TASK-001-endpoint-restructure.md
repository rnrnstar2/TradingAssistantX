# TASK-001: KaitoAPIエンドポイント再構成

## 概要
kaito-apiのエンドポイントディレクトリ構造を仕様書（docs/kaito-api.md）に従って再構成する。
現在のpublic/, v1-auth/, v2-auth/構造をread-only/, authenticated/構造に移行する。

## 要件定義書参照
- REQUIREMENTS.md: KaitoTwitterAPI仕様
- docs/kaito-api.md: 詳細仕様書（特に「統合認証アーキテクチャ（V2標準）」セクション）
- docs/directory-structure.md: ディレクトリ構造仕様

## 現状の構造
```
src/kaito-api/endpoints/
├── public/           # 現在の読み取り専用
├── v1-auth/          # V1認証必須（削除予定）
├── v2-auth/          # V2認証必須
├── action-endpoints.ts
├── trend-endpoints.ts
├── tweet-endpoints.ts
└── user-endpoints.ts
```

## 目標の構造
```
src/kaito-api/endpoints/
├── read-only/        # APIキー認証のみ（読み取り専用）
│   ├── user-info.ts
│   ├── tweet-search.ts
│   ├── trends.ts
│   ├── follower-info.ts
│   └── index.ts
├── authenticated/    # V2ログイン必須（投稿・エンゲージメント）
│   ├── tweet.ts
│   ├── engagement.ts
│   ├── follow.ts
│   └── index.ts
└── index.ts
```

## 実装手順

### 1. ディレクトリ作成
- `src/kaito-api/endpoints/read-only/`
- `src/kaito-api/endpoints/authenticated/`

### 2. read-only/への移行
public/ディレクトリの内容を精査し、read-only/に移行：
- `public/user-info.ts` → `read-only/user-info.ts`
- `public/tweet-search.ts` → `read-only/tweet-search.ts`
- `public/trends.ts` → `read-only/trends.ts`
- `public/follower-info.ts` → `read-only/follower-info.ts`

### 3. authenticated/への実装
既存のエンドポイントファイルから認証必須機能を抽出・統合：

#### tweet.ts（投稿管理）
- action-endpoints.tsのcreatePost機能
- tweet-endpoints.tsの削除機能（あれば）
- V2認証（login_cookie）を使用

#### engagement.ts（エンゲージメント）
- action-endpoints.tsのlike/retweet機能
- v2-auth/からの引用リツイート機能
- unlike/unretweet機能

#### follow.ts（フォロー管理）
- user-endpoints.tsのfollow/unfollow機能
- V2認証必須

### 4. index.tsファイル作成
各ディレクトリにindex.tsを作成し、適切にエクスポート。

### 5. 旧ファイルの削除
移行完了後、以下を削除：
- public/ディレクトリ（全体）
- action-endpoints.ts（機能はauthenticated/に統合）
- trend-endpoints.ts（機能はread-only/trends.tsに統合）
- tweet-endpoints.ts（機能は適切な場所に分散）
- user-endpoints.ts（機能は適切な場所に分散）

## 技術的制約
- TypeScript strict mode準拠
- 既存のAuthManagerとの互換性維持
- HttpClientインターフェースの使用継続
- エラーハンドリングパターンの統一

## 品質基準
- 全ての既存機能が新構造で動作すること
- 型安全性の確保（TypeScriptコンパイルエラーなし）
- 適切なエラーハンドリング
- ログ出力の整合性

## 注意事項
- V1認証関連コードは含めない（次のタスクで削除）
- 仕様書に記載されていない機能は実装しない
- MVPに必要な最小限の機能のみ実装
- 統計・分析機能は含めない

## 成果物
- 新しいディレクトリ構造の実装
- 全機能の動作確認
- 報告書: `tasks/20250729_131524_kaito_api_restructure/reports/REPORT-001-endpoint-restructure.md`