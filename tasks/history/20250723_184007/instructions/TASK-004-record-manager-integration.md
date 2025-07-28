# TASK-004: RecordManager統合とcore-runner.ts連携強化

## 🎯 実装目標

RecordManagerクラスをcore-runner.tsと完全統合し、実行記録・エラーハンドリング・統計管理を強化する。

## ✅ 必須要件

### 1. core-runner.ts統合インターフェース実装
- `recordExecution()`メソッドの完全実装
- `recordError()`メソッドの実装
- `getRecentPosts()`メソッドの実装
- `getExecutionCounts()`メソッドの実装
- `getLastExecutionTime()`メソッドの実装

### 2. エラーハンドリング強化
- Claude統合エラー処理
- システムリカバリー機能の改善
- 詳細エラーログの記録

### 3. 統計・分析機能の強化
- 実行統計の自動計算
- パフォーマンス指標の追跡
- 成功率分析の実装

## 📝 実装詳細

### ファイル: `src/services/record-manager.ts`

#### A. 不足メソッドの実装

##### 1. recordError()メソッド
```typescript
/**
 * エラー記録（core-runner.ts用）
 */
async recordError(error: unknown, result: ExecutionResult): Promise<void> {
  this.logger.info('🚨 [記録] エラー記録開始');
  
  try {
    const errorRecord: ExecutionRecord = {
      success: false,
      timestamp: result.timestamp,
      error: error instanceof Error ? error.message : String(error),
      executionTime: result.executionTime,
      systemMetrics: await this.collectSystemMetrics()
    };
    
    // 実行記録として保存
    await this.recordExecution(errorRecord);
    
    // 詳細エラーハンドリング
    await this.handleError(error, errorRecord);
    
    // 学習データ更新（エラーパターン学習）
    await this.updateErrorPatterns(error, result);
    
    this.logger.info('✅ [記録] エラー記録完了');
    
  } catch (recordError) {
    this.logger.error('❌ [記録] エラー記録失敗:', recordError);
  }
}
```

##### 2. getRecentPosts()メソッド
```typescript
/**
 * 最近の投稿取得（core-runner.ts用）
 */
async getRecentPosts(count: number = 5): Promise<any[]> {
  try {
    const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
    
    try {
      const content = await fs.readFile(todayPostsPath, 'utf-8');
      const todayData = yaml.load(content) as any;
      
      if (!todayData?.posts) {
        return [];
      }
      
      // 最新の投稿から指定件数を取得
      return todayData.posts
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, count)
        .map((post: any) => ({
          id: post.id || `post_${post.timestamp}`,
          content: post.content || '',
          timestamp: post.timestamp,
          success: post.success,
          engagement: post.engagement || {},
          type: post.type || 'unknown'
        }));
        
    } catch (fileError) {
      this.logger.warn('⚠️ [記録] today-posts.yaml読み込み失敗、空配列を返します');
      return [];
    }
    
  } catch (error) {
    this.logger.error('❌ [記録] 最近の投稿取得エラー:', error);
    return [];
  }
}
```

##### 3. getExecutionCounts()メソッド
```typescript
/**
 * 実行回数統計取得（core-runner.ts用）
 */
async getExecutionCounts(): Promise<{
  total: number;
  successful: number;
  failed: number;
  today: number;
}> {
  try {
    const dailyStats = await this.getDailyStatistics();
    
    // 今週の統計も取得
    const weeklyStats = await this.getWeeklyStatistics();
    
    return {
      total: dailyStats.total_posts,
      successful: dailyStats.successful_posts,
      failed: dailyStats.failed_posts,
      today: dailyStats.total_posts
    };
    
  } catch (error) {
    this.logger.error('❌ [記録] 実行回数統計取得エラー:', error);
    return {
      total: 0,
      successful: 0,
      failed: 0,
      today: 0
    };
  }
}
```

