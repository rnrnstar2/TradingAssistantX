# TASK-001: ActionSpecificCollector修正 - URL・設定エラー解決

## 🎯 タスク概要
ActionSpecificCollectorにおける2つの重大エラーの修正：
1. Reuters URL DNS解決エラー (`net::ERR_NAME_NOT_RESOLVED`)
2. API ソース URL undefined エラー (`url: expected string, got undefined`)

## 🚨 発生エラー詳細

### エラー1: DNS解決不可
```
❌ [ターゲット収集エラー] https://feeds.reuters.com/reuters/businessNews: page.goto: net::ERR_NAME_NOT_RESOLVED
```
**場所**: `src/lib/action-specific-collector.ts:731:18`

### エラー2: undefined URL
```
❌ [ターゲット収集エラー] undefined: page.goto: url: expected string, got undefined
```
**場所**: `src/lib/action-specific-collector.ts:731:18`

## 🔍 根本原因分析

### 原因1: Reuters URL無効化
- 設定ファイル `data/action-collection-strategies.yaml:25` でreuters URLが無効
- `https://feeds.reuters.com/reuters/businessNews` がアクセス不可

### 原因2: 設定構造不一致
- ActionSpecificCollectorが `source.url` を期待（line 593）
- APIソース（alpha_vantage, coingecko）には `url` プロパティが存在せず、`provider` プロパティのみ
- `CollectionTarget` 生成時に `source.url` が `undefined` になる

### 対象設定ファイル
- **Main**: `data/action-collection-strategies.yaml`
- **Secondary**: `data/multi-source-config.yaml` (正しい構造を持つ)

## 📋 修正要件

### 修正1: Reuters URL更新
- 無効なreuters URLを有効なURLに置換
- または、代替ニュースソースへの変更

### 修正2: APIソース処理追加
- ActionSpecificCollectorにAPIソース対応ロジック追加
- `source.url` が未定義の場合の処理分岐実装
- multi-source-config.yamlからの適切なURL構築

### 修正3: 設定構造統一
- action-collection-strategies.yaml の構造を multi-source-config.yaml と整合
- または、ActionSpecificCollector で両構造対応

## 🛠️ 実装詳細

### 1. ActionSpecificCollector修正 (`src/lib/action-specific-collector.ts`)

#### 修正対象: line 591-596
```typescript
// 現在の問題コード
const targets: CollectionTarget[] = actionConfig.sources.map(source => ({
  type: this.mapSourceToTargetType(source.name),
  source: source.url,  // ← この行が undefined エラーの原因
  priority: source.priority,
  searchTerms: source.searchPatterns || []
}));
```

#### 修正要件:
- `source.url` が undefined の場合の処理追加
- APIソースタイプに応じた URL 構築ロジック
- multi-source-config.yaml からの URL 解決機能

### 2. 設定ファイル修正 (`data/action-collection-strategies.yaml`)

#### 修正対象: line 24-28 (reuters)
```yaml
- name: "reuters_finance"
  url: "https://feeds.reuters.com/reuters/businessNews"  # ← 無効URL
  priority: "high"
  type: "rss"
  categories: ["business", "markets"]
```

#### 修正要件:
- 有効な reuters URL への更新
- または代替ニュースソースへの置換

#### 修正対象: line 31-41 (APIソース)
```yaml
- name: "alpha_vantage"
  provider: "alphavantage"  # ← url プロパティなし
  priority: "high"
  type: "api"
```

#### 修正要件:
- APIソース用の `url` プロパティ追加
- または、ActionSpecificCollector での `provider` 対応

## 🧪 テスト要件

### 1. エラー再現テスト
- `pnpm dev` でエラー再現確認
- 修正前後での動作比較

### 2. URL検証テスト
- 修正後の全URLにアクセス可能性確認
- `curl` または実際のページアクセスでの検証

### 3. 統合テスト
- ActionSpecificCollector での全ソース収集成功確認
- undefinedエラーの完全解消確認

## 📊 品質基準

### 必須チェック項目
- [ ] TypeScript型チェック通過
- [ ] lint エラーなし
- [ ] 全ソースでの正常収集完了
- [ ] undefinedエラー完全解消
- [ ] DNS解決エラー完全解消

### 推奨チェック項目
- [ ] エラーハンドリング強化
- [ ] ログメッセージの改善
- [ ] 設定バリデーション追加

## 🚫 制約・注意事項

### MVP制約遵守
- 最小限修正のみ実装
- 新規機能追加は避ける
- 設定構造の大幅変更は避ける

### 品質優先
- 動作確実性を最優先
- エラーハンドリングの確実な実装
- ユーザビリティを維持

## 📋 実装チェックリスト

### Phase 1: 緊急修正
- [ ] Reuters URL の有効URL置換
- [ ] undefined URL エラーの即時修正
- [ ] 基本動作確認

### Phase 2: 構造対応
- [ ] APIソース処理ロジック実装
- [ ] multi-source-config.yaml 統合
- [ ] 設定バリデーション追加

### Phase 3: 検証
- [ ] 全ソース収集テスト
- [ ] エラー解消確認
- [ ] TypeScript・lint チェック

## 📤 アウトプット要件

### 1. 修正ファイル
- `src/lib/action-specific-collector.ts`
- `data/action-collection-strategies.yaml`

### 2. 報告書作成
- 修正内容詳細
- テスト結果
- 残存課題（存在する場合）

### 3. 出力先指定
- **レポートファイル**: `tasks/20250721-210028/reports/REPORT-001-actionspecific-collector-fixes.md`
- **その他出力**: `tasks/20250721-210028/outputs/`

---

**重要**: このタスクは緊急度高のため、Phase 1（緊急修正）を最優先で実施し、動作確認後にPhase 2-3を実施してください。