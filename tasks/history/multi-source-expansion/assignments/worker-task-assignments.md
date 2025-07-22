# ワーカータスク配分指示書

**Project**: TradingAssistantX 多様情報源対応  
**Manager**: Claude Code Manager  
**Distribution Date**: 2025-01-21  
**Deadline**: 4週間後 (2025-02-18)

## 📋 **プロジェクト概要**

X（Twitter）のログイン制限問題を解決するため、RSS、API、Webスクレイピング等の多様な情報源に対応したシステムへの拡張を実施する。

**重要**: 既存のActionSpecificCollectorとClaude SDKシステムとの互換性を保ちながら段階的に拡張する。

---

## 👨‍💻 **Worker A: RSS & API統合担当**

### 🎯 **責任範囲**
- RSS フィード収集システムの実装
- 公開API統合（NewsAPI、Yahoo Finance API等）
- データ正規化システムの基盤構築
- レート制限管理システムの実装

### 📋 **具体的タスク**

#### Phase 1: RSS収集システム (週1-2)

**1.1 RSSCollectorクラス実装**
```typescript
// 実装先: src/lib/multi-source/rss-collector.ts
export class RSSCollector implements DataCollector {
  // 必須実装メソッド:
  - collect(requirements: RSSRequirements): Promise<RSSData[]>
  - filterByQuality(items: any[], threshold: number): any[]
  - normalizeRSSData(items: any[], feed: RSSFeed): RSSData[]
  - calculateRSSQuality(item: any): number
}
```

**技術要件**:
- `rss-parser` ライブラリの統合
- 並列RSS処理（最大5フィード同時）
- エラーハンドリング（個別フィード失敗時の継続）
- 品質評価アルゴリズムの実装

**設定ファイル**:
```yaml
# data/rss-config.yaml作成
feeds:
  - name: "bloomberg-markets"
    url: "https://feeds.bloomberg.com/markets/news.rss"
    qualityThreshold: 0.8
    updateInterval: 30
```

#### Phase 2: API統合システム (週2-3)

**2.1 APICollectorクラス実装**
```typescript
// 実装先: src/lib/multi-source/api-collector.ts
export class APICollector implements DataCollector {
  // 必須実装メソッド:
  - collect(requirements: APIRequirements): Promise<APIData[]>
  - collectFromNewsAPI(query: NewsQuery): Promise<APIData[]>
  - normalizeAPIData(data: any, config: APIConfig): APIData[]
}
```

**API統合対象**:
1. **NewsAPI** - 一般ニュース収集
2. **Yahoo Finance API** - 金融データ収集  
3. **Alpha Vantage** - 市場データ収集

**技術要件**:
- `rate-limiter-flexible` を使用したレート制限管理
- 各API固有のレスポンス正規化
- APIキー管理（環境変数ベース）
- 失敗時のリトライ機構

#### Phase 3: データ正規化システム (週3-4)

**3.1 DataNormalizerクラス実装**
```typescript
// 実装先: src/lib/multi-source/data-normalizer.ts
export class DataNormalizer {
  // 必須実装メソッド:
  - normalize(rawData: any, source: DataSource): NormalizedData
  - calculateQualityScore(data: NormalizedData): number
  - validateDataIntegrity(data: NormalizedData): boolean
}
```

**正規化要件**:
- 統一データフォーマット（NormalizedData型）への変換
- 品質スコア算出アルゴリズム
- タイムスタンプ正規化
- コンテンツ分類システム

### 📦 **期待成果物**

1. **実装ファイル**
   - `src/lib/multi-source/rss-collector.ts`
   - `src/lib/multi-source/api-collector.ts`
   - `src/lib/multi-source/data-normalizer.ts`
   - `src/types/multi-source-types.ts`

2. **設定ファイル**
   - `data/rss-config.yaml`
   - `data/api-config.yaml`

