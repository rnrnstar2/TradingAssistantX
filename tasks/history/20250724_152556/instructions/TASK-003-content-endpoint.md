# TASK-003: src/claude/endpoints/content-endpoint.ts 実装指示書

## 🎯 タスク概要
コンテンツ生成エンドポイント（content-endpoint.ts）を実装し、Claude強みを活用した高品質投稿コンテンツ生成機能を提供してください。

## 📋 要件定義準拠
REQUIREMENTS.md の**エンドポイント別設計**に基づく実装：
- **役割**: プロンプト+変数+GeneratedContent返却
- **責任**: 投資教育コンテンツの自動生成
- **返却型**: GeneratedContent（types.ts で定義）

## 🔍 既存コード移行
`src/claude/content-generator.ts` からエンドポイント別設計に移行：

### 移行対象機能
1. **ContentGenerator クラス** → **generateContent 関数**に変換
2. **generatePost メソッド** → メインコンテンツ生成ロジック
3. **generateQuoteComment メソッド** → 引用コメント生成機能
4. **品質チェック機能** → 品質確保付き生成

### 既存実装の活用
```typescript
// 移行元: ContentGenerator.generatePost()
async generatePost(request: ContentRequest): Promise<GeneratedContent> {
  const prompt = this.buildContentPrompt(topic, contentType, targetAudience, maxLength, context);
  const rawContent = await this.generateWithClaudeQualityCheck(prompt);
  const qualityScore = this.evaluateBasicQuality(rawContent, topic);
  // 品質チェック・ハッシュタグ生成・メタデータ構築
}
```

## ✅ 実装タスク

### 1. メインエンドポイント関数実装
```typescript
/**
 * コンテンツ生成エンドポイント - Claude強み活用高品質コンテンツ生成
 */
export async function generateContent(input: ContentInput): Promise<GeneratedContent>
```

### 2. 引用コメント生成関数実装
```typescript
/**
 * 引用ツイート用コメント生成
 */
export async function generateQuoteComment(input: QuoteCommentInput): Promise<string>
```

### 3. プロンプト構築機能
既存 `buildContentPrompt` メソッドを活用：
- 投資教育アカウント用コンテンツ指示
- トピック・対象読者・文字数の考慮
- 教育的価値・実践性・エンゲージメント要件
- リスク注意点の適切な含有

### 4. Claude SDK実行・品質確保
```typescript
const response = await claude()
  .withModel('sonnet')
  .withTimeout(15000)
  .query(prompt)
  .asText();
```

### 5. 品質評価・ハッシュタグ生成
- 基本品質スコア算出
- 文字数・トピック関連性・教育的要素評価
- コンテンツタイプ別ハッシュタグ生成
- メタデータ構築

## 🏗️ エンドポイント設計原則

### 単一責任の原則
- コンテンツ生成機能のみに特化
- 判断機能は decision-endpoint に分離
- 分析機能は analysis-endpoint に分離

### 品質確保重視
- 品質閾値（70点）による再生成機能
- 教育的価値の確保
- 投資初心者配慮の表現

### 型安全確保
- ContentInput 型による入力検証
- GeneratedContent 型による返却保証
- TypeScript strict モード対応

## 📂 実装構造

### ファイル配置
- **ディレクトリ**: `src/claude/endpoints/`
- **ファイル**: `content-endpoint.ts`

### 依存関係
- `../types` から型定義をインポート
- `@instantlyeasy/claude-code-sdk-ts` の claude 関数
- 既存の品質評価・ハッシュタグ生成ロジック活用

## 🎯 コンテンツ品質要件

### 教育的価値
- 投資初心者にも理解しやすい表現
- 具体例・数値を含める
- 実践的なアドバイス提供

### エンゲージメント促進
- 質問形式の活用
- 読者参加を促す要素
- 自然で読みやすい日本語

### リスク配慮
- 適切なリスク注意点の含有
- 投資は自己責任の明記
- 過度な推奨表現の回避

## 🚫 実装制約

### 禁止事項
- クラスベース実装禁止（関数ベースで実装）
- 過剰な品質抽象化禁止
- コンテンツ生成以外の機能実装禁止

### 必須要件
- 品質確保機能の維持
- 再生成機能の実装
- ステートレス設計

## 🔄 品質チェック要件
- TypeScript コンパイルエラーなし
- Lint チェック通過
- 品質スコア算出の適切な動作
- 280文字制限の遵守

## 📋 完了報告
実装完了後、以下の報告書を作成してください：
- **報告書**: `tasks/20250724_152556/reports/REPORT-003-content-endpoint.md`
- **内容**: 実装した機能の概要、品質確保機能の詳細、品質チェック結果

## 🔗 依存関係
- **前提**: TASK-001 (types.ts) の完了が必要
- **実行順序**: TASK-001 完了後に開始可能（TASK-002と並列実行可能）

---
**重要**: このコンテンツ生成エンドポイントは投稿品質を決定する重要な機能です。Claude強みを最大限活用した高品質コンテンツ生成を実装してください。