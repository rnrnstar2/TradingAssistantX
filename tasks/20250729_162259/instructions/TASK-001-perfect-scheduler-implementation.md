# TASK-001: src/scheduler完璧実装指示書

## 🎯 タスク概要

src/schedulerディレクトリの実装を完璧にし、MainWorkflowとの連携を最適化します。現在の実装は基本機能は動作しますが、型安全性、エラーハンドリング、パラメータマッピングに改善が必要です。

## 📋 現状分析結果

### ✅ 正常に動作している部分
- ディレクトリ構造はdocs/directory-structure.mdと完全一致
- 基本的なスケジュール読み込み・時刻チェック機能
- YAMLファイル読み込み機能
- MainWorkflow.execute()の基本的な呼び出し

### ⚠️ 改善が必要な部分
1. **型安全性**: MainWorkflow.execute()との型の不整合
2. **パラメータマッピング**: ScheduleItemからMainWorkflowへのデータ渡しの不備
3. **エラーハンドリング**: より堅牢なエラー処理が必要
4. **ログ機能**: 詳細な実行状況ログの改善
5. **設定管理**: スケジュール設定の動的読み込み機能

## 🔧 実装要件

### 1. 型安全性の向上

#### 現在の問題
```typescript
// time-scheduler.ts:32 - 型の不整合
await MainWorkflow.execute({
  scheduledAction: taskToRun.action,
  scheduledTopic: taskToRun.topic,
  scheduledQuery: taskToRun.target_query
});
```

#### 要求される改善
- MainWorkflowのWorkflowOptionsインターフェースとの完全な型整合性確保
- TypeScriptのstrict modeでの型エラー完全解消
- 型安全な呼び出しパターンの実装

### 2. パラメータマッピングの完璧化

#### MainWorkflowでの期待されるパラメータ処理
- `scheduledAction` → `decision.action`
- `scheduledTopic` → `decision.parameters.topic`
- `scheduledQuery` → `decision.parameters.query`

#### 実装要件
- ScheduleItemからMainWorkflowへの完璧なデータマッピング
- 各アクション種別での適切なパラメータ設定
- null/undefined値の適切な処理

### 3. エラーハンドリング強化

#### 必要な改善
- **スケジューラー継続性**: 個別タスクエラー時もスケジューラーは継続動作
- **詳細エラーログ**: エラー種別・原因・発生箇所の明確な記録
- **復旧機能**: 一時的エラーからの自動復旧
- **エラー統計**: エラー発生頻度・パターンの記録

#### エラー分類と対応
- **YAML読み込みエラー**: 起動失敗、詳細ログ出力
- **スケジュール実行エラー**: ログ出力、次回実行継続
- **MainWorkflowエラー**: ログ出力、統計記録、継続動作
- **致命的エラー**: プロセス終了、完全なエラー情報記録

### 4. ログ機能の大幅改善

#### 現在のログ問題
- 実行状況の詳細が不足
- エラー情報が不十分
- パフォーマンス指標がない

#### 要求されるログ機能
```typescript
// 期待されるログ出力例
console.log('⏰ スケジューラー起動 - PID: 12345');
console.log('📅 本日のスケジュール読み込み完了: 6件');
console.log('🔍 時刻チェック: 07:00 - マッチするタスク: post(朝の投資教育)');
console.log('⚡ MainWorkflow実行開始 - ExecutionID: exec_20250729_0700');
console.log('✅ MainWorkflow実行完了 - 実行時間: 2.3秒 - 結果: success');
```

#### ログ要件
- **実行統計**: 成功/失敗回数、平均実行時間
- **パフォーマンス**: 各フェーズの実行時間測定
- **状態遷移**: スケジューラー状態の変更記録
- **エラー詳細**: エラー種別・スタックトレース・復旧状況

### 5. 設定の動的読み込み機能

#### 現在の制限
- 起動時の1回のみスケジュール読み込み
- 実行中の設定変更に対応不可

#### 要求される機能
- **定期的再読み込み**: 1時間毎にschedule.yaml再読み込み
- **設定変更検知**: ファイル更新時の自動読み込み（オプション）
- **エラー時継続**: 読み込みエラー時は既存設定で継続

## 📁 対象ファイルと修正内容

### /src/scheduler/time-scheduler.ts
#### 主要改善点
1. **型安全性**: WorkflowOptionsとの完全な型整合性
2. **エラーハンドリング**: try-catchの範囲とエラー分類の改善
3. **ログ機能**: 詳細な実行状況ログの追加
4. **パフォーマンス**: 実行時間測定とメトリクス収集
5. **設定管理**: 動的読み込み機能の追加

