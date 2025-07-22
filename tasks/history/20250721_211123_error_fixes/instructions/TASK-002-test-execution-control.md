# TASK-002: テスト実行制御・無限ループ防止機能強化

## 🎯 任務概要
`pnpm dev`実行時の無限ループ防止とテストモード制御を強化し、確実に1回限りの実行を保証する。

## 🔍 問題分析結果

### 現象
- `pnpm dev` 実行時に予想以上に長時間動作
- 「2周目実行」の可能性が疑われる状況
- テストコマンドでは1回実行のみが期待される

### 対象ファイル
- **メイン実行**: `src/scripts/autonomous-runner-single.ts`
- **Core実行**: `src/core/autonomous-executor.ts` 
- **収集制御**: `src/lib/action-specific-collector.ts`

## 🔧 修正要求

### 修正1: autonomous-runner-single.ts 実行制御強化
**ファイル**: `src/scripts/autonomous-runner-single.ts`

**現在確認すべき実装**:
```typescript
// 現在の実装を確認し、以下の制御が適切に機能しているかチェック
```

**実装すべき強化機能**:
1. **実行回数制限**:
   ```typescript
   const MAX_EXECUTION_COUNT = 1; // 単発実行モードでは1回限り
   let executionCount = 0;
   
   const executeSingleAutonomousAction = async () => {
     if (executionCount >= MAX_EXECUTION_COUNT) {
       console.log('🛑 [実行制限] 最大実行回数に達しました');
       process.exit(0);
     }
     
     executionCount++;
     console.log(`🤖 [単発実行] 実行回数: ${executionCount}/${MAX_EXECUTION_COUNT}`);
     
     try {
       // 既存実行ロジック
     } finally {
       // 確実に終了
       console.log('✅ [単発実行完了] プロセスを終了します');  
       process.exit(0);
     }
   };
   ```

2. **タイムアウト制御**:
   ```typescript
   const EXECUTION_TIMEOUT = 5 * 60 * 1000; // 5分でタイムアウト
   
   const timeoutHandle = setTimeout(() => {
     console.log('⏰ [タイムアウト] 実行時間制限により強制終了');
     process.exit(1);
   }, EXECUTION_TIMEOUT);
   ```

3. **プロセス終了保証**:
   ```typescript
   process.on('SIGINT', () => {
     console.log('🛑 [中断要求] プロセスを安全に終了');
     process.exit(0);
   });
   
   process.on('unhandledRejection', (reason) => {
     console.error('❌ [未処理エラー]', reason);
     process.exit(1);
   });
   ```

### 修正2: autonomous-executor.ts 実行状態管理
**ファイル**: `src/core/autonomous-executor.ts`

**実装すべき機能**:
1. **実行状態の明確化**:
   ```typescript
   private isExecutionActive: boolean = false;
   private executionStartTime: number = 0;
   private readonly MAX_EXECUTION_TIME = 4 * 60 * 1000; // 4分
   
   public async executeClaudeAutonomous(): Promise<void> {
     if (this.isExecutionActive) {
       console.log('⚠️ [実行制御] 既に実行中です、重複実行を防止');
       return;
     }
     
     this.isExecutionActive = true;
     this.executionStartTime = Date.now();
     
     try {
       // 実行時間監視
       const timeoutPromise = new Promise<never>((_, reject) => {
         setTimeout(() => {
           reject(new Error('Execution timeout'));
         }, this.MAX_EXECUTION_TIME);
       });
       
       // 実際の実行との競合
       await Promise.race([
         this.performAutonomousExecution(),
         timeoutPromise
       ]);
       
     } finally {
       this.isExecutionActive = false;
       const duration = Date.now() - this.executionStartTime;
       console.log(`⏱️ [実行完了] 実行時間: ${duration}ms`);
     }
   }
   ```

### 修正3: action-specific-collector.ts 収集制限強化
**ファイル**: `src/lib/action-specific-collector.ts`

**収集ループ制御**:
1. **継続保証サイクル制限**:
   ```typescript
   private async executeWithContinuationGuarantee(
     strategy: CollectionStrategy,
     maxIterations: number = 1  // 単発実行では1回に制限
   ): Promise<CollectionResult[]> {
     // 既存実装を1回に制限
     console.log(`🔄 [収集制御] 単発実行モード: 最大${maxIterations}回`);
   }
   ```

2. **収集タイムアウト強化**:
   ```typescript
   private readonly COLLECTION_TIMEOUT = 2 * 60 * 1000; // 2分
   
   private async collectWithTimeout<T>(
     operation: () => Promise<T>,
     timeout: number = this.COLLECTION_TIMEOUT
   ): Promise<T> {
     return Promise.race([
       operation(),
       new Promise<never>((_, reject) => {
         setTimeout(() => reject(new Error('Collection timeout')), timeout);
       })
     ]);
   }
   ```

## 📋 実装要件

### 環境変数制御
```typescript
const IS_SINGLE_EXECUTION = process.env.NODE_ENV !== 'production';
const MAX_ITERATIONS = IS_SINGLE_EXECUTION ? 1 : 3;
```

### ログ強化
1. **実行開始・終了の明確な表示**
2. **実行時間の計測・表示**  
3. **終了理由の明確化**（正常終了/タイムアウト/エラー）

### メモリ・リソース管理
1. **Browser/Contextの確実なクリーンアップ**
2. **未解放リソースの監視**
3. **ガベージコレクション促進**

## 🧪 テスト要件

### 単体テスト
1. **実行回数制限テスト**: 2回目の実行が阻止されること
2. **タイムアウト制御テスト**: 指定時間で確実に終了
3. **リソース解放テスト**: メモリリークが発生しないこと

### 統合テスト
1. **`pnpm dev`実行テスト**: 3分以内に確実に終了
2. **エラー時終了テスト**: エラー発生時も適切に終了
3. **中断制御テスト**: Ctrl+Cで安全に終了

## 📊 監視・診断機能

### 実行状況レポート
```typescript
interface ExecutionReport {
  startTime: number;
  endTime: number;
  duration: number;
  executionCount: number;
  terminationReason: 'success' | 'timeout' | 'error' | 'interrupt';
  resourceUsage: {
    peakMemory: number;
    activeBrowsers: number;
    activeContexts: number;
  };
}
```

## 📤 出力要件

### 出力先
- **レポート**: `tasks/20250721_211123_error_fixes/outputs/TASK-002-execution-control.md`
- **実行ログ**: `tasks/20250721_211123_error_fixes/outputs/TASK-002-execution-log.txt`
- **診断データ**: `tasks/20250721_211123_error_fixes/outputs/TASK-002-diagnostics.json`

### レポート内容
1. 実行制御機能の実装詳細
2. テスト実行結果とパフォーマンス測定
3. リソース使用量の分析
4. 推奨運用方法

## ✅ 完了定義
1. `pnpm dev` 実行が確実に1回で終了する
2. 実行時間が3分以内に収まる
3. リソースリークが発生しない
4. エラー時も安全に終了する
5. 実行状況が適切にログ出力される

**実装優先度**: HIGH
**推定工数**: 1-2時間