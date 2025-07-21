# TASK-004: 新YAML構造実装ガイド

**実装担当**: Worker  
**作成日**: 2025-07-21  
**依存文書**: `TASK-004-new-structure-design.yaml`

## 🎯 実装概要

9つのYAMLファイルを4つに統合し、MVP制約に従った最適化された構造を実現する。

**統合前**: 9ファイル（7つ使用中、2つ未使用）  
**統合後**: 4ファイル（全て使用、100行以下、明確な責任分離）

## 📋 実装前の必須確認事項

### 前提条件チェック
- [ ] TASK-001, TASK-002, TASK-003の調査結果確認済み
- [ ] 設計書 `TASK-004-new-structure-design.yaml` 熟読済み
- [ ] 現在のgitブランチがmainブランチであることを確認
- [ ] 作業環境でTypeScriptコンパイルが成功することを確認

### リスク認識
- **高リスク統合**: `strategic-decisions.yaml`, `posting-history.yaml`
- **コアシステム影響**: 4つのファイルでハードコード参照
- **ドキュメント更新**: 8つのドキュメントファイルで参照

## 🛠️ Phase 1: 事前準備とバックアップ

### 1.1 完全バックアップ作成

```bash
# バックアップディレクトリ作成
mkdir -p backups/yaml-integration-$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/yaml-integration-$(date +%Y%m%d_%H%M%S)"

# dataディレクトリ全体をバックアップ
cp -r data/ $BACKUP_DIR/
echo "バックアップ完了: $BACKUP_DIR"
```

### 1.2 新ファイル骨格作成

`data/` ディレクトリに以下の4つの空ファイルを作成：

#### `data/account-config.yaml`
```yaml
# アカウント基本設定と成長目標
# 統合元: account-info.yaml + growth-targets.yaml
version: "1.0.0"

account_info:
  # account-info.yamlの内容をここに移行

growth_targets:
  # growth-targets.yamlの内容をここに移行

current_metrics:
  # 新規セクション：現在のパフォーマンス指標
```

#### `data/content-strategy.yaml`
```yaml
# コンテンツ戦略とパターン管理
# 統合元: content-patterns.yaml + account-strategy.yaml(部分)
version: "1.0.0"

content_themes:
  # content-patterns.yamlの内容をここに移行

posting_schedule:
  # account-strategy.yamlの投稿スケジュール部分

engagement_tactics:
  # account-strategy.yamlのエンゲージメント戦略部分

templates:
  # 新規セクション：投稿テンプレート
```

#### `data/posting-data.yaml`
```yaml
# 実行データと分析結果
# 統合元: performance-insights.yaml + collection-results.yaml + quality-assessments.yaml
version: "1.0.0"

performance_insights:
  # performance-insights.yamlの内容をここに移行

collection_results:
  # collection-results.yamlの内容をここに移行

quality_assessments:
  # quality-assessments.yamlの内容をここに移行
```

#### `data/system-config.yaml`
```yaml
# システム設定と戦略決定
# 統合元: strategic-decisions.yaml + posting-history.yaml
version: "1.0.0"

strategic_decisions:
  # strategic-decisions.yamlの内容をここに移行

posting_history:
  # posting-history.yamlの内容をここに移行

system_settings:
  # 新規セクション：システム動作設定
```

### 1.3 型定義準備

以下の新しい型定義ファイルを作成：

#### `src/types/account-config.ts`
```typescript
export interface AccountConfig {
  version: string;
  account_info: {
    // AccountInfo の内容
    username: string;
    display_name: string;
    bio: string;
    profile_image_url?: string;
  };
  growth_targets: {
    // GrowthTargets の内容
    followers: number;
    engagement_rate: number;
    weekly_posts: number;
    monthly_reach: number;
  };
  current_metrics: {
    // 新規
    followers_count: number;
    following_count: number;
    posts_count: number;
    engagement_rate: number;
    last_updated: string;
  };
}
```

#### `src/types/content-strategy.ts`
```typescript
export interface ContentStrategy {
  version: string;
  content_themes: {
    // ContentPatterns の内容（新規型定義）
    primary_topics: string[];
    content_types: string[];
    tone: string;
    target_audience: string;
  };
  posting_schedule: {
    frequency: string;
    preferred_times: string[];
    time_zone: string;
  };
  engagement_tactics: {
    hashtag_strategy: string[];
    mention_strategy: string;
    reply_approach: string;
  };
  templates: {
    // PostTemplate[] に相当
    post_formats: any[];
  };
}
```

