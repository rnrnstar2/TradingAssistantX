# TASK-006: integrity-checker.ts 緊急実装指示書

## 🚨 タスク概要
**最重要・緊急**: REQUIREMENTS.mdで定義された「ハルシネーション防止機構」の核心コンポーネントである`src/utils/integrity-checker.ts`を完全実装する。現在完全未実装のため、システム信頼性確保のため最優先で実装が必要。

## 📋 実装要件

### 1. ファイル作成・基本構造
**ファイルパス**: `src/utils/integrity-checker.ts`

**必須インポート**:
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../logging/logger';
import { YamlManager } from './yaml-manager';
import { createSafeError, EnhancedError } from './error-handler';
```

### 2. 主要機能実装

#### A. 構造検証機能
**要件**: REQUIREMENTS.mdのディレクトリ構造と完全一致確認

```typescript
interface StructureValidationResult {
  isValid: boolean;
  violations: StructureViolation[];
  warnings: string[];
}

interface StructureViolation {
  type: 'missing' | 'unauthorized' | 'naming' | 'structure';
  path: string;
  expected?: string;
  actual?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}
```

**実装機能**:
1. **ディレクトリ構造検証**: 要件定義の構造と実際の構造を照合
2. **必須ファイル確認**: REQUIREMENTS.mdに記載された必須ファイルの存在確認
3. **不正ファイル検出**: 要件定義にない追加ファイル・ディレクトリの検出
4. **命名規則チェック**: ファイル名・ディレクトリ名の規約遵守確認

#### B. 出力先制限システム
**要件**: 許可された出力先への書き込みのみ許可

```typescript
const ALLOWED_WRITE_PATHS = [
  'data/current/',
  'data/learning/', 
  'data/archives/',
  'tasks/outputs/'
];

const READONLY_PATHS = [
  'src/',
  'data/config/',
  'tests/',
  'docs/',
  'REQUIREMENTS.md'
];
```

**実装機能**:
1. **書き込み前権限チェック**: ファイル操作前の出力先検証
2. **読み取り専用保護**: readonly_pathsへの書き込み自動拒否
3. **パス正規化**: 相対パス・絶対パスの統一処理
4. **違反ログ記録**: 不正アクセス試行の詳細記録

#### C. 実行前後検証フロー
**要件**: システム実行の整合性保証

```typescript
interface ExecutionValidation {
  preExecution: ValidationResult;
  postExecution: ValidationResult;
  dataLimits: DataLimitValidation;
  namingRules: NamingValidation;
}

interface DataLimitValidation {
  current: {
    fileCount: number;
    maxFiles: number;
    totalSize: number;
    maxSize: number;
  };
  learning: {
    totalSize: number;
    maxSize: number;
  };
}
```

**実装機能**:
1. **実行前検証**:
   - ディレクトリ構造の完全性確認
   - 設定ファイルの整合性チェック
   - リソース制限の事前確認

2. **実行後検証**:
   - ファイル操作結果の検証
   - データ制限遵守の確認
   - 構造変更の検出と評価

3. **制限強制**:
   - data/current/: 最大20ファイル、1MB制限
   - data/learning/: 最大10MB制限
   - archives/: 無制限（ただし構造規約遵守）

#### D. 自動拒否・ロールバック機能
**要件**: 違反検出時の自動対処

```typescript
interface IntegrityAction {
  type: 'block' | 'rollback' | 'warn' | 'allow';
  reason: string;
  details: any;
  timestamp: Date;
}
```

**実装機能**:
1. **即座ブロック**: 重大違反の即時実行停止
2. **自動ロールバック**: 不正変更の自動復元
3. **警告通知**: 軽微な違反の警告記録
4. **実行履歴**: 全アクションの監査ログ

### 3. IntegrityChecker クラス実装

```typescript
export class IntegrityChecker {
  private static instance: IntegrityChecker;
  private logger: Logger;
  private yamlManager: YamlManager;
  private violationHistory: StructureViolation[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.yamlManager = YamlManager.getInstance();
  }

