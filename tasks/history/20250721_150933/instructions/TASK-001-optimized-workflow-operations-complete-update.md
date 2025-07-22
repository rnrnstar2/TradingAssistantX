# TASK-001: optimized-workflow-operations.md 完全更新

## 🎯 目的
Worker C継続担当による optimized-workflow-operations.md の完全更新実装。

前回の指示書内容に基づき、3つの新監視指標追加、日常運用チェックリスト更新、トラブルシューティング追加を実装する。

## 📋 実装必須項目

### 1. 新監視指標追加 (3つの指標)

#### 1.1 action_specific_collection_success_rate
- **目標値**: 95%
- **監視対象**: ActionSpecificCollectorの成功率
- **配置場所**: "📊 日常運用" > "監視ポイント" セクション
- **実装内容**:
  ```bash
  # アクション特化型収集成功率確認
  node -e "
  const logs = require('fs').readFileSync('data/context/execution-history.json', 'utf8');
  const entries = logs.split('\n').filter(l => l.includes('ActionSpecificCollector'));
  const success = entries.filter(l => l.includes('success')).length;
  const total = entries.length;
  console.log('収集成功率:', (success/total*100).toFixed(1) + '%');
  "
  ```

#### 1.2 claude_playwright_cycle_efficiency
- **目標値**: 90%
- **監視対象**: Claude-Playwright連鎖サイクルの効率性
- **配置場所**: "📊 日常運用" > "監視ポイント" セクション
- **実装内容**:
  ```bash
  # Claude-Playwright連鎖サイクル効率確認
  grep "Claude決定.*完了\|Playwright実行.*完了" data/context/*.log | 
  awk '{
    if(/Claude決定.*完了/) claude++; 
    if(/Playwright実行.*完了/) playwright++;
  } END {
    efficiency = (playwright/claude)*100;
    printf "連鎖効率: %.1f%%\n", efficiency;
  }'
  ```

#### 1.3 action_type_distribution_accuracy
- **目標値**: 85%
- **監視対象**: アクション種別配分の正確性
- **配置場所**: "📊 日常運用" > "監視ポイント" セクション
- **実装内容**:
  ```bash
  # アクション配分正確性確認
  node scripts/check-distribution-accuracy.js
  
  # 実際vs目標配分比較
  jq '.actual_distribution, .target_distribution' data/daily-action-log.json | 
  paste - - | awk '{
    diff = sqrt(($1-$5)^2 + ($2-$6)^2 + ($3-$7)^2 + ($4-$8)^2);
    accuracy = 100 - (diff/4)*100;
    printf "配分正確性: %.1f%%\n", accuracy;
  }'
  ```

### 2. 日常運用チェックリスト更新

#### 2.1 アクション特化型収集の監視手順
**朝（9:00-10:00）セクションに追加**:
```bash
# 4. アクション特化型収集状況確認
node -e "
const collector = require('./dist/lib/action-specific-collector.js');
collector.getCollectionStatus().then(status => {
  console.log('収集ステータス:', status);
  console.log('成功率:', status.successRate + '%');
});
"

# 5. 収集失敗パターン分析
grep "ActionSpecificCollector.*failed" data/context/*.log | 
tail -5 | awk -F'failed: ' '{print $2}' | sort | uniq -c
```

#### 2.2 Claude-Playwright連鎖サイクルの確認方法
**昼（12:00-13:00）セクションに追加**:
```bash
# 4. Claude-Playwright連鎖サイクル確認
grep "連鎖サイクル" data/context/*.log | tail -10

# 5. 連鎖効率監視
node -e "
const cycle = require('./dist/core/claude-playwright-cycle.js');
cycle.getCycleMetrics().then(metrics => {
  console.log('連鎖効率:', metrics.efficiency + '%');
  console.log('平均サイクル時間:', metrics.avgCycleTime + 'ms');
});
"
```

#### 2.3 original_post/quote_tweet/retweet別成功率チェック
**夕（18:00-19:00）セクションに追加**:
```bash
# 4. アクション種別成功率詳細確認
node scripts/action-type-success-analysis.js

# 5. 種別別パフォーマンス確認
jq '.action_performance' data/context/execution-history.json | tail -1 | 
jq -r 'to_entries[] | "\(.key): \(.value.success_rate)%"'
```

