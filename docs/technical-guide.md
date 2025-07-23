# TradingAssistantX 技術ガイド

## 1. システムビジョンと理想像

### Claude Code SDK中心の完全自律システム

**革新的中心技術**: Claude Code SDKによる意思決定の完全委託

TradingAssistantXは、Claude Code SDKを中心とした完全自律システムです：
- 🎯 **自律的テーマ決定**: Claudeが市場分析して最適テーマを決定
- 📊 **自律的データ収集**: 必要データを自動収集・分析
- ✍️ **自律的投稿作成**: Claude Code SDKが全意思決定を担当し最適投稿を生成
- 🔄 **継続的最適化**: 実行結果から学習し品質向上

### 自律的成長エンジン

- **1日15回の定時実行**で最適投稿時間に自律実行
- **アカウント現状把握**と次の成長要素を自己分析
- **フォロワー反応やトレンド学習**による投稿戦略自動更新
- **失敗からの学習**による継続的品質改善

### インテリジェントな意思決定

- **AI駆動の全自動プロセス**（人間の指示待ち不要）
- **状況に応じた適応的戦略切替**
- **人間では気づかない成長機会**の自動発見

## 2. システムアーキテクチャ

### 完全疎結合設計の重要性

**データソース独立性と意思決定分岐の容易性確保**

TradingAssistantXの中核となる設計原則です：
- 🔗 **データソース疎結合**: 各収集源（RSS/API/Community）は完全独立動作
- 📊 **統一インターフェース**: CollectionResult型でデータ統合、ソース固有性保持
- ⚡ **動的戦略切替**: ActionSpecificCollectorによる動的データ収集戦略
- 🎛️ **設定駆動制御**: YAML設定によるソース選択・優先度制御

```
意思決定層 (core/): アカウント状況分析・戦略選択
     ↓ 戦略指示
データ収集層 (collectors/): RSS・API・Community (独立)
     ↓ 構造化データ  
コンテンツ創造層 (services/): 投稿生成・品質確保・投稿実行
     ↓ 実行結果
学習・最適化層 (data/): 結果分析・戦略更新・階層管理
```

## 3. MVP構成とYAML駆動開発

### RSS Collector中心の段階的実装

**Phase 1 (MVP)**: RSS Collectorのみで投資教育コンテンツを収集・生成
**将来拡張**: API、Community、Webスクレイピングなど多様なデータソースを段階的に追加

### RSS Collectorの特徴

- **主要金融メディア**のRSSフィードから効率収集
- **構造化データ**で安定した情報品質確保
- **動的クエリ対応**: Google News検索と連携、テーマに応じた柔軟な情報収集
  - 固定URLとクエリベースの両方式をサポート
  - YAMLで「query」フィールドを指定すると自動的に検索URLを生成
  - Claude Code SDKが自律的に最適な検索条件を選択可能

### アカウント分析の特別扱い

- **Playwright使用**: 自アカウントの分析（フォロワー数、エンゲージメント率）のみPlaywrightを使用
- **分析と収集の分離**: アカウント分析（Playwright）と情報収集（RSS）は完全に独立
- **認証対応**: X APIの制限を回避し、確実に自アカウントデータを取得
- **最小限の利用**: ブラウザ自動化は自アカウント分析に限定し、一般的な情報収集にはRSSを使用

## 4. Claude Code SDK意思決定カタログ

### 利用可能なアクション・カタログ

#### データ収集戦略
- **RSS集中収集** (`collectors/rss-collector.ts`): 安定情報収集、API制限回避
- **アカウント分析** (`collectors/playwright-account.ts`): 自己状況把握、戦略調整
- **複合データ収集** (将来拡張): 多角的情報、独自性高コンテンツ

#### コンテンツ生成戦略
- **教育重視型**: フォロワー初心者中心、信頼性向上
- **トレンド対応型**: 話題性重視、短期エンゲージメント向上
- **分析特化型**: 市場複雑時、権威性向上

