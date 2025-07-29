# TASK-001: data-manager.ts移動と依存関係修正

## 🎯 タスク概要

`src/data/data-manager.ts`を`src/shared/data-manager.ts`に移動し、すべての依存関係のimportパスを修正する。

## 📋 事前確認必須

### REQUIREMENTS.md必読
```bash
cat REQUIREMENTS.md
```
**注意**: REQUIREMENTS.mdの内容を完全に理解してから作業開始すること

### 権限確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**Worker権限であることを確認後、作業開始許可**

## 🔧 実装手順

### 1. ファイル移動実行

```bash
# 1. src/shared/にdata-manager.tsを移動
mv src/data/data-manager.ts src/shared/data-manager.ts
```

### 2. import修正対象ファイル一覧

以下のファイルで`../data/data-manager`または`./data/data-manager`のimportパスを修正：

#### src/ファイル群
- `src/index.ts`
  - 修正前: `export { DataManager } from './data/data-manager';`
  - 修正後: `export { DataManager } from './shared/data-manager';`

- `src/workflows/action-executor.ts`
  - 修正前: `import { DataManager } from '../data/data-manager';`
  - 修正後: `import { DataManager } from '../shared/data-manager';`

- `src/workflows/main-workflow.ts`
  - 修正前: `import { DataManager } from '../data/data-manager';`
  - 修正後: `import { DataManager } from '../shared/data-manager';`

- `src/shared/component-container.ts`
  - 修正前: `import { DataManager } from '../data/data-manager';`
  - 修正後: `import { DataManager } from './data-manager';`

#### tests/ファイル群
- `tests/integration/workflow-integration.test.ts`
  - 修正前: `import { DataManager } from '../../src/data/data-manager';`
  - 修正後: `import { DataManager } from '../../src/shared/data-manager';`

- `tests/integration/main-system-integration.test.ts`
  - 修正前: `import { DataManager } from '../../src/data/data-manager';`
  - 修正後: `import { DataManager } from '../../src/shared/data-manager';`

- `tests/kaito-api/integration/compatibility-integration.test.ts`
  - 修正前: `import { DataManager } from '../../../src/data/data-manager';`
  - 修正後: `import { DataManager } from '../../../src/shared/data-manager';`

### 3. TypeScript型チェック実行

```bash
# 修正後、型エラーがないことを確認
npx tsc --noEmit
```

### 4. データアクセスパス確認

data-manager.tsがルートレベル/data/ディレクトリにアクセスしていることを確認：

```typescript
// data-manager.ts内で以下のようなパスでアクセスしていることを確認
const dataPath = path.join(process.cwd(), 'data');
```

## 🚫 制約事項

### MVP制約遵守
- 過剰な機能追加は禁止
- 単純なファイル移動とimportパス修正のみ実施
- 新機能・最適化・リファクタリングは禁止

### 品質基準
- TypeScript strict mode準拠
- 全てのimport文の動作確認
- コンパイルエラーゼロ

## 📊 完了基準

- [ ] data-manager.tsがsrc/shared/に移動完了
- [ ] 全対象ファイルのimportパス修正完了
- [ ] TypeScript型チェック通過（エラーゼロ）
- [ ] 既存機能に影響なし（動作確認）

## 🚨 出力管理厳守

### 📂 出力先指定
- **報告書**: `tasks/20250729_160110_src_data_cleanup/reports/REPORT-001-data-manager-migration.md`
- **一時ファイル**: `tasks/20250729_160110_src_data_cleanup/outputs/`配下のみ
- **🚫 ルートディレクトリ直接出力禁止**

### 📋 報告書必須項目
1. 実施した修正の完全リスト
2. 修正前後のimportパス対比
3. TypeScript型チェック結果
4. 動作確認結果
5. 発生した問題と解決方法

## ⚠️ 注意事項

- data-manager.ts以外のファイル修正は最小限に留める
- 既存の機能・動作を変更しない
- エラーが発生した場合は即座に報告
- 不明な点があれば作業を停止して確認を求める

---

**重要**: このタスクは並列実行可能です。TASK-002と同時に作業できます。