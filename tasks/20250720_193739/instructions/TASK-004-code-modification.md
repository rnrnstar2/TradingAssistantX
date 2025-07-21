# TASK-004: コード修正（投稿プロンプトの汎用化）

## 🎯 タスク概要
src/core/parallel-manager.tsのトレーディング特化投稿プロンプトを、汎用的なXアカウント自動化システム向けに修正する。

## 📋 修正対象ファイル

### `/Users/rnrnstar/github/TradingAssistantX/src/core/parallel-manager.ts`

**修正箇所**: 73-78行目の`executePostImmediate()`関数内プロンプト

## 🔧 具体的な修正内容

### 変更前（トレーディング特化）:
```typescript
const prompt = `
Generate a valuable educational post about trading or investing.
Focus on risk management, market analysis, or investment psychology.
Keep it under 280 characters.
Write in Japanese.
`;
```

### 変更後（汎用化）:
```typescript
const prompt = `
Generate a valuable and engaging social media post.
Focus on providing useful insights, educational content, or thought-provoking questions.
Keep it under 280 characters.
Write in Japanese.
Adapt the content style to match the account's theme and target audience.
`;
```

## 🚨 重要制約・注意事項

### MVP制約遵守
- **最小限の変更**: プロンプト部分のみ修正、他のロジックは変更しない
- **機能維持**: 既存の投稿生成機能は完全に保持
- **汎用性向上**: 特定業界に依存しない内容に変更

### 技術的制約
- **TypeScript型安全性**: 型定義は変更しない
- **文字列リテラル**: プロンプト文字列の変更のみ
- **関数シグネチャ**: executePostImmediate()の引数・戻り値は変更しない
- **imports**: import文は一切変更しない

### 実行手順

#### Phase 1: ファイル確認
```bash
# 1. 対象ファイルの存在確認
ls -la /Users/rnrnstar/github/TradingAssistantX/src/core/parallel-manager.ts

# 2. 現在のコード確認（特に73-78行目）
cat -n /Users/rnrnstar/github/TradingAssistantX/src/core/parallel-manager.ts | sed -n '70,80p'
```

#### Phase 2: コード修正
```bash
# Readツールで全内容確認後、Editツールで修正実行
# 変更範囲を最小限に抑制
```

#### Phase 3: 動作確認
```bash
# TypeScript構文チェック
npx tsc --noEmit /Users/rnrnstar/github/TradingAssistantX/src/core/parallel-manager.ts

# lint確認
npm run lint

# ビルド確認
npm run build
```

## 📊 成功基準
- [ ] プロンプト内容が汎用化されている
- [ ] "trading or investing"参照が削除されている
- [ ] 文字数制限（280文字）が保持されている
- [ ] 日本語指定が保持されている
- [ ] TypeScript構文エラーが発生していない
- [ ] 他の関数・機能に影響を与えていない

## 🔍 品質チェックポイント

### プロンプト内容の検証
- **汎用性**: 特定業界に依存しない表現になっているか
- **価値提供**: 教育的・有益なコンテンツ生成を促すか
- **適応性**: アカウントテーマに柔軟に対応できるか
- **制約維持**: 文字数・言語制約が保持されているか

### コード品質の検証
- **可読性**: 変更後もコードが理解しやすいか
- **一貫性**: 他のコード部分との一貫性が保たれているか
- **エラーハンドリング**: 既存のエラー処理が維持されているか

## 🧪 テスト計画（可能であれば実施）

### 基本動作テスト
```bash
# 投稿生成機能のテスト（環境が整っている場合）
npm run test

# または統合テスト実行
npm run start
```

## 📝 報告書作成
作業完了後、以下を報告書に記載：
- 修正されたファイルとその内容
- 変更前後のプロンプト比較
- TypeScript・lint・ビルド結果
- 機能テスト結果（実施した場合）
- 発生した問題とその解決方法（あれば）

## 🔗 他のタスクとの関係
- **並列実行可能**: TASK-001, TASK-002, TASK-003と同時実行可能
- **依存関係なし**: 他のタスクの完了を待つ必要なし
- **後続タスク**: 全タスク完了後、統合テストで動作確認

## 💡 拡張提案（時間に余裕がある場合のみ）
以下は必須ではないが、検討可能：
- プロンプトの設定ファイル外出し（data/配下のYAMLファイル活用）
- 複数のプロンプトパターンのランダム選択機能
- アカウント戦略に基づく動的プロンプト生成

**注意**: 拡張実装はMVP原則に反する可能性があるため、基本修正を優先