##### 4. getLastExecutionTime()メソッド
```typescript
/**
 * 最終実行時間取得（core-runner.ts用）
 */
async getLastExecutionTime(): Promise<string | null> {
  try {
    const recentPosts = await this.getRecentPosts(1);
    
    if (recentPosts.length > 0) {
      return recentPosts[0].timestamp;
    }
    
    return null;
    
  } catch (error) {
    this.logger.error('❌ [記録] 最終実行時間取得エラー:', error);
    return null;
  }
}
```

#### B. 高度な統計機能の実装

##### 1. 週次統計機能
```typescript
/**
 * 週次統計収集
 */
private async getWeeklyStatistics(): Promise<{
  totalPosts: number;
  avgSuccessRate: number;
  avgExecutionTime: number;
}> {
  try {
    // 過去7日間のデータを収集
    const weeklyData = await this.collectWeeklyData();
    
    const totalPosts = weeklyData.length;
    const successfulPosts = weeklyData.filter((p: any) => p.success).length;
    const avgSuccessRate = totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0;
    const avgExecutionTime = totalPosts > 0 
      ? weeklyData.reduce((sum: number, p: any) => sum + (p.executionTime || 0), 0) / totalPosts
      : 0;
    
    return {
      totalPosts,
      avgSuccessRate,
      avgExecutionTime
    };
    
  } catch (error) {
    this.logger.warn('⚠️ [統計] 週次統計収集失敗:', error);
    return {
      totalPosts: 0,
      avgSuccessRate: 0,
      avgExecutionTime: 0
    };
  }
}
```

##### 2. エラーパターン学習
```typescript
/**
 * エラーパターン学習・更新
 */
private async updateErrorPatterns(error: unknown, result: ExecutionResult): Promise<void> {
  try {
    const errorPatternsPath = path.join(process.cwd(), 'data', 'learning', 'error-patterns.yaml');
    
    // 既存のエラーパターンを読み込み
    let patterns: any = { error_patterns: [] };
    try {
      const content = await fs.readFile(errorPatternsPath, 'utf-8');
      patterns = yaml.load(content) || patterns;
    } catch {
      // ファイルが存在しない場合は新規作成
    }
    
    // 新しいエラーパターンを追加
    const errorPattern = {
      timestamp: result.timestamp,
      error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : String(error),
      execution_context: {
        action: result.action,
        executionTime: result.executionTime,
        systemMetrics: result.metrics
      },
      frequency: 1
    };
    
    // 同じエラーパターンがある場合は頻度を増加
    const existingPattern = patterns.error_patterns.find((p: any) => 
      p.error_type === errorPattern.error_type && 
      p.error_message === errorPattern.error_message
    );
    
    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.last_occurrence = result.timestamp;
    } else {
      patterns.error_patterns.push(errorPattern);
    }
    
    // パターンが多すぎる場合は古いものを削除（最大50件）
    if (patterns.error_patterns.length > 50) {
      patterns.error_patterns = patterns.error_patterns
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 50);
    }
    
    // ファイルに保存
    await fs.mkdir(path.dirname(errorPatternsPath), { recursive: true });
    await fs.writeFile(errorPatternsPath, yaml.dump(patterns, { indent: 2 }));
    
    this.logger.info('📚 [学習] エラーパターン更新完了');
    
  } catch (updateError) {
    this.logger.warn('⚠️ [学習] エラーパターン更新失敗:', updateError);
  }
}
```

#### C. Claude統合強化

##### 1. Claudeエラー分析連携
```typescript
/**
 * Claudeによるエラー分析
 */
private async analyzeErrorWithClaude(error: unknown, context: any): Promise<{
  analysis: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}> {
  try {
    // Claude統合は将来的に実装
    // 現在は基本的な分析を返す
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    const recommendations: string[] = [];
    
    // エラーの重要度を判定
    if (errorMessage.toLowerCase().includes('critical') || 
        errorMessage.toLowerCase().includes('fatal')) {
      severity = 'critical';
      recommendations.push('システム管理者に即座に連絡');
      recommendations.push('全サービス停止の検討');
    } else if (errorMessage.toLowerCase().includes('network') ||
               errorMessage.toLowerCase().includes('timeout')) {
      severity = 'medium';
      recommendations.push('ネットワーク接続の確認');
      recommendations.push('リトライ処理の実行');
    } else {
      severity = 'low';
      recommendations.push('ログの詳細確認');
      recommendations.push('次回実行での自動回復を期待');
    }
    
    return {
      analysis: `エラー分析: ${errorMessage}`,
      recommendations,
      severity
    };
    
  } catch (analysisError) {
    this.logger.warn('⚠️ [分析] Claudeエラー分析失敗:', analysisError);
    return {
      analysis: 'エラー分析に失敗しました',
      recommendations: ['手動での確認が必要です'],
      severity: 'medium'
    };
  }
}
```

