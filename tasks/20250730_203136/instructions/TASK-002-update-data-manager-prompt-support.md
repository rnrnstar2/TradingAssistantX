# TASK-002: DataManager プロンプト保存機能拡張

## 🎯 タスク概要

DataManagerクラスにClaude プロンプトログ保存機能を追加し、`data/current/execution-xxx/claude-outputs/` ディレクトリ構造での統一的なデータ管理を実現する。

## 📋 実装要件

### 対象ファイル
- `src/shared/data-manager.ts`
- `src/shared/types.ts` (必要に応じて型追加)

### 必須機能
1. **Claude出力ディレクトリの自動作成**
2. **プロンプトログの構造化保存**
3. **実行IDベースのファイル管理**
4. **既存データ管理との統合**

## 🏗️ 実装詳細

### 1. DataManager クラスの拡張

`src/shared/data-manager.ts` に以下のメソッドを追加：

```typescript
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

export class DataManager {
  // 既存のコード...

  /**
   * Claude出力データの保存（プロンプト・結果）
   * @param relativePath - claude-outputs/ からの相対パス
   * @param data - 保存するデータ
   */
  async saveClaudeOutput(relativePath: string, data: any): Promise<void> {
    try {
      const currentExecution = this.getCurrentExecutionId();
      if (!currentExecution) {
        throw new Error('Current execution ID not found');
      }

      const claudeOutputsDir = path.join(
        this.config.dataDir,
        'current',
        currentExecution,
        'claude-outputs'
      );

      const fullPath = path.join(claudeOutputsDir, relativePath);
      
      // ディレクトリを再帰的に作成
      await this.ensureDirectoryExists(path.dirname(fullPath));
      
      // データをYAML形式で保存
      const yamlContent = yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
      
      await fs.writeFile(fullPath, yamlContent, 'utf8');
      
      console.log(`✅ Claude出力保存完了: ${relativePath}`);
      
    } catch (error) {
      console.error(`❌ Claude出力保存エラー: ${relativePath}`, error);
      throw error;
    }
  }

  /**
   * プロンプトログの保存（特化メソッド）
   * @param promptType - プロンプトタイプ（content, selection, quote）
   * @param promptData - プロンプトデータ
   */
  async savePromptLog(promptType: string, promptData: any): Promise<void> {
    const filename = this.getPromptLogFilename(promptType);
    const relativePath = path.join('prompts', filename);
    
    await this.saveClaudeOutput(relativePath, promptData);
  }

  /**
   * Claude結果データの保存
   * @param resultType - 結果タイプ（content, decision, analysis）
   * @param resultData - 結果データ
   */
  async saveClaudeResult(resultType: string, resultData: any): Promise<void> {
    const filename = `${resultType}.yaml`;
    await this.saveClaudeOutput(filename, resultData);
  }

  /**
   * プロンプトログファイル名の生成
   */
  private getPromptLogFilename(promptType: string): string {
    const typeMap: Record<string, string> = {
      'content': 'content-prompt.yaml',
      'selection': 'selection-prompt.yaml', 
      'quote': 'quote-prompt.yaml',
      'analysis': 'analysis-prompt.yaml'
    };
    
    return typeMap[promptType] || `${promptType}-prompt.yaml`;
  }

  /**
   * ディレクトリの存在確認と作成
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 現在の実行IDを取得
   */
  private getCurrentExecutionId(): string | null {
    // 既存のロジックを使用または新規実装
    // execution-YYYYMMDD-HHMM 形式のIDを返す
    return this.currentExecutionId || null;
  }

  /**
   * Claude出力ディレクトリの初期化
   */
  async initializeClaudeOutputs(): Promise<void> {
    const currentExecution = this.getCurrentExecutionId();
    if (!currentExecution) {
      throw new Error('Current execution ID not found');
    }

    const claudeOutputsDir = path.join(
      this.config.dataDir,
      'current', 
      currentExecution,
      'claude-outputs'
    );

    // 基本ディレクトリ構造を作成
    const dirs = [
      claudeOutputsDir,
      path.join(claudeOutputsDir, 'prompts')
    ];

    for (const dir of dirs) {
      await this.ensureDirectoryExists(dir);
    }

    console.log(`✅ Claude出力ディレクトリ初期化完了: ${currentExecution}`);
  }

  /**
   * Claude出力データの読み込み
   * @param relativePath - claude-outputs/ からの相対パス
   */
  async loadClaudeOutput(relativePath: string): Promise<any> {
    try {
      const currentExecution = this.getCurrentExecutionId();
      if (!currentExecution) {
        throw new Error('Current execution ID not found');
      }

      const fullPath = path.join(
        this.config.dataDir,
        'current',
        currentExecution,
        'claude-outputs',
        relativePath
      );

      const content = await fs.readFile(fullPath, 'utf8');
      return yaml.load(content);
      
    } catch (error) {
      console.error(`❌ Claude出力読み込みエラー: ${relativePath}`, error);
      throw error;
    }
  }

  /**
   * プロンプトログの一覧取得
   */
  async getPromptLogs(): Promise<string[]> {
    try {
      const currentExecution = this.getCurrentExecutionId();
      if (!currentExecution) {
        return [];
      }

      const promptsDir = path.join(
        this.config.dataDir,
        'current',
        currentExecution,
        'claude-outputs',
        'prompts'
      );

      try {
        const files = await fs.readdir(promptsDir);
        return files.filter(file => file.endsWith('.yaml'));
      } catch {
        // ディレクトリが存在しない場合は空配列を返す
        return [];
      }
      
    } catch (error) {
      console.error('❌ プロンプトログ一覧取得エラー:', error);
      return [];
    }
  }
}
```

