# TASK-003: PerformanceAnalyzer修正とcore-runner.ts整合性確保

## 🎯 実装目標

PerformanceAnalyzerクラスの依存関係エラーを修正し、core-runner.tsとの整合性を確保する。

## ❌ 現在の問題

### 1. yamlManager依存問題
- `this.yamlManager.loadConfig()` の呼び出しが存在するが、yamlManagerが定義されていない
- コンパイルエラーが発生する状態

### 2. core-runner.ts統合問題
- `analyze()`メソッドのパラメータが不一致
- 戻り値の型定義が曖昧

## ✅ 必須要件

### 1. yamlManager依存の解決
- yamlManagerの代替手段を実装
- ファイル読み込み処理の直接実装
- エラーハンドリングの改善

### 2. core-runner.ts互換性確保
- `analyze()`メソッドの正確な実装
- 型定義の統一
- インターフェースの一致

### 3. パフォーマンス分析機能の完全実装
- エンゲージメント分析の精度向上
- 成長段階判定の自動化
- 学習データ更新の自動化

## 📝 実装詳細

### ファイル: `src/services/performance-analyzer.ts`

#### A. yamlManager依存の修正

##### 1. 直接YAML処理クラス実装
```typescript
/**
 * YAML管理クラス（yamlManagerの代替）
 */
class YamlFileManager {
  async loadConfig<T>(filePath: string): Promise<{ success: boolean; data?: T }> {
    try {
      const fullPath = path.join(process.cwd(), 'data', filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = yaml.load(content) as T;
      return { success: true, data };
    } catch (error) {
      console.warn(`YAML読み込み警告: ${filePath}`, error);
      return { success: false };
    }
  }

  async saveConfig<T>(filePath: string, data: T): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), 'data', filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, yaml.dump(data, { indent: 2 }));
      return true;
    } catch (error) {
      console.error(`YAML保存エラー: ${filePath}`, error);
      return false;
    }
  }
}
```

##### 2. クラス内でのyamlManager初期化
```typescript
export class PerformanceAnalyzer {
  private logger: Logger;
  private yamlManager: YamlFileManager; // 追加

  constructor() {
    this.logger = new Logger('PerformanceAnalyzer');
    this.yamlManager = new YamlFileManager(); // 初期化
  }
}
```

#### B. core-runner.ts互換のanalyze()メソッド実装

```typescript
/**
 * core-runner.ts用のanalyze()メソッド
 */
async analyze(parameters: {
  target: string;
  metrics: string[];
  period: string;
}): Promise<any> {
  this.logger.info(`分析開始: ${parameters.target}`);
  
  try {
    switch (parameters.target) {
      case 'engagement':
        return await this.analyzeEngagement(
          parameters.period === 'weekly' ? 'weekly' : 'daily'
        );
        
      case 'posts':
        const postIds = await this.getRecentPostIds(parameters.period);
        return await this.measurePostEffectiveness(postIds);
        
      case 'growth':
        const accountData = await this.loadAccountData();
        return await this.assessGrowthStage(accountData);
        
      default:
        throw new Error(`未知の分析対象: ${parameters.target}`);
    }
  } catch (error) {
    this.logger.error('分析エラー', error);
    throw error;
  }
}
```

#### C. 不足メソッドの実装

##### 1. アカウントデータ読み込み
```typescript
private async loadAccountData(): Promise<AccountStatus> {
  const result = await this.yamlManager.loadConfig<AccountStatus>('current/account-status.yaml');
  
  if (!result.success || !result.data) {
    // デフォルトデータを返す
    return {
      followers_count: 100,
      following_count: 50,
      tweet_count: 10,
      engagement_metrics: {
        engagementRate: 0.02,
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        impressions: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  return result.data;
}
```

##### 2. 最近の投稿ID取得
```typescript
private async getRecentPostIds(period: string): Promise<string[]> {
  const result = await this.yamlManager.loadConfig<{ posts: any[] }>('current/today-posts.yaml');
  
  if (!result.success || !result.data?.posts) {
    return [];
  }
  
  const days = period === 'weekly' ? 7 : 1;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return result.data.posts
    .filter(post => new Date(post.timestamp) > cutoffDate)
    .map(post => post.id || `post_${post.timestamp}`)
    .slice(0, 10); // 最大10件
}
```

