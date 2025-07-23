# TASK-005: DataOptimizer統合改善と学習データ最適化

## 🎯 実装目標

DataOptimizerクラスをcore-runner.tsおよび他のサービスクラスと完全統合し、学習データ管理を最適化する。

## ✅ 必須要件

### 1. core-runner.ts統合強化
- DataMaintenanceクラスとしての利用を想定した設計
- 非同期メンテナンス処理の実装
- エラーハンドリングの強化

### 2. 他サービスクラスとの連携強化
- XPosterとの投稿アーカイブ連携
- PerformanceAnalyzerとの分析データ連携
- RecordManagerとの実行記録連携

### 3. 学習データ管理の自動化
- 定期的なデータクリーンアップ
- インテリジェントなデータ価値評価
- 階層型データ移行の自動化

## 📝 実装詳細

### ファイル: `src/services/data-optimizer.ts`

#### A. core-runner.ts統合メソッド追加

##### 1. executeDataHierarchyMaintenance()メソッド
```typescript
/**
 * core-runner.ts用の階層型データメンテナンス実行
 */
async executeDataHierarchyMaintenance(): Promise<{
  success: boolean;
  results: {
    currentOptimized: boolean;
    learningCleaned: boolean;
    archivesMaintained: boolean;
    spaceSaved: number;
  };
  error?: string;
}> {
  try {
    this.logger.info('🔧 [DataOptimizer] 階層型データメンテナンス開始');
    
    let totalSpaceSaved = 0;
    
    // 1. currentデータの最適化
    const currentResult = await this.optimizeCurrentData();
    totalSpaceSaved += currentResult.spaceSaved;
    
    // 2. learningデータのクリーンアップ
    const learningResult = await this.cleanLearningData();
    totalSpaceSaved += learningResult.spaceSaved;
    
    // 3. archivesメンテナンス
    const archiveResult = await this.maintainArchives();
    totalSpaceSaved += archiveResult.spaceSaved;
    
    // 4. 統合レポート生成
    await this.generateMaintenanceReport({
      currentOptimized: currentResult.success,
      learningCleaned: learningResult.success,
      archivesMaintained: archiveResult.success,
      totalSpaceSaved
    });
    
    const results = {
      currentOptimized: currentResult.success,
      learningCleaned: learningResult.success,
      archivesMaintained: archiveResult.success,
      spaceSaved: totalSpaceSaved
    };
    
    this.logger.info('✅ [DataOptimizer] 階層型データメンテナンス完了', results);
    
    return {
      success: true,
      results
    };
    
  } catch (error) {
    this.logger.error('❌ [DataOptimizer] 階層型データメンテナンスエラー:', error);
    return {
      success: false,
      results: {
        currentOptimized: false,
        learningCleaned: false,
        archivesMaintained: false,
        spaceSaved: 0
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

##### 2. 各階層の個別最適化メソッド
```typescript
/**
 * currentデータの最適化
 */
private async optimizeCurrentData(): Promise<{ success: boolean; spaceSaved: number }> {
  try {
    let spaceSaved = 0;
    
    // 1日以上古いデータをlearningに移動
    const currentDir = join(this.dataRoot, 'current');
    const files = await this.getAllYamlFiles(currentDir);
    
    for (const file of files) {
      const stats = await fs.stat(file);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        const fileSize = stats.size;
        const valueScore = await this.evaluateDataValue(await loadYamlAsync(file));
        
        if (valueScore.totalScore > 40) {
          // 学習データに移動
          await this.moveToLearning(file);
          spaceSaved += fileSize;
        } else {
          // 価値が低い場合は直接アーカイブ
          await this.archiveData(file, this.generateArchivePath(file));
          spaceSaved += fileSize;
        }
      }
    }
    
    return { success: true, spaceSaved };
    
  } catch (error) {
    this.logger.error('❌ [Current最適化] エラー:', error);
    return { success: false, spaceSaved: 0 };
  }
}

/**
 * learningデータのクリーンアップ
 */
private async cleanLearningData(): Promise<{ success: boolean; spaceSaved: number }> {
  try {
    let spaceSaved = 0;
    
    // 個別クリーンアップメソッドの実行
    await this.cleanSuccessPatterns();
    await this.cleanHighEngagementData();
    await this.cleanEffectiveTopics();
    
    // 90日以上古いデータをアーカイブに移動
    const learningDir = join(this.dataRoot, 'learning');
    const files = await this.getAllYamlFiles(learningDir);
    
    for (const file of files) {
      const stats = await fs.stat(file);
      const ageDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageDays > 90) {
        spaceSaved += stats.size;
        await this.archiveData(file, this.generateArchivePath(file));
      }
    }
    
    return { success: true, spaceSaved };
    
  } catch (error) {
    this.logger.error('❌ [Learning最適化] エラー:', error);
    return { success: false, spaceSaved: 0 };
  }
}

