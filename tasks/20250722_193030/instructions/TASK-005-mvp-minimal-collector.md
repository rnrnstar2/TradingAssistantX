# Task: MVP用最小限Collector実装

## 概要
既存の複雑なCollectorを使わず、最もシンプルな形でネットからデータを取得する最小実装を作成します。

## 実装方針
既存のcollectorは高機能すぎるため、MVP用に新しい超軽量collectorを作成します。

## 新規ファイル作成

### 1. MVP Collector (`src/collectors/mvp-collector.ts`)

```typescript
export interface MVPData {
  id: string;
  title: string;
  link: string;
  timestamp: Date;
  source: 'coingecko' | 'reddit';
  data: any;
}

export class MVPCollector {
  async collectFromCoinGecko(): Promise<MVPData[]> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5'
      );
      const coins = await response.json();
      
      return coins.map((coin: any) => ({
        id: coin.id,
        title: `${coin.name} - $${coin.current_price}`,
        link: `https://www.coingecko.com/en/coins/${coin.id}`,
        timestamp: new Date(),
        source: 'coingecko',
        data: {
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          marketCap: coin.market_cap
        }
      }));
    } catch (error) {
      console.error('CoinGecko API error:', error);
      return [];
    }
  }

  async collectFromReddit(): Promise<MVPData[]> {
    try {
      const response = await fetch(
        'https://www.reddit.com/r/investing/hot.json?limit=5'
      );
      const data = await response.json();
      
      return data.data.children.map((post: any) => ({
        id: post.data.id,
        title: post.data.title,
        link: `https://www.reddit.com${post.data.permalink}`,
        timestamp: new Date(post.data.created_utc * 1000),
        source: 'reddit',
        data: {
          score: post.data.score,
          comments: post.data.num_comments,
          author: post.data.author
        }
      }));
    } catch (error) {
      console.error('Reddit API error:', error);
      return [];
    }
  }

  async collectAll(): Promise<MVPData[]> {
    const [coingecko, reddit] = await Promise.all([
      this.collectFromCoinGecko(),
      this.collectFromReddit()
    ]);
    
    return [...coingecko, ...reddit].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
}
```

### 2. MVP実行スクリプト (`src/scripts/mvp-runner.ts`)

```typescript
import { MVPCollector } from '../collectors/mvp-collector.js';

async function runMVP() {
  console.log('🚀 MVP Data Collection Starting...\n');
  
  const collector = new MVPCollector();
  const data = await collector.collectAll();
  
  console.log(`✅ 取得完了: ${data.length}件のデータ\n`);
  
  data.forEach((item, index) => {
    console.log(`${index + 1}. [${item.source.toUpperCase()}] ${item.title}`);
    console.log(`   🔗 ${item.link}`);
    console.log(`   📅 ${item.timestamp.toLocaleString()}\n`);
  });
  
  // 簡単な分析
  const cryptoData = data.filter(d => d.source === 'coingecko');
  const redditData = data.filter(d => d.source === 'reddit');
  
  console.log('📊 サマリー:');
  console.log(`- 暗号通貨データ: ${cryptoData.length}件`);
  console.log(`- Redditディスカッション: ${redditData.length}件`);
}

runMVP().catch(console.error);
```

### 3. package.jsonにスクリプト追加

```json
"scripts": {
  "mvp": "tsx src/scripts/mvp-runner.ts"
}
```

## 実装手順

1. 上記の2つのファイルを作成
2. package.jsonにmvpスクリプトを追加
3. 実行: `pnpm mvp`

## 品質基準
- エラーが発生してもクラッシュしない
- 少なくとも1つのソースからデータが取得できる
- データが正しく表示される

## 利点
- 外部ライブラリ依存なし（fetch APIのみ）
- 認証不要
- 100行以下のシンプルな実装
- すぐに動作確認可能

## 将来の拡張
- データベース保存
- より多くのデータソース追加
- キャッシュ機能
- エラーハンドリング強化