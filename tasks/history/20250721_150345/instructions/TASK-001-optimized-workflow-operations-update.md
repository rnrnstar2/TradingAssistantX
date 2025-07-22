# TASK-001: 最適化ワークフロー運用ガイド新戦略対応更新

## 🎯 タスク概要
`docs/guides/optimized-workflow-operations.md`を新戦略に対応させ、アクション特化型収集とClaude-Playwright連鎖サイクルの監視・運用手順を統合する。

## 📋 実装要件

### 1. 新監視指標の追加

現在の監視指標セクション（📊 日常運用 > 監視ポイント）に以下の3つの新指標を追加：

#### 1.1 アクション特化型収集成功率監視
```bash
# 5. アクション特化型収集の成功率
**目標**: 95%以上の成功率

# アクション特化型収集状況確認
grep "アクション特化型収集" data/context/*.log | tail -10

# 収集成功率計算
node -e "
const logs = require('fs').readFileSync('data/context/action-collection.log', 'utf8').split('\n');
const success = logs.filter(l => l.includes('収集成功')).length;
const total = logs.filter(l => l.includes('収集開始')).length;
console.log(\`成功率: \${(success/total*100).toFixed(1)}%\`);
"
```

**正常な収集ログ例**:
```
🎯 [アクション特化型収集] original_post用コンテンツ収集開始
📊 [収集成功] トレンド分析: 5件, ユーザー投稿: 8件, 関連情報: 3件
🎯 [アクション特化型収集] quote_tweet用コンテンツ収集開始
📊 [収集成功] 引用対象: 12件, 関連トピック: 7件
```

#### 1.2 Claude-Playwright連鎖サイクル効率監視
```bash
# 6. Claude-Playwright連鎖サイクルの効率
**目標**: 90%以上の効率性

# 連鎖サイクル実行状況確認
grep "連鎖サイクル" data/context/*.log | tail -15

# サイクル効率計算
node scripts/analyze-cycle-efficiency.js

# 個別サイクル実行時間確認
jq '.cycle_metrics[] | select(.type=="claude_playwright_cycle")' data/context/execution-history.json | tail -5
```

**理想的なサイクルログ例**:
```
🔄 [Claude連鎖] 決定生成開始 → コンテンツ分析 → アクション決定
🎭 [Playwright連鎖] ブラウザ起動 → 投稿実行 → 結果確認
⚡ [サイクル完了] 実行時間: 85秒, 効率: 92%
```

#### 1.3 アクション型配分精度監視
```bash
# 7. アクション型配分の精度
**目標**: 85%以上の配分精度

# 配分精度確認
node -e "
const planned = require('./data/content-strategy.yaml').optimal_distribution;
const actual = require('./data/context/daily-distribution.json').today_actual;
const accuracy = Object.keys(planned).reduce((acc, key) => {
  const diff = Math.abs(planned[key] - actual[key]);
  return acc + (1 - diff / planned[key]);
}, 0) / Object.keys(planned).length;
console.log(\`配分精度: \${(accuracy * 100).toFixed(1)}%\`);
"

# アクション型別の実行統計
grep "アクション型.*実行" data/context/*.log | 
awk -F'[\\[\\]]' '{print $2}' | 
sort | uniq -c | sort -nr
```

### 2. 日常運用チェック更新

既存の朝・昼・夕のチェックに新戦略対応項目を追加：

#### 2.1 朝（9:00-10:00）チェック拡張
既存の3項目に以下を追加：
```bash
# 4. アクション特化型収集の前日結果確認
node scripts/check-action-collection-results.js --yesterday

# 5. Claude-Playwright連鎖サイクル健全性確認
grep "サイクル.*異常" data/context/*.log | tail -3

# 6. アクション型配分の目標・実績ギャップ確認
node scripts/distribution-gap-analysis.js
```

#### 2.2 昼（12:00-13:00）チェック拡張
既存の3項目に以下を追加：
```bash
# 4. 午前のアクション特化型収集品質確認
jq '.morning_collection | .quality_score' data/context/collection-quality.json

# 5. Claude-Playwright連鎖サイクル効率確認
node scripts/cycle-efficiency-check.js --period morning

# 6. アクション型別成功率の中間確認
grep "アクション型.*成功率" data/context/midday-stats.log
```

