# KaitoTwitterAPI完全統合実装指示書

## 実装概要
改良されたREQUIREMENTS.mdに基づき、RSSに依存しないKaitoTwitterAPI完全統合システムを実装します。投稿・リツイート・引用リツイート・いいね・返信を統合した戦略的X活動システムの構築を目指します。

## 🎯 実装優先順位

### Phase 1: RSS排除とKaitoTwitterAPI完全統合（Week 1-2）

#### 1.1 KaitoTwitterAPIコレクター完全統合
```typescript
// src/collectors/kaito-api-collector.ts の強化
export class KaitoTwitterAPICollector extends BaseCollector {
  // X内市場インテリジェンス収集
  async collectMarketIntelligence(): Promise<MarketIntelligence>
  
  // 投資関連アカウント投稿分析
  async analyzeInvestmentAccounts(accounts: string[]): Promise<AccountAnalysis[]>
  
  // トレンド・センチメント分析
  async analyzeTrends(keywords: string[]): Promise<TrendAnalysis>
  
  // 競合インフルエンサー分析
  async analyzeCompetitors(competitorAccounts: string[]): Promise<CompetitorAnalysis>
  
  // フォロワー生態系分析
  async analyzeFollowerEcosystem(): Promise<FollowerEcosystem>
}
```

#### 1.2 統合アクション実行システム構築
```typescript
// src/services/x-action-executor.ts 新規作成
export class XActionExecutor {
  // 統合アクション実行
  async executeIntegratedActions(strategy: ActionStrategy): Promise<ActionResults>
  
  // 投稿実行
  async createPost(content: PostContent): Promise<PostResult>
  
  // リツイート実行
  async executeRetweet(tweetId: string, comment?: string): Promise<RetweetResult>
  
  // 引用リツイート実行
  async executeQuoteRetweet(tweetId: string, comment: string): Promise<QuoteResult>
  
  // いいね実行
  async executeLike(tweetId: string): Promise<LikeResult>
  
  // 返信実行
  async executeReply(tweetId: string, content: string): Promise<ReplyResult>
  
  // フォロー/アンフォロー管理
  async manageFollowing(action: 'follow' | 'unfollow', userId: string): Promise<FollowResult>
}
```

### Phase 2: 多様Xアクション戦略システム（Week 3-4）

#### 2.1 戦略的8アクションシステム実装
```typescript
// src/core/claude-autonomous-agent.ts の拡張
export class ClaudeAutonomousAgent {
  // 8つの戦略的アクション実装
  async collectXIntelligence(): Promise<XIntelligence>
  async analyzeEngagementEcosystem(): Promise<EngagementEcosystem>
  async strategicActionPlanning(): Promise<ActionPlan>
  async createMultiFormatContent(): Promise<MultiFormatContent>
  async executeIntegratedActions(): Promise<ActionResults>
  async realTimeInteraction(): Promise<InteractionResults>
  async influenceNetworkBuilding(): Promise<NetworkResults>
  async continuousEcosystemOptimization(): Promise<OptimizationResults>
}
```

#### 2.2 影響力ネットワーク管理システム
```typescript
// src/services/influence-network-manager.ts 新規作成
export class InfluenceNetworkManager {
  // 影響力マップ構築
  async buildInfluenceMap(): Promise<InfluenceMap>
  
  // 戦略的エンゲージメント実行
  async executeStrategicEngagement(targets: InfluenceTarget[]): Promise<EngagementResults>
  
  // ネットワーク成長分析
  async analyzeNetworkGrowth(): Promise<NetworkGrowthAnalysis>
  
  // インフルエンサー関係構築
  async buildInfluencerRelations(): Promise<RelationshipResults>
}
```

### Phase 3: データ構造最適化（Week 5-6）

