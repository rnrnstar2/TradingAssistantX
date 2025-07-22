# TASK-002: ActionSpecificCollector拡張実装

## 🎯 実装目標
既存のActionSpecificCollectorを拡張し、X（Twitter）以外の多様な情報源との統合を実現します。

## 📊 現状の問題
- `src/lib/action-specific-collector.ts`がX（Twitter）のみに依存
- 29行目で強制テストモード（`this.testMode = process.env.X_TEST_MODE === 'true' || true;`）
- フォールバックデータのみでの運用状況

## 🚀 実装要件

### 1. ActionSpecificCollector拡張

#### 修正対象ファイル
```
src/lib/action-specific-collector.ts - メインの拡張
src/types/autonomous-system.ts - 型定義の拡張
```

#### 新機能統合
- TASK-001で実装される`MultiSourceCollector`との連携
- 情報源選択の最適化ロジック
- 情報源別の品質評価システム

### 2. 技術要件

#### コンストラクタ拡張
```typescript
constructor(configPath?: string, useMultipleSources: boolean = true) {
  // X専用テストモードの設定調整
  this.testMode = process.env.X_TEST_MODE === 'true';
  this.useMultipleSources = useMultipleSources;
  this.loadConfig(configPath);
  
  if (this.useMultipleSources) {
    this.multiSourceCollector = new MultiSourceCollector();
  }
}
```

#### メソッド拡張
既存メソッドを以下のように拡張：

```typescript
// メイン収集メソッドの拡張
async collectForAction(
  actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
  context: IntegratedContext,
  targetSufficiency: number = 85
): Promise<ActionSpecificResult> {
  
  const results: CollectionResult[] = [];
  
  // 1. 多様な情報源からの収集（新機能）
  if (this.useMultipleSources && !this.testMode) {
    const multiSourceResults = await this.collectFromMultipleSources(actionType, context);
    results.push(...multiSourceResults);
  }
  
  // 2. X（Twitter）からの収集（既存機能、条件付き）
  if (results.length < targetSufficiency * 0.01 || this.shouldUseXSource(actionType)) {
    const xResults = await this.collectFromX(actionType, context);
    results.push(...xResults);
  }
  
  // 3. 結果の統合・評価
  return await this.processIntegratedResults(actionType, results, targetSufficiency);
}

// 新規メソッド
private async collectFromMultipleSources(
  actionType: string,
  context: IntegratedContext
): Promise<CollectionResult[]> {
  if (!this.multiSourceCollector) return [];
  
  const sources = this.determineOptimalSources(actionType);
  const results: CollectionResult[] = [];
  
  // 情報源別の並列収集
  const sourcePromises = sources.map(async (source) => {
    try {
      switch (source.type) {
        case 'rss':
          return await this.multiSourceCollector.collectFromRSS(source.config);
        case 'api':
          return await this.multiSourceCollector.collectFromAPIs(source.config);
        case 'community':
          return await this.multiSourceCollector.collectFromCommunity(source.config);
        default:
          return [];
      }
    } catch (error) {
      console.warn(`⚠️ [${source.type}収集エラー]:`, error);
      return [];
    }
  });
  
  const sourceResults = await Promise.allSettled(sourcePromises);
  
  sourceResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.push(...result.value.data);
    }
  });
  
  return results;
}

private determineOptimalSources(actionType: string): SourceConfig[] {
  // アクションタイプ別の最適情報源選択ロジック
  const sourceStrategies = {
    original_post: ['rss', 'api', 'community'], // 多様な情報源
    quote_tweet: ['community', 'rss'],          // コミュニティとRSS重視
    retweet: ['rss', 'api'],                    // 信頼性の高いRSSとAPI
    reply: ['community']                        // コミュニティ重視
  };
  
  return this.config.multiSources.filter(source => 
    sourceStrategies[actionType].includes(source.type)
  );
}
```

### 3. 設定システム拡張

#### 既存設定との統合
`data/action-collection-strategies.yaml`の拡張に対応：