## 🧪 テスト要件

### 1. 統合テスト
```typescript
describe('RecordManager Integration', () => {
  it('should work with core-runner.ts', async () => {
    const recordManager = new RecordManager('tasks/outputs');
    
    // core-runner.tsと同じ呼び出し方法をテスト
    const recentPosts = await recordManager.getRecentPosts(5);
    const executionCounts = await recordManager.getExecutionCounts();
    const lastExecution = await recordManager.getLastExecutionTime();
    
    expect(recentPosts).toBeInstanceOf(Array);
    expect(executionCounts).toHaveProperty('total');
    expect(lastExecution).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    const recordManager = new RecordManager('tasks/outputs');
    const mockError = new Error('Test error');
    const mockResult = {
      success: false,
      timestamp: new Date().toISOString(),
      executionId: 'test',
      action: 'test',
      decision: { action: 'test', reasoning: '', parameters: {}, confidence: 0 },
      executionTime: 1000
    };
    
    await expect(recordManager.recordError(mockError, mockResult))
      .resolves.not.toThrow();
  });
});
```

### 2. パフォーマンステスト
```typescript
describe('Performance Tests', () => {
  it('should handle large datasets efficiently', async () => {
    const recordManager = new RecordManager('tasks/outputs');
    
    const startTime = Date.now();
    await recordManager.getRecentPosts(100);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
  });
});
```

## 📊 成功基準

### 機能面
- ✅ core-runner.tsとの完全統合
- ✅ 全必須メソッドの実装
- ✅ エラーハンドリングの強化

### パフォーマンス面
- ✅ 大量データ処理の最適化
- ✅ メモリ使用量の効率化
- ✅ ファイルI/Oの最適化

### 品質面
- ✅ ログ出力の充実
- ✅ エラー復旧機能の実装
- ✅ 学習機能の自動化

## 🔍 検証方法

### 1. 統合確認
```bash
# core-runner.tsでの実行確認
pnpm dev

# RecordManager単体テスト
pnpm test src/services/record-manager.test.ts
```

### 2. データ整合性確認
```bash
# 生成されるYAMLファイルの確認
ls -la data/current/
ls -la data/learning/
ls -la tasks/outputs/
```

## 📋 実装後チェックリスト

- [ ] recordError()メソッド実装完了
- [ ] getRecentPosts()メソッド実装完了
- [ ] getExecutionCounts()メソッド実装完了
- [ ] getLastExecutionTime()メソッド実装完了
- [ ] エラーパターン学習機能実装完了
- [ ] Claude統合基盤実装完了
- [ ] 統計機能強化完了
- [ ] テスト実装・実行完了

## 💡 注意点

### 1. データ整合性
- 既存のYAMLファイル形式との互換性
- データ破損時の適切な回復処理
- バックアップ機能の実装

### 2. パフォーマンス
- 大量データ処理時のメモリ管理
- ファイルアクセスの最適化
- キャッシュ機能の活用

## 🎯 完了条件

1. **統合**: core-runner.tsとの完全統合
2. **機能**: 全必須メソッドの正常動作
3. **品質**: エラーハンドリングの改善
4. **テスト**: 全テストケースが通過
5. **運用**: 実際の運用環境での安定動作

---

**重要**: RecordManagerはシステム全体の記録・監視を担当する基盤サービスです。データの整合性と信頼性を最優先に実装してください。