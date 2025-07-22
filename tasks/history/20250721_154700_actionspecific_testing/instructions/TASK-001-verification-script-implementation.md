# TASK-001: ActionSpecific動作検証スクリプト実装

## 📋 タスク概要

**Worker 3専用タスク**: ActionSpecificCollectorの**動作検証スクリプト**実装

## 🎯 背景・現状分析

### ✅ 実装済み要素（高品質）
- **ActionSpecificCollector本体**: `src/lib/action-specific-collector.ts` - 完成度が高い実装
- **単体テスト**: `tests/unit/action-specific-collector.test.ts` - 包括的で詳細なテスト
- **統合テスト**: `tests/integration/action-specific-integration.test.ts` - システム統合・エラーハンドリング・パフォーマンス全てをカバー
- **YAML設定**: `data/action-collection-strategies.yaml` - 設定ファイル存在確認済み

### ❌ 不足要素
- **動作検証スクリプト**: 実環境での動作確認用スクリプト（**本タスクで実装**）

## 🎯 実装要件

### **1. 動作検証スクリプト作成**
**ファイル**: `/Users/rnrnstar/github/TradingAssistantX/scripts/verify-action-specific.ts`

**検証項目**:
```typescript
// 1. 実際のアクション決定→特化収集フロー検証
await verifyActionDecisionFlow();

// 2. Claude-Playwright連鎖サイクル動作検証
await verifyChainedCollectionCycle();

// 3. パフォーマンス要件検証
await verifyPerformanceRequirements();

// 4. 品質基準検証
await verifyQualityStandards();
```

### **2. 検証内容詳細**

#### A. フロー検証
- DecisionEngine → ActionSpecificCollector連携
- アクション種別別の情報収集動作確認
- 結果データの完全性チェック

#### B. 連鎖サイクル検証
- Claude指示生成 → Playwright実行 → Claude分析の一連の流れ
- 複数回実行での安定性確認
- エラー回復機能の動作確認

#### C. パフォーマンス検証
- **実行時間**: 90秒以内での完了確認
- **情報充足度**: 85%以上の達成確認
- **成功率**: 95%以上の確認

#### D. 品質検証
- 収集情報の関連性スコア確認
- 信頼性・一意性・タイムリー性の評価
- 品質メトリクスの正常値確認

### **3. 実装構造**

```typescript
// scripts/verify-action-specific.ts
import { ActionSpecificCollector } from '../src/lib/action-specific-collector.js';
import { DecisionEngine } from '../src/core/decision-engine.js';
import { AutonomousExecutor } from '../src/core/autonomous-executor.js';

class ActionSpecificVerificationSuite {
  private collector: ActionSpecificCollector;
  private decisionEngine: DecisionEngine;
  private autonomousExecutor: AutonomousExecutor;

  async runFullVerification(): Promise<VerificationReport> {
    // 1. フロー検証
    // 2. 連鎖サイクル検証
    // 3. パフォーマンス検証
    // 4. 品質検証
  }
}

interface VerificationReport {
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  results: {
    flowVerification: TestResult;
    chainedCycleVerification: TestResult;
    performanceVerification: TestResult;
    qualityVerification: TestResult;
  };
  metrics: {
    executionTime: number;
    sufficiencyScore: number;
    successRate: number;
    qualityScore: number;
  };
  recommendations?: string[];
}
```

### **4. 監視・ログ機能**

```typescript
// リアルタイム監視システム
class VerificationMonitor {
  async monitorExecution(testName: string, testFn: Function) {
    // 実行時間測定
    // メモリ使用量監視
    // エラーログ記録
    // パフォーマンスメトリクス収集
  }
}
```

## 🔧 技術要件

### **実装方針**
- **テストモード活用**: `X_TEST_MODE=true` でモック動作確認
- **実環境テスト**: 実際のClaude API・Playwright実行確認
- **エラーハンドリング**: 全異常ケースでの適切なフォールバック確認
- **TypeScript strict**: 厳密な型安全性確保

### **出力形式**
```bash
# 実行コマンド
pnpm tsx scripts/verify-action-specific.ts

# 実行結果例
✅ [ActionSpecific検証] 全体ステータス: PASS
├─ フロー検証: PASS (1.2秒)
├─ 連鎖サイクル検証: PASS (45秒) 
├─ パフォーマンス検証: PASS (充足度: 87%, 実行時間: 78秒)
└─ 品質検証: PASS (総合スコア: 82点)

📊 [メトリクス]
- 実行時間: 78秒/90秒制限
- 情報充足度: 87%/85%目標
- 成功率: 98%/95%目標
- 品質スコア: 82点/80点目標
```

## ⚡ 品質基準

### **必須要件**
1. **90秒制限**: 全検証が90秒以内に完了
2. **85%充足度**: 情報収集の充足度85%以上達成
3. **95%成功率**: テスト実行成功率95%以上
4. **エラー耐性**: 異常系でも適切なレポート出力

### **品質チェック**
- **TypeScript**: strict mode, lint通過必須
- **モジュール**: ES modules対応
- **ログ**: 詳細な実行ログと結果レポート
- **再現性**: 複数回実行でも安定した結果

## 📂 出力管理規則遵守

**🚨 CRITICAL**: [出力管理規則](../../docs/guides/output-management-rules.md) 必須遵守

**承認された出力場所**:
- ✅ `tasks/20250721_154700_actionspecific_testing/outputs/` - 本タスクのみ
- ✅ `scripts/verify-action-specific.ts` - メインスクリプト
- 🚫 ルートディレクトリへの出力は絶対禁止

## 🎯 成功定義

### **完了基準**
1. **検証スクリプト**: `scripts/verify-action-specific.ts`の完全実装
2. **実行成功**: 全検証項目でPASS結果
3. **要件達成**: 90秒/85%充足度/95%成功率の全要件クリア
4. **安定性**: 複数回実行での一貫した結果

### **報告書要件**
**ファイル**: `tasks/20250721_154700_actionspecific_testing/reports/REPORT-001-verification-script.md`

**含める内容**:
- 実装完了確認
- 検証結果詳細
- パフォーマンスメトリクス
- 品質評価結果
- 改善提案（あれば）

---

**重要**: 既存のテスト実装は非常に高品質で包括的です。本タスクは**動作検証スクリプト**に特化して実装してください。