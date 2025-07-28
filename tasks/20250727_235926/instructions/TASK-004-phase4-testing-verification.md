# TASK-004: Phase 4 - 動作確認とテスト検証

## 🎯 実装目標

**Phase 1-3で改善されたsrc/main-workflows/の完全な動作確認と品質検証を実施し、`pnpm dev`の正常動作を保証する**

## 📋 前提条件

### 必須読み込み
1. **REQUIREMENTS.md** - システム要件定義の理解
2. **TASK-001〜003完了確認** - 全前フェーズの修正が完了していること
3. **src/main-workflows/** - 改善された全ファイルの最終確認
4. **src/main.ts** - main-workflowsとの統合確認

### MVP制約確認
- **動作確実性**: システムが確実に30分間隔で動作すること
- **エラーハンドリング**: 想定されるエラーケースで適切に回復すること  
- **品質保証**: TypeScript strict、ESLintを完全に通過すること

## 🔧 実装詳細

### A. 段階的動作確認テスト

**1. 静的解析テスト**
```bash
# TypeScript厳格チェック
npx tsc --noEmit --strict

# ESLint品質チェック  
npx eslint src/main-workflows/ --fix

# ビルドテスト
npm run build
```

**2. 統合テスト準備**
```typescript
// test-integration.ts (一時テストファイル作成)
import { ComponentContainer, COMPONENT_KEYS } from '../src/shared/component-container';
import { Config } from '../src/shared/config';
import { SchedulerManager } from '../src/main-workflows/scheduler-manager';
import { ExecutionFlow } from '../src/main-workflows/execution-flow';

/**
 * 統合テスト - main-workflowsの基本動作確認
 */
async function testMainWorkflowsIntegration(): Promise<void> {
  console.log('🧪 main-workflows統合テスト開始');
  
  try {
    // 1. ComponentContainer初期化テスト
    const container = new ComponentContainer();
    const config = new Config();
    await config.initialize();
    
    // 2. main-workflowsコンポーネント初期化テスト
    const schedulerManager = new SchedulerManager(container);
    const executionFlow = new ExecutionFlow(container);
    
    // 3. 基本メソッド呼び出しテスト
    const schedulerStatus = schedulerManager.getSchedulerStatus();
    const executionStatus = executionFlow.getExecutionStatus();
    
    console.log('✅ コンポーネント初期化成功');
    console.log('📊 SchedulerManager状態:', schedulerStatus);
    console.log('📊 ExecutionFlow状態:', executionStatus);
    
    console.log('✅ main-workflows統合テスト完了');
    
  } catch (error) {
    console.error('❌ 統合テスト失敗:', error);
    throw error;
  }
}

// テスト実行
testMainWorkflowsIntegration().catch(console.error);
```

### B. 実環境動作確認

**1. 基本起動テスト**
```bash
# システム基本起動
timeout 30s pnpm dev

# 起動ログ確認
echo "起動ログをチェックし、以下が含まれることを確認:"
echo "- ✅ システム初期化完了"  
echo "- ✅ SchedulerManager initialized"
echo "- ⏰ スケジューラー起動完了"
echo "- 🚀 TradingAssistantX システム開始"
```

**2. スケジューラー動作確認**
```typescript
// scheduler-test.ts (一時テストファイル)
/**
 * スケジューラー機能の動作確認
 */
async function testSchedulerFunctionality(): Promise<void> {
  console.log('⏰ スケジューラー動作テスト開始');
  
  // モックコールバック作成
  const mockCallback = async (): Promise<{ success: boolean; duration: number; error?: string }> => {
    console.log('🔄 テスト実行サイクル開始');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    console.log('✅ テスト実行サイクル完了');
    return { success: true, duration: 1000 };
  };
  
  const container = new ComponentContainer();
  const schedulerManager = new SchedulerManager(container);
  
  try {
    // スケジューラー開始テスト（短時間）
    console.log('📍 スケジューラー開始テスト...');
    
    // 手動実行テスト
    console.log('🔧 手動実行テスト...');
    await schedulerManager.triggerExecution();
    
    console.log('⏹️ スケジューラー停止テスト...');
    schedulerManager.stopScheduler();
    
    console.log('✅ スケジューラー動作テスト完了');
    
  } catch (error) {
    console.error('❌ スケジューラーテスト失敗:', error);
    throw error;
  }
}
```

### C. エラーハンドリング検証

**1. 異常系テストケース**
```typescript
// error-handling-test.ts (一時テストファイル)
/**
 * エラーハンドリングの動作確認
 */
