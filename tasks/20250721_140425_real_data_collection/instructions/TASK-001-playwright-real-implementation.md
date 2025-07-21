# TASK-001: Playwright実データ収集実装

## 🎯 実装目標

**現在の問題**: `EnhancedInfoCollector`がMockDataのみ返している  
**解決目標**: 実際のX.comからPlaywrightでリアルデータ収集  
**緊急度**: 高（実運用のため必須）

## 📋 実装要件

### 1. X_TEST_MODE対応実装

```typescript
// src/lib/enhanced-info-collector.ts に追加
export class EnhancedInfoCollector {
  private targets: CollectionTarget[] = [];
  private testMode: boolean;

  constructor() {
    this.testMode = process.env.X_TEST_MODE === 'true';
    this.initializeTargets();
  }

  private async collectTrendInformation(): Promise<CollectionResult[]> {
    console.log('📈 [トレンド収集] X.comトレンド情報を収集中...');
    
    if (this.testMode) {
      console.log('🧪 [TEST MODE] Mockデータを使用');
      return this.getMockTrendData();
    }
    
    console.log('🌐 [REAL MODE] Playwrightで実データ収集');
    return this.collectRealTrendData();
  }
}
```

### 2. Playwright実装メソッド

**実装必須メソッド**:

#### A. `collectRealTrendData()`: X.com/explore からトレンド収集
```typescript
private async collectRealTrendData(): Promise<CollectionResult[]> {
  try {
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // X.com/explore にアクセス
    await page.goto('https://x.com/explore', { waitUntil: 'networkidle' });
    
    // トレンド情報をスクレイピング
    const trends = await page.evaluate(() => {
      // DOM操作でトレンド情報取得
      const trendElements = document.querySelectorAll('[data-testid="trend"]');
      return Array.from(trendElements).map(el => ({
        text: el.textContent || '',
        engagement: Math.floor(Math.random() * 1000) + 100
      }));
    });
    
    await browser.close();
    
    // CollectionResult形式に変換
    return trends.slice(0, 5).map((trend, index) => ({
      id: `real-trend-${Date.now()}-${index}`,
      type: 'trend',
      content: trend.text,
      source: 'x.com/explore',
      relevanceScore: this.calculateRelevanceScore(trend.text),
      timestamp: Date.now(),
      metadata: {
        engagement: trend.engagement,
        hashtags: this.extractHashtags(trend.text)
      }
    }));
    
  } catch (error) {
    console.error('❌ Real trend collection failed:', error);
    console.log('🔄 Falling back to mock data');
    return this.getMockTrendData();
  }
}
```

#### B. `collectRealCompetitorData()`: 競合アカウント投稿分析
```typescript
private async collectRealCompetitorData(): Promise<CollectionResult[]> {
  try {
    const competitorAccounts = ['@investment_guru', '@fx_master', '@crypto_analyst'];
    const results: CollectionResult[] = [];
    
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    
    for (const account of competitorAccounts.slice(0, 2)) { // 制限
      const page = await browser.newPage();
      
      try {
        await page.goto(`https://x.com/${account.substring(1)}`, { waitUntil: 'networkidle' });
        
        // 最新の投稿を取得
        const posts = await page.evaluate(() => {
          const postElements = document.querySelectorAll('[data-testid="tweetText"]');
          return Array.from(postElements).slice(0, 3).map(el => el.textContent || '');
        });
        
        posts.forEach((post, index) => {
          if (post.length > 20) { // 意味のある投稿のみ
            results.push({
              id: `real-competitor-${Date.now()}-${index}`,
              type: 'competitor',
              content: post,
              source: `competitor_${account}`,
              relevanceScore: this.calculateRelevanceScore(post),
              timestamp: Date.now(),
              metadata: {
                engagement: Math.floor(Math.random() * 500) + 50,
                author: account,
                hashtags: this.extractHashtags(post)
              }
            });
          }
        });
        
      } catch (pageError) {
        console.error(`❌ Failed to collect from ${account}:`, pageError);
      } finally {
        await page.close();
      }
    }
    
    await browser.close();
    return results.slice(0, 6); // 最大6件
    
  } catch (error) {
    console.error('❌ Real competitor collection failed:', error);
    return this.getMockCompetitorData();
  }
}
```

#### C. `collectRealMarketNews()`: 市場ニュース収集
```typescript
private async collectRealMarketNews(): Promise<CollectionResult[]> {
  try {
    const searchTerms = ['日銀', '金利政策', 'NYダウ', '株価', '為替'];
    const results: CollectionResult[] = [];
    
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        await page.goto(`https://x.com/search?q=${encodeURIComponent(term)}&f=live`, { waitUntil: 'networkidle' });
        
        const newsItems = await page.evaluate(() => {
          const tweetElements = document.querySelectorAll('[data-testid="tweetText"]');
          return Array.from(tweetElements).slice(0, 2).map(el => el.textContent || '');
        });
        
        newsItems.forEach((item, index) => {
          if (item.length > 30) {
            results.push({
              id: `real-news-${Date.now()}-${index}`,
              type: 'news',
              content: item,
              source: 'x.com/search',
              relevanceScore: this.calculateRelevanceScore(item),
              timestamp: Date.now(),
              metadata: {
                engagement: Math.floor(Math.random() * 800) + 100,
                hashtags: this.extractHashtags(item),
                searchTerm: term
              }
            });
          }
        });
        
        await this.sleep(2000); // レート制限対策
      } catch (termError) {
        console.error(`❌ Failed to search for ${term}:`, termError);
      }
    }
    
    await browser.close();
    return results.slice(0, 6);
    
  } catch (error) {
    console.error('❌ Real news collection failed:', error);
    return this.getMockNewsData();
  }
}
```

#### D. `collectRealHashtagData()`: ハッシュタグ活動分析
```typescript
private async collectRealHashtagData(): Promise<CollectionResult[]> {
  try {
    const hashtags = ['#投資', '#FX', '#株式投資', '#資産運用'];
    const results: CollectionResult[] = [];
    
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    for (const hashtag of hashtags.slice(0, 2)) {
      try {
        await page.goto(`https://x.com/hashtag/${hashtag.substring(1)}`, { waitUntil: 'networkidle' });
        
        const hashtagActivity = await page.evaluate(() => {
          const elements = document.querySelectorAll('[data-testid="tweetText"]');
          return Array.from(elements).slice(0, 2).map(el => el.textContent || '');
        });
        
        if (hashtagActivity.length > 0) {
          results.push({
            id: `real-hashtag-${Date.now()}-${hashtag}`,
            type: 'hashtag',
            content: `${hashtag} タグで活発な議論: ${hashtagActivity[0]}`,
            source: 'hashtag_analysis',
            relevanceScore: this.calculateRelevanceScore(hashtagActivity[0]),
            timestamp: Date.now(),
            metadata: {
              engagement: Math.floor(Math.random() * 400) + 100,
              hashtags: [hashtag],
              activityLevel: hashtagActivity.length
            }
          });
        }
        
        await this.sleep(2000);
      } catch (hashtagError) {
        console.error(`❌ Failed to analyze ${hashtag}:`, hashtagError);
      }
    }
    
    await browser.close();
    return results;
    
  } catch (error) {
    console.error('❌ Real hashtag collection failed:', error);
    return this.getMockHashtagData();
  }
}
```

### 3. ヘルパーメソッド実装

```typescript
// ヘルパーメソッド群
private calculateRelevanceScore(content: string): number {
  const investmentKeywords = ['投資', 'トレード', 'FX', '株式', '仮想通貨', '金融', '資産運用', '市場', '経済'];
  const score = investmentKeywords.reduce((acc, keyword) => {
    return acc + (content.includes(keyword) ? 0.1 : 0);
  }, 0.5);
  return Math.min(score, 1.0);
}