```typescript
interface ActionCollectionConfig {
  strategies: {
    // 既存のX戦略
    [key: string]: {
      priority: number;
      focusAreas: string[];
      sources: Array<{name: string; url: string; priority: string;}>;
      // ... existing fields
    }
  };
  
  // 新規追加
  multiSources: {
    rss: RSSSources[];
    apis: APISources[];
    community: CommunitySources[];
  };
  
  sourceSelection: {
    [actionType: string]: {
      preferred: string[];
      fallback: string[];
      priority: 'quality' | 'speed' | 'diversity';
    };
  };
}
```

### 4. 品質評価システム拡張

#### 情報源別品質評価
```typescript
private async evaluateMultiSourceQuality(
  results: CollectionResult[],
  actionType: string
): Promise<QualityEvaluation> {
  
  const sourceQuality = {
    rss: { weight: 0.9, baseline: 85 },      // 高品質・信頼性
    api: { weight: 0.95, baseline: 90 },     // 最高品質・正確性
    community: { weight: 0.7, baseline: 70 }, // 多様性重視
    twitter: { weight: 0.8, baseline: 75 }   // 既存X評価
  };
  
  // 情報源別の品質加重平均
  let totalScore = 0;
  let totalWeight = 0;
  
  results.forEach(result => {
    const source = this.identifyResultSource(result);
    const quality = sourceQuality[source] || sourceQuality.twitter;
    
    const adjustedScore = result.relevanceScore * quality.weight + 
                         (quality.baseline / 100) * (1 - quality.weight);
    
    totalScore += adjustedScore * quality.weight;
    totalWeight += quality.weight;
  });
  
  return {
    relevanceScore: Math.round((totalScore / totalWeight) * 100),
    credibilityScore: this.calculateMultiSourceCredibility(results),
    uniquenessScore: this.calculateCrossSourceUniqueness(results),
    timelinessScore: this.calculateMultiSourceTimeliness(results),
    overallScore: Math.round((totalScore / totalWeight) * 100),
    feedback: this.generateMultiSourceFeedback(results)
  };
}
```

### 5. フォールバック戦略の改善

#### 段階的フォールバック
1. **第1段階**: RSS + API（高信頼性）
2. **第2段階**: Community + RSS（多様性）  
3. **第3段階**: X（Twitter）（既存システム）
4. **第4段階**: 高品質フォールバックデータ

## 📋 実装手順

### Phase 1: 基本統合
1. MultiSourceCollectorとの接続インターフェース実装
2. 既存テストモード設定の調整
3. 基本的な多様情報源収集の実装

### Phase 2: 品質システム
1. 情報源別品質評価システムの実装
2. クロスソース重複除去の実装
3. 統合品質メトリクスの実装

### Phase 3: 最適化
1. アクション別情報源選択の最適化
2. パフォーマンスチューニング
3. エラーハンドリングの強化

### Phase 4: テスト統合
1. 既存テストケースの更新
2. 新機能のテストケース追加
3. 統合テストの実行

## ⚠️ 制約・注意事項

### 既存機能への影響最小化
- 既存のX（Twitter）収集機能は保持
- 後方互換性の確保
- 段階的な移行戦略

### パフォーマンス要件
- 既存の90秒制限内での実行
- 情報源増加によるレイテンシ増加の抑制
- 適切な並列処理の実装

## ✅ 完了基準

1. **機能完了**
   - 多様な情報源からの統合収集が正常動作
   - 既存X機能との共存が問題なく動作
   - 品質評価システムが適切に機能

2. **品質基準**
   - TypeScript strict mode準拠
   - ESLint/Prettier通過
   - 既存テストケースの全パス

3. **統合基準**
   - TASK-001との連携が正常動作
   - 設定ファイルの更新との連携確認
   - 全体システムとしての動作確認

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_190718_information_source_expansion/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-002-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- 拡張した機能の詳細
- 既存システムとの統合状況
- 品質改善の効果測定
- パフォーマンス比較結果

---

**実装品質**: X依存からの脱却により、より豊富で信頼性の高い情報収集システムへと発展させてください。