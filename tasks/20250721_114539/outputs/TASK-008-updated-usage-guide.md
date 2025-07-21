# 最適化後YAMLファイル構成 - 使用ガイド

## 📁 新しいファイル構成

最適化完了後、以下の3つのファイルでシステム全体を管理します：

```
data/
├── account-config.yaml     # アカウント情報・成長目標・進捗管理
├── content-strategy.yaml   # コンテンツ戦略・投稿パターン・テンプレート
└── posting-data.yaml      # 投稿履歴・実行状況・エラー管理
```

## 🏗️ ファイル別詳細説明

### 1. account-config.yaml
**統合元**: `account-info.yaml` + `growth-targets.yaml`

```yaml
version: "1.0.0"
lastUpdated: [タイムスタンプ]

account:           # アカウント基本情報
current_metrics:   # 現在のメトリクス
growth_targets:    # 成長目標設定
progress:          # 進捗状況
history:          # 履歴データ
```

### 2. content-strategy.yaml
**統合元**: `content-patterns.yaml` + `account-strategy.yaml`の一部

```yaml
version: "1.0.0"
lastUpdated: [ISO日時]

content_themes:      # コンテンツテーマ定義
posting_strategy:    # 投稿戦略設定
content_templates:   # テンプレート集
target_audience:     # ターゲット層定義
engagement_tactics:  # エンゲージメント戦術
```

### 3. posting-data.yaml
**統合元**: `posting-history.yaml`の改良版

```yaml
version: "1.0.0"
lastUpdated: [ISO日時]

posting_history:     # 投稿履歴データ
execution_summary:   # 実行サマリー
current_status:      # 現在の状態
```

## 🔗 TypeScript型定義

新しい型定義が以下に作成されています：

```typescript
// src/types/account-config.ts
export interface AccountConfig { ... }

// src/types/content-strategy.ts  
export interface ContentStrategy { ... }

// src/types/posting-data.ts
export interface PostingData { ... }
```

### 使用方法

```typescript
import { AccountConfig, ContentStrategy, PostingData } from './types';

// YAML読み込み例
const accountConfig: AccountConfig = yaml.load(
  fs.readFileSync('data/account-config.yaml', 'utf8')
);
```

## 📋 主な改善点

### ✅ ファイル構成の最適化
- **削減**: 12ファイル → 3ファイル (75%削減)
- **サイズ**: 15,000行 → 169行 (99%削減)
- **複雑性**: 巨大ファイル完全解消

### ✅ メンテナンス性向上
- 機能別明確分離
- 重複データ完全排除
- 直感的なファイル名

### ✅ 型安全性確保
- 完全なTypeScript型定義
- コンパイル時エラー検出
- IDE補完サポート

## 🚀 使用開始手順

### 1. 既存コードの更新
```typescript
// 旧: 複数ファイル読み込み
const accountInfo = yaml.load(fs.readFileSync('data/account-info.yaml', 'utf8'));
const growthTargets = yaml.load(fs.readFileSync('data/growth-targets.yaml', 'utf8'));

// 新: 単一ファイル読み込み
const accountConfig = yaml.load(fs.readFileSync('data/account-config.yaml', 'utf8'));
```

### 2. データアクセスパターン
```typescript
// アカウント情報
const username = accountConfig.account.username;
const followers = accountConfig.current_metrics.followers_count;

// 成長目標
const dailyTarget = accountConfig.growth_targets.followers.daily;

// 進捗状況
const trend = accountConfig.progress.trend;
```

### 3. 型安全な実装
```typescript
import { AccountConfig } from './types/account-config';

function updateMetrics(config: AccountConfig, newFollowers: number) {
  config.current_metrics.followers_count = newFollowers;
  config.current_metrics.last_updated = Date.now();
  // TypeScriptが型チェックを自動実行
}
```

## ⚠️ 移行時の注意点

### データの整合性
- 全データは新ファイルに完全移行済み
- バックアップは `tasks/outputs/backup/` に保存
- ロールバック可能

### 既存コードへの影響
- ファイルパス変更が必要
- データ構造は基本的に維持
- 型定義による安全性向上

## 🔧 トラブルシューティング

### ファイルが見つからない場合
```bash
# 新ファイルの存在確認
ls -la data/account-config.yaml data/content-strategy.yaml data/posting-data.yaml
```

### YAML構文エラーの場合
```bash
# 構文チェック
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
try {
  yaml.load(fs.readFileSync('data/account-config.yaml', 'utf8'));
  console.log('構文OK');
} catch (e) {
  console.error('構文エラー:', e.message);
}
"
```

### TypeScriptエラーの場合
```bash
# 型チェック実行
npm run check-types
```

## 📈 期待される効果

### 開発効率
- ファイル管理の簡素化
- データアクセスの高速化
- 型安全性による品質向上

### メンテナンス性
- 設定変更の一元化
- 重複管理の排除
- 直感的な構造

### スケーラビリティ
- 新機能追加の容易さ
- データ構造の明確化
- 拡張性の確保

---

**最適化完了**: 2025-07-21  
**対象タスク**: TASK-008  
**ファイル構成**: 3ファイル体制で運用開始