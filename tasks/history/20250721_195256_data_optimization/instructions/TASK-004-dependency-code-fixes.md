# TASK-004: 依存関係コード修正・統合完了

## 🚨 **CRITICAL実装指示**

**前提条件**: TASK-001〜003完了後の**必須実装** - データ構造変更に対応するsrc/コード依存関係修正

## 🎯 **実装目標**

TASK-001〜003で変更されたデータファイル構造に対応し、src/コード内の全ファイル参照を新構造に修正・統合する

## 📋 **修正対象ファイル**

### **高優先度修正（必須）**

#### **1. src/lib/account-analyzer.ts**
```typescript
// 🔴 修正必要箇所:
Line 48: private analysisFile = 'data/account-analysis-data.yaml';
→ 修正: private analysisFile = 'data/current/current-analysis.yaml';

Line 198: const accountFile = 'data/account-info.yaml';
→ 修正: const accountFile = 'data/account-config.yaml';

Line 298, 429, 820: const configFile = 'data/account-config.yaml';
→ 検証: account-config.yamlが軽量化されたことを考慮した読み込み修正
```

#### **2. src/lib/daily-action-planner.ts**
```typescript
// 🔴 修正必要箇所:
Line 14: private readonly logFile = 'data/daily-action-data.yaml';
→ 修正: データ読み込み部分をclaude-summary.yaml優先に変更

Line 15: private readonly strategyFile = 'data/content-strategy.yaml';
→ 検証: content-strategy.yamlの構造変更対応確認
```

#### **3. src/utils/config-loader.ts**
```typescript
// 🔴 修正必要箇所:
Line 6: const configPath = 'data/autonomous-config.yaml';
→ 追加: claude-summary.yamlの優先読み込み実装

// 新規追加必要:
const claudeSummaryPath = 'data/claude-summary.yaml';
const systemStatePath = 'data/core/system-state.yaml';
```

#### **4. src/utils/monitoring/health-check.ts**
```typescript
// 🔴 修正必要箇所:
Line 25-28: 複数のdataファイルパス
→ 修正: 新構造（archives/, core/, current/）対応
→ 追加: claude-summary.yaml等の新ファイルチェック
```

### **中優先度修正**

#### **5. src/lib/posting-manager.ts**
```typescript
Line 23: private historyFile = 'data/posting-history.yaml';
→ 検証: posting-history.yamlの軽量化対応確認
```

#### **6. src/core/autonomous-executor.ts**
```typescript
// 🔴 重要: expanded-action-decisions.yaml参照の特定・修正
// Grepで該当箇所を特定し、data/current/current-decisions.yaml参照に変更
```

### **新規実装必要**

#### **7. Claude Summary統合読み込みシステム**
```typescript
// 新規ファイル作成: src/lib/claude-summary-loader.ts
export class ClaudeSummaryLoader {
  private summaryFile = 'data/claude-summary.yaml';
  private systemStateFile = 'data/core/system-state.yaml';
  private decisionContextFile = 'data/core/decision-context.yaml';
  
  async loadOptimizedData(): Promise<OptimizedSystemData> {
    // 30行のclaude-summary.yamlから最重要データを読み込み
    // 必要に応じてsystem-state.yaml, decision-context.yamlを追加読み込み
  }
}
```

## 🔧 **実装手順**

### **Phase 1: 既存参照の修正**

#### **Step 1: account-analyzer.ts修正**
```typescript
// 1. 現在のファイル読み込み確認
Read src/lib/account-analyzer.ts

// 2. data/account-analysis-data.yaml参照を特定
// Line 48: private analysisFile

// 3. 新しいファイルパス適用
private analysisFile = 'data/current/current-analysis.yaml';

// 4. 読み込みロジック確認・調整
// 軽量化されたcurrent-analysis.yamlの構造に対応
```

#### **Step 2: daily-action-planner.ts修正**  
```typescript
// 1. 既存のdata読み込み確認
// 2. claude-summary.yaml優先読み込みに変更
// 3. daily-action-data.yaml参照を軽量データに変更
```

#### **Step 3: config-loader.ts拡張**
```typescript
// 1. claude-summary.yaml読み込み機能追加
// 2. 既存autonomous-config.yaml読み込みは保持
// 3. 優先度制御実装（claude-summary > autonomous-config）
```

### **Phase 2: 新規統合システム実装**

#### **Step 4: Claude Summary Loader作成**
```typescript
// 1. 新規ファイル作成: src/lib/claude-summary-loader.ts
// 2. 最適化読み込みクラス実装
// 3. 既存システムとの統合インターフェース作成
```

