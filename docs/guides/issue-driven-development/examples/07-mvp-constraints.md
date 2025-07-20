# 実例7: MVP制約下での実装

## 📋 背景

アービトラージアシスタントで価格監視機能を実装する際、MVP制約に従って必要最小限の機能に絞り込んで開発しました。

## 🎯 イシュー内容

### Issue #312: リアルタイム価格監視機能

```markdown
## タスク概要
複数取引所の価格をリアルタイムで監視し、アービトラージ機会を検出する機能。

## MVP制約
### 実装する機能
- 基本的な価格取得（WebSocket）
- シンプルな価格差計算
- 基本的な通知機能

### 実装しない機能
- 複雑な統計分析（Z-score、ボリンジャーバンド等）
- 高度なエラーハンドリング（自動再接続、リトライ）
- 詳細なパフォーマンス最適化
- プラグイン機構

## 影響を受けるファイル
- packages/backend/src/services/price-monitor.ts
- packages/backend/src/types/market.ts
- apps/web/app/monitor/page.tsx
```

## 🚀 実装過程

### 1. 最初の設計（過剰）

```typescript
// ❌ MVP違反: 統計分析機能を含む複雑な設計
interface PriceAnalysis {
  price: number;
  volume: number;
  zScore: number;           // 不要
  movingAverage: number;    // 不要
  standardDeviation: number; // 不要
  bollinger: {              // 不要
    upper: number;
    lower: number;
  };
}
```

### 2. MVP準拠の設計

```typescript
// ✅ MVP準拠: 必要最小限のデータ構造
interface MarketPrice {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

interface ArbitrageOpportunity {
  buyExchange: string;
  sellExchange: string;
  profit: number;
  profitPercent: number;
}
```

### 3. シンプルな価格監視サービス

```typescript
// packages/backend/src/services/price-monitor.ts
export class PriceMonitorService {
  private prices: Map<string, MarketPrice> = new Map();

  // シンプルな価格更新
  updatePrice(exchange: string, data: MarketPrice) {
    const key = `${exchange}:${data.symbol}`;
    this.prices.set(key, data);
    this.checkArbitrage(data.symbol);
  }

  // 基本的なアービトラージチェック
  private checkArbitrage(symbol: string) {
    const exchangePrices = this.getPricesForSymbol(symbol);
    
    if (exchangePrices.length < 2) return;

    // シンプルな価格差計算
    for (let i = 0; i < exchangePrices.length; i++) {
      for (let j = i + 1; j < exchangePrices.length; j++) {
        const buyPrice = exchangePrices[i];
        const sellPrice = exchangePrices[j];

        // 買値と売値の差を計算
        const profit1 = sellPrice.bid - buyPrice.ask;
        const profit2 = buyPrice.bid - sellPrice.ask;

        if (profit1 > 0) {
          this.notifyOpportunity({
            buyExchange: buyPrice.exchange,
            sellExchange: sellPrice.exchange,
            profit: profit1,
            profitPercent: (profit1 / buyPrice.ask) * 100,
          });
        }

        if (profit2 > 0) {
          this.notifyOpportunity({
            buyExchange: sellPrice.exchange,
            sellExchange: buyPrice.exchange,
            profit: profit2,
            profitPercent: (profit2 / sellPrice.ask) * 100,
          });
        }
      }
    }
  }

  // シンプルな通知
  private notifyOpportunity(opportunity: ArbitrageOpportunity) {
    if (opportunity.profitPercent > 0.1) { // 0.1%以上の利益
      console.log('Arbitrage opportunity:', opportunity);
      // EventEmitterで通知
      this.emit('opportunity', opportunity);
    }
  }
}
```

### 4. 基本的なWebSocket接続

