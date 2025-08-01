# TASK-001: Claude データ分析エンドポイント新設

## 🎯 タスク概要
Claude Codeによるデータ前処理・分析エンドポイントを新設し、生データではなくインサイトをプロンプトに統合する仕組みを実装する。

## 📋 実装要件

### 1. 新規ファイル作成
**ファイル**: `src/claude/endpoints/data-analysis-endpoint.ts`

### 2. 実装すべき関数

#### `analyzeTargetQueryResults`
```typescript
export async function analyzeTargetQueryResults(params: {
  tweets: Array<{
    id: string;
    text: string;
    author_id: string;
    public_metrics?: any;
    created_at?: string;
  }>;
  query: string;
  topic: string;
  context?: SystemContext;
}): Promise<TargetQueryInsights>
```

**要件**:
- 最大100件のツイートを分析
- FX市場のトレンド・重要情報を抽出
- 200文字以内のサマリー + 3-5個のキーポイント
- リアルタイム性を重視した分析

#### `analyzeReferenceUserTweets`
```typescript
export async function analyzeReferenceUserTweets(params: {
  tweets: Array<{
    id: string;
    text: string;
    created_at: string;
    public_metrics?: any;
  }>;
  username: string;
  context?: SystemContext;
}): Promise<ReferenceUserInsights>
```

**要件**:
- 特定ユーザーの最大20件のツイートを分析
- そのユーザーの専門性・最新見解を抽出
- 150文字以内のサマリー + 重要ポイント2-3個
- ユーザーの特性に応じた分析（例：stlouisfed → 金融政策重視）

### 3. プロンプト設計要件

**共通原則**:
- トークン効率を最大化（不要な情報は送らない）
- FX中級者向けの専門的な分析
- 具体的な数値・銘柄・イベントを重視
- 分析結果は構造化されたJSONで返却

### 4. エラーハンドリング
- Claude API呼び出し失敗時のリトライ（最大2回）
- タイムアウト設定（15秒）
- フォールバック: 基本的な要約を返す

### 5. 参考実装
- `src/claude/endpoints/content-endpoint.ts`のパターンに従う
- `src/claude/utils/prompt-logger.ts`でプロンプトログを保存

## 📁 関連ドキュメント
- `docs/claude.md` - Claude SDK仕様
- `docs/directory-structure.md` - プロジェクト構造

## ✅ 完了条件
- TypeScript strict modeでエラーなし
- 単体テストの作成（別タスク）
- プロンプトログが正しく保存される