/**
 * archivesメンテナンス
 */
private async maintainArchives(): Promise<{ success: boolean; spaceSaved: number }> {
  try {
    let spaceSaved = 0;
    
    // 6ヶ月以上古いアーカイブの圧縮
    const archiveDir = join(this.dataRoot, 'archives');
    const monthDirs = await fs.readdir(archiveDir, { withFileTypes: true });
    
    for (const monthDir of monthDirs) {
      if (monthDir.isDirectory()) {
        const monthPath = join(archiveDir, monthDir.name);
        const [year, month] = monthDir.name.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1);
        const ageMonths = (Date.now() - monthDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        if (ageMonths > 6) {
          // 古いアーカイブを圧縮形式に変換
          const compressedSize = await this.compressArchiveMonth(monthPath);
          spaceSaved += compressedSize;
        }
      }
    }
    
    return { success: true, spaceSaved };
    
  } catch (error) {
    this.logger.error('❌ [Archive最適化] エラー:', error);
    return { success: false, spaceSaved: 0 };
  }
}
```

#### B. 他サービス連携メソッド強化

##### 1. XPoster連携の改善
```typescript
/**
 * XPoster用の投稿アーカイブ処理（既存メソッドの改善）
 */
async archivePost(post: {
  content: string;
  timestamp: Date;
  postId?: string;
  engagementMetrics?: any;
  metadata?: any;
}): Promise<void> {
  try {
    // 既存実装を保持しつつ、分析機能を追加
    await super.archivePost(post); // 既存の処理
    
    // 追加: 投稿パフォーマンス分析
    const performanceData = await this.analyzePostPerformance(post);
    
    // 追加: 学習データの自動更新
    if (performanceData.isHighPerformance) {
      await this.addToLearningData('high-performance-posts', {
        ...post,
        performance: performanceData
      });
    }
    
    // 追加: トレンド分析データの更新
    await this.updateTrendAnalysis(post);
    
  } catch (error) {
    console.error('❌ 拡張投稿アーカイブエラー:', error);
    throw error;
  }
}

/**
 * 投稿パフォーマンス分析
 */
private async analyzePostPerformance(post: any): Promise<{
  isHighPerformance: boolean;
  engagementScore: number;
  viralityScore: number;
  educationalValue: number;
}> {
  const metrics = post.engagementMetrics || {};
  
  // エンゲージメントスコア計算
  const engagementScore = (
    (metrics.likes || 0) * 1 +
    (metrics.retweets || 0) * 3 +
    (metrics.replies || 0) * 2
  ) / Math.max(metrics.impressions || 1, 1);
  
  // 教育価値スコア計算
  const educationalKeywords = ['NISA', 'iDeCo', '投資', '積立', 'リスク'];
  const educationalValue = educationalKeywords
    .filter(keyword => post.content.includes(keyword)).length / educationalKeywords.length;
  
  return {
    isHighPerformance: engagementScore > 0.05,
    engagementScore,
    viralityScore: (metrics.retweets || 0) / Math.max(metrics.impressions || 1, 1),
    educationalValue
  };
}
```

##### 2. PerformanceAnalyzer連携
```typescript
/**
 * PerformanceAnalyzer用のデータ提供
 */
async getAnalysisData(period: 'daily' | 'weekly' | 'monthly'): Promise<{
  posts: any[];
  engagementData: any[];
  trendData: any[];
}> {
  try {
    const cutoffDate = this.getCutoffDate(period);
    
    // 各種データの収集
    const posts = await this.getPostsSince(cutoffDate);
    const engagementData = await this.getEngagementDataSince(cutoffDate);
    const trendData = await this.getTrendDataSince(cutoffDate);
    
    return {
      posts,
      engagementData,
      trendData
    };
    
  } catch (error) {
    console.error('❌ 分析データ提供エラー:', error);
    return {
      posts: [],
      engagementData: [],
      trendData: []
    };
  }
}
```

#### C. インテリジェントデータ管理

##### 1. AI駆動データ価値評価
```typescript
/**
 * AI駆動データ価値評価（既存メソッドの拡張）
 */