### 2. 実行ID管理の強化

既存の実行ID管理を確認し、必要に応じて以下を追加：

```typescript
export class DataManager {
  private currentExecutionId: string | null = null;

  /**
   * 新規実行サイクルの初期化
   */
  async initializeNewExecution(): Promise<string> {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '-')
      .substring(0, 13); // YYYYMMDD-HHMM

    this.currentExecutionId = `execution-${timestamp}`;
    
    // Claude出力ディレクトリも同時に初期化
    await this.initializeClaudeOutputs();
    
    return this.currentExecutionId;
  }

  /**
   * 現在の実行IDを設定
   */
  setCurrentExecutionId(executionId: string): void {
    this.currentExecutionId = executionId;
  }

  /**
   * 現在の実行IDを取得
   */
  getCurrentExecutionId(): string | null {
    return this.currentExecutionId;
  }
}
```

### 3. 型定義の追加

`src/shared/types.ts` に必要に応じて型を追加：

```typescript
// Claude出力関連の型定義
export interface ClaudeOutputPaths {
  prompts: {
    content: string;
    selection: string;
    quote: string;
    analysis: string;
  };
  results: {
    content: string;
    decision: string;
    analysis: string;
  };
}

export interface DataManagerConfig {
  dataDir: string;
  currentExecutionId?: string;
  claudeOutputPaths?: ClaudeOutputPaths;
}
```

### 4. エラーハンドリング強化

既存のエラーハンドリングを確認し、Claude出力関連のエラーケースを追加：

```typescript
// カスタムエラークラスの追加
export class ClaudeOutputError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'ClaudeOutputError';
  }
}
```

## 🧪 テスト要件

### 単体テスト (`tests/shared/data-manager.test.ts`)

以下のテストケースを追加：

```typescript
describe('DataManager - Claude Output Support', () => {
  describe('saveClaudeOutput', () => {
    it('should save prompt data to correct path', async () => {
      // テスト実装
    });

    it('should create directories recursively', async () => {
      // テスト実装
    });

    it('should handle YAML serialization correctly', async () => {
      // テスト実装
    });
  });

  describe('savePromptLog', () => {
    it('should save different prompt types with correct filenames', async () => {
      // テスト実装
    });
  });

  describe('initializeClaudeOutputs', () => {
    it('should create required directory structure', async () => {
      // テスト実装
    });
  });
});
```

### 統合テスト

- ワークフロー実行時のディレクトリ作成確認
- 複数のClaude出力の同時保存テスト
- エラー時の適切なクリーンアップ確認

## ⚠️ 重要な制約

### MVP制約遵守
- **最小限実装**: 必要最小限の機能のみ実装
- **後方互換性**: 既存のDataManager機能に影響なし
- **パフォーマンス**: ファイルI/O最適化

### 品質要件
- **TypeScript strict**: 厳格な型チェック必須
- **エラーハンドリング**: ファイルシステムエラーの適切な処理
- **ログ出力**: 適切なデバッグ情報の提供

## 📝 完了条件

1. ✅ DataManagerにClaude出力保存機能追加
2. ✅ ディレクトリ構造の自動作成確認
3. ✅ プロンプトログ保存の動作確認
4. ✅ 既存DataManager機能に影響なし
5. ✅ 全テスト通過（単体・統合）
6. ✅ lint/typecheck 通過

## 🔗 依存関係

**直列実行必須**: TASK-001完了後に実行
- TASK-001のClaudePromptLoggerクラスがこのDataManager拡張機能を使用

## 📋 報告事項

実装完了後、以下を含む報告書を作成してください：

- 追加したメソッドの一覧と機能説明
- ディレクトリ構造作成の動作確認結果
- 既存機能への影響評価
- パフォーマンステスト結果
- 発生した課題と解決方法

**報告書パス**: `tasks/20250730_203136/reports/REPORT-002-data-manager-prompt-support.md`