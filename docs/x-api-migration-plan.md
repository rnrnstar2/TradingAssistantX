# X API v2 移行計画書

## 概要
TradingAssistantXシステムをX API v2（旧Twitter API）に完全移行するための実装計画書。

## 現状分析

### 現在の実装状況
- **認証方式**: OAuth 1.0a（x-poster.ts）
- **エンドポイント**: Twitter API v1.1 (`/1.1/statuses/update.json`)
- **機能**: 基本投稿、フォロワー数取得
- **データ収集**: RSS経由（X APIは直接使用せず）

### X API v2の特徴
- **認証方式**: OAuth 2.0推奨（OAuth 1.0aも対応）
- **エンドポイント**: `/2/tweets`（投稿）、`/2/users/me`（ユーザー情報）
- **料金プラン**:
  - Free: 500投稿/月、100読取/月
  - Basic ($200/月): 3,000投稿/月、10,000読取/月
  - Pro ($5,000/月): 1M読取/月、300K投稿/月、検索機能
  - Enterprise: カスタマイズ可能

## 移行方針

### Phase 1: 基本移行（MVP維持）
1. **x-poster.ts改修**
   - OAuth 2.0対応追加（Bearer Token認証）
   - v2エンドポイントへの切り替え
   - 既存機能の維持

2. **新規実装: x-data-collector.ts**
   - タイムライン取得
   - 検索機能（Proプラン以上）
   - メンション・リプライ収集

### Phase 2: 機能拡張
1. **高度な投稿機能**
   - スレッド投稿
   - メディア添付
   - 投票機能

2. **分析機能強化**
   - エンゲージメント詳細取得
   - インプレッション数
   - クリック率

## 実装優先順位

### 必須実装（Phase 1）
1. OAuth 2.0認証実装
2. 基本投稿機能のv2移行
3. ユーザー情報取得のv2移行
4. エラーハンドリング強化

### 推奨実装（Phase 2）
1. タイムライン収集機能
2. 検索機能（Proプラン必須）
3. メディア投稿対応
4. 詳細分析機能

## ディレクトリ構造変更案

```
src/
├── collectors/
│   ├── x-data-collector.ts  # 新規：X API v2データ収集
│   └── rss-collector.ts     # 既存維持
├── services/
│   ├── x-poster-v2.ts       # 新規：v2対応版
│   ├── x-poster.ts          # 既存：段階的廃止
│   └── x-auth-manager.ts    # 新規：OAuth 2.0管理
└── types/
    └── x-api-types.ts       # 新規：X API v2型定義
```

## 環境変数更新

### 現在の環境変数
```
X_CONSUMER_KEY
X_CONSUMER_SECRET
X_ACCESS_TOKEN
X_ACCESS_TOKEN_SECRET
```

### 追加予定の環境変数
```
X_BEARER_TOKEN       # OAuth 2.0用
X_CLIENT_ID          # OAuth 2.0用
X_CLIENT_SECRET      # OAuth 2.0用
X_API_TIER           # Free/Basic/Pro/Enterprise
```

## 実装スケジュール案

### Week 1-2: 基本移行
- OAuth 2.0認証実装
- 投稿機能のv2移行
- テスト環境構築

### Week 3-4: データ収集強化
- タイムライン収集実装
- 検索機能実装（Proプラン向け）
- エラーハンドリング改善

### Week 5-6: 分析機能追加
- エンゲージメント詳細取得
- パフォーマンス分析
- レポート機能強化

## リスク管理

### 技術的リスク
- APIレート制限への対応
- 認証方式変更による既存機能への影響
- データ形式の違いによる互換性問題

### 対策
- 段階的移行（v1.1とv2の並行運用期間設定）
- 十分なテスト期間の確保
- ロールバック計画の準備

## 次のステップ

1. プラン選択の確認（Free/Basic/Pro/Enterprise）
2. OAuth 2.0認証情報の取得
3. 開発環境でのテスト実装
4. 段階的な本番環境への適用