#### D. エラーハンドリング強化

```typescript
/**
 * 安全なYAML読み込み
 */
private async safeLoadYaml<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const result = await this.yamlManager.loadConfig<T>(filePath);
    return result.success ? result.data || defaultValue : defaultValue;
  } catch (error) {
    this.logger.warn(`YAML読み込み失敗: ${filePath}`, error);
    return defaultValue;
  }
}
```

## 🔧 修正箇所一覧

### 1. yamlManager呼び出し箇所（全て修正）
- `identifyHighPerformingContent()` - 208行目
- `measurePostImpact()` - 264行目
- `trackDailyPerformance()` - 297行目
- `extractDailyInsights()` - 393行目
- `updateLearningData()` - 460行目, 475行目
- `evaluateStrategyEffectiveness()` - 613行目
- `suggestStageTransition()` - 642行目
- 他、計15箇所

### 2. 型定義の追加・修正
```typescript
// core-runner.ts互換の型定義追加
export interface AnalyzeParameters {
  target: string;
  metrics: string[];
  period: string;
}

export interface AnalysisResult {
  target: string;
  results: any;
  timestamp: string;
  success: boolean;
}
```

## 🧪 テスト要件

### 1. 基本機能テスト
```typescript
describe('PerformanceAnalyzer Fixed', () => {
  it('should analyze engagement without yamlManager', async () => {
    const analyzer = new PerformanceAnalyzer();
    const result = await analyzer.analyze({
      target: 'engagement',
      metrics: ['rate', 'growth'],
      period: 'daily'
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
  
  it('should handle missing files gracefully', async () => {
    const analyzer = new PerformanceAnalyzer();
    // ファイルが存在しない状態でのテスト
    const result = await analyzer.analyzeEngagement('daily');
    
    expect(result).toBeDefined();
    // デフォルト値での動作を確認
  });
});
```

### 2. core-runner.ts統合テスト
```typescript
describe('Core Runner Integration', () => {
  it('should work with core-runner analyze call', async () => {
    const analyzer = new PerformanceAnalyzer();
    
    // core-runner.tsと同じ呼び出し方法
    const result = await analyzer.analyze({
      target: 'engagement',
      metrics: ['rate'],
      period: 'daily'
    });
    
    expect(result).toBeDefined();
  });
});
```

## 📊 成功基準

### 機能面
- ✅ コンパイルエラーの完全解消
- ✅ core-runner.tsとの統合成功
- ✅ 全分析機能の正常動作

### 品質面
- ✅ エラーハンドリングの改善
- ✅ ログ出力の充実
- ✅ デフォルト値処理の実装

## 🔍 検証方法

### 1. コンパイル確認
```bash
# TypeScriptコンパイル確認
pnpm build

# 型チェック
pnpm typecheck
```

### 2. 実行テスト
```bash
# core-runner.tsでの実行確認
pnpm dev

# PerformanceAnalyzer単体テスト
pnpm test src/services/performance-analyzer.test.ts
```

## 📋 実装後チェックリスト

- [ ] yamlManager依存の完全解消
- [ ] YamlFileManagerクラス実装完了
- [ ] analyze()メソッド実装完了
- [ ] 全メソッドのエラーハンドリング修正完了
- [ ] 型定義の追加・統一完了
- [ ] テスト実装・実行完了
- [ ] コンパイルエラー解消確認
- [ ] core-runner.ts統合テスト完了

## 💡 注意点

### 1. データ互換性
- 既存のYAMLファイル形式との互換性維持
- デフォルト値の適切な設定
- エラー時の適切なフォールバック

### 2. パフォーマンス
- ファイル読み込みのキャッシュ化
- 不要なファイルアクセスの削減
- メモリ使用量の最適化

## 🎯 完了条件

1. **コンパイル**: TypeScriptエラーの完全解消
2. **統合**: core-runner.tsとの完全統合
3. **機能**: 全分析機能の正常動作
4. **テスト**: 全テストケースが通過
5. **安定性**: エラー処理の適切な実装

---

**緊急度**: 高 - core-runner.tsの正常動作を阻害している問題のため、最優先で修正してください。