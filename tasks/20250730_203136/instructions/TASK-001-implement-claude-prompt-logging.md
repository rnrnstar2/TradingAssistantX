# TASK-001: Claude エンドポイント プロンプトログ実装

## 🎯 タスク概要

Claude Code SDKの各エンドポイント（generateContent, selectOptimalTweet, generateQuoteComment）にプロンプトログ出力機能を実装し、AI判断プロセスの完全透明化を実現する。

## 📋 実装要件

### 対象ファイル
- `src/claude/endpoints/content-endpoint.ts`
- `src/claude/endpoints/selection-endpoint.ts` 
- `src/claude/endpoints/analysis-endpoint.ts`
- `src/claude/types.ts` (型定義追加)

### 必須機能
1. **プロンプトログ構造の統一化**
2. **各エンドポイントでの自動ログ出力**
3. **機密情報の自動除外**
4. **実行IDとの連携**

## 🏗️ 実装詳細

### 1. 型定義の追加 (`src/claude/types.ts`)

以下の型定義を追加：

```typescript
// プロンプトログ用の型定義
export interface PromptLogMetadata {
  endpoint: string;
  timestamp: string;
  execution_id: string;
  model: string;
  timeout: number;
}

export interface PromptLogData {
  prompt_metadata: PromptLogMetadata;
  input_context: Record<string, any>;
  system_context: SystemContext;
  full_prompt: string;
  response_metadata?: {
    content_length?: number;
    twitter_length?: number;
    quality_score?: number;
    generation_time_ms?: number;
  };
}

export interface PromptLogger {
  logPrompt(data: PromptLogData): Promise<void>;
}
```

### 2. プロンプトログユーティリティ関数 (`src/claude/utils/prompt-logger.ts`)

新規ファイルを作成し、以下の機能を実装：

```typescript
import { PromptLogData, PromptLogMetadata } from '../types';
import { DataManager } from '../../shared/data-manager';

export class ClaudePromptLogger {
  private static dataManager: DataManager | null = null;

  private static getDataManager(): DataManager {
    if (!this.dataManager) {
      this.dataManager = new DataManager();
    }
    return this.dataManager;
  }

  /**
   * プロンプトログを保存
   */
  static async logPrompt(data: PromptLogData): Promise<void> {
    try {
      const sanitizedData = this.sanitizePromptData(data);
      const filename = this.generateLogFilename(data.prompt_metadata.endpoint);
      const filepath = `claude-outputs/prompts/${filename}`;
      
      await this.getDataManager().saveClaudeOutput(filepath, sanitizedData);
      
      console.log(`📝 Claude プロンプトログ保存: ${filepath}`);
    } catch (error) {
      console.error('❌ プロンプトログ保存エラー:', error);
      // エラーでもワークフローを停止させない
    }
  }

  /**
   * 機密情報の除外
   */
  private static sanitizePromptData(data: PromptLogData): PromptLogData {
    // APIキー、パスワード、トークンなどを除外
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // プロンプト内の機密情報パターンを除外
    if (sanitized.full_prompt) {
      sanitized.full_prompt = sanitized.full_prompt
        .replace(/api[_-]?key[:\s]*[a-zA-Z0-9_-]+/gi, 'api_key: [REDACTED]')
        .replace(/token[:\s]*[a-zA-Z0-9_-]+/gi, 'token: [REDACTED]')
        .replace(/password[:\s]*[^\s]+/gi, 'password: [REDACTED]');
    }
    
    return sanitized;
  }

  /**
   * ログファイル名生成
   */
  private static generateLogFilename(endpoint: string): string {
    const endpointMap: Record<string, string> = {
      'generateContent': 'content-prompt.yaml',
      'selectOptimalTweet': 'selection-prompt.yaml',
      'generateQuoteComment': 'quote-prompt.yaml',
      'analyzePerformance': 'analysis-prompt.yaml'
    };
    
    return endpointMap[endpoint] || `${endpoint}-prompt.yaml`;
  }
}
```

### 3. content-endpoint.ts の更新

`generateContent` 関数と `generateQuoteComment` 関数に以下の修正を適用：