  public static getInstance(): IntegrityChecker {
    if (!IntegrityChecker.instance) {
      IntegrityChecker.instance = new IntegrityChecker();
    }
    return IntegrityChecker.instance;
  }

  // 実行前検証
  public async validateBeforeExecution(): Promise<StructureValidationResult>

  // 実行後検証  
  public async validateAfterExecution(): Promise<StructureValidationResult>

  // ファイル書き込み権限チェック
  public async checkWritePermission(targetPath: string): Promise<boolean>

  // 構造検証
  private async validateStructure(): Promise<StructureValidationResult>

  // データ制限チェック
  private async validateDataLimits(): Promise<DataLimitValidation>

  // 違反時アクション実行
  private async executeViolationAction(violation: StructureViolation): Promise<IntegrityAction>

  // ロールバック実行
  private async performRollback(changes: FileChange[]): Promise<void>
}
```

### 4. 既存システムとの統合

#### A. core-runner.ts への統合
```typescript
// 実行前
const integrityChecker = IntegrityChecker.getInstance();
const preValidation = await integrityChecker.validateBeforeExecution();
if (!preValidation.isValid) {
  throw new Error('Integrity check failed before execution');
}

// 実行後
const postValidation = await integrityChecker.validateAfterExecution();
if (!postValidation.isValid) {
  await integrityChecker.performRollback(executionChanges);
}
```

#### B. autonomous-executor.ts への統合
- 各フェーズ実行前後での整合性チェック
- 違反検出時の実行中断機能

#### C. file-size-monitor.ts との連携
- サイズ制限情報の共有
- 統合的な制限管理

### 5. テスト実装要件

**単体テスト作成**:
- 構造検証機能のテスト
- 権限チェック機能のテスト
- 制限強制機能のテスト
- ロールバック機能のテスト

## 🎯 実装品質基準

### 必須要件
- ✅ TypeScript strictモード準拠
- ✅ エラーハンドリング完全実装
- ✅ 非同期処理の適切な実装
- ✅ ログ出力の充実
- ✅ 既存システムとのシームレスな統合

### パフォーマンス要件
- 検証処理は1秒以内で完了
- メモリ効率的な実装
- 並列処理可能な設計

### セキュリティ要件
- パストラバーサル攻撃対策
- 権限昇格防止
- 監査ログの改竄防止

## 🚨 実装上の注意事項

### MVP制約遵守
- 過度に複雑な実装は避ける
- 必要最小限の機能に集中
- 将来拡張を考慮した設計

### 既存コードへの影響最小化
- 既存インターフェースの維持
- 後方互換性の確保
- 段階的統合の実施

### エラー処理
- 検証失敗時もシステムクラッシュを避ける
- 詳細なエラー情報の記録
- ユーザーフレンドリーなエラーメッセージ

## 📁 出力管理

### 実装ファイル
- ✅ **作成**: `src/utils/integrity-checker.ts`
- ✅ **更新**: 既存ファイルへの統合コード追加時は最小限の変更

### テストファイル
- ✅ **作成**: `tests/utils/integrity-checker.test.ts`

### 報告書
- ✅ **作成**: `tasks/20250723_013109/reports/REPORT-006-integrity-checker-implementation.md`

## 🎯 成功基準

1. **構造検証機能の完全動作**
   - REQUIREMENTS.mdとの100%整合性確認
   - 違反検出率100%

2. **出力先制限の完全実装**
   - 不正書き込み100%ブロック
   - 許可パスへの書き込み100%成功

3. **既存システムとの完全統合**
   - core-runner.tsでの自動実行
   - エラー時の適切なハンドリング

4. **パフォーマンス基準達成**
   - 1秒以内の検証完了
   - メモリ使用量の最適化

この指示書に従い、TradingAssistantXのハルシネーション防止機構の核心となるintegrity-checker.tsを実装し、システムの信頼性を大幅に向上させてください。