3. **テストファイル**
   - `tests/unit/rss-collector.test.ts`
   - `tests/unit/api-collector.test.ts`
   - `tests/integration/data-normalization.test.ts`

### 🔗 **他ワーカーとの連携**

- **Worker B**: DataNormalizerインターフェースの共有
- **Worker C**: 統合テストでのAPI提供、品質メトリクス連携

### ✅ **完了基準**

- [ ] 5つ以上のRSSフィードから安定したデータ収集
- [ ] 3つの外部API統合完了
- [ ] 品質スコア0.7以上のデータ生成率80%以上
- [ ] 全ユニットテストでのパス率100%
- [ ] レート制限遵守（API制限超過0件）

---

## 🌐 **Worker B: Webスクレイピング担当**

### 🎯 **責任範囲**
- 既存Playwrightシステムの多サイト対応拡張
- robots.txt遵守システムの実装
- 品質評価・フィルタリングシステムの構築
- IPローテーション・アンチ検出システムの実装

### 📋 **具体的タスク**

#### Phase 1: Playwright拡張 (週1-2)

**1.1 WebScraperクラス実装**
```typescript
// 実装先: src/lib/multi-source/web-scraper.ts
export class WebScraper implements DataCollector {
  // 既存のPlaywrightBrowserManagerを活用
  private browserManager: PlaywrightBrowserManager;
  
  // 必須実装メソッド:
  - collect(requirements: WebScrapingRequirements): Promise<WebData[]>
  - scrapeWebsite(target: WebTarget): Promise<WebData[]>
  - extractStructuredData(page: Page, selectors: SiteSelectors): any
}
```

**対応サイト（Phase 1）**:
1. **Yahoo Finance** - 金融ニュース・市場データ
2. **MarketWatch** - 市場分析記事
3. **Investopedia** - 教育コンテンツ

**技術要件**:
- 既存`PlaywrightBrowserManager`の活用・拡張
- 動的コンテンツ対応（`waitForSelector`、`networkidle`）
- サイト別セレクター管理システム
- 多重ブラウザインスタンス管理

#### Phase 2: robots.txt遵守システム (週2)

**2.1 RobotsCheckerクラス実装**
```typescript
// 実装先: src/lib/multi-source/robots-checker.ts
export class RobotsChecker {
  // 必須実装メソッド:
  - isAllowed(url: string, userAgent?: string): Promise<boolean>
  - fetchRobotsTxt(domain: string): Promise<string>
  - parseRobotsRules(robotsTxt: string): RobotsRules
  - cacheRobotsRules(domain: string, rules: RobotsRules): void
}
```

**機能要件**:
- `robotstxt` ライブラリの統合
- robots.txtのキャッシング（24時間）
- User-Agentベースの判定
- 遅延時間（Crawl-delay）の遵守

#### Phase 3: 品質評価システム (週3)

**3.1 ContentQualityAssessorクラス実装**
```typescript
// 実装先: src/lib/multi-source/content-quality-assessor.ts
export class ContentQualityAssessor {
  // 必須実装メソッド:
  - assessWebContent(content: WebContent): QualityScore
  - checkContentRelevance(content: string): number
  - detectContentType(content: string): ContentType
  - calculateReadabilityScore(content: string): number
}
```

**品質評価基準**:
- **関連性**: 金融・投資キーワードの含有率
- **信頼性**: ソースドメインの権威性
- **新鮮性**: 発行日からの経過時間
- **読みやすさ**: 文章構造・長さの評価
- **独自性**: 既存データとの重複度

#### Phase 4: スクレイピング最適化 (週4)

**4.1 アンチ検出システム**
- User-Agentランダム化
- リクエスト間隔の動的調整
- プロキシローテーション（オプション）
- ヘッダー偽装システム

**4.2 パフォーマンス最適化**
- 並列スクレイピング制御（最大3サイト同時）
- コンテンツキャッシング
- 失敗サイトのスキップ機構

### 📦 **期待成果物**