### 3. トラブルシューティング追加

#### 3.1 ActionSpecificCollector失敗時の復旧手順
**"🛠️ トラブルシューティング"セクションに追加**:

```markdown
### ActionSpecificCollector失敗時の対処

#### 症状: アクション特化型収集が連続失敗
```bash
# 収集失敗詳細確認
grep "ActionSpecificCollector.*error" data/context/error-log.json | tail -10

# 収集対象データ確認
node -e "
const collector = require('./dist/lib/action-specific-collector.js');
collector.diagnosticCheck().then(console.log).catch(console.error);
"
```

**段階的復旧手順**:
1. **収集キャッシュクリア**: `rm -f data/context/collection-cache.json`
2. **収集戦略リセット**: `cp backup/content-strategy.yaml data/content-strategy.yaml`
3. **個別収集テスト**: `node scripts/test-action-collection.js --type original_post`
4. **段階的有効化**: 1つずつアクション種別を有効化して確認

#### 収集品質低下時の対処
```bash
# 収集品質分析
node scripts/analyze-collection-quality.js --days 7
```

**品質改善手順**:
1. **収集源多様化**: TwitterAPI + Web収集の併用
2. **収集フィルター調整**: より厳密な品質基準適用
3. **収集間隔調整**: 過度な収集頻度の抑制
```

#### 3.2 連鎖サイクル中断時の対処法
**"🛠️ トラブルシューティング"セクションに追加**:

```markdown
### Claude-Playwright連鎖サイクル中断時の対処

#### 症状: 連鎖サイクルが途中停止
```bash
# サイクル状態確認
node -e "
const cycle = require('./dist/core/claude-playwright-cycle.js');
cycle.getCurrentCycleState().then(console.log);
"