```typescript
// packages/backend/src/connectors/basic-websocket.ts
export class BasicWebSocketConnector {
  private ws: WebSocket | null = null;

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.handleMessage(parsed);
      } catch (error) {
        console.error('Parse error:', error);
        // MVP: 複雑なエラーハンドリングはしない
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      // MVP: 自動再接続は実装しない
    });
  }

  private handleMessage(data: any) {
    // 最小限のデータ変換
    if (data.type === 'ticker') {
      this.emit('price', {
        exchange: this.exchange,
        symbol: data.symbol,
        bid: parseFloat(data.bid),
        ask: parseFloat(data.ask),
        timestamp: Date.now(),
      });
    }
  }
}
```

### 5. シンプルなUI実装

```tsx
// apps/web/app/monitor/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { MarketPrice, ArbitrageOpportunity } from '@/types';

export default function MonitorPage() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);

  // MVP: 基本的な表示のみ
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">価格監視</h1>
      
      {/* 現在の価格 */}
      <div className="mb-8">
        <h2 className="text-xl mb-2">現在の価格</h2>
        <table className="w-full border">
          <thead>
            <tr>
              <th>取引所</th>
              <th>買値</th>
              <th>売値</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => (
              <tr key={`${price.exchange}-${price.symbol}`}>
                <td>{price.exchange}</td>
                <td>{price.bid}</td>
                <td>{price.ask}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* アービトラージ機会 */}
      <div>
        <h2 className="text-xl mb-2">アービトラージ機会</h2>
        {opportunities.length === 0 ? (
          <p>現在、機会はありません</p>
        ) : (
          <ul>
            {opportunities.map((opp, idx) => (
              <li key={idx} className="mb-2 p-2 bg-green-100 rounded">
                {opp.buyExchange} → {opp.sellExchange}: 
                {opp.profitPercent.toFixed(2)}%
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

## ❌ 実装を避けた機能

### 1. 統計分析
```typescript
// 実装しない: 複雑な統計計算
class StatisticalAnalyzer {
  calculateZScore(prices: number[]): number { /* ... */ }
  calculateBollinger(prices: number[]): BollingerBands { /* ... */ }
  predictTrend(history: PriceHistory[]): Prediction { /* ... */ }
}
```

### 2. 高度なエラーハンドリング
```typescript
// 実装しない: 複雑な再接続ロジック
class ReconnectionManager {
  private retryCount = 0;
  private backoffStrategy: BackoffStrategy;
  
  async reconnectWithBackoff() { /* ... */ }
  handleConnectionFailure() { /* ... */ }
}
```

### 3. プラグインシステム
```typescript
// 実装しない: 拡張可能なアーキテクチャ
interface PriceAnalysisPlugin {
  name: string;
  analyze(prices: MarketPrice[]): AnalysisResult;
  configure(options: PluginOptions): void;
}
```

## ✅ 結果

### 実装内容
- 基本的な価格取得: 200行
- シンプルな差額計算: 50行
- 最小限のUI: 100行
- **合計: 約350行**

### 実装しなかった場合の推定
- 統計分析機能: +500行
- 高度なエラーハンドリング: +300行
- プラグインシステム: +400行
- **節約: 約1200行**

## 💡 学び

### MVP成功のポイント

1. **明確な境界線**
   - 必要な機能: 価格取得、差額計算、表示
   - 不要な機能: 統計、予測、高度な分析

2. **シンプルなデータ構造**
   - 最小限のフィールドのみ
   - 複雑な計算結果は保持しない

3. **基本的なエラー処理**
   - ログ出力のみ
   - 自動回復は考えない

### 将来の拡張性

```typescript
// 将来的に必要になったら追加
interface EnhancedMarketPrice extends MarketPrice {
  volume?: number;
  // 他のフィールドは必要時に追加
}
```

### チームへの影響
- 開発期間: 5日 → 2日に短縮
- デバッグ時間: 大幅に削減
- 理解しやすさ: 新メンバーも即理解可能

## 📝 まとめ

MVP制約を守ることで：
- **開発速度** が3倍向上
- **品質** が向上（シンプル = バグが少ない）
- **保守性** が向上（理解しやすい）
- **価値提供** が早まる（ユーザーが早く使える）