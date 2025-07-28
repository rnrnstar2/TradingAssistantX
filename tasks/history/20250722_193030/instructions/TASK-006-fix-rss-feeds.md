# Task: RSS CollectorのRSSフィード修正

## 概要
REQUIREMENTS.mdの方針に従い、RSS Collectorのみを使用するMVP構成を実現するため、動作しないRSSフィードを修正します。

## 背景
- Yahoo Finance RSS: 400エラー（アクセス制限）
- MarketWatch RSS: データ構造の問題
- MVP方針: RSS Collectorのみで投資教育コンテンツを収集

## 修正内容

### 1. RSS Collectorのデフォルトソース更新 (`src/collectors/base/rss-collector.ts`)

getDefaultSources()メソッドを以下のように修正：

```typescript
public static getDefaultSources(): RSSSource[] {
  return [
    {
      name: 'Financial Times',
      url: 'https://www.ft.com/rss/home',
      provider: 'ft',
      enabled: true,
      timeout: 10000,
      maxItems: 20,
      categories: ['finance', 'markets', 'business']
    },
    {
      name: 'Bloomberg Markets',
      url: 'https://feeds.bloomberg.com/markets/news.rss',
      provider: 'bloomberg',
      enabled: true,
      timeout: 10000,
      maxItems: 20,
      categories: ['finance', 'stocks', 'markets']
    },
    {
      name: 'CNBC Top News',
      url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      provider: 'cnbc',
      enabled: true,
      timeout: 10000,
      maxItems: 20,
      categories: ['finance', 'business', 'markets']
    },
    {
      name: 'WSJ Markets',
      url: 'https://feeds.wsj.com/xml/rss/3_7031.xml',
      provider: 'wsj',
      enabled: true,
      timeout: 10000,
      maxItems: 15,
      categories: ['finance', 'stocks', 'markets']
    },
    {
      name: 'Investing.com',
      url: 'https://www.investing.com/rss/news_1.rss',
      provider: 'investing',
      enabled: true,
      timeout: 10000,
      maxItems: 20,
      categories: ['finance', 'forex', 'crypto']
    }
  ];
}
```

### 2. データ構造の修正

現在のMultiSourceCollectionResultインターフェースの構造に合わせて、RSSパース結果を正しくマップするよう修正：

```typescript
// collectFromSource内のマッピング処理
const results: MultiSourceCollectionResult[] = feed.items
  .slice(0, source.maxItems || 20)
  .map((item, index) => {
    const timestamp = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
    
    return {
      source: 'rss' as const,
      provider: source.provider as DataProvider,
      title: item.title || 'No title',
      link: item.link || '',
      summary: item.contentSnippet || item.content || '',
      content: {
        title: item.title || 'No title',
        link: item.link || '',
        description: item.contentSnippet || item.content || '',
        additionalInfo: {
          categories: item.categories || source.categories || [],
          author: item.creator || 'Unknown',
          guid: item.guid || `${source.name}-${timestamp}-${index}`
        }
      },
      timestamp,
      relevanceScore: this.calculateRelevanceScore(item),
      metadata: {
        sourceName: source.name,
        categories: source.categories || []
      }
    };
  });
```

### 3. テスト実行用スクリプトの作成

`tasks/20250722_193030/test-rss-fixed.ts`:

```typescript
import { RSSCollector } from '../../src/collectors/base/rss-collector.js';

async function testFixedRSS() {
  const config = {
    sources: RSSCollector.getDefaultSources(),
    timeout: 15000,
    maxConcurrency: 2,
    cacheTimeout: 300
  };

  const collector = new RSSCollector(config);
  
  console.log('🚀 修正版RSS Collectorテスト開始...\n');
  
  try {
    const result = await collector.collectFromRSS();
    
    console.log(`✅ 取得成功！`);
    console.log(`📊 取得記事数: ${result.data.length}`);
    console.log(`⏱️  所要時間: ${result.metadata.responseTime}ms`);
    console.log(`📰 有効なソース: ${result.data.map(d => d.metadata?.sourceName).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')}\n`);
    
    // 最初の5件を表示
    console.log('📋 最新記事（上位5件）:');
    result.data.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   📰 ${item.metadata?.sourceName || 'Unknown'}`);
      console.log(`   📅 ${new Date(item.timestamp).toLocaleString()}`);
      console.log(`   🔗 ${item.link}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testFixedRSS();
```

## 実装手順

1. RSS Collectorのソース定義を上記の新しいRSSフィードに更新
2. データマッピングのロジックを修正
3. テストスクリプトを実行して動作確認
4. 成功したRSSフィードのみを有効化

## 品質基準
- 少なくとも3つ以上のRSSフィードから正常にデータ取得できること
- データ構造が正しくマップされていること
- エラーが発生してもクラッシュしないこと

## 注意事項
- 各RSSフィードのレート制限に注意
- CORS制限がある場合はサーバーサイドで実行
- 一部のフィードは認証が必要な場合があるため、動作しないものは無効化

## 将来の改善
- より多くの金融メディアRSSフィードの追加
- フィードの健全性チェック機能
- フォールバック機構の実装