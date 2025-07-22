# TASK-002: Decision Engine完成実装

## 📋 タスク概要
**目的**: 意思決定エンジンの完全実装（REQUIREMENTS.md準拠）  
**優先度**: 🔥 最高（自律システムの頭脳）  
**実行順序**: 並列（TASK-001と同時実行可能）  

## 🎯 実装要件

### 1. 基本要件
- **ファイル**: `src/core/decision-engine.ts`
- **現状**: 簡素な実装のみ存在
- **目標**: REQUIREMENTS.mdの意思決定カタログ完全実装

### 2. 実装すべき機能

#### 意思決定フロー実装
```typescript
export class SystemDecisionEngine {
  // 現在状況分析
  async analyzeCurrentSituation(): Promise<SituationAnalysis>
  
  // 戦略選択判断
  async selectStrategy(analysis: SituationAnalysis): Promise<SelectedStrategy>
  
  // データ収集戦略決定
  async determineCollectionStrategy(
    accountStatus: AccountStatus,
    marketCondition: MarketCondition
  ): Promise<CollectionStrategy>
  
  // コンテンツ生成戦略決定
  async determineContentStrategy(
    followerProfile: FollowerProfile,
    engagement: EngagementMetrics
  ): Promise<ContentStrategy>
  
  // 投稿タイミング決定
  async determinePostingTiming(
    urgency: NewsUrgency,
    historicalData: PostingHistory
  ): Promise<PostingTiming>
}
```

#### 判断基準実装（REQUIREMENTS.md準拠）
1. **アカウント状態による分岐**
   - 成長初期段階（< 1000フォロワー）
   - 成長軌道段階（1000-10000）
   - 確立段階（> 10000）

2. **エンゲージメントによる分岐**
   - 低エンゲージメント（< 3%）
   - 高エンゲージメント（> 5%）
   - 変動大（標準偏差が大きい）

3. **外部環境による分岐**
   - 重要経済指標発表
   - 市場急変
   - 通常時

### 3. データ活用
```typescript
// 必須データソース
- data/current/account-status.yaml
- data/current/active-strategy.yaml
- data/learning/success-patterns.yaml
- data/learning/high-engagement.yaml
```

### 4. MVP制約
- 🚫 過度に複雑な機械学習アルゴリズムは使わない
- 🚫 リアルタイム市場分析は実装しない
- ✅ ルールベースの明確な判断ロジック
- ✅ YAMLファイルベースの学習データ活用

### 5. 統合要件
- `AutonomousExecutor` との密結合
- 各Collectorとの連携
- `ContentCreator` への戦略指示
- ログ出力による意思決定の可視化

## 📊 成功基準
- [ ] REQUIREMENTS.md意思決定フロー完全実装
- [ ] 3つの判断軸すべて実装
- [ ] YAMLファイル読み書き機能
- [ ] 意思決定ログの出力
- [ ] TypeScript型安全性確保

## 🔧 実装のヒント
1. 既存の簡素な実装を拡張する形で実装
2. `src/utils/yaml-manager.ts` を活用
3. 意思決定の理由を必ずログに残す
4. フォールバック戦略を必ず実装

## 📁 出力ファイル
- `src/core/decision-engine.ts` - 更新実装
- `tests/core/decision-engine.test.ts` - テストコード
- 本報告書完了時: `tasks/20250723_001451_phase3_core_services/reports/REPORT-002-decision-engine-completion.md`