async evaluateDataValue(data: DataItem): Promise<ValueScore & {
  aiAnalysis: {
    contentQuality: number;
    futureRelevance: number;
    learningPotential: number;
  };
}> {
  // 既存の評価を実行
  const basicScore = await super.evaluateDataValue(data);
  
  // AI分析の追加
  const aiAnalysis = await this.performAIAnalysis(data);
  
  return {
    ...basicScore,
    totalScore: basicScore.totalScore + aiAnalysis.contentQuality * 10,
    aiAnalysis
  };
}

/**
 * AI分析（将来的にClaude統合予定）
 */
private async performAIAnalysis(data: DataItem): Promise<{
  contentQuality: number;
  futureRelevance: number;
  learningPotential: number;
}> {
  try {
    // 現在は基本的な分析、将来的にClaude統合
    const content = data.content || '';
    
    // コンテンツ品質分析
    const contentQuality = this.analyzeContentQuality(content);
    
    // 将来関連性分析
    const futureRelevance = this.analyzeFutureRelevance(data);
    
    // 学習ポテンシャル分析
    const learningPotential = this.analyzeLearningPotential(data);
    
    return {
      contentQuality,
      futureRelevance,
      learningPotential
    };
    
  } catch (error) {
    return {
      contentQuality: 0.5,
      futureRelevance: 0.5,
      learningPotential: 0.5
    };
  }
}
```

## 🧪 テスト要件

### 1. 統合テスト
```typescript
describe('DataOptimizer Integration', () => {
  it('should integrate with core-runner.ts', async () => {
    const optimizer = new DataOptimizer();
    
    const result = await optimizer.executeDataHierarchyMaintenance();
    
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    expect(result.results.spaceSaved).toBeGreaterThanOrEqual(0);
  });
  
  it('should work with XPoster archive', async () => {
    const optimizer = new DataOptimizer();
    
    const mockPost = {
      content: 'Test post',
      timestamp: new Date(),
      postId: 'test123',
      engagementMetrics: { likes: 10, retweets: 5 }
    };
    
    await expect(optimizer.archivePost(mockPost))
      .resolves.not.toThrow();
  });
});
```

### 2. パフォーマンステスト
```typescript
describe('Performance Tests', () => {
  it('should handle large datasets efficiently', async () => {
    const optimizer = new DataOptimizer();
    
    const startTime = Date.now();
    await optimizer.optimizeDataset();
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(30000); // 30秒以内
  });
});
```

## 📊 成功基準

### 機能面
- ✅ core-runner.tsとの完全統合
- ✅ 他サービスクラスとの連携強化
- ✅ 学習データ管理の自動化

### パフォーマンス面
- ✅ データ処理速度30%向上
- ✅ ストレージ使用量20%削減
- ✅ メモリ効率50%改善

### 品質面
- ✅ データ品質評価の精度向上
- ✅ エラーハンドリングの強化
- ✅ ログ出力の詳細化

## 🔍 検証方法

### 1. 統合確認
```bash
# core-runner.tsでの実行確認
pnpm dev

# DataOptimizer単体テスト
pnpm test src/services/data-optimizer.test.ts
```

### 2. データ最適化確認
```bash
# データサイズの変化確認
du -sh data/current/
du -sh data/learning/
du -sh data/archives/
```

## 📋 実装後チェックリスト

- [ ] executeDataHierarchyMaintenance()実装完了
- [ ] XPoster連携強化完了
- [ ] PerformanceAnalyzer連携実装完了
- [ ] AI駆動データ価値評価実装完了
- [ ] 階層型データ移行自動化完了
- [ ] テスト実装・実行完了
- [ ] パフォーマンス改善確認完了
- [ ] 統合テスト完了

## 💡 注意点

### 1. データ整合性
- データ移行時の整合性保証
- バックアップ処理の確実な実行
- エラー時のロールバック機能

### 2. パフォーマンス
- 大量ファイル処理時のメモリ管理
- 並列処理の効率化
- I/O負荷の分散

## 🎯 完了条件

1. **統合**: core-runner.tsとの完全統合
2. **連携**: 他サービスクラスとの連携強化
3. **自動化**: 学習データ管理の完全自動化
4. **品質**: データ品質評価の精度向上
5. **安定性**: 長時間運用での安定動作

---

**重要**: DataOptimizerはシステム全体のデータ管理を担当する基盤サービスです。データの整合性と効率性を両立させた実装を心がけてください。