#### 2.3 夕（18:00-19:00）チェック拡張
既存の3項目に以下を追加：
```bash
# 4. 1日のアクション特化型収集総括
node scripts/daily-collection-summary.js

# 5. Claude-Playwright連鎖サイクル日次効率確認
node scripts/daily-cycle-efficiency.js

# 6. アクション型配分最終精度確認
node scripts/final-distribution-accuracy.js
```

### 3. トラブルシューティングセクション拡張

既存の「🛠️ トラブルシューティング」セクションに以下の新セクションを追加：

#### 3.1 アクション特化型収集失敗対応
```bash
### アクション特化型収集失敗時の対処

#### 症状: 特定アクション型の収集品質低下
# 収集品質詳細確認
grep "収集品質.*低下" data/context/*.log | tail -10

# アクション型別の収集統計
node -e "
const stats = require('./data/context/collection-stats.json');
Object.entries(stats.by_action_type).forEach(([type, data]) => {
  console.log(\`\${type}: 成功率 \${data.success_rate}%, 品質 \${data.quality_score}\`);
});
"
```

**対処法**:
1. **収集プロンプト調整**: 該当アクション型のClaude収集プロンプトを見直し
2. **情報源拡張**: 収集対象サイト・APIエンドポイントの追加
3. **フィルタリング強化**: 低品質コンテンツの除外ルール追加
4. **フォールバック有効**: 収集失敗時の代替コンテンツソース使用

#### 症状: 収集データの重複・偏重
```bash
# 重複データ確認
node scripts/detect-content-duplicates.js

# 収集ソース偏重確認
jq '.collection_sources | group_by(.source) | .[] | {source: .[0].source, count: length}' data/context/collection-log.json
```

**対処法**:
1. **重複除去強化**: コンテンツハッシュによる重複検出強化
2. **ソース分散**: 収集ソースの均等配分設定調整
3. **時間分散**: 収集タイミングの分散化設定

#### 3.2 Claude-Playwright連鎖サイクル障害対応
```bash
### Claude-Playwright連鎖サイクル中断時の復旧

#### 症状: Claude決定→Playwright実行の連鎖断絶
# 連鎖断絶ポイント特定
grep "連鎖.*中断\|連鎖.*失敗" data/context/*.log | tail -10

# 各コンポーネントの個別状態確認
node -e "
const { ClaudeDecisionEngine } = require('./dist/core/claude-decision-engine.js');
const { PlaywrightActionExecutor } = require('./dist/lib/playwright-action-executor.js');

Promise.all([
  new ClaudeDecisionEngine().healthCheck(),
  new PlaywrightActionExecutor().healthCheck()
]).then(results => {
  console.log('Claude Engine:', results[0] ? '正常' : '異常');
  console.log('Playwright Executor:', results[1] ? '正常' : '異常');
});
"
```

**対処法**:
1. **段階的復旧**: Claude→Playwright個別確認→連鎖再開
2. **タイムアウト調整**: 各ステップのタイムアウト値延長
3. **リトライ強化**: 失敗時の自動リトライ回数・間隔調整
4. **セーフモード**: 連鎖を無効化した単体動作モード切り替え

#### 症状: Playwrightブラウザ操作の頻繁な失敗
```bash
# Playwright実行ログ詳細確認
grep "playwright.*エラー\|browser.*失敗" data/context/*.log | tail -15

# ブラウザセッション状態確認
node scripts/check-browser-sessions.js
```

**対処法**:
1. **ブラウザ再起動**: 全てのブラウザセッション終了・再起動
2. **ヘッドレス切り替え**: デバッグ用にヘッドフルモード一時使用
3. **待機時間調整**: 要素待機・ページ読み込み待機時間延長
4. **フォールバック API**: ブラウザ操作失敗時のAPI直接実行

#### 3.3 アクション戦略切り替え手順
```bash
### 各アクション戦略の緊急切り替え

#### 戦略A→戦略Bへの切り替え手順
# 現在の戦略確認
jq '.current_strategy' data/content-strategy.yaml

# 戦略切り替え実行
node scripts/switch-action-strategy.js --from strategyA --to strategyB --reason "performance_degradation"

# 切り替え後の検証
node scripts/validate-strategy-switch.js --strategy strategyB
```

**戦略切り替えトリガー**:
- 成功率が目標値を3回連続下回った場合
- 特定アクション型の障害が1時間継続した場合
- システム全体のパフォーマンス劣化が検出された場合