async function testErrorHandling(): Promise<void> {
  console.log('🚨 エラーハンドリングテスト開始');
  
  const container = new ComponentContainer();
  const executionFlow = new ExecutionFlow(container);
  
  // Test 1: 不正な設定でのエラー処理
  console.log('Test 1: 設定エラー処理確認');
  
  // Test 2: API接続エラー処理
  console.log('Test 2: API接続エラー処理確認');
  
  // Test 3: データ保存エラー処理  
  console.log('Test 3: データ保存エラー処理確認');
  
  console.log('✅ エラーハンドリングテスト完了');
}
```

### D. パフォーマンス・メモリリーク確認

**1. メモリ使用量モニタリング**
```typescript
// performance-test.ts (一時テストファイル)
/**
 * パフォーマンス・メモリリーク確認
 */
async function testPerformanceAndMemory(): Promise<void> {
  console.log('📊 パフォーマンステスト開始');
  
  const initialMemory = process.memoryUsage();
  console.log('初期メモリ使用量:', {
    heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024) + 'MB'
  });
  
  // 複数回の実行サイクルテスト
  const container = new ComponentContainer();
  const executionFlow = new ExecutionFlow(container);
  
  for (let i = 0; i < 5; i++) {
    console.log(`🔄 実行サイクル ${i + 1}/5`);
    
    try {
      const result = await executionFlow.executeMainLoop();
      console.log(`   結果: ${result.success ? '成功' : '失敗'} (${result.duration}ms)`);
    } catch (error) {
      console.log(`   エラー: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
    
    // メモリ使用量チェック
    const currentMemory = process.memoryUsage();
    console.log(`   メモリ: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
    
    // GC実行
    if (global.gc) {
      global.gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  console.log('最終メモリ使用量:', {
    heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
    increase: Math.round(memoryIncrease / 1024 / 1024) + 'MB'
  });
  
  if (memoryIncrease > 50 * 1024 * 1024) { // 50MB以上増加
    console.warn('⚠️ メモリリークの可能性があります');
  } else {
    console.log('✅ メモリ使用量は適正範囲内');
  }
  
  console.log('✅ パフォーマンステスト完了');
}
```

## ⚠️ 重要な制約事項

### テスト制約
- **実データ使用禁止**: `REAL_DATA_MODE=false` でのテストのみ
- **外部API制限**: KaitoAPI呼び出しは最小限に抑制
- **時間制限**: 各テストは5分以内で complete
- **リソース制限**: メモリ使用量は200MB以下を維持

### 品質基準
- **TypeScript Strict**: 全ファイルでエラー・警告ゼロ
- **ESLint Clean**: 全品質ルールを通過
- **動作確認**: `pnpm dev` が30秒以上正常動作
- **エラー回復**: 想定エラーから適切に回復

### 検証項目
- ✅ 静的解析完全通過（TypeScript + ESLint）
- ✅ システム起動・初期化成功
- ✅ スケジューラー機能正常動作
- ✅ 実行フロー（4ステップ）完全実行
- ✅ エラーハンドリング適切動作
- ✅ メモリリーク無し
- ✅ ログ出力適切

## 🔍 品質チェック要件

### 自動品質チェック
```bash
# 完全品質チェックスクリプト
#!/bin/bash

echo "🔍 Phase 4 品質チェック開始"

# 1. 静的解析
echo "1. TypeScript Strict チェック"
npx tsc --noEmit --strict
if [ $? -ne 0 ]; then
  echo "❌ TypeScript エラーあり"
  exit 1
fi

echo "2. ESLint チェック"  
npx eslint src/main-workflows/ --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ ESLint エラーあり"
  exit 1
fi

echo "3. ビルドテスト"
npm run build
if [ $? -ne 0 ]; then
  echo "❌ ビルドエラーあり"
  exit 1  
fi

echo "✅ 静的解析完全通過"

# 2. 動作テスト
echo "4. システム起動テスト"
timeout 30s pnpm dev &
PID=$!
sleep 10
kill $PID 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✅ システム正常起動確認"
else
  echo "❌ システム起動エラー"
  exit 1
fi

echo "✅ Phase 4 品質チェック完了"
```

## 📊 完了基準

### 必須完了項目
1. **静的解析100%通過**: TypeScript strict + ESLint clean
2. **システム起動成功**: `pnpm dev` が正常起動・30秒以上動作
3. **全機能動作確認**: 4ステップワークフローが完全実行
4. **エラー回復確認**: 想定エラーケースで適切に継続動作
5. **メモリ健全性**: メモリリーク無し、適正使用量維持
6. **ログ品質**: 適切なログレベルで情報出力

### 品質メトリクス
- **TypeScriptエラー**: 0件
- **ESLint警告**: 0件  
- **メモリ使用量**: 200MB以下
- **起動時間**: 10秒以内
- **エラー回復率**: 100%（想定エラーから回復）

## 📝 実装ガイドライン

### テスト実行順序
1. **静的解析実行** (必須最初)
2. **統合テスト実行** (コンポーネント連携確認)
3. **動作確認テスト** (実環境確認)
4. **エラーハンドリングテスト** (異常系確認)
5. **パフォーマンステスト** (リソース確認)
6. **最終検証** (全項目チェック)

### 問題発見時の対応
- **TypeScriptエラー**: 即座にPhase 1に戻り修正
- **動作エラー**: ログ詳細確認・Phase 2,3の修正検討
- **メモリリーク**: Phase 3の共通化部分見直し
- **パフォーマンス問題**: 不要な処理の削除・最適化

### テストファイル管理
```bash
# テストファイル配置
tasks/20250727_235926/outputs/
├── test-integration.ts          # 統合テスト
├── scheduler-test.ts            # スケジューラーテスト  
├── error-handling-test.ts       # エラーハンドリングテスト
├── performance-test.ts          # パフォーマンステスト
├── quality-check.sh             # 品質チェックスクリプト
└── test-results.md              # テスト結果レポート
```

## 📁 出力先指定

- **テストファイル**: `tasks/20250727_235926/outputs/` 配下
- **テスト結果**: `tasks/20250727_235926/outputs/test-results.md`
- **品質レポート**: `tasks/20250727_235926/outputs/quality-report.md`
- **修正ファイル**: 問題発見時のみ `src/main-workflows/` 配下

## 🚫 絶対禁止事項

- **本番データ使用**: 実際のAPIキー・本番データでのテスト禁止
- **長時間実行**: 各テストは5分以内で完了すること
- **設定変更**: TypeScript・ESLint設定の調整による品質基準緩和禁止
- **機能追加**: テスト用の新機能追加禁止

## 🎯 最終成果物

### 完了時の状態
- ✅ **src/main-workflows/** - 完全に品質改善された実装
- ✅ **静的解析クリア** - TypeScript strict + ESLint 100%通過  
- ✅ **動作確認完了** - `pnpm dev` 正常動作確認
- ✅ **品質レポート** - 全テスト結果と改善内容の報告
- ✅ **保守性向上** - 可読性・メンテナンス性の大幅改善

---

**このタスクはPhase 4の最終検証タスクです。Phase 1-3の改善成果を確実に動作確認し、品質保証された src/main-workflows/ を完成させてください。**