#### 投稿タイミング戦略
- **定時投稿**: 安定習慣形成、継続エンゲージメント
- **機会的投稿**: 重要ニュース時、注目度最大化
- **最適化投稿**: データ分析後、ROI最大化

### アカウント成長段階別戦略

1. **集中特化段階**: 投資基礎教育特化（エンゲージメント低・テーマ分散時）
2. **段階的拡張段階**: 核テーマ60% + 関連テーマ40%（安定エンゲージメント時）
3. **多様化展開段階**: 動的戦略適用（高エンゲージメント・複数実績時）

### 3次元判断マトリクス

**優先順位**: 外部環境 > エンゲージメント状態 > 成長段階

```
[外部環境] 緊急対応 → 分析特化型 + 機会的投稿
[通常環境] → [エンゲージメント判断]
  ├── 低エンゲージメント → 集中特化段階強制 + トレンド対応強化
  ├── 安定エンゲージメント → 成長段階適用
  │   ├── 集中特化段階 → RSS集中 + 教育重視 + 定時投稿
  │   ├── 段階的拡張段階 → 複合収集 + バランス型 + 最適化投稿
  │   └── 多様化展開段階 → 戦略的収集 + 分析特化 + 機会的投稿
  └── 高エンゲージメント → 現在戦略維持 + 質的向上集中
```

### 自律実行フロー

```
[1] 現在状況分析 (account-status.yaml・active-strategy.yaml読み込み)
[2] アカウント成長段階判定 + 戦略選択
[3] データ収集実行 (選択されたCollector起動)
[4] コンテンツ生成 (選択された戦略でcontent-creator実行)
[5] 品質確認・投稿実行 (x-poster.ts)
[6] 結果記録・学習データ更新 (data/learning/)
```

## 5. ディレクトリ構造

### /src ディレクトリ詳細（最新構造）

```
src/
├── core/                   # コアシステム
│   ├── autonomous-executor.ts      # 自律実行エンジン
│   │                               # 自律的な意思決定と実行フローを制御
│   ├── decision-engine.ts         # 意思決定エンジン
│   │                               # 収集データを基に最適な戦略を選択
│   └── loop-manager.ts           # ループ実行管理
│                                   # 1日15回の定時実行を制御
├── collectors/             # データ収集（疎結合設計）
│   ├── rss-collector.ts          # RSS収集（MVP・動的クエリ対応）
│   │                               # 固定URLとGoogle News検索の両方対応
│   │                               # 主要金融メディア + 動的検索クエリ
│   ├── playwright-account.ts     # アカウント分析専用（Playwright使用）
│   │                               # X API制限回避、自アカウント状態分析のみ
│   └── base-collector.ts         # 基底クラス（疎結合設計）
│                                   # CollectionResult型による統一インターフェース
├── services/               # ビジネスロジック
│   ├── content-creator.ts        # 投稿コンテンツ生成
│   │                               # Claude Code SDK中心の教育的コンテンツ生成
│   ├── data-hierarchy-manager.ts # 階層データ管理（3層構造）
│   │                               # current→learning→archives自動移行
│   ├── performance-analyzer.ts   # 分析・評価
│   │                               # エンゲージメント分析・成功パターン抽出
│   └── x-poster.ts              # X投稿
│                                   # 生成コンテンツをX（Twitter）に投稿
├── utils/                  # ユーティリティ（最適化済み）
│   ├── yaml-manager.ts         # YAML高度操作
│   ├── yaml-utils.ts           # YAML基本操作
│   ├── context-compressor.ts   # コンテキスト圧縮
│   │                               # Claude Code SDK向けコンテキスト最適化
│   ├── error-handler.ts        # エラーハンドリング
│   ├── file-size-monitor.ts    # ファイルサイズ監視
│   └── monitoring/
│       └── health-check.ts     # システムヘルスチェック
└── scripts/                # 実行スクリプト
    ├── main.ts      # ループ実行（pnpm start）
    ├── dev.ts       # 単一実行（pnpm dev）
    └── core-runner.ts # 共通実行ロジック
```