#### **Step 5: 既存システム統合**
```typescript
// 1. 主要な実行ファイルでClaude Summary Loader使用
// 2. 従来の大容量ファイル読み込み段階的削除
// 3. 最適化された軽量読み込みに完全移行
```

### **Phase 3: 動作検証・統合テスト**

#### **Step 6: 個別ファイル動作確認**
```bash
# 1. account-analyzer.ts: 新ファイルパスでの正常動作確認
# 2. daily-action-planner.ts: claude-summary.yaml読み込み確認
# 3. config-loader.ts: 優先度制御動作確認
```

#### **Step 7: システム統合テスト**
```bash
# 1. 自律実行システム全体動作確認
# 2. Claude Code読み込み効率測定
# 3. 既存機能の完全動作確認
```

#### **Step 8: パフォーマンステスト**
```bash
# 1. 読み込み時間測定（従来 vs 最適化後）
# 2. メモリ使用量確認
# 3. Claude Code判断精度確認
```

## 📋 **具体的修正コード例**

### **account-analyzer.ts修正例**
```typescript
// 修正前:
private analysisFile = 'data/account-analysis-data.yaml';

// 修正後:
private analysisFile = 'data/current/current-analysis.yaml';
private summaryFile = 'data/claude-summary.yaml'; // 新規追加

// 読み込みメソッド修正:
async loadAnalysisData() {
  // 最初にclaude-summary.yamlから軽量データを読み込み
  const summary = loadYamlSafe(this.summaryFile);
  
  // 詳細が必要な場合のみcurrent-analysis.yamlを読み込み
  const detailed = loadYamlSafe(this.analysisFile);
  
  return { summary, detailed };
}
```

### **config-loader.ts拡張例**
```typescript
// 既存:
const configPath = 'data/autonomous-config.yaml';

// 新規追加:
const claudeSummaryPath = 'data/claude-summary.yaml';
const systemStatePath = 'data/core/system-state.yaml';

export function loadOptimizedConfig() {
  // 1. 最優先: claude-summary.yaml (30行)
  const summary = loadYamlSafe(claudeSummaryPath);
  
  // 2. 必要に応じて: system-state.yaml (15行)  
  const systemState = loadYamlSafe(systemStatePath);
  
  // 3. フォールバック: autonomous-config.yaml
  const autonomousConfig = loadYamlSafe(configPath);
  
  return { summary, systemState, autonomousConfig };
}
```

## 🚨 **制約・注意事項**

### **下位互換性の維持**
- **既存機能**: 完全動作を保証
- **段階的移行**: 急激な変更を回避
- **フォールバック**: 旧ファイルが存在する場合の対応

### **エラーハンドリング強化**
```typescript
// ファイル存在確認と適切なフォールバック
try {
  const optimizedData = loadYamlSafe('data/claude-summary.yaml');
  return optimizedData;
} catch (error) {
  console.warn('Optimized file not found, falling back to legacy files');
  const legacyData = loadYamlSafe('data/legacy-file.yaml');
  return legacyData;
}
```

### **テスト環境での動作保証**
- **テストファイル**: 新構造に対応した testdata準備
- **CI/CD**: パイプラインでの動作確認
- **統合テスト**: 全機能の動作検証

### **出力管理規則**
- **承認された出力場所**: `tasks/20250721_195256_data_optimization/reports/`
- **報告書ファイル名**: `REPORT-004-dependency-code-fixes.md`

## ✅ **完了基準**

1. **ファイル参照修正**: 全src/ファイルの新構造対応完了
2. **Claude Summary統合**: 軽量読み込みシステム稼働確認
3. **下位互換性**: 既存機能の100%動作保証
4. **パフォーマンス向上**: 読み込み効率90%以上改善確認
5. **統合テスト完了**: 全システム統合動作確認
6. **エラーハンドリング**: 異常系の適切な処理確認

## 📊 **期待効果**

### **システム統合完了**
- **Claude Code最適化**: コンテキスト96%削減の実現
- **読み込み効率**: src/コード全体での高速読み込み達成
- **システム安定性**: 新旧システム完全統合

### **開発・保守効率化**
- **統一インターフェース**: 一元化された読み込みシステム
- **デバッグ効率**: 軽量データでの高速デバッグ
- **将来拡張性**: 最適化された構造での機能追加対応

## 🎯 **実装優先度**

**CRITICAL**: account-analyzer.ts, daily-action-planner.ts修正
**HIGH**: config-loader.ts拡張, Claude Summary Loader作成
**MEDIUM**: health-check.ts, posting-manager.ts対応

**成功指標**: 全src/コードが新データ構造で正常動作し、Claude Code読み込み効率96%改善を達成

---

**重要**: この依存関係修正により、データ構造最適化プロジェクトが完全完了し、Claude Code自律システムの真の効率化が実現されます。