# 中断ポイント特定
grep "サイクル中断\|cycle.interrupted" data/context/*.log | tail -5
```

**復旧手順**:
1. **状態バックアップ**: `cp data/context/cycle-state.json backup/cycle-state-$(date +%s).json`
2. **中断ポイント確認**: ログから具体的な中断箇所を特定
3. **部分リスタート**: 中断ポイントからの部分的再開実行
4. **完全リセット**: 最終手段として完全なサイクルリセット

#### Claude決定タイムアウト対処
```bash
# Claude応答時間分析
grep "Claude.*timeout\|決定タイムアウト" data/context/*.log | 
awk '{print $1, $2}' | sort | tail -10
```

**対処法**:
1. **プロンプト簡素化**: 複雑すぎる決定プロンプトの簡略化
2. **タイムアウト延長**: 30秒→60秒に延長
3. **代替決定ロジック**: タイムアウト時のフォールバック決定
```

#### 3.3 アクション戦略切り替え手順
**"🛠️ トラブルシューティング"セクションに追加**:

```markdown
### アクション戦略切り替え手順

#### 緊急時戦略切り替え
```bash
# 現在の戦略確認
jq '.expanded_action_strategy.active_strategy' data/content-strategy.yaml

# 利用可能な戦略一覧
jq '.expanded_action_strategy.available_strategies | keys[]' data/content-strategy.yaml
```

**切り替え手順**:
1. **現在戦略のバックアップ**: `cp data/content-strategy.yaml backup/strategy-$(date +%s).yaml`
2. **戦略変更**: `conservative` → `balanced` → `aggressive` の順で段階的変更
3. **効果測定**: 1時間後の成功率確認
4. **戦略固定**: 最適戦略での運用継続

#### パフォーマンス低下時の戦略調整
```bash
# 戦略別パフォーマンス分析
node scripts/strategy-performance-analysis.js --period 24h
```

**調整パターン**:
- **高負荷時**: `aggressive` → `conservative`
- **API制限時**: `batch_processing` → `sequential_processing`  
- **品質重視**: `quantity_focused` → `quality_focused`
```

## 📂 出力管理規則

**⚠️ CRITICAL: Root Directory Pollution Prevention 必須**

### 出力先指定
- **更新ファイル**: `/Users/rnrnstar/github/TradingAssistantX/docs/guides/optimized-workflow-operations.md`
- **バックアップ作成**: `/Users/rnrnstar/github/TradingAssistantX/tasks/20250721_150933/outputs/optimized-workflow-operations-backup.md`
- **更新ログ**: `/Users/rnrnstar/github/TradingAssistantX/tasks/20250721_150933/outputs/TASK-001-update-log.md`

### 作業手順
1. **既存ファイルバックアップ**: 現在のファイルを outputs/ にバックアップ
2. **段階的更新**: 3つのセクション（監視指標→チェックリスト→トラブルシューティング）を順次更新
3. **統合確認**: 既存運用手順との自然な統合を確認
4. **更新ログ作成**: 変更内容を詳細に記録

## ✅ 完了基準

### 1. 既存運用手順との自然な統合
- 既存の監視ポイント（1-4）に新指標（5-7）を自然に追加
- 既存の日次チェック流れを維持しつつ新項目を適切な位置に配置
- 文体・フォーマットの一貫性を保持

### 2. 実用的な監視・保守手順
- 各監視指標に具体的なコマンド例を提供
- 閾値設定とアラート条件を明確に記載
- 自動化可能な部分と手動確認が必要な部分を区別

### 3. 緊急時対応の明確化
- 問題発生時の段階的対処手順を提供
- 最終手段としての完全リセット手順を含める
- 復旧時間の目安と成功判定基準を明記

## 🚨 品質要件

### TypeScript要件
- **Strict Mode**: 全コード TypeScript strict mode 準拠
- **型安全性**: any型使用禁止、適切な型定義
- **Lint通過**: ESLint エラー・警告ゼロ

### 実装要件
- **既存コードとの統合**: 既存の運用手順との seamless integration
- **可読性**: マークダウンフォーマットの適切な使用
- **実用性**: 実際の運用で使える具体的な手順

### テスト要件
- **更新内容確認**: 追加したコマンド例の動作確認
- **文書構造確認**: マークダウンの構造とリンクの有効性確認
- **全体整合性**: 文書全体の論理的一貫性確認

## 📋 実装チェックリスト

### Phase 1: 準備・分析
- [ ] 既存 optimized-workflow-operations.md の完全読み込み
- [ ] 既存監視ポイント・チェックリスト構造の把握
- [ ] 更新対象セクションの特定と既存内容の理解

### Phase 2: 新監視指標追加
- [ ] action_specific_collection_success_rate 指標追加（目標95%）
- [ ] claude_playwright_cycle_efficiency 指標追加（目標90%）
- [ ] action_type_distribution_accuracy 指標追加（目標85%）
- [ ] 各指標の監視コマンド例とアラート条件設定

### Phase 3: 日常運用チェックリスト更新
- [ ] 朝チェックにアクション特化型収集監視追加
- [ ] 昼チェックにClaude-Playwright連鎖サイクル確認追加
- [ ] 夕チェックにアクション種別成功率チェック追加
- [ ] 既存チェックフローとの自然な統合確認

### Phase 4: トラブルシューティング追加
- [ ] ActionSpecificCollector失敗時復旧手順追加
- [ ] 連鎖サイクル中断時対処法追加
- [ ] アクション戦略切り替え手順追加
- [ ] 各対処法の段階的手順と成功判定基準設定

### Phase 5: 統合・品質確認
- [ ] 文書全体の構造確認と論理的一貫性チェック
- [ ] マークダウンフォーマットの統一性確認
- [ ] 既存運用手順との seamless integration 確認
- [ ] 更新ログ作成と変更内容の詳細記録

## 💡 実装のポイント

### 監視指標追加時
- 既存の4つの監視ポイントの後に自然に配置
- 同じフォーマット（目標値、確認コマンド、正常例）で統一
- 新指標特有の詳細説明を適切に追加

### チェックリスト更新時
- 朝・昼・夕の既存フローを維持
- 新項目を適切な時間帯に論理的に配置
- 実行時間を考慮した現実的なチェック内容

### トラブルシューティング追加時
- 既存のトラブルシューティング構造を踏襲
- 症状→確認→対処法の明確な段階的手順
- 緊急度に応じた対処順序の明記

---

**最終更新日**: 2025-07-21  
**担当**: Worker C継続  
**セッション**: 20250721_150933