### /data ディレクトリ詳細（最重要）

```
data/
├── config/                 # システム設定（読み取り専用）
│   ├── autonomous-config.yaml    # 自律実行設定
│   │   └── 実行モード、品質閾値、最大投稿数等を定義
│   ├── posting-times.yaml       # 投稿時間設定
│   │   └── 1日15回の最適投稿時間を定義
│   ├── rss-sources.yaml         # RSSフィード設定
│   │   └── 収集対象の金融メディアRSSフィードURL一覧
│   └── brand-strategy.yaml      # ブランド戦略設定
│       └── フォロワー数に応じたコンテンツ戦略を定義
│
├── current/                # ホットデータ層（直近7日分・最大1MB）
│   ├── account-status.yaml      # アカウント状態
│   │   └── フォロワー数、エンゲージメント率等
│   ├── active-strategy.yaml     # アクティブな戦略
│   │   └── 現在適用中のコンテンツ戦略
│   ├── today-posts.yaml         # 本日の投稿記録
│   │   └── 当日の投稿内容と結果
│   ├── weekly-summary.yaml      # 週次サマリー
│   │   └── 直近7日間の成果とインサイト
│   └── execution-log.yaml       # 実行ログ（整合性監査用）
│       └── ファイル作成・更新・削除の記録
│
├── learning/               # ウォームデータ層（90日分の分析済みデータ・最大10MB）
│   ├── post-insights.yaml       # 投稿分析結果（必須）
│   │   └── エンゲージメント分析、成功パターンの抽出
│   └── engagement-patterns.yaml # エンゲージメントパターン（必須）
│       └── 時間帯・トピック別の反応傾向
│
└── archives/               # コールドデータ層（永続保存・容量無制限）
    ├── posts/                   # 全投稿の生データ
    │   └── 2025-01/            # 月別ディレクトリ
    │       └── 投稿の完全なアーカイブ
    └── insights/               # 古い分析結果
        └── 2024-Q4/            # 四半期別アーカイブ
            └── 過去の学習データとインサイト
```

### /tasks ディレクトリ

```
tasks/
├── outputs/                # 実行結果出力
│   └── 各種分析結果、生成コンテンツの一時保存
├── {TIMESTAMP}/           # タスク別ディレクトリ
│   ├── instructions/      # Manager作成の指示書
│   ├── outputs/          # タスク固有の出力
│   ├── analysis/         # 分析結果
│   ├── reports/          # 実行報告書
│   └── temporary/        # 一時ファイル
└── temporary/             # 共通一時ファイル置き場
```

## 6. データフロー設計

### Claude Code SDK中心の実行フロー

```
[1] 自律実行開始 (main.ts / dev.ts)
         ↓
[2] core/execution/core-runner.ts 起動
         ↓
[3] 現在のシステム状態を収集
     - account-status.yaml（アカウント状態）
     - 市場データ（RSS等から取得）
     - システムヘルス情報
         ↓
[4] claude-autonomous-agent.ts 経由でClaude Code SDKに問い合わせ
     「現在の状況で何をすべきか？」
         ↓
[5] Claudeが次の行動を決定
     ├── データ収集 → 収集対象とCollectorを指定
     ├── 投稿作成 → 内容とテーマを生成
     ├── 分析 → 分析対象と方法を指定
     └── 待機 → 理由と待機時間を指定
         ↓
[6] Claudeの決定に基づいて実行
         ↓
[7] 実行結果をClaude Code SDKにフィードバック
         ↓
[8] Claudeが結果を評価し、学習データを更新
         ↓
[9] 結果を階層データに記録（current → learning → archives）
         ↓
[10] data-optimizer.ts による階層データ管理・自動移行
         ↓
[11] integrity-checker.ts による事後検証
```

