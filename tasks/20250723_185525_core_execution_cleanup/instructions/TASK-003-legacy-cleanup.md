# TASK-003: レガシー実行ロジック完全削除

## 🎯 タスク概要

Claude中心アーキテクチャ移行の最終段階として、古い意思決定システム（autonomous-executor.ts, decision-engine.ts）とそれらの依存関係を完全に削除し、システムを完全にクリーンアップする。

## 📋 必須事前確認

### 1. 権限・環境確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**Worker権限での実装作業のみ許可**

### 2. REQUIREMENTS.md確認
```bash
cat REQUIREMENTS.md | head -50
```
**要件定義書の必読確認**

### 3. 前提タスク完了確認
- ✅ **TASK-001完了**: execution/モジュール監査完了
- ✅ **TASK-002完了**: core-runner.ts理想実装への置換完了

## 🚨 削除対象レガシーファイル

### 確実削除対象（121KB + 40KB = 161KB削減）
```
src/core/
├── autonomous-executor.ts (40KB, 1000行+) - 旧実行システム
├── decision-engine.ts (121KB, 3000行+) - 巨大意思決定エンジン
└── （その他特定されるレガシーファイル）
```

### レガシーシステムの特徴（削除理由）
- ❌ **SystemDecisionEngine**: Claude以外の意思決定システム
- ❌ **複雑な意思決定フロー**: 過剰な抽象化・分岐
- ❌ **YAML操作の混在**: 型定義とビジネスロジックの混在
- ❌ **巨大ファイル**: メンテナンス困難な肥大化コード

## 📝 実装要件

### 1. レガシーファイル特定・影響範囲調査

**調査対象**:
1. **autonomous-executor.ts**: 依存している他ファイルの特定
2. **decision-engine.ts**: importしている・されているファイルの特定
3. **連鎖削除対象**: レガシーシステムでのみ使用される関連ファイル

**調査方法**:
```bash
# autonomous-executor.tsを使用しているファイル検索
grep -r "autonomous-executor" src/ --include="*.ts"

# decision-engine.tsを使用しているファイル検索  
grep -r "decision-engine" src/ --include="*.ts"

# SystemDecisionEngineを使用している箇所
grep -r "SystemDecisionEngine" src/ --include="*.ts"
```

### 2. 依存関係の安全削除

**段階的削除手順**:
1. **使用箇所の特定**: レガシーファイルをimport/使用している箇所
2. **影響範囲確認**: 削除によって影響を受けるファイル
3. **代替実装確認**: 新しいClaude中心システムで機能が代替されているか
4. **安全削除実行**: 段階的にファイルを削除

### 3. 残存参照の修正

**修正対象の可能性**:
- ❌ **import文**: レガシーファイルのimport削除
- ❌ **型定義**: 不要になった型定義の削除
- ❌ **設定ファイル**: tsconfig.json等の不要な参照
- ❌ **テストファイル**: レガシーシステムのテスト削除

## 🔧 実装手順

### Phase 1: 影響範囲調査
1. **依存関係マッピング**:
   ```bash
   # 全レガシーファイルの使用状況調査
   find src/ -name "*.ts" -exec grep -l "autonomous-executor\|decision-engine\|SystemDecisionEngine" {} \;
   ```

2. **削除影響シミュレーション**: 仮削除してTypeScriptエラー確認

3. **削除安全性確認**: 新システムで機能が代替されているか確認

### Phase 2: 段階的削除実行
1. **import文削除**: レガシーファイルのimportを削除

2. **レガシーファイル削除**:
   ```bash
   rm src/core/autonomous-executor.ts
   rm src/core/decision-engine.ts
   ```

3. **連鎖削除**: レガシーシステムでのみ使用されるファイル削除

### Phase 3: 整合性確保・検証
1. **TypeScript型チェック**:
   ```bash
   pnpm typecheck
   ```

2. **Lint確認**:
   ```bash
   pnpm lint
   ```

3. **実行テスト**:
   ```bash
   pnpm dev
   ```

4. **システム全体動作確認**: 新Claude中心システムの正常動作確認

## 📤 出力要件

**必須出力先**: `tasks/20250723_185525_core_execution_cleanup/outputs/`

### 出力ファイル
1. **削除レポート**: `legacy-cleanup-report.yaml`
2. **削除前後比較**: `codebase-size-comparison.yaml`
3. **動作確認結果**: `post-cleanup-validation-results.txt`

### 削除レポート形式
```yaml
cleanup_timestamp: "2025-07-23T18:55:25Z"
deleted_files:
  - file: "src/core/autonomous-executor.ts"
    size: "40KB"
    lines: 1000
    reason: "レガシー実行システム・Claude中心移行により不要"
  - file: "src/core/decision-engine.ts"
    size: "121KB"
    lines: 3000
    reason: "巨大意思決定エンジン・Claude委譲により不要"
impact_analysis:
  total_size_reduced: "161KB"
  total_lines_reduced: 4000
  complexity_reduction: "major"
  maintainability_improvement: "significant"
dependency_fixes:
  import_statements_removed: []
  type_definitions_cleaned: []
  configuration_updated: []
validation_results:
  typecheck_passed: true | false
  lint_passed: true | false
  execution_test_passed: true | false
  claude_system_operational: true | false
migration_completion:
  claude_autonomous_agent_primary: true
  legacy_decision_systems_removed: true
  execution_flow_simplified: true
  codebase_size_optimized: true
```

## 🚫 絶対禁止事項

### 削除禁止
- ❌ **claude-autonomous-agent.ts**: 新Claude中心システムの核心
- ❌ **execution/サブディレクトリ**: 必要な実行制御モジュール
- ❌ **services/**: コンテンツ作成・投稿サービス
- ❌ **collectors/**: データ収集システム

### 実装禁止
- ❌ **新しい意思決定システムの作成**: Claudeに完全委譲
- ❌ **レガシーコードの部分的保持**: 完全削除が原則
- ❌ **代替システムの実装**: Claude以外の意思決定は不要

### 出力禁止
- ❌ **ルートディレクトリへの出力**: 分析・レポートの直接出力禁止

## ✅ 完了確認チェックリスト

- [ ] レガシーファイルの影響範囲調査完了
- [ ] autonomous-executor.ts削除完了
- [ ] decision-engine.ts削除完了
- [ ] 関連する不要ファイル削除完了
- [ ] 残存import文・参照の修正完了
- [ ] TypeScript型チェック通過確認
- [ ] Lint通過確認
- [ ] Claude中心システム動作確認完了
- [ ] 削除レポート作成・出力完了
- [ ] 報告書作成完了

## 🔄 依存関係

**前提条件**:
- ✅ **TASK-001完了**: execution/モジュール調整完了
- ✅ **TASK-002完了**: core-runner理想実装置換完了

**成果物**: Claude中心アーキテクチャへの完全移行完了

## 📋 報告書作成

**報告書パス**: `tasks/20250723_185525_core_execution_cleanup/reports/REPORT-003-legacy-cleanup.md`

実装完了後、必ず報告書を作成してください。

## 🎉 最終成果

このタスク完了により以下を実現:
- ✅ **161KB+のレガシーコード削除** (autonomous-executor + decision-engine)
- ✅ **Claude中心アーキテクチャの完全実現**
- ✅ **シンプル・保守可能なコードベース**
- ✅ **REQUIREMENTS.md準拠のシステム設計**

---

**重要**: この削除により、システムは完全にClaude Code SDK中心の自律システムとなり、REQUIREMENTS.mdで定義された理想的なアーキテクチャが実現されます。