# TASK-005: Claude SDK DEV_MODE最適化と警告メッセージ改善

## 📋 タスク概要
現在のCLAUDE_SDK_DEV_MODEの実装を最適化し、過度な警告メッセージを削減して、テスト実行時の出力を見やすくする。

## 🎯 目的
- CLAUDE_SDK_DEV_MODEの警告メッセージを最小限に削減
- テスト実行時の出力をクリーンに保つ
- 環境変数による制御の見直し

## 📁 対象ファイル
- `src/claude/endpoints/content-endpoint.ts`
- `src/claude/endpoints/analysis-endpoint.ts`
- `src/claude/endpoints/search-endpoint.ts`

## 🔧 実装詳細

### 1. 警告メッセージの最適化

#### 現在の問題点
- 各エンドポイント呼び出しごとに`console.warn`が出力される
- テスト実行時に大量の警告メッセージで結果が見づらい

#### 修正方針
1. **初回のみ警告を表示**する仕組みを実装
2. **ログレベルの制御**を追加
3. **テスト環境では警告を無効化**

#### 共通パターンの実装

各エンドポイントファイルの先頭に以下を追加：

```typescript
// 警告表示フラグ（初回のみ表示）
let devModeWarningShown = false;

// テスト環境かどうかを判定
const isTestEnvironment = process.env.NODE_ENV === 'test';
```

Claude SDK呼び出し部分の修正：
- `if (process.env.CLAUDE_SDK_DEV_MODE === 'true')`のブロック内で
- `console.warn`を条件付きに変更：
  - `!devModeWarningShown && !isTestEnvironment`の場合のみ警告表示
  - 警告表示後に`devModeWarningShown = true`を設定

### 2. shouldUseMock関数の確認と調整

#### 確認事項
- `shouldUseMock()`関数が既に実装されているか確認
- 実装されている場合、その動作を確認
- CLAUDE_SDK_DEV_MODEとの関係を整理

#### 調整方針
- `shouldUseMock()`と`CLAUDE_SDK_DEV_MODE`の役割を明確化
- 必要に応じて統合または使い分け
- テスト環境での動作を最適化

### 3. 環境変数の整理

#### 確認と修正
- `.env`ファイルにCLAUDE_SDK_DEV_MODEが含まれていないか確認
- 本番環境でモックが使用されないことを保証
- 環境変数の使用を最小限に抑える

### 4. genMockContent関数の確認

#### 確認事項
- 各エンドポイントで`genMockContent`関数が実装されているか
- 実装内容が適切か
- 関数名の統一（`genMockContent` vs `generateMockContent`）

## ✅ 完了条件
- [ ] テスト実行時の警告メッセージが大幅に削減されている
- [ ] 初回のみ警告が表示される仕組みが実装されている
- [ ] テスト環境では警告が完全に無効化されている
- [ ] `pnpm test tests/claude/`の出力がクリーンになっている
- [ ] 本番環境でモックが使用されないことが保証されている

## 📝 注意事項
- CLAUDE.mdの規約に従い、本番環境でのモック使用は厳禁
- テスト環境での動作を損なわないよう注意
- ログ出力は開発時のデバッグに必要な最小限に留める

## 🚀 実行コマンド
```bash
# テスト実行（警告メッセージが削減されていることを確認）
pnpm test tests/claude/ -- --run

# 型チェック
pnpm typecheck

# lint実行
pnpm lint
```

## 💡 実装のヒント
- グローバル変数の使用は最小限に
- 環境変数の判定は起動時に一度だけ行う
- console.warnの代わりにconsole.logやdebugレベルのログを検討