### データの流れ

```
Claudeへの情報提供:
  System State + Market Data + Account Status → claude-autonomous-agent.ts
           ↓
Claudeの意思決定:
  claude-autonomous-agent.ts → Action Decision (JSON)
           ↓
実行フェーズ:
  [データ収集の場合]
    Claude Decision → Specified Collector → CollectionResult
  [投稿作成の場合]
    Claude Decision → content-creator.ts → x-poster.ts
  [分析の場合]
    Claude Decision → performance-analyzer.ts
           ↓
フィードバック:
  Execution Result → claude-autonomous-agent.ts → Learning Update
           ↓
保存フェーズ:
  結果 → data/learning/*.yaml → 次回実行時にClaudeが参照
```

## 7. 疎結合Collector設計

### 設計原則

疎結合設計は、システムの拡張性と保守性を確保する最重要アーキテクチャ原則です。

**重要性**：
- **データソース独立性**: 各Collectorは完全に独立して動作し、相互依存なし
- **統一インターフェース**: CollectionResult型による抽象化で新規データソース追加が容易
- **戦略的切り替え**: YAML設定変更だけでデータソースの有効/無効を制御
- **拡張性重視**: 新しいCollectorを追加しても既存コードへの影響を最小化

### Collectorインターフェース

#### base-collector.ts の役割

```typescript
// 基底クラスの構造
export abstract class BaseCollector {
  abstract collect(context: CollectionContext): Promise<CollectionResult>;
  
  // 共通の検証ロジック
  protected validateResult(result: CollectionResult): boolean {
    // データ品質チェック
  }
}
```

#### CollectionResult型の構造

```typescript
interface CollectionResult {
  source: string;           // データソース識別子
  timestamp: string;        // 収集時刻
  data: {
    items: CollectedItem[]; // 収集されたアイテム
    metadata: {
      quality: number;      // データ品質スコア（0-1）
      relevance: number;    // 関連性スコア（0-1）
      count: number;        // アイテム数
    };
  };
  errors?: string[];        // エラー情報（あれば）
}

interface CollectedItem {
  title: string;            // タイトル
  content: string;          // 本文
  url?: string;             // ソースURL
  publishedAt?: string;     // 公開日時
  tags?: string[];          // タグ・カテゴリ
  importance?: number;      // 重要度スコア
}
```

#### 新規Collector追加方法

1. `src/collectors/`に新規ファイル作成
2. `BaseCollector`を継承
3. `collect`メソッドを実装
4. `CollectionResult`型で結果を返却
5. `data/config/`に対応する設定YAMLを追加

例：
```typescript
// src/collectors/new-source-collector.ts
export class NewSourceCollector extends BaseCollector {
  async collect(context: CollectionContext): Promise<CollectionResult> {
    // 独自の収集ロジック
    const items = await this.fetchFromNewSource();
    
    return {
      source: 'new-source',
      timestamp: new Date().toISOString(),
      data: {
        items,
        metadata: {
          quality: this.calculateQuality(items),
          relevance: this.calculateRelevance(items),
          count: items.length
        }
      }
    };
  }
}
```

## 8. YAML仕様

### 設定ファイル仕様

**基本ルール**：
- 配置場所: `data/`ディレクトリ以下のみ
- ファイル形式: `.yaml`拡張子必須
- 文字コード: UTF-8
- インデント: スペース2文字

### 各YAMLファイルの詳細

#### autonomous-config.yaml

```yaml
version: "1.0"
autonomous:
  enabled: true              # 自律実行の有効/無効
  mode: "balanced"           # 実行モード: aggressive/balanced/conservative
  
posting:
  max_per_day: 15           # 1日の最大投稿数
  quality_threshold: 0.8    # 投稿品質の最低閾値（0-1）
  min_interval_minutes: 30  # 投稿間隔の最小値（分）
  
data_management:
  max_current_files: 10     # currentディレクトリの最大ファイル数
  archive_after_days: 30    # アーカイブまでの日数
  cleanup_interval_hours: 24 # クリーンアップ実行間隔
```