#### 具体的実装要件
```typescript
export class TimeScheduler {
  private scheduleItems: ScheduleItem[] = [];
  private running: boolean = false;
  private lastConfigCheck: Date = new Date();
  private executionStats: ExecutionStats = {
    totalExecutions: 0,
    successCount: 0,
    errorCount: 0,
    averageExecutionTime: 0
  };

  async start(): Promise<void> {
    // 詳細ログ付きの起動処理
    // 設定読み込みとエラーハンドリング
    // メトリクス初期化
    
    while (this.running) {
      try {
        // 設定の定期再読み込み
        await this.checkAndReloadConfig();
        
        // 時刻チェックと実行
        await this.processScheduledTasks();
        
        // 統計更新
        this.updateExecutionStats();
        
      } catch (error) {
        // 分類されたエラーハンドリング
        this.handleSchedulerError(error);
      }
      
      await this.sleep(60000);
    }
  }

  private async processScheduledTasks(): Promise<void> {
    // 型安全なMainWorkflow呼び出し
    // 詳細ログ出力
    // パフォーマンス測定
  }

  private async checkAndReloadConfig(): Promise<void> {
    // 1時間毎の設定再読み込み
    // エラー時は既存設定で継続
  }

  private handleSchedulerError(error: Error): void {
    // エラー分類と適切な対応
    // 詳細ログ出力
    // 統計更新
  }
}
```

### /src/scheduler/schedule-loader.ts
#### 主要改善点
1. **エラー詳細化**: より具体的なエラーメッセージ
2. **検証機能**: YAML構造の妥当性検証
3. **キャッシュ機能**: 読み込み結果のキャッシュ
4. **型安全性**: 厳密な型チェック

#### 具体的実装要件
```typescript
export class ScheduleLoader {
  static load(path: string = 'data/config/schedule.yaml'): ScheduleConfig {
    try {
      // ファイル存在確認
      // YAML解析
      // 構造検証
      // ScheduleConfig型への厳密なキャスト
      
      const config = this.validateAndCastConfig(yamlContent);
      this.logLoadSuccess(config);
      return config;
      
    } catch (error) {
      // 詳細なエラー分類と対応
      throw new ScheduleLoadError(`詳細エラー情報: ${error.message}`, error);
    }
  }

  static getTodaySchedule(config: ScheduleConfig): ScheduleItem[] {
    // ScheduleItem[]の厳密な型検証
    // 時刻フォーマット検証
    // 重複チェック
    // ソート処理
    
    return this.validateScheduleItems(config.daily_schedule);
  }

  private static validateAndCastConfig(content: any): ScheduleConfig {
    // 型ガードを使った厳密な検証
    // 必須フィールドの確認
    // データ型の検証
  }

  private static validateScheduleItems(items: any[]): ScheduleItem[] {
    // 各ScheduleItemの型検証
    // 時刻フォーマット確認 (HH:MM)
    // アクション種別確認
    // 必須パラメータ確認
  }
}
```

### /src/scheduler/types.ts
#### 主要改善点
1. **型定義の拡張**: エラークラス、統計、設定の型追加
2. **型ガード**: 実行時型チェック関数
3. **列挙型**: アクション種別の厳密な定義

#### 具体的実装要件
```typescript
export interface ScheduleItem {
  time: string;           // "HH:MM" 形式
  action: ActionType;     // 列挙型での厳密な定義
  topic?: string;         // postアクション用
  target_query?: string;  // retweet/quote_tweet用
}

export interface ScheduleConfig {
  daily_schedule: ScheduleItem[];
}

export enum ActionType {
  POST = 'post',
  RETWEET = 'retweet',
  QUOTE_TWEET = 'quote_tweet',
  LIKE = 'like'
}

export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  errorHistory: ErrorRecord[];
}

export interface ErrorRecord {
  timestamp: Date;
  errorType: string;
  message: string;
  action?: string;
  recoveryAction?: string;
}

export class ScheduleLoadError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ScheduleLoadError';
  }
}

// 型ガード関数
export function isValidScheduleItem(item: any): item is ScheduleItem {
  // 実行時型チェック
}

export function isValidTimeFormat(time: string): boolean {
  // HH:MM形式の検証
}
```

## 🔄 MainWorkflowとの連携改善

### 現在の呼び出し方法の問題
```typescript
// 現在: 型の不整合がある
await MainWorkflow.execute({
  scheduledAction: taskToRun.action,
  scheduledTopic: taskToRun.topic,
  scheduledQuery: taskToRun.target_query
});
```

