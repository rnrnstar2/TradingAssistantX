# TASK-001: main.ts ワークフロー実装タスク

## 🎯 タスク概要

**目的**: src/main.ts に30分毎ワークフローの具体的実装を移動し、コードを見ただけでワークフローが理解できる構造に改善

**優先度**: 最重要 - システム中核機能の透明化

## 📋 作業前必須確認

### 権限・環境チェック
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**⚠️ ROLE=worker 必須、権限確認完了まで作業開始禁止**

### 要件定義書確認
```bash
cat REQUIREMENTS.md | head -30
```
**📖 REQUIREMENTS.md の30分毎ワークフロー仕様を必ず理解してから開始**

## 🎯 実装要件

### 現在の問題点
- **main.ts**: ワークフロー詳細が見えない（MainLoopに委譲）
- **MainLoop**: スケジュール機能とワークフロー実装が混在
- **可読性**: main.tsを見てもワークフローが理解できない

### 理想的な構造
```typescript
// main.ts - 具体的なワークフローが直接見える
async function executeWorkflow(): Promise<ExecutionResult> {
  // 1. 【データ読み込み】- 具体的処理内容が見える
  const context = await loadSystemContext();
  
  // 2. 【Claude判断】- 具体的処理内容が見える  
  const decision = await makeClaudeDecision(context);
  
  // 3. 【アクション実行】- 具体的処理内容が見える
  const result = await executeAction(decision);
  
  // 4. 【結果記録】- 具体的処理内容が見える
  await recordResults(result, context);
  
  return result;
}
```

## 🔧 具体的実装タスク

### Phase 1: ワークフロー関数の実装

#### 1. 基本ワークフロー関数の作成
```typescript
/**
 * メインワークフロー実行（30分毎実行）
 * REQUIREMENTS.md準拠の4ステップワークフロー
 */
async function executeWorkflow(): Promise<ExecutionResult>
```

#### 2. 各ステップ関数の実装

**データ読み込み関数**:
```typescript
/**
 * 【ステップ1】データ読み込み
 * - DataManager: 設定・学習データ読み込み
 * - KaitoAPI: アカウント状況確認
 */
async function loadSystemContext(): Promise<SystemContext>
```

**Claude判断関数**:
```typescript
/**
 * 【ステップ2】Claude判断  
 * - 現在状況の分析
 * - 最適なアクション決定（投稿/RT/いいね/待機）
 */
async function makeClaudeDecision(context: SystemContext): Promise<ClaudeDecision>
```

**アクション実行関数**:
```typescript
/**
 * 【ステップ3】アクション実行
 * - 決定されたアクションの実行
 * - 基本的なエラーハンドリング
 */
async function executeAction(decision: ClaudeDecision): Promise<ActionResult>
```

**結果記録関数**:
```typescript
/**
 * 【ステップ4】結果記録
 * - 実行結果の記録
 * - 学習データの更新
 */
async function recordResults(result: ActionResult, context: SystemContext): Promise<void>
```

### Phase 2: 既存コードからの移行

#### MainLoopから機能移行
現在の `src/scheduler/main-loop.ts` から以下を移行:

1. **analyzeCurrentSituation()** → **loadSystemContext()**
2. **makeDecision()** → **makeClaudeDecision()**  
3. **executeDecision()** → **executeAction()**
4. **recordResults()** → **recordResults()**

#### 型定義の追加・更新
```typescript
interface SystemContext {
  timestamp: string;
  account: AccountInfo;
  system: SystemHealth;
  market: MarketData;
  learningData: LearningData;
}

interface ExecutionResult {
  success: boolean;
  action: string;
  executionTime: number;
  result?: ActionResultData;
  error?: string;
  metadata: ExecutionMetadata;
}
```

### Phase 3: スケジューラー統合

#### executeMainLoop()の変更
```typescript
private async executeMainLoop(): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();

  try {
    systemLogger.info('🔄 メインループ実行開始');
    
    // ===================================================================
    // 30分毎自動実行ワークフロー (REQUIREMENTS.md準拠)
    // 【重要】具体的なワークフローはexecuteWorkflow()で実装
    // ===================================================================
    
    const result = await executeWorkflow();
    const duration = Date.now() - startTime;

    if (result.success) {
      systemLogger.success('✅ メインループ実行完了:', {
        action: result.action,
        duration: `${duration}ms`,
        confidence: result.metadata.confidence
      });
      
      return { success: true, duration };
    } else {
      systemLogger.error('❌ メインループ実行失敗:', result.error);
      return { success: false, duration, error: result.error };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    systemLogger.error('❌ メインループ実行エラー:', error);
    
    return { 
      success: false, 
      duration, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

## 🚫 実装制約・禁止事項

### MVP制約遵守
- **過剰実装禁止**: 7指標品質評価、詳細エンゲージメント予測などは実装しない
- **バランス重視**: 動作確実性とClaude価値の両立
- **シンプル設計**: 複雑な設計より確実な動作を優先

### ファイル構造制約
- **編集対象**: `src/main.ts` のみ
- **他ファイル**: 必要に応じて `src/shared/types.ts` の型定義追加可能
- **新規作成禁止**: 新しいファイルは作成しない

### コード品質要求
- **TypeScript strict**: 厳密な型チェック対応
- **エラーハンドリング**: 適切なtry-catch実装
- **ログ出力**: systemLogger使用による適切なログ出力

## 🧪 動作確認要件

### 必須確認項目
1. **コードが明確**: main.tsを見ればワークフローが理解できる
2. **型安全性**: TypeScript strict mode通過
3. **ログ出力**: 各ステップの実行状況が確認できる
4. **エラー処理**: 適切なエラーハンドリングと復旧

### テストコマンド
```bash
# TypeScript型チェック
pnpm run typecheck

# Lint実行
pnpm run lint

# 動作確認（手動）
pnpm run dev
```

## 📝 成果物・出力先

### 必須出力
- **実装完了コード**: `src/main.ts` 更新
- **型定義更新**: `src/shared/types.ts` （必要に応じて）

### 報告書作成
作業完了後、以下の報告書を作成:
```
tasks/20250724_134113/reports/REPORT-001-main-workflow-implementation.md
```

**報告書内容**:
- 実装完了内容の詳細
- 変更点の説明
- 動作確認結果
- 次のWorkerへの引き継ぎ事項

## ⚠️ 重要注意事項

### 依存関係管理
- **MainLoop依存**: このタスク完了後、Worker2がMainLoop簡素化作業を実行
- **統合影響**: 変更は慎重に行い、システム全体への影響を考慮

### 品質最優先
- **制限なし**: 品質確保のための適切な実装を最優先
- **完全性**: 中途半端な実装は絶対禁止
- **妥協禁止**: 動作確実性を損なう妥協は不可

### コミュニケーション
- **進捗報告**: 実装中の重要な発見や課題は報告書に詳細記載
- **次Worker向け**: Worker2への引き継ぎ情報を明確に記載

---

**🎯 成功基準**: main.tsを見ただけで30分毎ワークフローの全体像が理解でき、各ステップの具体的処理内容が明確になること