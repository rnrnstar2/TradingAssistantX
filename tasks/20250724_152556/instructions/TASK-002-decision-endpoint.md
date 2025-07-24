# TASK-002: src/claude/endpoints/decision-endpoint.ts 実装指示書

## 🎯 タスク概要
判断エンドポイント（decision-endpoint.ts）を実装し、Claude判断による最適アクション決定機能を提供してください。

## 📋 要件定義準拠
REQUIREMENTS.md の**エンドポイント別設計**に基づく実装：
- **役割**: プロンプト+変数+ClaudeDecision返却
- **責任**: 状況分析に基づく適切なアクション決定
- **返却型**: ClaudeDecision（types.ts で定義）

## 🔍 既存コード移行
`src/claude/decision-engine.ts` からエンドポイント別設計に移行：

### 移行対象機能
1. **ClaudeDecisionEngine クラス** → **makeDecision 関数**に変換
2. **makeEnhancedDecision メソッド** → メイン判断ロジック
3. **基本状況収集** → 入力データ処理
4. **Claude判断実行** → Claude SDK 呼び出し

### 既存実装の活用
```typescript
// 移行元: ClaudeDecisionEngine.makeEnhancedDecision()
async makeEnhancedDecision(): Promise<ClaudeDecision> {
  const context = await this.gatherBasicContext();
  const prompt = this.buildDecisionPrompt(context);
  const decision = await this.executeClaudeDecision(prompt, context);
  return decision;
}
```

## ✅ 実装タスク

### 1. エンドポイント関数実装
```typescript
/**
 * 判断エンドポイント - Claude判断による最適アクション決定
 */
export async function makeDecision(input: DecisionInput): Promise<ClaudeDecision>
```

### 2. 入力データ処理
- KaitoAPI データの解析
- 学習データの活用
- 現在時刻・状況の考慮

### 3. Claude判断プロンプト構築
既存 `buildDecisionPrompt` メソッドを参考に：
- 投資教育X自動化システムの文脈
- 現在状況の詳細情報
- 5つのアクション選択肢の提示
- JSON形式での返却指示

### 4. Claude SDK 実行
```typescript
const response = await claude()
  .withModel('sonnet')
  .withTimeout(10000)
  .query(prompt)
  .asText();
```

### 5. 応答解析・検証
- JSON応答の解析
- 決定内容の検証
- エラー時の待機決定生成

## 🏗️ エンドポイント設計原則

### 単一責任の原則
- 判断機能のみに特化
- コンテンツ生成は content-endpoint に分離
- 分析機能は analysis-endpoint に分離

### 型安全確保
- DecisionInput 型による入力検証
- ClaudeDecision 型による返却保証
- TypeScript strict モード対応

### エラーハンドリング
- Claude実行失敗時の適切な待機判断
- 品質確保優先（失敗時は素直に待機）
- 基本的なログ出力

## 📂 実装構造

### ディレクトリ作成
- **ディレクトリ**: `src/claude/endpoints/` （作成が必要）
- **ファイル**: `decision-endpoint.ts`

### 依存関係
- `../types` から型定義をインポート
- `@instantlyeasy/claude-code-sdk-ts` の claude 関数
- 必要に応じて kaito-api からの型インポート

## 🚫 実装制約

### 禁止事項
- クラスベース実装禁止（関数ベースで実装）
- 過剰な抽象化禁止
- 判断以外の機能実装禁止（コンテンツ生成・分析など）

### 必須要件
- 純粋関数としての実装
- 副作用の最小化
- ステートレス設計

## 🔄 品質チェック要件
- TypeScript コンパイルエラーなし
- Lint チェック通過
- Claude実行時の適切なエラーハンドリング
- 返却型の型安全確保

## 📋 完了報告
実装完了後、以下の報告書を作成してください：
- **報告書**: `tasks/20250724_152556/reports/REPORT-002-decision-endpoint.md`
- **内容**: 実装した機能の概要、既存コードからの移行内容、品質チェック結果

## 🔗 依存関係
- **前提**: TASK-001 (types.ts) の完了が必要
- **実行順序**: TASK-001 完了後に開始可能

---
**重要**: この判断エンドポイントはシステムの中核機能です。Claude強みを活用した高品質な判断機能を実装してください。