# TASK-002: コンテキスト圧迫抑制・最小情報システム

## 🎯 実装目標
過剰な情報構築を排除し、Claude Codeが現在のXアカウント状況に対して最善の一手を打つために必要最小限の情報システムを構築します。

## 📊 現状の問題
- `max_context_size: 50000`でも圧迫される情報量
- 過剰な履歴データ・分析データの蓄積
- 実行時の冗長なログ出力
- 不要な多段階前処理プロセス

## 🚀 実装要件

### 1. データストレージ最適化

#### 履歴データの最小化
```typescript
// data/account-analysis-results.json削減
interface MinimalAccountState {
  healthScore: number;          // 単一指標
  todayActions: number;         // 今日の実行回数
  lastSuccess: string;          // 最後の成功時刻
  // 削除: 詳細履歴、複雑分析結果
}

// data/posting-history.yaml最小化
interface EssentialPostingHistory {
  recent: Array<{
    time: string;
    type: string;
    success: boolean;
  }>; // 最新5件のみ
}
```

#### YAML設定の軽量化
```yaml
# data/autonomous-config.yaml 簡素化
execution:
  mode: "adaptive"              # Claude判断重視
  
constraints:
  daily_limit: 15              # シンプルな制限
  quality_threshold: 0.8       # 品質基準のみ
  
# 削除: 複雑な設定、詳細オプション
```

### 2. リアルタイム情報システム

#### 動的情報収集（保存なし）
```typescript
export class RealtimeInfoCollector {
  // 情報をメモリ内でのみ処理、永続化しない
  async getEssentialContext(): Promise<EssentialContext> {
    return {
      market: await this.getCurrentMarketSnapshot(),    // リアルタイム取得
      account: await this.getCurrentAccountSnapshot(),  // 最新状態のみ
      opportunities: await this.getImmediateOpportunities() // 現在の機会のみ
    };
  }
  
  // 保存・履歴化せず、Claude判断に必要な情報のみ提供
  private async getCurrentMarketSnapshot(): Promise<MarketSnapshot> {
    // 最小限の市場情報（5分以内の情報のみ）
    return {
      trending: await this.getTopTrends(3),           // 上位3つのみ
      sentiment: await this.getCurrentSentiment(),    // 現在感情のみ
      activity: await this.getActivityLevel()        // 活動レベルのみ
    };
  }
}
```

### 3. 実行時ログ最適化

#### 簡潔なログシステム
```typescript
export class MinimalLogger {
  // 冗長な実行ログを排除
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (level === 'info' && !this.isEssentialInfo(message)) {
      return; // 不要な情報ログはスキップ
    }
    
    // 簡潔な形式でのみ出力
    const timestamp = new Date().toISOString().slice(11, 19); // HH:mm:ss
    console.log(`${timestamp} ${level.toUpperCase()}: ${message}`);
  }
  
  private isEssentialInfo(message: string): boolean {
    const essential = ['開始', '完了', 'エラー', '判断', '実行'];
    return essential.some(keyword => message.includes(keyword));
  }
}
```

### 4. Claude判断特化システム

#### 最適情報プロバイダー
```typescript
export class ClaudeOptimizedProvider {
  async getDecisionContext(actionType?: string): Promise<DecisionContext> {
    // Claude判断に特化した最小限コンテキスト
    return {
      current: {
        time: this.getCurrentTime(),
        accountHealth: await this.getSimpleHealthScore(),
        todayProgress: await this.getTodayProgress()
      },
      immediate: {
        bestOpportunity: await this.getBestOpportunity(actionType),
        constraints: this.getActiveConstraints()
      },
      context: this.getMinimalContext(200) // 最大200文字に制限
    };
  }
  
  private getMinimalContext(maxChars: number): string {
    // 投資・トレード分野での価値創造に集中
    return `投資教育コンテンツでの信頼性構築、価値提供重視`.slice(0, maxChars);
  }
}
```

### 5. メモリ効率化システム

#### 自動クリーンアップ
```typescript
export class MemoryOptimizer {
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // 5分ごとに不要データをクリア
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedData();
    }, 5 * 60 * 1000);
  }
  
  private cleanupUnusedData(): void {
    // 1. 古いキャッシュデータの削除
    this.clearOldCache();
    
    // 2. 一時的なメモリ使用量の最適化
    if (global.gc) {
      global.gc();
    }
    
    // 3. 使用メモリの監視
    const usage = process.memoryUsage();
    if (usage.heapUsed > 100 * 1024 * 1024) { // 100MB超過
      console.warn('⚠️ メモリ使用量高: ', Math.round(usage.heapUsed / 1024 / 1024), 'MB');
    }
  }
  
  private clearOldCache(): void {
    // 5分以上古いキャッシュエントリを削除
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    // キャッシュクリーンアップロジック実装
  }
}
```

### 6. 最小配分システム

#### シンプル決定エンジン
```typescript
export class MinimalDecisionEngine {
  async makeDecision(context: EssentialContext): Promise<SimpleDecision> {
    // 複雑な分析を排除、Claude判断に委任
    const prompt = this.buildMinimalPrompt(context);
    
    const decision = await claude()
      .withModel('sonnet')
      .query(prompt)
      .asText();
    
    return this.parseSimpleDecision(decision);
  }
  
  private buildMinimalPrompt(context: EssentialContext): string {
    return `
状況: アカウント健康度${context.accountHealth}%, 今日${context.todayActions}/15回実行済み

X（Twitter）での価値創造のため最適なアクション1つを選択:
1. post - 独自投稿 (市場洞察・教育コンテンツ)
2. engage - エンゲージメント (リプライ・引用)  
3. amplify - 価値拡散 (リツイート)
4. wait - 最適タイミング待機

選択理由も含め簡潔に回答してください。
`;
  }
}
```

## 📋 実装手順

### Phase 1: データ最小化
1. 履歴・分析データの削減実装
2. YAML設定の簡素化
3. 不要ファイルの削除・統合

### Phase 2: リアルタイム化
1. 動的情報収集システム実装
2. 永続化レイヤーの除去
3. メモリ内処理への転換

### Phase 3: ログ最適化
1. 簡潔ログシステム実装
2. 冗長出力の除去
3. エラー情報の精密化

### Phase 4: Claude特化最適化
1. Claude判断特化プロバイダー実装
2. 最小情報コンテキスト構築
3. 決定エンジンの簡素化

## ⚠️ 制約・注意事項

### 情報損失防止
- 重要な状態情報は保持
- デバッグ時の追跡可能性確保
- 緊急時のロールバック対応

### パフォーマンス要件
- メモリ使用量: 100MB以下維持
- 実行速度: 30秒以内に判断完了
- CPU使用率の最適化

### 品質基準維持
- 判断精度の低下防止
- エラー処理の簡素化・強化
- システム安定性の確保

## ✅ 完了基準

1. **効率化達成**
   - メモリ使用量: 50%削減
   - 実行時間: 30%短縮
   - コンテキスト情報: 70%削減

2. **品質基準**
   - 判断精度維持・向上
   - システム安定性確保
   - エラー処理の改善

3. **運用基準**
   - Claude決定の高速化
   - リアルタイム対応力向上
   - メンテナンス性の向上

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_194158_system_optimization/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-002-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- データ最小化効果の測定結果
- メモリ・CPU使用量の改善効果
- Claude判断の高速化効果
- 実際の運用での効率向上

---

**効率化品質**: 必要最小限の情報で最大の判断精度を実現し、Claude Codeの能力を最大化してください。