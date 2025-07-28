# TASK-003: 自動クレンジングシステム基盤構築

## 🎯 担当領域
学習データの定期的自動クレンジング機能の基盤構築

## 📝 実行手順

### 1. クレンジング仕様設計

#### データ保持期間ルール
```yaml
# data/config/learning-retention-rules.yaml 作成
retention_rules:
  success_patterns:
    max_entries: 50
    min_success_rate: 0.70
    retention_days: 30
    archive_threshold: 0.50
  
  high_engagement:
    max_entries: 100
    min_engagement_rate: 3.0
    retention_days: 60
    performance_decay_days: 90
  
  effective_topics:
    max_entries: 30
    effectiveness_threshold: 0.60
    trend_data_retention_days: 90
    seasonal_data_years: 2

cleanup_schedule:
  daily_cleanup: true
  weekly_deep_clean: true
  monthly_archive: true
```

### 2. 自動クレンジング機能実装

#### src/services/data-optimizer.ts 拡張
学習データ専用のクレンジングメソッド追加:

```typescript
// 追加メソッド設計
interface LearningDataCleaner {
  cleanSuccessPatterns(): Promise<void>;
  cleanHighEngagementData(): Promise<void>; 
  cleanEffectiveTopics(): Promise<void>;
  performDeepCleaning(): Promise<void>;
}
```

機能仕様:
- 成功率・エンゲージメント率による自動フィルタリング
- 古いデータの archives への自動移動
- データ品質スコアによる価値判定
- 容量最適化（最新・高価値データ優先保持）

### 3. 品質監視機能

#### データ健全性チェック
- YAMLファイル構文エラー検出
- データ整合性確認
- 欠損値・異常値検出
- 統計的妥当性検証

#### パフォーマンス監視
- ファイルサイズ監視
- 読み込み速度測定
- メモリ使用量追跡

### 4. 統合設定

#### autonomous-config.yaml への統合
```yaml
data_management:
  learning_data_optimization:
    enabled: true
    cleanup_frequency: "daily"
    quality_threshold: 0.70
    max_file_size_mb: 5
    
  retention_policy:
    enforce_limits: true
    auto_archive: true
    quality_filtering: true
```

### 5. 実行フロー統合

#### core/autonomous-executor.ts への統合
学習データクレンジングをメインループに組み込み:

1. データ収集後の品質チェック
2. 投稿実行後の成果記録
3. 定期クレンジングの実行タイミング
4. 緊急時の品質回復処理

## 🔄 自動化ルール

### トリガー条件
- ファイルサイズが閾値超過時
- データ品質スコア低下時
- 定期実行タイミング到達時
- メモリ使用量警告時

### クレンジング優先度
1. **重複データ除去** - 最優先
2. **低品質データ除去** - データ価値判定基準適用
3. **古いデータ移動** - 保持期間ルール適用
4. **容量最適化** - サイズ・パフォーマンス基準

### 安全性確保
- クレンジング前の自動バックアップ
- 段階的削除（即座削除禁止）
- 復旧可能な仕組み
- エラー時の処理継続

## ✅ 完了確認
- [ ] retention-rules.yaml 作成完了
- [ ] data-optimizer.ts 拡張完了
- [ ] 品質監視機能実装完了
- [ ] autonomous-executor.ts 統合完了
- [ ] クレンジング動作テスト完了

## 📊 期待効果
- 常に高品質な学習データ維持
- Claude Code SDK最適化されたデータサイズ
- 継続的なパフォーマンス向上
- メモリ・ストレージ効率化