1. **実装ファイル**
   - `src/lib/multi-source/web-scraper.ts`
   - `src/lib/multi-source/robots-checker.ts`
   - `src/lib/multi-source/content-quality-assessor.ts`
   - `src/lib/multi-source/scraping-optimizer.ts`

2. **設定ファイル**
   - `data/web-scraping-config.yaml`
   - `data/site-selectors.yaml`

3. **テストファイル**
   - `tests/unit/web-scraper.test.ts`
   - `tests/unit/robots-checker.test.ts`
   - `tests/integration/multi-site-scraping.test.ts`

### 🔗 **他ワーカーとの連携**

- **Worker A**: ContentQualityAssessor → DataNormalizerの品質スコア統合
- **Worker C**: PlaywrightBrowserManager拡張の統合、パフォーマンステスト連携

### ✅ **完了基準**

- [ ] 5つ以上のWebサイトから安定したデータ抽出
- [ ] robots.txt完全遵守（違反件数0件）
- [ ] 平均品質スコア0.75以上の達成
- [ ] スクレイピング成功率90%以上
- [ ] 検出回避率95%以上（403/429エラー5%未満）

---

## 🔧 **Worker C: システム統合・テスト担当**

### 🎯 **責任範囲**
- 既存ActionSpecificCollectorとの統合
- MultiSourceCollectorメインシステムの実装
- 全システムのパフォーマンス最適化
- 統合テスト・品質検証の実施
- ドキュメント更新・維持管理

### 📋 **具体的タスク**

#### Phase 1: MultiSourceCollector実装 (週1)

**1.1 MultiSourceCollectorクラス実装**
```typescript
// 実装先: src/lib/multi-source/multi-source-collector.ts
export class MultiSourceCollector {
  private rssCollector: RSSCollector;      // Worker A成果物
  private apiCollector: APICollector;      // Worker A成果物  
  private webScraper: WebScraper;          // Worker B成果物
  private legacyCollector: ActionSpecificCollector; // 既存システム
  
  // 必須実装メソッド:
  - collectFromAllSources(req: CollectionRequirements): Promise<CollectedData[]>
  - collectPrioritized(priority: Priority): Promise<CollectedData[]>
  - mergeResults(results: CollectedData[][]): Promise<CollectedData[]>
}
```

**統合要件**:
- Worker A、Bの成果物の統合
- 既存ActionSpecificCollectorとの互換性保持
- エラー時のフォールバック機能
- 並列処理とタイムアウト管理

#### Phase 2: システム統合 (週2)

**2.1 EnhancedActionSpecificCollector実装**
```typescript
// 実装先: src/lib/enhanced-action-specific-collector.ts
export class EnhancedActionSpecificCollector extends ActionSpecificCollector {
  private multiSourceCollector: MultiSourceCollector;
  
  // 既存メソッドの拡張:
  async collectForAction(
    actionType: ActionType,
    context: ActionContext,
    sufficiencyTarget: number = 85
  ): Promise<ActionSpecificResult>
}
```

**統合ポイント**:
- 既存のClaude SDK連携の維持
- 決定エンジンとの互換性確保
- データフォーマットの統一
- パフォーマンス劣化の防止

#### Phase 3: パフォーマンス最適化 (週2-3)

**3.1 並列処理システム**
```typescript
// 実装先: src/lib/multi-source/parallel-collection-manager.ts
export class ParallelCollectionManager {
  - executeParallelCollection(tasks: CollectionTask[]): Promise<CollectedData[]>
  - createBatches(tasks: CollectionTask[], batchSize: number): CollectionTask[][]
  - monitorPerformance(tasks: CollectionTask[]): PerformanceMetrics
}
```

**3.2 キャッシュシステム**
```typescript
// 実装先: src/lib/multi-source/data-cache-manager.ts
export class DataCacheManager {
  - getCachedOrFetch(key: string, fetcher: Function): Promise<CollectedData[]>
  - invalidateExpiredCache(): void
  - calculateCacheKey(requirements: CollectionRequirements): string
}
```

