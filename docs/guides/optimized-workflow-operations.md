# 最適化ワークフロー運用ガイド

## 🎯 目的
TASK-WF05で実装された最適化ワークフローシステムの日常運用、監視、トラブルシューティングの完全ガイド。

## 📋 概要
8ステップの最適化されたワークフローによる自律システムの効率的運用方法を説明します。
- **実行時間**: 5.5分（従来7分から21%短縮）
- **アクション種別**: 4種類（投稿/引用/RT/リプライ）
- **日次目標**: 15回の最適配分

## 🚀 システム起動

### 基本起動手順
```bash
# 1. 環境変数確認
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:10}..."
echo "X_API_KEY: ${X_API_KEY:0:10}..."
echo "X_TEST_MODE: $X_TEST_MODE"

# 2. 依存関係確認
pnpm install

# 3. 最適化ワークフロー開始
pnpm run autonomous:start
```

### 起動前チェックリスト
- [x] **環境変数設定完了**: ANTHROPIC_API_KEY, X_API_KEY
- [x] **テストモード確認**: X_TEST_MODE=true（初回推奨）
- [x] **設定ファイル確認**: data/content-strategy.yaml
- [x] **ログディレクトリ作成**: data/context/

### 起動時のシステム確認
```bash
# ヘルスチェック
curl -X GET http://localhost:3000/health

# 設定確認
cat data/content-strategy.yaml | grep expanded_action_strategy -A 20

# 今日の進捗確認
node -e "
const { DailyActionPlanner } = require('./dist/lib/daily-action-planner.js');
const planner = new DailyActionPlanner();
planner.getTodayProgress().then(console.log);
"
```

## 📊 日常運用

### 監視ポイント

#### 1. 並列実行の成功率
**目標**: 95%以上の成功率

```bash
# 実行ログ確認
tail -f data/context/execution-history.json | jq '.[-1].metrics'

# 並列実行状況確認
grep "並列実行開始" data/context/*.log | tail -10
```

**正常な並列実行ログ例**:
```
🔄 [Step 2] 並列実行開始: アカウント分析 & 情報収集
📊 [アカウント分析] フォロワー: 1,250 (+15), ヘルススコア: 72/100
🌐 [情報収集] 5件のトレンド情報を収集完了
```

#### 2. 1日15回アクションの配分状況
**目標**: 日次目標90%以上達成

```bash
# 今日の配分状況確認
node scripts/check-daily-distribution.js

# 配分統計確認
jq '.optimal_distribution' data/daily-action-log.json | tail -1
```

**理想的な配分例**:
```json
{
  "original_post": 9,  // 60%
  "quote_tweet": 4,    // 25%
  "retweet": 1,        // 10%
  "reply": 1           // 5%
}
```

#### 3. 各アクション型の品質
**目標**: 各アクション成功率90%以上

```bash
# アクション別成功率確認
grep "アクション完了" data/context/*.log | 
awk -F'[' '{print $3}' | 
sort | uniq -c
```

#### 4. エンゲージメント改善状況
**目標**: 月次エンゲージメント率+10%

```bash
# エンゲージメント統計
node scripts/analyze-engagement.js --period 30days

# 最新のヘルススコア確認
jq '.account.healthScore' data/context/current-situation.json
```

### 日次運用チェック

#### 朝（9:00-10:00）
```bash
# 1. 夜間実行結果確認
cat data/context/execution-history.json | jq '.[-5:]'

# 2. 今日の目標設定確認
node -e "require('./dist/lib/daily-action-planner.js').DailyActionPlanner().planDailyDistribution()"

# 3. API制限状況確認
grep "API制限" data/context/*.log | tail -5
```

#### 昼（12:00-13:00）
```bash
# 1. 午前の実行状況確認
tail -n 50 data/context/execution-history.json

# 2. 配分進捗確認
node scripts/check-progress.js

# 3. エラー有無確認
grep "❌" data/context/*.log | tail -10
```

#### 夕（18:00-19:00）
```bash
# 1. 日次達成率確認
node scripts/daily-summary.js

# 2. 品質指標確認
node scripts/quality-metrics.js

# 3. 明日の準備確認
ls -la data/context/generated-content.json
```

## 🛠️ トラブルシューティング

### 並列実行失敗時の対処

#### 症状: アカウント分析 & 情報収集の並列実行失敗
```bash
# エラーログ確認
grep "並列実行" data/context/error-log.json | tail -5

# 個別コンポーネント確認
node -e "
const { AccountAnalyzer } = require('./dist/lib/account-analyzer.js');
const analyzer = new AccountAnalyzer();
analyzer.analyzeCurrentStatus().then(console.log).catch(console.error);
"
```

**対処法**:
1. **X API接続確認**: `X_API_KEY`の有効性確認
2. **レート制限回避**: 5分待機後再実行
3. **個別実行**: 並列を無効化して順次実行

#### 症状: API制限エラー頻発
```bash
# API制限状況詳細確認
grep "rate.limit" data/context/*.log | wc -l
```

**対処法**:
1. **バッチサイズ調整**: 3→2に削減
2. **間隔延長**: 3秒→5秒に延長
3. **テストモード有効化**: `X_TEST_MODE=true`設定