### 4. パフォーマンス監視ダッシュボード更新

既存の「📈 パフォーマンス監視」セクションのKPI監視に新指標を追加：

#### 4.1 KPI監視ダッシュボード拡張
```bash
# リアルタイム拡張KPI確認
watch -n 30 'node scripts/enhanced-kpi-dashboard.js'
```

**監視指標（既存+新規）**:
- **実行成功率**: >95%
- **日次目標達成率**: >90%
- **平均実行時間**: <330秒
- **アカウントヘルススコア**: >70
- **API制限遭遇率**: <5%
- **🆕 アクション特化型収集成功率**: >95%
- **🆕 Claude-Playwright連鎖サイクル効率**: >90%
- **🆕 アクション型配分精度**: >85%

#### 4.2 アラート設定拡張
既存のアラート設定に新しいアラート条件を追加：
```json
{
  "action_collection_failure": {
    "threshold": 0.95,
    "condition": "below",
    "action": "adjust_collection_strategy"
  },
  "cycle_efficiency_degradation": {
    "threshold": 0.90,
    "condition": "below", 
    "action": "restart_cycle_components"
  },
  "distribution_accuracy_deviation": {
    "threshold": 0.85,
    "condition": "below",
    "action": "recalibrate_distribution"
  }
}
```

### 5. 週次・月次メンテナンス更新

#### 5.1 週次メンテナンス拡張
既存の`weekly-maintenance.sh`に以下を追加：
```bash
# 5. アクション特化型収集分析
node scripts/weekly-collection-analysis.js

# 6. Claude-Playwright連鎖サイクル効率分析
node scripts/weekly-cycle-analysis.js

# 7. アクション型配分最適化分析
node scripts/weekly-distribution-optimization.js
```

#### 5.2 月次メンテナンス拡張
既存の`monthly-maintenance.sh`に以下を追加：
```bash
# 4. 新戦略統合効果分析
node scripts/monthly-strategy-impact-analysis.js

# 5. アクション収集・連鎖サイクル最適化提案
node scripts/monthly-optimization-suggestions.js
```

## 🎯 実装ガイドライン

### ファイル更新方針
1. **既存構造維持**: 現在のセクション構成と番号体系を保持
2. **自然な統合**: 新項目を既存項目の延長として追加
3. **一貫性確保**: 既存のフォーマット・コマンド例のスタイルを踏襲
4. **実用性重視**: 実際の運用で使用可能な具体的なコマンド・手順を提供

### 品質基準
- ✅ **既存内容の保持**: 現在の内容を削除・変更せず、追加のみ
- ✅ **コマンド実行可能性**: 全てのbashコマンド・nodeスクリプトが実行可能
- ✅ **ログパターン整合性**: 既存のログフォーマットと整合性のある例示
- ✅ **セクション番号管理**: 既存番号体系に従った連番管理

### 出力管理規則
**🚨 重要**: 出力管理規則に従い、以下の場所に作業完了報告書を作成：
- **📋 報告書**: `tasks/20250721_150345/reports/REPORT-001-optimized-workflow-operations-update.md`
- **更新ファイル**: `docs/guides/optimized-workflow-operations.md` （直接更新）

## 📝 完了要件
1. 3つの新監視指標が適切にセクションに統合されている
2. 日常運用チェック（朝・昼・夕）に新戦略対応項目が追加されている
3. トラブルシューティングセクションに新システム対応が追加されている
4. パフォーマンス監視ダッシュボードに新指標が統合されている
5. 週次・月次メンテナンスに新戦略分析が追加されている
6. 全ての追加内容が既存フォーマットと一貫性を保っている
7. TypeScript型チェック・ESLintエラーなし（該当なし・ドキュメント更新のため）

## 🔧 参考情報
- **対象ファイル**: `/Users/rnrnstar/github/TradingAssistantX/docs/guides/optimized-workflow-operations.md`
- **関連システム**: アクション特化型収集システム、Claude-Playwright連鎖サイクル
- **監視対象**: action_specific_collection_success_rate, claude_playwright_cycle_efficiency, action_type_distribution_accuracy

---
**実装者**: Worker C  
**期限**: セッション内完了  
**優先度**: 高（新戦略運用に必要な監視・運用手順整備）