### 改善された呼び出し方法
```typescript
// 改善後: 完全な型安全性
const workflowOptions: WorkflowOptions = {
  scheduledAction: taskToRun.action,
  scheduledTopic: taskToRun.topic || undefined,
  scheduledQuery: taskToRun.target_query || undefined
};

const result = await MainWorkflow.execute(workflowOptions);

// 結果の型安全な処理
if (result.success) {
  this.updateSuccessStats(result);
} else {
  this.handleWorkflowError(result.error, taskToRun);
}
```

## 🧪 テスト要件

### 必須テストケース
1. **正常系**: 各アクション種別での正常実行
2. **エラー系**: YAML読み込みエラー、MainWorkflowエラー
3. **型安全性**: TypeScriptコンパイル成功
4. **設定再読み込み**: 動的設定変更の動作確認
5. **継続動作**: エラー発生時のスケジューラー継続性

### テスト実装指針
- Jest + TypeScriptでの単体テスト
- MainWorkflowのモッキング
- 実際のYAMLファイルでの統合テスト
- エラーケースの網羅的テスト

## 📊 品質要件

### TypeScript要件
- **strict mode**: 完全対応
- **型エラー**: 0件
- **lint**: ESLint完全通過
- **型カバレッジ**: 100%

### パフォーマンス要件
- **起動時間**: 3秒以内
- **設定読み込み**: 1秒以内
- **メモリ使用量**: 増加なし（現在比）
- **CPU使用率**: 1分間隔での最小限使用

### 可読性要件
- **コメント**: 各関数・重要ロジックに詳細コメント
- **命名**: 意図が明確な変数・関数名
- **構造**: 論理的なコード構成
- **ドキュメント**: JSDocs形式での関数ドキュメント

## 🚫 MVP制約遵守

### 実装してはいけない機能
- **過度な統計機能**: 単純な成功/失敗カウント以上の詳細統計
- **UI機能**: Webベースの管理画面等
- **複雑な設定**: 環境別・プロファイル別設定
- **高度な最適化**: パフォーマンスチューニング機能
- **外部依存**: 追加のライブラリ導入

### 実装すべき最小限機能
- **基本ログ**: console.logでの実行状況出力
- **エラーハンドリング**: try-catchでの基本的な例外処理
- **型安全性**: TypeScriptでの厳密な型定義
- **設定管理**: YAML読み込みとバリデーション
- **継続動作**: エラー時の適切な継続処理

## 📋 完了条件

### 実装完了の判定基準
1. **TypeScriptコンパイル**: エラー・警告なし
2. **ESLint**: 警告・エラーなし  
3. **型安全性**: MainWorkflow.execute()の完全な型整合性
4. **動作確認**: 各アクション種別での正常動作
5. **エラー処理**: 異常系での適切な継続動作
6. **ログ出力**: 詳細で有用な実行状況ログ

### テスト完了の判定基準
1. **単体テスト**: 全テストケース合格
2. **型テスト**: TypeScript型チェック完全通過
3. **統合テスト**: 実際のschedule.yamlでの動作確認
4. **エラーテスト**: 各種エラーケースでの適切な動作

## 📄 報告書要件

実装完了後、以下の報告書を作成してください：
**報告書パス**: `tasks/20250729_162259/reports/REPORT-001-perfect-scheduler-implementation.md`

### 報告書必須内容
1. **実装概要**: 変更したファイルと主な改善点
2. **型安全性**: MainWorkflowとの連携改善詳細
3. **エラーハンドリング**: 実装したエラー処理パターン
4. **ログ改善**: 追加した詳細ログの説明
5. **動作確認結果**: 各アクション種別での動作テスト結果
6. **パフォーマンス**: 実行時間・メモリ使用量の測定結果
7. **今後の改善点**: さらなる最適化の可能性

## 🎯 重要な実装ポイント

### 1. 段階的実装
- まず型安全性を完璧にする
- 次にエラーハンドリングを強化
- 最後にログとメトリクス機能を追加

### 2. テスト駆動
- 各機能実装前に対応するテストを作成
- TypeScriptコンパイルエラーを即座に解決
- 継続的な動作確認

### 3. MainWorkflowとの完璧な連携
- WorkflowOptionsインターフェースの厳密な遵守
- パラメータマッピングの正確性確保
- 戻り値の型安全な処理

この指示書に従って、src/schedulerディレクトリの実装を完璧に仕上げてください。品質・安全性・保守性を最優先に、MVP制約を遵守した実装をお願いします。