#### posting-times.yaml

```yaml
version: "1.0"
schedule:
  timezone: "Asia/Tokyo"
  prime_times:              # 優先投稿時間帯
    - time: "07:00-08:00"
      priority: "high"
      reason: "朝の通勤時間帯"
    - time: "12:00-13:00"
      priority: "medium"
      reason: "昼休み時間帯"
    - time: "18:00-19:00"
      priority: "high"
      reason: "夕方の帰宅時間帯"
    - time: "21:00-23:00"
      priority: "medium"
      reason: "夜のリラックスタイム"
      
  avoid_times:              # 投稿を避ける時間帯
    - time: "02:00-05:00"
      reason: "深夜帯・低エンゲージメント"
```

#### rss-sources.yaml（動的クエリ対応版）

**特徴**: Claude Code SDKが状況に応じて最適なクエリを選択できる革新的設計

```yaml
version: "1.0"
sources:
  financial_news:
    # 固定URL方式（安定ソース）
    - name: "日経電子版"
      url: "https://www.nikkei.com/rss/news.rdf"
      category: "general_market"
      priority: "high"
      reliability: 0.95
      
    - name: "ブルームバーグ日本"
      url: "https://www.bloomberg.co.jp/rss/news.rdf"
      category: "global_market"
      priority: "high"
      reliability: 0.90
      
    # 動的クエリ方式（Google News検索連携）
    - name: "投資基礎教育_インテリジェント"
      query: "投資 初心者 基礎 解説"
      category: "educational_content"
      priority: "high"
      search_type: "google_news"
      adaptive: true  # Claudeがクエリを動的に調整可能
      context_aware: true  # アカウント状況に応じて適応
      
    - name: "市場緊急_アダプティブ"
      query: "株価急落 OR 市場暴落 OR 金利急上昇 OR 経済ショック"
      category: "emergency_news"
      priority: "urgent"
      search_type: "google_news"
      trigger_conditions: ["market_volatility", "breaking_news"]
      adaptive: true
      
    # コンテキストアウェアクエリ（Claudeが自動生成）
    - name: "アダプティブ_コンテンツ"
      query_template: "{{theme}} {{skill_level}} {{market_condition}}"
      category: "dynamic_content"
      priority: "medium"
      search_type: "google_news"
      claude_controlled: true  # Claudeが完全に制御
      variables:
        theme: ["投資", "資産運用", "ポートフォリオ"]
        skill_level: ["初心者", "中級者", "上級者"]
        market_condition: ["上昇相場", "下落相場", "横ばい"]
      
  market_analysis:
    - name: "ロイター日本"
      url: "https://jp.reuters.com/rss/topNews.rdf"
      category: "breaking_news"
      priority: "medium"
      reliability: 0.85
      
# インテリジェント設定
settings:
  fetch_limit_per_source: 10
  cache_duration_minutes: 60
  
  # 動的クエリ機能
  dynamic_query_enabled: true
  google_news_base_url: "https://news.google.com/rss/search"
  
  # Claude Code SDK連携設定
  claude_query_optimization: true    # Claudeがクエリを最適化
  context_integration: true         # アカウント状況をクエリに反映
  real_time_adaptation: true        # リアルタイムでクエリ調整
  
  # 品質管理
  min_content_quality: 0.7         # 最低コンテンツ品質闾値
  duplicate_detection: true        # 重複コンテンツ検出
  relevance_threshold: 0.6         # 関連性闾値
```

#### 動的クエリの仕組み

