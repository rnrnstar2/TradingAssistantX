# TASK-002: 実行終了時自動クリーンアップ統合

## 🎯 実装目的

**健全な定期実行ワークフロー**の確立：
- `AutonomousExecutor.executeAutonomously()` 完了時の自動クリーンアップ
- システム停止時（SIGINT/SIGTERM）の適切なシャットダウン
- 無限ループでの**メモリ・ディスク蓄積防止**

## 🚨 MVP制約（必須遵守）

### 絶対禁止
- **統計・分析システム** - 実行時間、成功率等の詳細統計禁止
- **複雑なエラーハンドリング** - リトライ、自動回復は実装しない
- **将来の拡張機能** - 設定可能パラメータ、プラグイン機構等

### 実装範囲
**最小限の統合機能のみ**：
1. 実行完了後の自動クリーンアップ呼び出し
2. システム停止時のデータ整合性保護
3. 基本的なエラーログ出力

## 📋 修正対象ファイル

### 1. AutonomousExecutor統合
**ファイル**: `src/core/autonomous-executor.ts`

**修正箇所** (`executeAutonomously()` メソッド):
```typescript
async executeAutonomously(): Promise<void> {
  try {
    // ... 既存の実行ロジック
    
    await this.saveExecutionResults(actions);
    
    // 🆕 実行完了後クリーンアップ
    await this.performPostExecutionCleanup();
    
  } catch (error) {
    console.error('Autonomous execution error:', error);
    await this.handleExecutionError(error);
  }
}
```

### 2. autonomous-runner統合
**ファイル**: `src/scripts/autonomous-runner.ts`

**修正箇所** (SIGINT/SIGTERM ハンドラー):
```typescript
process.on('SIGINT', async () => {
  console.log('\n⏹️  システム停止処理開始...');
  await performSystemShutdownCleanup();
  process.exit(0);
});
```

## 🔧 実装要件

### 1. クリーンアップ統合メソッド作成
**場所**: `src/core/autonomous-executor.ts` 内

**新規メソッド**:
- `performPostExecutionCleanup()` - 実行完了後クリーンアップ
- `performEmergencyCleanup()` - 緊急停止時クリーンアップ

**機能**（最小限）：
- TASK-001で作成したクリーンアップスクリプトを呼び出し
- エラー時はログ出力のみ（処理継続）
- データ削除前の安全性チェック

### 2. システム停止処理統合
**場所**: `src/scripts/autonomous-runner.ts`

**新規関数**:
- `performSystemShutdownCleanup()` - システム停止時処理

**機能**：
- 現在実行中の処理完了待機（最大30秒）
- 一時ファイルの安全な削除
- 実行状態の適切な保存

### 3. エラーハンドリング統合
**既存メソッド修正**: `handleExecutionError()`

**追加機能**：
- エラー時の一時ファイル削除
- データ整合性チェック
- **複雑なリトライ禁止**

## 🛡️ 安全性要件

### データ整合性保護
1. **実行中データの保護** - 現在処理中のファイルは削除しない
2. **設定ファイル保護** - YAML設定ファイルは絶対に削除しない
3. **失敗時の継続** - クリーンアップ失敗でもシステムは継続

### エラー処理（最小限）
- クリーンアップ失敗時は**ログ出力のみ**
- システム全体の停止は回避
- **自動リトライ禁止**

## 📂 出力管理（強制遵守）

### 出力先
- **一時ファイル**: `tasks/20250721_001131/outputs/`
- **統合ログ**: `tasks/20250721_001131/outputs/TASK-002-integration-log.txt`

### 禁止出力先
- **ルートディレクトリ直下**は絶対禁止
- **分析・統計ファイル**の作成禁止

## ✅ 実装手順

1. **クリーンアップスクリプト統合**
   - TASK-001の成果物を活用
   - TypeScriptから呼び出し可能な形式に統合

2. **AutonomousExecutor修正**
   - `executeAutonomously()` にクリーンアップ呼び出し追加
   - エラーハンドリング強化

3. **autonomous-runner修正**
   - SIGINT/SIGTERM ハンドラー改善
   - 適切なシャットダウン処理追加

4. **統合テスト**
   - 正常実行後のクリーンアップ確認
   - 強制停止時の安全性確認

## 🚫 実装禁止事項

- **実行時間監視**（次のタスクで実装）
- **詳細な統計収集**
- **パフォーマンス分析**
- **復元・バックアップ機能**
- **複雑な設定システム**

## 🎯 成功基準

1. **自動クリーンアップ実行** - 毎回の実行完了後にデータ削除
2. **安全なシステム停止** - SIGINT/SIGTERM時の適切な終了
3. **データ整合性維持** - 重要ファイルの保護確認
4. **MVP制約完全遵守** - 過剰機能の除外

## 📋 報告書要件

**報告書**: `tasks/20250721_001131/reports/REPORT-002-execution-cleanup-integration.md`

**含める内容**：
- 統合されたクリーンアップ呼び出し
- 修正されたファイルと変更内容
- テスト結果と動作確認
- データ整合性保護の実装

**含めない内容**：
- 実行時間の詳細分析
- パフォーマンス統計
- 将来の拡張計画

---

**重要**: この統合により、定期実行システムが**健全なエコシステム**として動作し、データ蓄積問題が根本解決されます。