#### 3.1 新規設定ファイル作成
```yaml
# data/config/x-action-strategies.yaml
action_strategies:
  posting:
    frequency: "3-5/day"
    optimal_times: ["09:00", "12:00", "18:00", "21:00"]
    content_types: ["educational", "market_analysis", "trend_commentary"]
  
  retweeting:
    target_engagement_threshold: 10
    comment_rate: 0.7
    daily_limit: 5
  
  liking:
    strategic_targets: ["influencers", "active_followers", "trending_posts"]
    daily_limit: 20
  
  replying:
    response_time_target: "15min"
    engagement_threshold: 5
    daily_limit: 10

# data/config/influence-targets.yaml
influence_targets:
  tier1_influencers:
    - account: "@finance_guru_jp"
      strategy: "strategic_engagement"
      frequency: "daily"
  
  tier2_active_followers:
    - segment: "high_engagement_followers"
      strategy: "relationship_building"
      frequency: "weekly"
  
  competitors:
    - account: "@competitor_account"
      strategy: "differentiation"
      monitoring: "continuous"
```

#### 3.2 新規データファイル構造
```yaml
# data/current/today-actions.yaml
today_actions:
  date: "2025-01-23"
  posts:
    - id: "post_001"
      content: "投資の基礎知識..."
      timestamp: "09:00:00"
      engagement: { likes: 45, retweets: 12, replies: 3 }
  
  retweets:
    - original_id: "1234567890"
      comment: "重要な観点です。"
      timestamp: "12:30:00"
      engagement: { likes: 8, retweets: 2 }
  
  likes: 
    - tweet_id: "1234567891"
      reason: "strategic_engagement"
      timestamp: "14:15:00"
  
  replies:
    - to_tweet_id: "1234567892"
      content: "詳しく説明していただき..."
      timestamp: "16:45:00"
      engagement: { likes: 15, replies: 2 }

# data/learning/action-insights.yaml
action_insights:
  period: "2025-01-01 to 2025-01-23"
  
  post_performance:
    best_performing:
      - content_type: "market_analysis"
        avg_engagement_rate: 4.2%
        optimal_time: "21:00"
    
  retweet_effectiveness:
    with_comment: 3.8%
    without_comment: 1.2%
    
  engagement_patterns:
    likes_impact: "High for relationship building"
    replies_impact: "Highest for influence expansion"
```

## 🔧 実装時の技術要件

### API統合要件
- KaitoTwitterAPI 200 QPS性能の完全活用
- 平均700msレスポンス時間の維持
- エラーハンドリングと自動リトライ機能
- レート制限対策と効率的なバッチ処理

### データ管理要件
- X内データの15分以内分析サイクル
- 全アクション効果の即座測定
- 競合・インフルエンサーデータの継続監視
- 戦略パラメータの自動調整

### パフォーマンス要件
- エンゲージメント率3.5%以上の達成
- 月次フォロワー増加率10%の持続
- 1日10-20アクションの戦略的実行
- 競合優位性の定量的確立

## 🧪 テスト要件

### 統合テスト
- 全8アクションの連携動作確認
- KaitoTwitterAPI性能限界テスト
- エラー復旧・継続実行テスト

### 効果測定テスト
- A/Bテストによる戦略効果検証
- 競合比較による優位性確認
- 長期成長トレンドの追跡

## 📊 成功指標

### 技術指標
- [ ] RSS依存の完全排除
- [ ] 8種類アクションの統合実行
- [ ] 15分以内効果分析サイクル確立
- [ ] 200 QPS性能の完全活用

### ビジネス指標
- [ ] エンゲージメント率3.5%達成
- [ ] 月次フォロワー増加率10%達成
- [ ] 競合アカウントとの差別化確立
- [ ] 影響力ネットワークの拡大

## 🚨 重要な実装制約

### MVP原則の厳守
- 要件定義外の機能は実装しない
- 過剰な最適化は避け、実用性を優先
- シンプルで保守可能なコード構造

### 出力管理
- 全データは`data/`配下の指定場所のみ
- 実行ログは`tasks/outputs/`に保存
- ルートディレクトリへの直接出力禁止

## 📋 完了条件

1. RSSコレクターの完全排除と動作確認
2. 8種類アクションの統合実行システム完成
3. KaitoTwitterAPI完全統合による市場データ取得
4. 影響力ネットワーク管理システムの動作確認
5. 全テストの通過と成功指標の達成

実装完了後、報告書を作成してください：
📋 報告書: tasks/20250723_223435_requirements_ultimate_upgrade/reports/REPORT-001-complete-integration.md