1. **固定URL**: 安定した情報ソースから基本情報を収集
2. **簡単クエリ**: 事前定義されたキーワードで検索
3. **アダプティブクエリ**: Claudeが状況に応じてクエリを修正
4. **コンテキストアウェア**: アカウント状態や市場状況を考慮した検索

#### account-status.yaml

```yaml
version: "1.0"
account:
  username: "@TradingAssistantX"
  created_at: "2024-01-01"
  
metrics:
  followers_count: 1234
  following_count: 567
  total_posts: 890
  
engagement:
  average_likes: 45.6
  average_retweets: 12.3
  average_replies: 8.9
  engagement_rate: 0.054  # (likes + retweets + replies) / impressions
  
growth:
  followers_7d: +123
  followers_30d: +456
  growth_rate_7d: 0.11
  growth_rate_30d: 0.58
  
last_updated: "2024-01-22T10:30:00Z"
```

#### brand-strategy.yaml

```yaml
version: "1.0"
strategies:
  beginner_focused:  # 0-1000フォロワー
    range: [0, 1000]
    theme: "投資初心者向け基礎教育"
    content_ratio:
      educational: 0.8
      news_commentary: 0.2
    tone: "親しみやすく、分かりやすい"
    
  growth_phase:      # 1000-5000フォロワー
    range: [1000, 5000]
    themes:
      core: 
        name: "投資基礎教育"
        ratio: 0.6
      related:
        - name: "市場分析"
          ratio: 0.25
        - name: "銘柄解説"
          ratio: 0.15
    tone: "専門的だが理解しやすい"
    
  established:       # 5000+フォロワー
    range: [5000, null]
    themes: "dynamic"  # 動的に選択
    tone: "権威的かつ親近感のある"
```

## 9. ハルシネーション防止機構

### 整合性検証システム

システムの信頼性を保証する最重要機能。要件定義との完全な整合性を維持します。

### integrity-checker.tsの役割

#### 実行前検証

```typescript
class IntegrityChecker {
  // 実行前チェック
  async preExecutionCheck(): Promise<ValidationResult> {
    // 1. ディレクトリ構造の検証
    const structureValid = await this.validateDirectoryStructure();
    
    // 2. 必須ファイルの存在確認
    const filesExist = await this.validateRequiredFiles();
    
    // 3. ファイルサイズ制限チェック
    const sizesValid = await this.validateFileSizes();
    
    // 4. 命名規則の確認
    const namingValid = await this.validateNamingConventions();
    
    return {
      passed: structureValid && filesExist && sizesValid && namingValid,
      errors: [...] // 詳細なエラー情報
    };
  }
}
```

#### 実行後検証

```typescript
  // 実行後チェック
  async postExecutionCheck(executionLog: ExecutionLog): Promise<ValidationResult> {
    // 1. 作成されたファイルの検証
    const createdValid = this.validateCreatedFiles(executionLog.files_created);
    
    // 2. 更新されたファイルの検証
    const updatedValid = this.validateUpdatedFiles(executionLog.files_updated);
    
    // 3. 削除されたファイルの検証
    const deletedValid = this.validateDeletedFiles(executionLog.files_deleted);
    
    // 4. 許可されたパスのみへの書き込み確認
    const pathsValid = this.validateWritePaths(executionLog);
    
    return {
      passed: createdValid && updatedValid && deletedValid && pathsValid,
      errors: [...] 
    };
  }
```

#### ロールバック機能

```typescript
  // 異常検出時のロールバック
  async rollback(backup: SystemBackup): Promise<void> {
    // 1. 不正なファイルの削除
    await this.removeInvalidFiles();
    
    // 2. バックアップからの復元
    await this.restoreFromBackup(backup);
    
    // 3. 実行ログへの記録
    await this.logRollback();
  }
```

### 検証ルール

1. **構造検証**: 要件定義のディレクトリ構造と完全一致
2. **ファイル数制限**: data/current/は最大10ファイル
3. **階層別サイズ制限**: 
   - current/: 最大1MB（ホットデータ）
   - learning/: 最大10MB（ウォームデータ）
   - archives/: 無制限（コールドデータ）