#### `src/types/posting-data.ts`
```typescript
export interface PostingData {
  version: string;
  performance_insights: {
    // PerformanceInsights の内容
    top_performing_posts: any[];
    engagement_patterns: any;
    growth_metrics: any;
  };
  collection_results: {
    // CollectionResult[] に相当
    collected_data: any[];
    analysis_summary: any;
  };
  quality_assessments: {
    // QualityScore[] に相当
    content_quality_scores: any[];
    improvement_suggestions: string[];
  };
}
```

#### `src/types/system-config.ts`
```typescript
export interface SystemConfig {
  version: string;
  strategic_decisions: {
    // StrategicDecisions の内容
    current_phase: string;
    decision_history: any[];
    next_actions: string[];
  };
  posting_history: {
    // PostHistory[] に相当
    posts: any[];
    execution_log: any[];
  };
  system_settings: {
    // 新規
    automation_level: string;
    safety_checks: boolean;
    backup_frequency: string;
  };
}
```

## 🔄 Phase 2: 低リスク統合（並行実行可能）

### 2.1 account-config.yaml統合

**影響範囲**: 
- `src/lib/x-client.ts` (account-info.yaml使用)
- `src/lib/growth-system-manager.ts` (growth-targets.yaml使用)

**実行手順**:

1. **元データ確認**:
```bash
# 現在の内容を確認
cat data/account-info.yaml
cat data/growth-targets.yaml
```

2. **account-config.yamlにデータ統合**:
```yaml
# data/account-config.yaml
version: "1.0.0"

account_info:
  username: "your_username"  # account-info.yamlから移行
  display_name: "Your Display Name"
  bio: "Your bio text"
  profile_image_url: "https://example.com/image.jpg"

growth_targets:
  followers: 10000  # growth-targets.yamlから移行
  engagement_rate: 0.05
  weekly_posts: 7
  monthly_reach: 50000

current_metrics:
  followers_count: 0
  following_count: 0
  posts_count: 0
  engagement_rate: 0.0
  last_updated: "2025-07-21T12:00:00Z"
```

3. **x-client.ts更新**:
```typescript
// src/lib/x-client.ts
// 変更前:
// const accountInfo = JSON.parse(fs.readFileSync('data/account-info.yaml', 'utf8'));

// 変更後:
import { AccountConfig } from '../types/account-config';
const accountConfig: AccountConfig = loadYamlSafe('data/account-config.yaml');
const accountInfo = accountConfig.account_info;
```

4. **growth-system-manager.ts更新**:
```typescript
// src/lib/growth-system-manager.ts
// 変更前:
// const growthTargets = loadYamlSafe('data/growth-targets.yaml');

// 変更後:
import { AccountConfig } from '../types/account-config';
const accountConfig: AccountConfig = loadYamlSafe('data/account-config.yaml');
const growthTargets = accountConfig.growth_targets;
```

5. **TypeScriptコンパイル確認**:
```bash
npx tsc --noEmit
```

### 2.2 posting-data.yaml統合

**影響範囲**: 
- `src/lib/growth-system-manager.ts` (performance-insights.yaml使用)

**実行手順**:

1. **元データ確認**:
```bash
cat data/performance-insights.yaml
cat data/collection-results.yaml    # 未使用
cat data/quality-assessments.yaml   # 未使用
```

2. **posting-data.yamlにデータ統合**:
```yaml
# data/posting-data.yaml
version: "1.0.0"

performance_insights:
  # performance-insights.yamlの全内容をここに移行
  analysis_date: "2025-07-21"
  top_performing_posts: []
  engagement_patterns: {}
  growth_metrics: {}

collection_results:
  # collection-results.yamlの内容（未使用だが統合）
  collected_data: []
  analysis_summary: {}

quality_assessments:
  # quality-assessments.yamlの内容（未使用だが統合）
  content_quality_scores: []
  improvement_suggestions: []
```

3. **growth-system-manager.ts更新**:
```typescript
// src/lib/growth-system-manager.ts
// 変更前:
// const performanceInsights = loadYamlSafe('data/performance-insights.yaml');

// 変更後:
import { PostingData } from '../types/posting-data';
const postingData: PostingData = loadYamlSafe('data/posting-data.yaml');
const performanceInsights = postingData.performance_insights;
```

### 2.3 Phase 2完了確認

```bash
# TypeScriptコンパイル確認
npx tsc --noEmit

# 影響を受けるコンポーネントのテスト
# - Xクライアント機能
# - 成長システム管理機能
```

## 🔄 Phase 3: 中リスク統合

### 3.1 content-strategy.yaml統合

**影響範囲**: 
- `src/utils/monitoring/health-check.ts` (content-patterns.yaml使用)
- `src/lib/growth-system-manager.ts` (account-strategy.yaml使用)

