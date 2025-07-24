# TASK-002: 依存関係修正と新データ構造実装

## 📋 **実装概要**

**目的**: Claude SDK完全移行に伴う依存関係修正とREQUIREMENTS.md新データ構造実装
**重要性**: システム正常動作の回復と新データアーキテクチャ対応

## 🎯 **現状分析結果**

### 問題点
1. **依存関係エラー**: `decision-engine.ts`削除による参照エラー
2. **インポート不整合**: 旧ファイルから新エンドポイントへの移行未完了
3. **新データ構造未実装**: REQUIREMENTS.mdのcurrent/history構造が未実装

## 🚀 **実装作業指示**

### Phase 1: 緊急依存関係修正

**1. 全ファイルインポート調査**
```bash
# decision-engineをインポートしているファイルを特定
grep -r "decision-engine" src/ --include="*.ts" --include="*.tsx"
```

**2. インポート修正パターン**
```typescript
// 修正前
import { ClaudeDecisionEngine } from '../claude/decision-engine';
import { DecisionEngine } from '../claude/decision-engine';

// 修正後
import { makeDecision, ClaudeDecision } from '../claude';
// または
import { makeDecision } from '../claude/endpoints/decision-endpoint';
```

**3. 他の削除ファイル依存確認**
```bash
# 削除済みファイルの参照確認
grep -r "content-generator\|market-analyzer\|performance-tracker\|prompt-builder" src/ --include="*.ts"
```

### Phase 2: 使用方法の更新

**1. DecisionEngineクラスから関数への移行**
```typescript
// 修正前（クラスベース）
const decisionEngine = new ClaudeDecisionEngine();
const decision = await decisionEngine.makeEnhancedDecision();

// 修正後（関数ベース）
const decision = await makeDecision({
  context: systemContext,
  learningData: learningData,
  currentTime: new Date()
});
```

**2. 他のエンドポイント使用例**
```typescript
// コンテンツ生成
import { generateContent } from '../claude';
const content = await generateContent({
  request: { topic: 'investment', contentType: 'educational' },
  qualityThreshold: 70
});

// 分析実行
import { analyzePerformance } from '../claude';
const analysis = await analyzePerformance({
  decision: decision,
  result: executionResult,
  context: systemContext
});
```

### Phase 3: 新データ構造実装

**1. ディレクトリ構造作成**
```bash
# 新データ構造作成
mkdir -p src/data/current
mkdir -p src/data/history
```

**2. DataManager拡張実装**

**src/data/data-manager.ts の更新**:
- 実行サイクル管理機能追加
- current/history アーカイブ機能
- タイムスタンプ付きディレクトリ管理
- 1投稿1ファイル保存機能

**必須メソッド**:
```typescript
// 新しい実行サイクル開始
async startNewCycle(): Promise<string> // execution-YYYYMMDD-HHMM

// 現在サイクルへの保存
async saveToCurrentCycle(type: string, data: any): Promise<void>

// サイクル完了・アーカイブ
async archiveCycle(cycleId: string): Promise<void>

// 投稿データ保存（1投稿1ファイル）
async savePost(post: any): Promise<string> // post-TIMESTAMP.yaml

// インデックス更新
async updatePostIndex(): Promise<void>
```

### Phase 4: 統合テスト

**1. 基本動作確認**
```bash
# エラーなしで起動確認
pnpm dev

# 30秒程度実行して基本フロー確認
```

**2. データフロー確認**
- Claude判断 → decision.yamlへ保存
- 実行結果 → current/execution-*/へ保存
- サイクル完了 → history/へアーカイブ

**3. エラーハンドリング確認**
- 各種エラー時の継続動作
- データ整合性の維持

## 📊 **品質基準**

### 必須要件
- ✅ 全依存関係エラー解消
- ✅ pnpm dev正常起動
- ✅ 30分サイクル正常動作
- ✅ データ構造整合性維持

### 実装品質
- ✅ TypeScript型安全性維持
- ✅ エラーハンドリング完全性
- ✅ REQUIREMENTS.md準拠
- ✅ MVP制約遵守（過剰実装禁止）

## 🔒 **実装制約**

### 技術制約
- **インポート統一**: src/claude/index.tsからのインポート推奨
- **型安全**: any型の最小化、適切な型定義使用
- **非同期処理**: 全データ操作は非同期実装

### データ構造制約
- **current/**: 1実行サイクル（30分）のみ保持
- **history/**: 月次ディレクトリで整理
- **ファイルサイズ**: 各ファイル1MB以下推奨
- **命名規則**: タイムスタンプ形式統一（YYYYMMDD-HHMM）

## 🎯 **成功基準**

### Phase完了条件
1. ✅ 全インポートエラー解消
2. ✅ pnpm dev正常起動・30秒以上安定動作
3. ✅ current/historyディレクトリ作成・動作確認
4. ✅ Claude判断結果の適切な保存確認

### 最終確認項目
- システム起動から判断・実行・保存の一連フロー
- エラー時の適切なフォールバック
- データ構造の整合性維持
- REQUIREMENTS.md新仕様との適合性

## 💡 **実装優先度**

**最優先**: Phase 1（依存関係修正）- システム起動に必須
**必須**: Phase 2（使用方法更新）- 正常動作に必須
**重要**: Phase 3（データ構造実装）- MVP要件
**最終**: Phase 4（統合テスト）- 品質保証

## ⚠️ **注意事項**

### インポート修正時の注意
- 型定義も合わせて更新
- 使用方法の変更も同時に実施
- テスト実行で動作確認

### データ構造実装時の注意
- 既存のconfig/context/learningは変更しない
- 段階的な移行を意識
- バックワード互換性の維持

---

**重要**: この実装により、Claude SDK完全移行が完了し、新データアーキテクチャが稼働開始します。慎重かつ確実に作業を進めてください。