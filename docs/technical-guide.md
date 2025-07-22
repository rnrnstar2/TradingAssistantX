# TradingAssistantX 技術ガイド

## 1. ディレクトリ構造

### /src ディレクトリ詳細

```
src/
├── core/                   # コアシステム
│   ├── autonomous-executor.ts      # 自律実行エンジン
│   │                               # 自律的な意思決定と実行フローを制御
│   ├── decision-engine.ts         # 意思決定エンジン
│   │                               # 収集データを基に最適な戦略を選択
│   └── loop-manager.ts           # ループ実行管理
│                                   # 1日15回の定時実行を制御
├── collectors/             # データ収集
│   ├── rss-collector.ts          # RSS収集（MVP）
│   │                               # 主要金融メディアからRSSフィードを収集
│   ├── playwright-account.ts     # アカウント分析専用
│   │                               # 自アカウントの状態を分析（フォロワー数等）
│   └── base-collector.ts         # 基底クラス（疎結合設計）
│                                   # CollectionResult型による統一インターフェース
├── services/               # ビジネスロジック
│   ├── content-creator.ts        # 投稿コンテンツ生成
│   │                               # Claude SDKを使用して教育的価値の高いコンテンツを生成
│   ├── data-optimizer.ts         # データ最適化・クレンジング
│   │                               # 古いデータの削除と最適化処理
│   └── x-poster.ts              # X API投稿
│                                   # 生成コンテンツをX（Twitter）に投稿
├── utils/                  # ユーティリティ
│   ├── yaml-manager.ts          # YAML読み書き
│   │                               # data/ディレクトリのYAMLファイル管理
│   ├── context-compressor.ts    # コンテキスト圧縮
│   │                               # Claude SDK向けのコンテキスト最適化
│   └── integrity-checker.ts     # 整合性検証（必須）
│                                   # 要件定義との整合性を常に保証
└── scripts/                # 実行スクリプト
    ├── main.ts                  # ループ実行（pnpm start）
    │                               # core-runnerを1日15回実行
    ├── dev.ts                   # 単一実行（pnpm dev）
    │                               # core-runnerを1回だけ実行（開発用）
    └── core-runner.ts           # 共通実行ロジック
                                    # アカウント分析→投稿作成の中核処理
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
├── current/                # 現在の状態（常に最新・最小限）
│   ├── account-status.yaml      # アカウント状態
│   │   └── フォロワー数、エンゲージメント率等
│   ├── active-strategy.yaml     # アクティブな戦略
│   │   └── 現在適用中のコンテンツ戦略
│   ├── today-posts.yaml         # 本日の投稿記録
│   │   └── 当日の投稿内容と結果
│   └── execution-log.yaml       # 実行ログ（整合性監査用）
│       └── ファイル作成・更新・削除の記録
│
├── learning/               # 学習データ（定期的にクレンジング）
│   ├── success-patterns.yaml    # 成功パターン
│   │   └── 高エンゲージメントを獲得した投稿パターン
│   ├── high-engagement.yaml     # 高エンゲージメント投稿
│   │   └── 反響の大きかった投稿の詳細記録
│   └── effective-topics.yaml    # 効果的なトピック
│       └── フォロワー増加に貢献したトピック一覧
│
└── archives/               # アーカイブ（古いデータは自動移動）
    └── 2024-01/                # 月別アーカイブ
        └── 過去の投稿データ、学習結果等を保存
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

## 2. データフロー設計

### 実行フロー

```
[1] 自律実行開始 (main.ts / dev.ts)
         ↓
[2] core-runner.ts 起動
         ↓
[3] integrity-checker.ts による事前検証
         ↓
[4] account-status.yaml 読み込み（現在状態把握）
         ↓
[5] decision-engine.ts による戦略選択
         ↓
[6] ActionSpecificCollector による情報収集
         ↓
[7] content-creator.ts によるコンテンツ生成
         ↓
[8] x-poster.ts による投稿実行
         ↓
[9] 結果をdata/current/に記録
         ↓
[10] integrity-checker.ts による事後検証
         ↓
[11] data-optimizer.ts によるデータ最適化
```

### データの流れ

```
収集フェーズ:
  RSS Feeds → rss-collector.ts → CollectionResult
  X Account → playwright-account.ts → AccountStatus
           ↓
意思決定フェーズ:
  CollectionResult + AccountStatus → decision-engine.ts
           ↓
生成フェーズ:
  決定戦略 + 収集データ → content-creator.ts → 投稿コンテンツ
           ↓
投稿フェーズ:
  投稿コンテンツ → x-poster.ts → X Platform
           ↓
学習フェーズ:
  投稿結果 → data/learning/*.yaml → 次回実行時に活用
```

## 3. 疎結合Collector設計

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

## 4. YAML仕様

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

#### rss-sources.yaml

```yaml
version: "1.0"
sources:
  financial_news:
    - name: "日経電子版"
      url: "https://www.nikkei.com/rss/news.rdf"
      category: "general_market"
      priority: "high"
      
    - name: "ブルームバーグ日本"
      url: "https://www.bloomberg.co.jp/rss/news.rdf"
      category: "global_market"
      priority: "high"
      
    - name: "ロイター日本"
      url: "https://jp.reuters.com/rss/topNews.rdf"
      category: "breaking_news"
      priority: "medium"
      
  market_analysis:
    - name: "投資の森"
      url: "https://www.toushin.com/rss/"
      category: "investment_education"
      priority: "medium"
      
settings:
  fetch_limit_per_source: 10  # 各ソースから取得する最大記事数
  cache_duration_minutes: 60  # キャッシュ有効期間
```

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

## 5. ハルシネーション防止機構

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
3. **サイズ制限**: 各YAMLは最大100KB、data/全体で10MB上限
4. **命名規則**: 要件定義に記載されたファイル名のみ使用可
5. **書き込み権限**: 許可されたディレクトリのみ書き込み可能

## 6. 拡張ポイント

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

---

**注意**: このドキュメントは技術実装の詳細リファレンスです。システムの概要やビジョンについては`system-overview.md`を、実際の操作方法については`operation-guide.md`を参照してください。