**注意事項**: account-strategy.yamlは**部分統合**のみ。残りは後のフェーズで対応。

**実行手順**:

1. **account-strategy.yamlの内容分析**:
```bash
cat data/account-strategy.yaml
# コンテンツ戦略部分と、システム戦略部分を識別
```

2. **content-strategy.yamlにデータ統合**:
```yaml
# data/content-strategy.yaml
version: "1.0.0"

content_themes:
  # content-patterns.yamlの全内容を移行
  primary_topics: ["trading", "investment", "market_analysis"]
  content_types: ["educational", "news", "analysis"]
  tone: "professional"
  target_audience: "traders"

posting_schedule:
  # account-strategy.yamlのスケジュール部分のみ移行
  frequency: "daily"
  preferred_times: ["09:00", "15:00", "21:00"]
  time_zone: "Asia/Tokyo"

engagement_tactics:
  # account-strategy.yamlのエンゲージメント部分のみ移行
  hashtag_strategy: ["#trading", "#investment"]
  mention_strategy: "selective"
  reply_approach: "professional"

templates:
  post_formats: []
```

3. **health-check.ts更新**:
```typescript
// src/utils/monitoring/health-check.ts
// 変更前:
// const contentPatterns = loadYamlSafe('data/content-patterns.yaml');

// 変更後:
import { ContentStrategy } from '../types/content-strategy';
const contentStrategy: ContentStrategy = loadYamlSafe('data/content-strategy.yaml');
const contentPatterns = contentStrategy.content_themes;
```

4. **growth-system-manager.tsの部分更新**:
```typescript
// account-strategy.yamlの使用箇所を特定し、
// コンテンツ戦略部分のみcontent-strategy.yamlから読み込むよう変更
// システム戦略部分はそのまま残す
```

## 🔄 Phase 4: 高リスク統合（最重要）

### 4.1 事前準備（必須）

```bash
# 追加バックアップ作成
cp -r data/ backups/phase4-backup-$(date +%Y%m%d_%H%M%S)/

# コアシステムの現在の動作確認
npm run test  # またはシステムの動作確認コマンド
```

### 4.2 system-config.yaml統合

**⚠️ 高リスク**: 3箇所ずつで使用される最重要ファイルを統合

**影響範囲**: 
- `src/core/decision-engine.ts` (strategic-decisions.yaml)
- `src/core/parallel-manager.ts` (strategic-decisions.yaml)
- `src/lib/claude-max-integration.ts` (posting-history.yaml)
- `src/lib/x-client.ts` (posting-history.yaml)
- `src/utils/monitoring/health-check.ts` (posting-history.yaml)

**実行手順**:

1. **現在の内容確認**:
```bash
cat data/strategic-decisions.yaml
cat data/posting-history.yaml
```

2. **system-config.yamlにデータ統合**:
```yaml
# data/system-config.yaml
version: "1.0.0"

strategic_decisions:
  # strategic-decisions.yamlの全内容を移行
  current_phase: "growth"
  decision_history: []
  next_actions: []

posting_history:
  # posting-history.yamlの全内容を移行
  posts: []
  execution_log: []

system_settings:
  automation_level: "full"
  safety_checks: true
  backup_frequency: "daily"
```

3. **decision-engine.ts更新**:
```typescript
// src/core/decision-engine.ts
// 変更前:
// const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');

// 変更後:
import { SystemConfig } from '../types/system-config';
const systemConfigPath = path.join(process.cwd(), 'data', 'system-config.yaml');
const systemConfig: SystemConfig = loadYamlSafe(systemConfigPath);
const strategicDecisions = systemConfig.strategic_decisions;
```

4. **parallel-manager.ts更新**:
```typescript
// src/core/parallel-manager.ts の動的参照部分を更新
// 注意: target変数による動的参照の詳細調査が必要
```

5. **claude-max-integration.ts更新**:
```typescript
// src/lib/claude-max-integration.ts
// 変更前:
// const historyPath = path.join(process.cwd(), 'data', 'posting-history.yaml');

// 変更後:
import { SystemConfig } from '../types/system-config';
const systemConfig: SystemConfig = loadYamlSafe('data/system-config.yaml');
const postingHistory = systemConfig.posting_history;
```

6. **段階的確認**:
```bash
# 各ファイル更新後にTypeScriptコンパイル確認
npx tsc --noEmit

# コアシステム動作確認
# - 決定エンジンの動作確認
# - 並列マネージャーの動作確認
# - Claude統合システムの動作確認
```

### 4.3 動的参照の特別対応

**parallel-manager.tsの動的参照問題**:

```typescript
// src/core/parallel-manager.ts の例
// const targetPath = path.join(dataDir, target);
// この target 変数が何を参照するかの詳細調査が必要

// 対応方法例:
if (target === 'strategic-decisions.yaml') {
  // system-config.yamlのstrategic_decisionsセクションを参照
  const systemConfig = loadYamlSafe('data/system-config.yaml');
  return systemConfig.strategic_decisions;
} else if (target === 'posting-history.yaml') {
  // system-config.yamlのposting_historyセクションを参照
  const systemConfig = loadYamlSafe('data/system-config.yaml');
  return systemConfig.posting_history;
}
```

## 🔄 Phase 5: 最終クリーンアップ

### 5.1 旧ファイル削除

**⚠️ 注意**: バックアップが確実に存在することを確認してから実行

```bash
# 統合完了の最終確認
npx tsc --noEmit
npm run test  # 全システムテスト

# 旧ファイル削除（バックアップ保持）
rm data/account-info.yaml
rm data/account-strategy.yaml  # content-strategy.yamlへの統合完了後
rm data/collection-results.yaml
rm data/content-patterns.yaml
rm data/growth-targets.yaml
rm data/performance-insights.yaml
rm data/posting-history.yaml
rm data/quality-assessments.yaml
rm data/strategic-decisions.yaml

# 残るファイル確認
ls data/
# 期待結果: account-config.yaml, content-strategy.yaml, posting-data.yaml, system-config.yaml
```

### 5.2 ドキュメント更新

以下の8つのドキュメントファイルを更新：

1. **docs/reference.md**
2. **docs/architecture.md**
3. **docs/operations.md**
4. **docs/setup.md**
5. **docs/common/naming-conventions.md**
6. **docs/CLAUDE.md**
7. **CLAUDE.md**

**更新内容**: 旧ファイル名 → 新ファイル名、新しい構造の説明

### 5.3 最終動作確認

```bash
# 全システムの総合テスト
npm run test

# TypeScriptコンパイル最終確認
npx tsc --noEmit

# 各新ファイルの読み込みテスト
node -e "
const yaml = require('yaml');
const fs = require('fs');
console.log('Testing account-config.yaml...');
const accountConfig = yaml.parse(fs.readFileSync('data/account-config.yaml', 'utf8'));
console.log('✓ account-config.yaml loaded successfully');

console.log('Testing content-strategy.yaml...');
const contentStrategy = yaml.parse(fs.readFileSync('data/content-strategy.yaml', 'utf8'));
console.log('✓ content-strategy.yaml loaded successfully');

console.log('Testing posting-data.yaml...');
const postingData = yaml.parse(fs.readFileSync('data/posting-data.yaml', 'utf8'));
console.log('✓ posting-data.yaml loaded successfully');

console.log('Testing system-config.yaml...');
const systemConfig = yaml.parse(fs.readFileSync('data/system-config.yaml', 'utf8'));
console.log('✓ system-config.yaml loaded successfully');

console.log('All YAML files loaded successfully!');
"
```

## 📊 成功基準チェックリスト

### 機能要件
- [ ] 全ての既存機能が統合後も正常動作
- [ ] TypeScriptコンパイルエラーゼロ
- [ ] ファイル数の4個への削減達成
- [ ] 各ファイル100行以下の制約遵守

### 品質要件
- [ ] 型安全性の完全保持
- [ ] 明確な責任分離の実現
- [ ] 重複データの完全排除

### 運用要件
- [ ] 段階的移行の実現
- [ ] ロールバック可能性の確保（バックアップ存在）
- [ ] ドキュメント整合性の維持

## 🚨 トラブルシューティング

### TypeScriptエラーが発生した場合
1. エラー箇所の特定
2. 型定義の確認と修正
3. import文の更新確認

### 動作確認で異常が発生した場合
1. 即座に作業を停止
2. バックアップからの復元を検討
3. 該当フェーズの手順を再確認

### ロールバック手順
```bash
# 緊急時のロールバック
rm -rf data/
cp -r backups/yaml-integration-[最新タイムスタンプ]/data/ ./
git checkout -- src/  # 必要に応じて
```

## 📝 実装完了時の報告項目

1. **実行したフェーズと結果**
2. **発生した問題と解決方法**
3. **最終的なファイル構成**
4. **TypeScriptコンパイル結果**
5. **動作確認結果**
6. **今後の推奨事項**

---

**重要**: このガイドは段階的実行を前提とし、各フェーズで問題が発生した場合は即座に停止し、前段階への復元を検討してください。MVP制約に従い、完璧な実装よりも動作する実装を優先してください。