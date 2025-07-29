# TASK-001: MainWorkflowからmakeDecision呼び出しを削除

## 🎯 タスク概要
`src/workflows/main-workflow.ts`から`makeDecision`関数の呼び出しを削除し、dev実行時もYAML固定アクションを使用するように修正する。

## 📚 必須読み込み
- `/Users/rnrnstar/github/TradingAssistantX/REQUIREMENTS.md` - MVP要件定義書を必ず読み込むこと
- `/Users/rnrnstar/github/TradingAssistantX/docs/workflow.md` - ワークフロー仕様書を確認
- `/Users/rnrnstar/github/TradingAssistantX/docs/claude.md` - Claude SDK仕様書の最新版を確認

## 🎯 実装詳細

### 1. 修正対象ファイル
- `src/workflows/main-workflow.ts`

### 2. 主要な修正内容

#### 2.1 import文の修正
```typescript
// 削除する
import { makeDecision, generateContent } from '../claude';

// 修正後
import { generateContent } from '../claude';
```

#### 2.2 手動実行モード（4ステップ）の修正
現在の実装（135行目以降）:
- 4ステップフロー（データ収集 → Claude判断 → アクション実行 → 結果保存）
- `makeDecision`を呼び出している部分がある

修正後:
- 3ステップフロー（データ収集 → アクション実行 → 結果保存）
- YAMLから固定アクションを取得して直接実行
- `makeDecision`関数の呼び出しを完全に削除

#### 2.3 実装パターン
```typescript
// dev実行時も固定アクションを使用
const fixedAction = await this.dataManager.loadFixedAction(); // または適切な方法でYAMLから取得
const decision = {
  action: fixedAction.action,
  parameters: {
    topic: fixedAction.topic,
    query: fixedAction.query
  },
  confidence: 1.0,
  reasoning: `固定アクション実行: ${fixedAction.action}`
};
```

### 3. 注意事項
- **型安全性**: TypeScript strictモードでエラーが出ないようにする
- **既存の処理フロー**: executeAction関数はそのまま使用可能
- **ログ出力**: "Claude判断開始"などのログも適切に修正
- **エラーハンドリング**: makeDecision失敗時の処理も削除

### 4. 品質基準
- TypeScript型チェック通過
- 既存のexecuteAction処理との互換性維持
- ドキュメントとの整合性確認

## 📋 完了条件
- [ ] makeDecision関数のimportを削除
- [ ] 手動実行モードでもYAML固定アクション使用
- [ ] 4ステップから3ステップへの変更完了
- [ ] TypeScriptエラーなし
- [ ] ログメッセージの整合性確認

## 🚫 制約事項
- MVP要件を超える機能追加は禁止
- スケジュール実行モードの処理は変更しない（既に正しい実装）
- executeAction関数の内部実装は変更しない

## 📁 出力管理
- 修正ファイルは既存の場所にそのまま保存
- 報告書: `tasks/20250729_150802/reports/REPORT-001-remove-makedecision-from-workflow.md`