# Task: import文の一括更新

## 概要
Phase 2で移動したファイルに対するimport文を全プロジェクトで更新します。

## 前提条件
- Phase 1（TASK-001）、Phase 2（TASK-002）が完了していること
- ファイルが新しいディレクトリ構造に移動済みであること

## 主要なimport更新パターン

### 1. lib/sources → collectors/base
- `from './lib/sources/` → `from './collectors/base/`
- `from '../lib/sources/` → `from '../collectors/base/`
- `from '../../lib/sources/` → `from '../../collectors/base/`

### 2. lib/ → 各新ディレクトリ
- `from './lib/claude-` → `from './providers/claude-`
- `from './lib/x-client` → `from './providers/x-client`
- `from './lib/minimal-decision-engine` → `from './engines/lightweight-decision-engine`
- `from './lib/decision-logger` → `from './logging/decision-logger`
- `from './lib/minimal-logger` → `from './logging/minimal-logger`

### 3. lib/decision → decision
- `from './lib/decision/` → `from './decision/`
- `from '../lib/decision/` → `from '../decision/`

### 4. lib/browser → managers/browser
- `from './lib/browser/` → `from './managers/browser/`
- `from '../lib/browser/` → `from '../managers/browser/`

### 5. core/config-manager → core/app-config-manager
- `from './core/config-manager` → `from './core/app-config-manager`
- `from '../core/config-manager` → `from '../core/app-config-manager`

## 実装手順

### Step 1: import文の検索と更新対象の特定
```bash
# lib/からのimportを検索
grep -r "from ['\"].*lib/" src/ --include="*.ts" --include="*.tsx"
```

### Step 2: 系統的な更新
以下の順序で更新を実施：

1. **providers系の更新**
   - claude-autonomous-agent, claude-optimized-provider, claude-tools, x-client

2. **collectors系の更新**
   - base/, specialized/, integrated/, engines/

3. **engines系の更新**
   - content-convergence-engine, autonomous-exploration-engine等

4. **managers系の更新**
   - browser/, resource/, 直下のファイル

5. **services系の更新**
   - information-evaluator, context-integrator等

6. **その他のディレクトリ**
   - decision/, logging/, exploration/, rss/

### Step 3: 特殊ケースの処理
- **削除されたファイルへの参照**
  - `config-loader.ts`への参照を発見した場合は、`app-config-manager.ts`への参照に更新
  - `optimization-metrics.ts`への参照は削除（コメントアウトまたは該当行削除）

### Step 4: 更新の検証
各ファイルの更新後：
1. TypeScriptのimportエラーがないことを確認
2. 相対パスが正しく解決されることを確認

### Step 5: 更新確認レポートの作成
- 更新したファイル数
- 更新したimport文の数
- 特殊ケースの処理内容

## 品質基準
- すべてのimport文が正しく更新されていること
- TypeScriptコンパイルエラーがないこと（pnpm run typecheck）
- 相対パスが適切に調整されていること

## 出力
- 更新確認レポート: `tasks/20250722_193030/outputs/phase3-import-update-report.md`
- エラーログ（もしあれば）: `tasks/20250722_193030/outputs/phase3-errors.log`

## 注意事項
- 正規表現による一括置換は避け、各ファイルを確認しながら更新
- 相対パスの深さ（../の数）に注意して適切に調整
- エクスポートされた型やインターフェースの参照も忘れずに更新
- package.jsonのパスマッピング（もしあれば）も確認

## 更新チェックリスト
- [ ] providers/への更新
- [ ] collectors/への更新
- [ ] engines/への更新
- [ ] managers/への更新
- [ ] services/への更新
- [ ] decision/への更新
- [ ] logging/への更新
- [ ] exploration/への更新
- [ ] rss/への更新
- [ ] config-manager → app-config-managerの更新
- [ ] 削除ファイルへの参照の処理