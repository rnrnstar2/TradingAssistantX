# TASK-004: リアルエラー学習システム統合・検証

## 🎯 実装目標

TASK-001〜003の成果物を統合し、**完全なリアルエラー学習システム**を構築する。エラー検出→Claude分析→自動修正→再テストの全サイクルを検証し、実用可能な状態にする。

## 📋 必須実装項目

### 1. 統合テストシステム
- **ファイル**: `tests/integration/real-error-learning-integration.test.ts`
- **機能**: 
  - 全データソーステストの統合実行
  - エラー→修正→再テストサイクルの完全テスト
  - システム全体の動作確認

### 2. エラー学習サイクル検証
- **機能**:
  - 実際のエラー発生→検出→Claude分析→修正→再テスト
  - 修正効果の確認
  - 修正失敗時のフォールバック動作

### 3. 統合コマンドインターフェース
- **ファイル**: `src/scripts/real-error-learning.ts`
- **機能**:
  - コマンドライン実行インターフェース
  - エラー学習プロセスの手動実行
  - 結果レポート生成

## 🚨 制約・注意事項

### MVP制約遵守
- **シンプル統合**: 複雑な分析・可視化機能は実装しない
- **現在動作重視**: 安定動作を最優先
- **統計機能最小限**: 成功/失敗カウントのみ

### 統合制約
- **全体実行時間**: 最大15分以内
- **メモリ制限**: 100MB以下
- **並列制限**: データソーステストは最大3つまで同時実行

### 出力管理
- **統合レポート**: `tasks/20250722_004919_real_error_learning_system/outputs/integration-report-{timestamp}.json`
- **修正履歴**: `tasks/20250722_004919_real_error_learning_system/outputs/fix-history.json`

## 📝 実装詳細

### 統合テストフロー
```typescript
interface IntegrationTestFlow {
  phase1_discovery: {
    executeAllSourceTests: () => Promise<SourceTestResult[]>;
    identifyErrors: (results: SourceTestResult[]) => ErrorSummary[];
  };
  phase2_analysis: {
    analyzeWithClaude: (errors: ErrorSummary[]) => Promise<FixDecision[]>;
    prioritizeFixing: (decisions: FixDecision[]) => FixDecision[];
  };
  phase3_fixing: {
    applyFixes: (decisions: FixDecision[]) => Promise<FixResult[]>;
    backupOriginalCode: () => Promise<void>;
  };
  phase4_verification: {
    rerunTests: () => Promise<SourceTestResult[]>;
    compareResults: (before: SourceTestResult[], after: SourceTestResult[]) => ComparisonResult;
  };
}
```

### エラー学習記録
```typescript
interface ErrorLearningRecord {
  sessionId: string;
  timestamp: string;
  originalErrors: ErrorSummary[];
  claudeAnalysis: FixDecision[];
  appliedFixes: FixResult[];
  verificationResults: SourceTestResult[];
  overallSuccess: boolean;
  learningOutcomes: string[];
}
```

### 統合実行スクリプト
コマンド例：
```bash
# 全体実行
tsx src/scripts/real-error-learning.ts --run-all

# 特定ソースのみ
tsx src/scripts/real-error-learning.ts --source yahoo_finance

# 修正のみ実行（テストスキップ）
tsx src/scripts/real-error-learning.ts --fix-only

# レポート生成
tsx src/scripts/real-error-learning.ts --report
```

## ✅ 完了条件

1. **完全統合テスト**: 全データソースでエラー→修正→再テストサイクルが動作
2. **Claude分析統合**: リアルエラーがClaude Code SDKで適切に分析される
3. **自動修正適用**: 修正が実際のコードに適用され、効果が確認される
4. **コマンドライン実行**: 手動でエラー学習プロセスを実行可能
5. **レポート生成**: 学習結果が構造化されたレポートで出力される
6. **TypeScript strict**: すべてのコードが型チェックを通過
7. **15分実行制限**: 全体プロセスが15分以内に完了

## 🔗 依存関係

- **TASK-001**: RealTestFramework (必須)
- **TASK-002**: ClaudeInteractiveFix (必須)  
- **TASK-003**: DataSourceTests (必須)

## 📊 期待される最終効果

**革新的なエラー学習システム**の完成：

1. **リアルエラー検出**: 実際のWeb/APIエラーを確実にキャッチ
2. **AI分析・修正**: Claude Code SDKによる知的修正判断
3. **自動修正適用**: コード修正の自動適用・検証
4. **学習蓄積**: エラーパターンの蓄積と再利用
5. **対話的改善**: Claudeとの対話による継続的システム改善

このシステムにより、**データソースの変更や問題に対してシステムが自己進化**し、人手による修正作業を大幅に削減できる。

---

**実装品質**: MVP制約準拠、統合品質重視
**実行時間**: 最大240分
**依存関係**: TASK-001〜003の完了必須