4. **命名規則**: 要件定義に記載されたファイル名のみ使用可
5. **書き込み権限**: 許可されたディレクトリのみ書き込み可能
6. **自動階層移動**: 古いデータは自動的に下位層へ移動し、分析結果のみ保持

## 10. 拡張ポイント

### 新機能追加時の考慮事項

1. **疎結合の維持**
   - 新Collectorは必ずBaseCollectorを継承
   - 既存コードへの変更を最小限に
   - 依存関係の明確化

2. **YAMLファースト**
   - 新機能の設定は必ずYAMLで管理
   - ハードコーディングの禁止
   - 設定の動的読み込み

3. **整合性の保証**
   - integrity-checkerへの検証ルール追加
   - 要件定義の更新と同期
   - テストケースの追加

### プラグイン的な設計思想

```
新機能追加の流れ:
1. 新Collector作成 → BaseCollector継承
                  ↓
2. YAML設定追加 → data/config/に配置
                  ↓
3. DecisionEngineに統合 → 戦略選択ロジックに組み込み
                  ↓
4. 検証ルール追加 → integrity-checkerを更新
                  ↓
5. ドキュメント更新 → 技術ガイドに追記
```

この設計により、システムの中核を変更することなく、新しい機能を安全に追加できます。

## 11. 階層型データ管理システム（3層構造）

### 設計思想

Claude Code SDK向けに必要最小限の高品質データのみを保持し、継続的成長を実現する階層型アーキテクチャ。

### 3層構造の詳細

#### ホットデータ層（data/current/）
- **保持期間**: 直近7日分
- **容量制限**: 最大1MB
- **目的**: 即座の意思決定用
- **特徴**: 
  - 実行時に常に参照される最重要データ
  - Claude Code SDKが高速アクセス可能
  - リアルタイムの状況把握に特化

#### ウォームデータ層（data/learning/）
- **保持期間**: 90日分の分析済みインサイト
- **容量制限**: 最大10MB
- **目的**: 学習とパターン認識
- **特徴**:
  - 生データではなく分析結果のみ保持
  - 成功パターンとエンゲージメント傾向を蓄積
  - 戦略最適化の根拠データを提供

#### コールドデータ層（data/archives/）
- **保持期間**: 永続保存
- **容量制限**: 無制限
- **目的**: 完全なデータ保全
- **特徴**:
  - 全投稿の生データを月別・四半期別で整理
  - 長期的な傾向分析とデータ監査に活用
  - 通常の実行では参照されない

### 自動データ移行プロセス

```
実行時データ生成
     ↓
[current/] 即座の意思決定に活用
     ↓ (7日後)
分析処理 → インサイト抽出
     ↓
[learning/] パターン学習に活用
     ↓ (90日後)
[archives/] 永続保存（月別/四半期別）
```

### data-optimizer.tsの責務

1. **日次移行処理**:
   - 投稿生データをarchives/posts/へ自動移行
   - currentディレクトリの容量監視・クリーンアップ

2. **週次分析処理**:
   - currentデータからインサイトを抽出
   - 分析結果をlearningディレクトリに保存
   - 古いcurrentデータの削除

3. **月次アーカイブ処理**:
   - 古いlearningデータをarchives/insights/へ移行
   - 四半期別の統計サマリー生成

### Claude Code SDK最適化効果

- **コンテキスト軽量化**: 必要最小限のデータのみ読み込み
- **高速意思決定**: ホットデータへの瞬時アクセス
- **学習効率化**: 整理されたインサイトによる素早い学習
- **長期記憶保持**: 重要な知見の永続化

---

**注意**: このドキュメントは技術実装の詳細リファレンスです。システムの概要やビジョンについては`system-overview.md`を、実際の操作方法については`operation-guide.md`を参照してください。