# TASK-004: KaitoAPI ファイル削除補完作業

## 🎯 タスク概要

TASK-002の未完了部分である、重複ファイルの削除とimport依存関係修正を実施し、REQUIREMENTS.md準拠の11ファイル構成を完成させます。

## 📋 現状確認

### 現在のファイル構成（13ファイル）
```
src/kaito-api/
├── action-executor.ts          # [要削除] 機能重複
├── search-engine.ts            # [要削除] 機能重複
├── core/client.ts              # [保持]
├── core/config.ts              # [保持]
├── endpoints/action-endpoints.ts    # [保持] 統合先
├── endpoints/community-endpoints.ts # [保持]
├── endpoints/list-endpoints.ts      # [保持]
├── endpoints/login-endpoints.ts     # [保持]
├── endpoints/trend-endpoints.ts     # [保持]
├── endpoints/tweet-endpoints.ts     # [保持] 統合先
├── endpoints/user-endpoints.ts      # [保持]
├── endpoints/webhook-endpoints.ts   # [保持]
└── utils/response-handler.ts        # [保持]
```

### 目標構成（11ファイル）
```
src/kaito-api/                 # 11ファイル完成目標
├── core/ (2ファイル)
├── endpoints/ (8ファイル)
└── utils/ (1ファイル)
```

## 🚨 **重要確認事項**

### TASK-002実施状況
- ✅ **機能統合**: action-executor → action-endpoints 統合済み
- ✅ **機能統合**: search-engine → tweet-endpoints 統合済み
- ✅ **過剰実装削除**: client.ts から不要機能削除済み
- ❌ **ファイル削除**: **未実施**（これが今回の作業対象）

### 削除安全性確認
統合作業は完了済みのため、以下ファイルは安全に削除可能です：
- `action-executor.ts` - 機能は `endpoints/action-endpoints.ts` に移行済み
- `search-engine.ts` - 機能は `endpoints/tweet-endpoints.ts` に移行済み

## 📝 実施手順

### Step 1: import依存関係確認

**目的**: 削除対象ファイルを参照している他ファイルの特定

**実行コマンド**:
```bash
# action-executor.ts の参照確認
grep -r "action-executor" src/ --exclude-dir=kaito-api
grep -r "ActionExecutor" src/ --exclude-dir=kaito-api

# search-engine.ts の参照確認  
grep -r "search-engine" src/ --exclude-dir=kaito-api
grep -r "SearchEngine" src/ --exclude-dir=kaito-api
```

**対処方針**:
- 参照が見つかった場合：import文を適切に修正
- `action-executor` → `kaito-api/endpoints/action-endpoints`
- `search-engine` → `kaito-api/endpoints/tweet-endpoints`

### Step 2: 段階的ファイル削除

**手順**:
1. **action-executor.ts削除**
   ```bash
   # バックアップ作成（念のため）
   cp src/kaito-api/action-executor.ts src/kaito-api/action-executor.ts.bak
   
   # ファイル削除実行
   rm src/kaito-api/action-executor.ts
   ```

2. **search-engine.ts削除**
   ```bash
   # バックアップ作成（念のため）
   cp src/kaito-api/search-engine.ts src/kaito-api/search-engine.ts.bak
   
   # ファイル削除実行
   rm src/kaito-api/search-engine.ts
   ```

3. **削除確認**
   ```bash
   # ファイル数確認（11ファイルになっているはず）
   find src/kaito-api -name "*.ts" | wc -l
   
   # 構造確認
   tree src/kaito-api
   ```

### Step 3: import修正実施

**修正対象の可能性**:
- `src/main-workflows/` - ExecutionFlow等でimportしている可能性
- `src/shared/` - ComponentContainer等での参照可能性
- その他の統合ファイル

**修正パターン**:
```typescript
// 修正前
import { ActionExecutor } from '../kaito-api/action-executor';
import { SearchEngine } from '../kaito-api/search-engine';

// 修正後
import { ActionEndpoints } from '../kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../kaito-api/endpoints/tweet-endpoints';
```

### Step 4: 動作確認

**確認項目**:
1. **TypeScript コンパイル確認**
   ```bash
   npx tsc --noEmit
   ```

2. **import エラー確認**
   ```bash
   # 存在しないモジュールの参照チェック
   grep -r "action-executor\|search-engine" src/ --exclude="*.bak"
   ```

3. **ファイル数最終確認**
   ```bash
   find src/kaito-api -name "*.ts" | wc -l
   # 結果: 11 （目標達成確認）
   ```

## 🔧 予想される修正箇所

### 1. ExecutionFlow の修正
**ファイル**: `src/main-workflows/execution-flow.ts`

**予想される修正**:
```typescript
// 修正前（存在する可能性）
import { ActionExecutor } from '../kaito-api/action-executor';

// 修正後
import { ActionEndpoints } from '../kaito-api/endpoints/action-endpoints';
```

### 2. ComponentContainer の修正
**ファイル**: `src/shared/component-container.ts`

**予想される修正**:
```typescript
// 削除対象ファイルへの参照があれば適切に修正
```

### 3. main.ts の修正
**ファイル**: `src/main.ts`

**現在はエンドポイント別設計に移行済みのため修正不要の可能性が高い**

## ⚠️ **重要な注意事項**

### 安全な削除の確認
- **機能統合確認済み**: action-executor の機能は action-endpoints に統合済み
- **機能統合確認済み**: search-engine の機能は tweet-endpoints に統合済み
- **過剰実装削除済み**: client.ts の不要機能は削除済み

### エラー発生時の対処
1. **import エラー**: 適切なendpointsファイルへのimport修正
2. **機能不足**: 統合先ファイルに機能が存在することを確認
3. **予期しないエラー**: バックアップファイルから復旧可能

### 品質確保
- **段階的削除**: 1ファイルずつ削除・確認
- **動作確認**: 各段階でTypeScriptコンパイル確認
- **完了確認**: 最終的に11ファイル構成を確認

## 📊 成功基準

### 完了条件
- [ ] `action-executor.ts` 削除完了
- [ ] `search-engine.ts` 削除完了
- [ ] ファイル数が11ファイルに削減
- [ ] TypeScript コンパイルエラーなし
- [ ] import 参照エラーなし

### 品質基準
- [ ] 既存機能の動作に影響なし
- [ ] REQUIREMENTS.md 構成に完全準拠
- [ ] MVP要件を満たす機能は全て保持

## 📁 出力管理

### 作業ログ
**出力先**: `tasks/20250724_155254/logs/file-deletion.log`

**記録内容**:
- 削除対象ファイルの確認
- import依存関係の確認結果
- 修正したファイルと変更内容
- 最終確認結果

### 完了報告
**報告書**: `tasks/20250724_155254/reports/REPORT-004-kaito-api-file-deletion-completion.md`

**報告内容**:
- 削除したファイル一覧
- 修正したimport参照一覧
- 最終ファイル構成（11ファイル）
- 動作確認結果
- REQUIREMENTS.md適合性確認

## ⏰ 実行優先度: 最高（即座実行）

このタスクはREQUIREMENTS.md準拠完成のための最終作業です。完了により、KaitoAPI最適化が完全に完成します。

## 🎯 期待効果

### アーキテクチャ完成
- REQUIREMENTS.md完全準拠の11ファイル構成実現
- MVP制約に基づく最適化完成
- 過剰実装の完全除去

### 保守性向上
- ファイル数削減による管理容易性向上
- 重複機能除去による保守負荷軽減
- 明確な責務分離の確立

### 次フェーズ準備
- アーキテクチャ基盤の完成
- 機能拡張への準備完了
- 品質保証体制の確立