**最適化要件**:
- メモリ使用量の制限（最大512MB）
- レスポンス時間の短縮（目標: 90秒以内）
- CPU使用率の制限（80%以下）
- 同時実行数の制御

#### Phase 4: テスト・品質保証 (週3-4)

**4.1 統合テストスイート作成**
```typescript
// tests/integration/multi-source-integration.test.ts
describe('Multi-Source Integration Tests', () => {
  // Worker A & B成果物の統合テスト
  // 既存システムとの互換性テスト
  // パフォーマンステスト
  // エラーハンドリングテスト
});
```

**4.2 品質メトリクス監視**
- データ品質スコアの監視
- 収集成功率の測定
- レスポンス時間の監視
- エラー率の追跡

### 📦 **期待成果物**

1. **実装ファイル**
   - `src/lib/multi-source/multi-source-collector.ts`
   - `src/lib/enhanced-action-specific-collector.ts`
   - `src/lib/multi-source/parallel-collection-manager.ts`
   - `src/lib/multi-source/data-cache-manager.ts`
   - `src/lib/multi-source/performance-monitor.ts`

2. **設定ファイル**
   - `data/multi-source-config.yaml` (統合版)
   - `data/performance-config.yaml`

3. **テストファイル**
   - `tests/integration/multi-source-integration.test.ts`
   - `tests/integration/legacy-compatibility.test.ts`
   - `tests/performance/collection-performance.test.ts`

4. **ドキュメント更新**
   - `docs/setup.md` の多様情報源設定追加
   - `docs/operations.md` の監視項目追加
   - `README.md` の機能説明更新

### 🔗 **他ワーカーとの連携**

- **Worker A**: RSSCollector、APICollectorの統合
- **Worker B**: WebScraperの統合、性能テストでの連携

### ✅ **完了基準**

- [ ] 全情報源からの統合収集成功率95%以上
- [ ] 既存システムとの100%互換性確保
- [ ] 平均レスポンス時間90秒以内
- [ ] 統合テストカバレッジ90%以上
- [ ] ドキュメント更新完了率100%

---

## 📊 **全体プロジェクト管理**

### 📅 **スケジュール概要**

| 週 | Worker A (RSS&API) | Worker B (Web) | Worker C (統合) |
|---|---|---|---|
| 1 | RSS実装 | Playwright拡張 | MultiSource基盤 |
| 2 | API統合 | robots.txt遵守 | 既存システム統合 |
| 3 | データ正規化 | 品質評価 | パフォーマンス最適化 |
| 4 | テスト・調整 | スクレイピング最適化 | 統合テスト・ドキュメント |

### 🚩 **重要マイルストーン**

- **Week 1 End**: 基本実装完了、初期統合テスト
- **Week 2 End**: 主要機能実装完了、結合テスト
- **Week 3 End**: 最適化・品質調整完了、性能テスト
- **Week 4 End**: 全システム統合完了、本番配布準備

### 📞 **コミュニケーション**

- **毎週金曜日**: 進捗報告（各ワーカー → Manager）
- **水曜日**: 中間チェック・課題解決セッション
- **緊急時**: Slack #multi-source-project チャンネル

### 🚨 **リスク管理**

| リスク | 影響度 | 対策 |
|---|---|---|
| API制限超過 | 高 | フォールバック機能、レート制限管理 |
| Webサイト構造変更 | 中 | 複数サイト対応、柔軟セレクター |
| パフォーマンス劣化 | 高 | 段階的統合、性能監視 |
| 既存システム互換性 | 高 | 継続的統合テスト |

---

**Manager承認**: Claude Code Manager  
**配布日**: 2025-01-21  
**次回レビュー**: 2025-01-28（Week 1レビュー）

各ワーカーは配分されたタスクに従って実装を開始してください。質問や課題がある場合は即座に報告してください。