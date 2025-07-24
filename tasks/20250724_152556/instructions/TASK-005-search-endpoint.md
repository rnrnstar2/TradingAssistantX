# TASK-005: src/claude/endpoints/search-endpoint.ts 実装指示書

## 🎯 タスク概要
検索クエリエンドポイント（search-endpoint.ts）を実装し、Claude判断に基づく最適な検索クエリ生成機能を提供してください。

## 📋 要件定義準拠
REQUIREMENTS.md の**エンドポイント別設計**に基づく実装：
- **役割**: プロンプト+変数+SearchQuery返却
- **責任**: リツイート・いいね対象の検索クエリ生成
- **返却型**: SearchQuery（types.ts で定義）

## 🔍 新規実装機能
このエンドポイントは新規設計機能として実装：

### 主要機能
1. **リツイート用検索クエリ生成**: 投資教育関連の高品質投稿検索
2. **いいね用検索クエリ生成**: エンゲージメント対象の投稿検索
3. **引用ツイート用検索クエリ生成**: 価値追加可能な投稿検索
4. **トレンド連動検索クエリ**: 市場トレンドに基づく検索

## ✅ 実装タスク

### 1. メインエンドポイント関数実装
```typescript
/**
 * 検索クエリエンドポイント - Claude判断による最適検索クエリ生成
 */
export async function generateSearchQuery(input: SearchInput): Promise<SearchQuery>
```

### 2. 検索目的別クエリ生成
```typescript
/**
 * リツイート用検索クエリ生成
 */
export async function generateRetweetQuery(input: RetweetSearchInput): Promise<SearchQuery>

/**
 * いいね用検索クエリ生成
 */  
export async function generateLikeQuery(input: LikeSearchInput): Promise<SearchQuery>

/**
 * 引用ツイート用検索クエリ生成
 */
export async function generateQuoteQuery(input: QuoteSearchInput): Promise<SearchQuery>
```

### 3. Claude判断による検索戦略
Claude SDKを活用した検索クエリ最適化：
- 投資教育の観点からの検索戦略決定
- トレンド・市場状況に基づくキーワード選定
- 対象読者（初心者/中級者）考慮の検索条件

### 4. 検索条件構築
以下の検索パラメータを生成：
- **キーワード**: 投資教育関連キーワード
- **除外キーワード**: 不適切コンテンツ除外
- **エンゲージメント条件**: 最小いいね数・RT数
- **時間範囲**: 検索対象期間
- **言語・地域**: 日本語・日本地域限定

## 🎯 検索戦略設計

### 投資教育コンテンツ特化
- **高品質判定基準**: 教育的価値、信頼性、エンゲージメント
- **キーワード戦略**: 「投資」「資産運用」「NISA」「初心者」など
- **除外条件**: 投機的・リスク過大な内容の除外

### アクション別最適化
- **リツイート**: 幅広い教育価値のあるコンテンツ
- **いいね**: 良質で支持できるコンテンツ
- **引用ツイート**: 追加価値を提供できるコンテンツ

### 市場トレンド連動
- 現在の市場センチメント反映
- トレンドトピックとの関連性考慮
- ボラティリティに応じた検索戦略調整

## 🏗️ Claude活用プロンプト設計

### 検索戦略判断プロンプト
```typescript
const prompt = `投資教育X自動化システムの検索クエリを生成してください。

目的: ${searchIntent}
市場状況: ${JSON.stringify(marketContext)}
対象読者: ${targetAudience}

以下の要件で最適な検索クエリを生成してください:
- 投資教育の観点で価値が高いコンテンツを発見
- 信頼性とエンゲージメントのバランス
- ${targetAudience}に適した内容レベル
- 現在の市場状況に関連性の高いトピック

JSON形式で回答してください:
{
  "query": "検索クエリ",
  "exclude": ["除外キーワード"],
  "engagement_min": 10,
  "time_range": "24h",
  "reasoning": "選定理由"
}`;
```

## 📂 実装構造

### ファイル配置
- **ディレクトリ**: `src/claude/endpoints/`
- **ファイル**: `search-endpoint.ts`

### 依存関係
- `../types` から型定義をインポート
- `@instantlyeasy/claude-code-sdk-ts` の claude 関数
- `../../kaito-api/search-engine` （検索実行参考）

## 🚫 実装制約

### 禁止事項
- 過剰に複雑な検索アルゴリズム禁止
- 検索実行機能の実装禁止（クエリ生成のみ）
- 投資教育以外の分野への拡張禁止

### 必須要件
- 純粋な検索クエリ生成機能
- アクション別の適切な戦略分離
- ステートレス設計

## 🔄 品質チェック要件
- TypeScript コンパイルエラーなし  
- Lint チェック通過
- Claude実行時の適切なエラーハンドリング
- 生成クエリの妥当性確認

## 📋 完了報告
実装完了後、以下の報告書を作成してください：
- **報告書**: `tasks/20250724_152556/reports/REPORT-005-search-endpoint.md`
- **内容**: 実装した検索戦略の概要、アクション別最適化の詳細、品質チェック結果

## 🔗 依存関係
- **前提**: TASK-001 (types.ts) の完了が必要
- **実行順序**: TASK-001 完了後に開始可能（他のエンドポイントと並列実行可能）

---
**重要**: この検索クエリエンドポイントは適切なコンテンツ発見の鍵となる機能です。投資教育の価値観に基づく高品質な検索戦略を実装してください。