#### 症状: 品質低下（ヘルススコア<50）
```bash
# ヘルススコア履歴確認
jq '.account.healthScore' data/context/execution-history.json | tail -10
```

**対処法**:
1. **実行間隔延長**: 96分→144分に調整
2. **配分見直し**: original_post比率増加
3. **コンテンツ品質改善**: Claude決定プロンプト調整

### パフォーマンス問題対応

#### 実行時間が目標5.5分を超過
```bash
# ステップ別実行時間分析
grep "\[Step" data/context/*.log | 
awk '{print $1, $2, $3}' | 
sort | uniq -c
```

**最適化順序**:
1. **Step 2並列化**: アカウント分析 + 情報収集
2. **Step 4簡素化**: 複雑判定ロジック削除
3. **Step 7バッチ化**: 3件同時実行

#### メモリ使用量増加
```bash
# メモリ使用量確認
ps aux | grep "node.*autonomous"

# 古いログファイルクリーンアップ
find data/context -name "*.log" -mtime +7 -delete
```

## 🔧 メンテナンス

### 日次メンテナンス
```bash
#!/bin/bash
# daily-maintenance.sh

# 1. ログローテーション
find data/context -name "*.log" -size +10M -exec gzip {} \;

# 2. 古い実行履歴削除（50件超過分）
node scripts/cleanup-history.js

# 3. 統計更新
node scripts/update-statistics.js

# 4. バックアップ作成
cp data/content-strategy.yaml backup/content-strategy-$(date +%Y%m%d).yaml
```

### 週次メンテナンス
```bash
#!/bin/bash
# weekly-maintenance.sh

# 1. パフォーマンス分析
node scripts/weekly-performance-analysis.js

# 2. 配分効率確認
node scripts/distribution-efficiency.js

# 3. エンゲージメント分析
node scripts/engagement-analysis.js

# 4. 設定最適化提案
node scripts/suggest-optimizations.js
```

### 月次メンテナンス
```bash
#!/bin/bash
# monthly-maintenance.sh

# 1. 全体統計レポート
node scripts/monthly-report.js

# 2. 戦略評価・調整
node scripts/strategy-evaluation.js

# 3. システム最適化
node scripts/system-optimization.js
```

## 📈 パフォーマンス監視

### KPI監視ダッシュボード
```bash
# リアルタイムKPI確認
watch -n 30 'node scripts/kpi-dashboard.js'
```

**監視指標**:
- **実行成功率**: >95%
- **日次目標達成率**: >90%
- **平均実行時間**: <330秒
- **アカウントヘルススコア**: >70
- **API制限遭遇率**: <5%

### アラート設定
```bash
# アラート条件設定
cat > monitoring/alerts.json << EOF
{
  "execution_failure_rate": {
    "threshold": 0.05,
    "action": "email_admin"
  },
  "health_score_critical": {
    "threshold": 40,
    "action": "pause_system"
  },
  "api_limit_exceeded": {
    "threshold": 3,
    "action": "enable_test_mode"
  }
}
EOF
```

## 🔍 ログ分析

### 重要ログパターン
```bash
# 成功実行パターン
grep "✅.*完了" data/context/*.log

# 並列実行効果確認
grep "並列実行開始\|統合分析.*完了" data/context/*.log

# アクション実行統計
grep "拡張アクション実行完了" data/context/*.log | 
sed 's/.*\([0-9]\+\)成功, \([0-9]\+\)失敗.*/成功:\1 失敗:\2/' | 
sort | uniq -c
```

### エラーパターン分析
```bash
# よくあるエラー Top 10
grep "❌" data/context/*.log | 
awk -F'] ' '{print $2}' | 
sort | uniq -c | sort -nr | head -10
```

## 📞 サポート・エスカレーション

### 緊急時対応手順
1. **システム停止**: `pkill -f autonomous`
2. **状態保存**: `cp -r data/context backup/emergency-$(date +%s)`
3. **ログ確認**: `tail -100 data/context/error-log.json`
4. **復旧手順実行**: セーフモードでの段階的復旧

### よくある質問

**Q: 実行時間が突然長くなった**
A: Step 2の並列実行が無効化されている可能性。`parallel_analysis_enabled: true`を確認。

**Q: 配分が偏っている**
A: `data/content-strategy.yaml`の`optimal_distribution`設定を確認。

**Q: エンゲージメントが低下**
A: アカウントヘルススコアとコンテンツ品質を確認。Claude決定プロンプトの調整を検討。

---

## 🎯 運用成功の指標

### 短期目標（1週間）
- [ ] 実行成功率 95%以上維持
- [ ] 日次目標達成率 85%以上
- [ ] 平均実行時間 350秒以下

### 中期目標（1ヶ月）
- [ ] エンゲージメント率 +15%改善
- [ ] アカウントヘルススコア 75以上維持
- [ ] 4種類アクション配分の安定運用

### 長期目標（3ヶ月）
- [ ] フォロワー成長率 +25%
- [ ] システム稼働率 99%以上
- [ ] 完全自律運用達成

---

**最終更新**: 2025-07-21  
**バージョン**: v2.0 (最適化統合版)  
**作成者**: Claude Code TASK-WF05 Integration Team