**generateContent関数の修正箇所**:
- プロンプト構築後、Claude SDK呼び出し前にログ出力
- レスポンス取得後にレスポンスメタデータをログに追加

```typescript
// プロンプト構築後に追加
const promptLogData: PromptLogData = {
  prompt_metadata: {
    endpoint: 'generateContent',
    timestamp: new Date().toISOString(),
    execution_id: context?.executionId || 'unknown',
    model: 'sonnet',
    timeout: CLAUDE_TIMEOUT
  },
  input_context: {
    topic,
    content_type: contentType,
    target_audience: targetAudience,
    max_length: maxLength
  },
  system_context: context || getSystemContextForContent(),
  full_prompt: prompt
};

// Claude SDK呼び出し
const startTime = Date.now();
const response = await claude()...
const endTime = Date.now();

// レスポンスメタデータを追加
promptLogData.response_metadata = {
  content_length: response.length,
  twitter_length: calculateTwitterLength(response),
  quality_score: evaluateBasicQuality(response, topic),
  generation_time_ms: endTime - startTime
};

// プロンプトログ保存
await ClaudePromptLogger.logPrompt(promptLogData);
```

### 4. selection-endpoint.ts の更新

`selectOptimalTweet` 関数に同様のログ機能を追加：

```typescript
// selectOptimalTweet関数内でプロンプト構築後に追加
const promptLogData: PromptLogData = {
  prompt_metadata: {
    endpoint: 'selectOptimalTweet',
    timestamp: new Date().toISOString(),
    execution_id: context?.executionId || 'unknown',
    model: 'sonnet',
    timeout: 30000
  },
  input_context: {
    selection_type: params.selectionType,
    candidates_count: params.candidates.length,
    topic: params.criteria.topic,
    quality_threshold: params.criteria.qualityThreshold
  },
  system_context: context || getDefaultSystemContext(),
  full_prompt: prompt
};

// Claude SDK呼び出し後にレスポンスメタデータを追加し、ログ保存
```

### 5. DataManagerの拡張

`src/shared/data-manager.ts` に以下のメソッドを追加：

```typescript
/**
 * Claude出力データの保存
 */
async saveClaudeOutput(relativePath: string, data: any): Promise<void> {
  const executionDir = this.getCurrentExecutionDir();
  const fullPath = path.join(executionDir, relativePath);
  
  // ディレクトリを作成
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  
  // YAMLファイルとして保存
  const yamlContent = yaml.dump(data, { 
    indent: 2, 
    lineWidth: 120,
    noRefs: true 
  });
  
  await fs.writeFile(fullPath, yamlContent, 'utf8');
}
```

## 🧪 テスト要件

### 単体テスト
- プロンプトログ生成の正確性
- 機密情報除外機能
- ファイル保存の確実性

### 統合テスト  
- ワークフロー実行時の自動ログ出力
- 実行ID連携の確認
- エラー時の適切なハンドリング

## ⚠️ 重要な制約

### MVP制約遵守
- **最小限実装**: 過剰な機能追加は禁止
- **エラー非停止**: ログエラーでワークフロー停止させない
- **パフォーマンス**: ログ処理でメイン処理を遅延させない

### 品質要件
- **TypeScript strict**: 厳格な型チェック必須
- **エラーハンドリング**: 全ての可能性を想定
- **コード品質**: ESLint/Prettier通過必須

## 📝 完了条件

1. ✅ 全対象エンドポイントでプロンプトログ出力実装
2. ✅ 機密情報除外機能が正常動作
3. ✅ data/current/execution-xxx/claude-outputs/prompts/ にファイル保存確認
4. ✅ 既存ワークフローに影響なし
5. ✅ 全テスト通過（単体・統合）
6. ✅ lint/typecheck 通過

## 📋 報告事項

実装完了後、以下を含む報告書を作成してください：

- 実装したファイルの一覧
- 追加した型定義の詳細
- テスト実行結果
- 発生した課題と解決方法
- パフォーマンスへの影響評価

**報告書パス**: `tasks/20250730_203136/reports/REPORT-001-claude-prompt-logging.md`