private extractHashtags(content: string): string[] {
  const hashtagRegex = /#[\w\u3042-\u3096\u30A1-\u30FC\u4E00-\u9FAF]+/g;
  return content.match(hashtagRegex) || [];
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 既存のMockメソッドをprivateに変更
private getMockTrendData(): CollectionResult[] {
  // 既存のmockTrendDataをreturn
}

private getMockCompetitorData(): CollectionResult[] {
  // 既存のmockCompetitorDataをreturn  
}

private getMockNewsData(): CollectionResult[] {
  // 既存のmockNewsDataをreturn
}

private getMockHashtagData(): CollectionResult[] {
  // 既存のmockHashtagDataをreturn
}
```

### 4. 他の既存メソッド更新

**同様に他の収集メソッドも更新**:
```typescript
private async collectCompetitorContent(): Promise<CollectionResult[]> {
  if (this.testMode) {
    return this.getMockCompetitorData();
  }
  return this.collectRealCompetitorData();
}

private async collectMarketNews(): Promise<CollectionResult[]> {
  if (this.testMode) {
    return this.getMockNewsData();
  }
  return this.collectRealMarketNews();
}

private async collectHashtagActivity(): Promise<CollectionResult[]> {
  if (this.testMode) {
    return this.getMockHashtagData();
  }
  return this.collectRealHashtagData();
}
```

## 🔧 技術要件

### パフォーマンス制約
- **制限時間**: 90秒以内で全収集完了
- **並列実行**: Promise.allで4つのメソッド同時実行
- **レート制限**: 各リクエスト間に2秒待機

### エラーハンドリング
- 個別メソッド失敗時はMockデータにフォールバック
- ネットワークエラー、タイムアウト対応
- ログ出力による失敗原因追跡

### セキュリティ対策
- headless: true でブラウザ起動
- User-Agent設定（必要に応じて）
- 過度なリクエスト防止

## ⚠️ 注意事項

1. **X.com利用規約遵守**: 過度なスクレイピング禁止
2. **レート制限**: 適切な間隔でリクエスト
3. **フォールバック必須**: 実データ取得失敗時のMock対応
4. **ログ出力**: デバッグ可能な詳細ログ

## ✅ 完了条件

1. **実装完了**: 全4つのcollectメソッドPlaywright実装
2. **動作確認**: `X_TEST_MODE=false`で実データ収集動作
3. **フォールバック確認**: エラー時のMock切り替え動作
4. **パフォーマンス**: 90秒以内完了確認
5. **品質確認**: TypeScript型チェック通過

**完了後の確認方法**:
```bash
# .envでX_TEST_MODE=falseを確認
cat .env | grep X_TEST_MODE

# 実行して実データ収集を確認
pnpm dev

# ログで「REAL MODE」が表示されることを確認
```

## 📝 実装ファイル

**対象ファイル**: `src/lib/enhanced-info-collector.ts`  
**影響範囲**: 新機能追加のみ（既存Mock機能は保持）  
**テスト**: 既存の統合テストは動作継続

---

**実装完了後**: `pnpm dev`で実際のX.comデータ収集開始！