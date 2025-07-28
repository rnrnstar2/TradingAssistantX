# TASK-003: Data Optimizer実装

## 📋 タスク概要
**目的**: データ最適化・クレンジングシステムの実装  
**優先度**: 高（データ品質管理の核心）  
**実行順序**: 並列（TASK-001, TASK-002と同時実行可能）  

## 🎯 実装要件

### 1. 基本要件
- **ファイル**: `src/services/data-optimizer.ts`
- **責務**: dataディレクトリの最適な状態維持
- **自動化**: 定期的なクレンジング実行

### 2. 実装すべき機能

#### コア機能
```typescript
export class DataOptimizer {
  // データクレンジング実行
  async optimizeDataStructure(): Promise<OptimizationResult>
  
  // 古いデータのアーカイブ
  async archiveOldData(daysToKeep: number = 7): Promise<ArchiveResult>
  
  // 低価値データの削除
  async removeLowValueData(): Promise<CleanupResult>
  
  // 学習データの最適化
  async optimizeLearningData(): Promise<LearningOptimizationResult>
  
  // データ圧縮
  async compressHistoricalData(): Promise<CompressionResult>
  
  // データ整合性チェック
  async validateDataIntegrity(): Promise<ValidationResult>
}
```

#### 最適化ルール
1. **current/ディレクトリ**
   - 常に最新データのみ保持
   - 1日以上前のデータは自動削除
   - ファイルサイズ制限（各10KB以内）

2. **learning/ディレクトリ**
   - 高エンゲージメント投稿のみ保持
   - 成功パターンの定期更新
   - 最大100エントリー制限

3. **archives/ディレクトリ**
   - 月別に自動整理
   - 3ヶ月以上前は圧縮保存
   - 重複データの自動削除

### 3. データ品質基準
```typescript
interface DataQualityCriteria {
  // エンゲージメント率3%以上
  minEngagementRate: 0.03;
  
  // 教育的価値スコア7以上（10点満点）
  minEducationalValue: 7;
  
  // データ鮮度（日数）
  maxDataAge: {
    current: 1,
    learning: 30,
    archives: 90
  };
}
```

### 4. MVP制約
- 🚫 複雑な機械学習による価値判定は実装しない
- 🚫 リアルタイムストリーミング処理は実装しない
- ✅ シンプルなルールベース実装
- ✅ YAMLファイルの効率的な管理

### 5. 自動実行設定
- 毎日午前3時に自動実行
- 手動実行も可能
- 実行ログの保存

## 📊 成功基準
- [ ] 3つのディレクトリすべて最適化対応
- [ ] データ品質基準の実装
- [ ] 自動アーカイブ機能
- [ ] 実行ログ出力
- [ ] エラー時のロールバック機能

## 🔧 実装のヒント
1. `fs-extra` パッケージを活用
2. `src/utils/yaml-manager.ts` でYAML操作
3. トランザクション的な処理（全成功or全ロールバック）
4. バックアップを取ってから削除

## ⚠️ 注意事項
- データ削除は慎重に（必ずバックアップ）
- 実行中のプロセスとの競合を避ける
- ディスク容量を考慮した実装

## 📁 出力ファイル
- `src/services/data-optimizer.ts` - メイン実装
- `tests/services/data-optimizer.test.ts` - テストコード
- 本報告書完了時: `tasks/20250723_001451_phase3_core_services/reports/REPORT-003-data-optimizer-implementation.md`