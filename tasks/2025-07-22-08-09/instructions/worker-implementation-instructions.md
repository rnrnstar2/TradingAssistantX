# Worker実装指示書 - 真の戦略的自律システム実装

## 🎯 **実装目標**
Claude Code SDKが実際にリアルタイムデータを収集・分析し、市場状況に応じた戦略的投稿を自動生成するシステムの完成

## 🚀 **Stage 1: API認証設定（所要時間: 30分）**

### **1.1 APIキー取得**
以下のサービスで無料APIキーを取得：

```bash
# 必須APIs（無料）
1. Alpha Vantage: https://www.alphavantage.co/support/#api-key
2. CoinGecko: https://www.coingecko.com/en/api/pricing  
3. FRED: https://fred.stlouisfed.org/docs/api/api_key.html

# オプション（プレミアム品質）
4. Finnhub: https://finnhub.io/
5. FMP: https://financialmodelingprep.com/developer/docs
```

### **1.2 環境変数設定**
```bash
# プロジェクトルートに .env.local ファイル作成
touch .env.local

# 以下の内容を追加
echo "ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_VANTAGE_KEY" >> .env.local
echo "COINGECKO_API_KEY=YOUR_COINGECKO_KEY" >> .env.local  
echo "FRED_API_KEY=YOUR_FRED_KEY" >> .env.local
echo "FINNHUB_API_KEY=YOUR_FINNHUB_KEY" >> .env.local
echo "FMP_API_KEY=YOUR_FMP_KEY" >> .env.local

# 実データモード有効化
echo "REAL_DATA_MODE=true" >> .env.local
```

### **1.3 接続テスト作成**
`src/scripts/test-api-connections.ts` を作成：

```typescript
// API接続テストスクリプト
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testAPIs() {
  console.log('🧪 API接続テスト開始...');
  
  // Alpha Vantage テスト
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    console.log('✅ Alpha Vantage: 接続成功');
  } catch (error) {
    console.log('❌ Alpha Vantage: 接続失敗', error.message);
  }
  
  // CoinGecko テスト
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } }
    );
    console.log('✅ CoinGecko: 接続成功');
  } catch (error) {
    console.log('❌ CoinGecko: 接続失敗', error.message);
  }
  
  // FRED テスト
  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1`
    );
    console.log('✅ FRED: 接続成功');
  } catch (error) {
    console.log('❌ FRED: 接続失敗', error.message);
  }
}

testAPIs();
```

### **1.4 テスト実行**
```bash
# テストスクリプト実行
pnpm exec tsx src/scripts/test-api-connections.ts

# 期待結果: 全API接続成功
```

## 🔧 **Stage 2: データ収集統合（所要時間: 2-3時間）**

### **2.1 環境変数読み込み修正**

`src/lib/fx-api-collector.ts` の constructor修正：

```typescript
constructor(config?: Partial<FXAPIConfig>) {
  this.config = { ...FXAPICollector.DEFAULT_CONFIG, ...config };
  
  // 環境変数から自動読み込み
  this.config.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
  this.config.finnhubKey = process.env.FINNHUB_API_KEY; 
  this.config.fmpKey = process.env.FMP_API_KEY;
  
  // 🔧 NEW: .env.local サポート追加
  if (!this.config.alphaVantageKey || !this.config.finnhubKey || !this.config.fmpKey) {
    require('dotenv').config({ path: '.env.local' });
    this.config.alphaVantageKey = this.config.alphaVantageKey || process.env.ALPHA_VANTAGE_API_KEY;
    this.config.finnhubKey = this.config.finnhubKey || process.env.FINNHUB_API_KEY;
    this.config.fmpKey = this.config.fmpKey || process.env.FMP_API_KEY;
  }
  
  console.log('🔑 [FXAPICollector] API認証情報読み込み:', {
    alphaVantage: !!this.config.alphaVantageKey,
    finnhub: !!this.config.finnhubKey,
    fmp: !!this.config.fmpKey
  });
}
```

### **2.2 RSS収集の有効化**

`data/multi-source-config.yaml` の修正：

```yaml
# Reuters を有効化
reuters:
  enabled: true  # false から true に変更
  base_url: "https://feeds.reuters.com"
  feeds:
    - path: "/reuters/businessNews"
      category: "business"
    - path: "/reuters/technologyNews"  
      category: "technology"
  refresh_interval: 600
  timeout: 10000

# Bloomberg も有効化  
bloomberg:
  enabled: true  # 追加
  base_url: "https://feeds.bloomberg.com"
  feeds:
    - path: "/markets/news.rss"
      category: "markets"
  refresh_interval: 600
  timeout: 10000
```

### **2.3 True Autonomous Workflow の実データ統合**

`src/core/true-autonomous-workflow.ts` の修正：

```typescript
private async analyzeCurrentSituation(): Promise<IntegratedContext> {
  console.log('🧠 [Claude状況分析] 制約なしの完全状況分析を実行中...');
  
  // 🔧 NEW: 実際のデータ収集実行
  const realDataMode = process.env.REAL_DATA_MODE === 'true';
  
  if (realDataMode) {
    console.log('📊 [リアルデータモード] 外部データ収集を開始...');
    
    // 並列データ収集実行
    const collectionTasks = [
      this.collectMarketData(),
      this.collectNewsData(), 
      this.collectCommunityData(),
      this.collectEconomicData()
    ];
    
    try {
      const [marketData, newsData, communityData, economicData] = await Promise.all(collectionTasks);
      
      console.log('✅ [データ収集完了]:', {
        market: marketData.length,
        news: newsData.length, 
        community: communityData.length,
        economic: economicData.length
      });
      
      return this.buildIntegratedContext({
        marketData,
        newsData,
        communityData, 
        economicData
      });
    } catch (error) {
      console.error('❌ [データ収集エラー]:', error);
      return this.getFallbackContext();
    }
  } else {
    console.log('🧪 [テストモード] モックデータを使用');
    return this.getFallbackContext();
  }
}

// 🔧 NEW: 実際のデータ収集メソッド追加
private async collectMarketData() {
  const fxCollector = new FXAPICollector();
  return await fxCollector.collectForexRates(['USDJPY', 'EURUSD', 'GBPUSD']);
}

private async collectNewsData() {
  const rssCollector = new RssParallelCollectionEngine();
  return await rssCollector.collectFromAllSources();
}

private async collectCommunityData() {
  // Reddit/HN データ収集
  return [];  // 実装詳細は後続で
}

private async collectEconomicData() {
  const apiCollector = new APICollector();
  return await apiCollector.collectEconomicIndicators();
}
```

### **2.4 Claude SDKプロンプトの実データ統合**

`src/lib/claude-autonomous-agent.ts` の `analyzeAndDecideContentStrategy` 修正：

```typescript
async analyzeAndDecideContentStrategy(analysisData: {
  marketAnalysis: any;
  trendAnalysis: any;  
  audienceInsights: any;
  performanceHistory: any;
}): Promise<{ theme: string; content: string; actionType: string }> {
  console.log('📝 [Claude内容決定] 完全自律コンテンツ戦略を決定中...');
  
  // 🔧 NEW: 実データ存在確認とデータ品質評価
  const dataQuality = this.evaluateDataQuality(analysisData);
  console.log('📊 [データ品質評価]:', dataQuality);
  
  const contentPrompt = `
あなたはX（Twitter）投資教育コンテンツの完全自律システムです。
以下の**実際の市場データと分析**に基づいて、最適なコンテンツ戦略を自律的に決定してください。

🔴 **重要**: 以下は実際のリアルタイムデータです。必ずこのデータを活用してください。

REAL-TIME ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

DATA QUALITY SCORE: ${dataQuality.score}/100
- Market Data: ${dataQuality.market ? '✅ Available' : '❌ Missing'}  
- News Data: ${dataQuality.news ? '✅ Available' : '❌ Missing'}
- Community Trends: ${dataQuality.community ? '✅ Available' : '❌ Missing'}

MANDATORY REAL-DATA USAGE REQUIREMENTS:
🎯 **データ駆動コンテンツ**: 上記の実際のデータから具体的な数値、企業名、ニュース内容を必ず含める
🎯 **時事性重視**: 最新の市場動向、ニュース、経済指標を反映
🎯 **具体的分析**: 汎用的内容禁止、実データに基づく専門的分析必須

MANDATORY CONTENT FORMAT REQUIREMENTS:
- **ハッシュタグ必須**: 必ず3-5個のハッシュタグを含める
- **エモジ使用**: 視覚的魅力のためエモジを効果的に使用  
- **改行構造**: 読みやすい改行とセクション分け
- **具体例含有**: 実データから具体的な数値や事例を含める
- **CTA (行動喚起)**: フォロワーの行動を促す要素を含める

返答形式（JSON）:
{
  "theme": "実データに基づくテーマ",
  "content": "実際のデータを活用した具体的なコンテンツ（ハッシュタグ3-5個とエモジ含む）",
  "actionType": "original_post",
  "dataUsage": "使用した実データの詳細",
  "reasoning": "実データに基づく選択理由",
  "expectedImpact": "期待される効果"
}

**重要**: contentには実際の市場データから得た具体的情報（株価、通貨レート、企業名、ニュース内容）を必ず含めて投稿を作成してください。
`;

  // 以下既存の処理...
}

// 🔧 NEW: データ品質評価メソッド
private evaluateDataQuality(analysisData: any) {
  let score = 0;
  const quality = {
    market: false,
    news: false, 
    community: false,
    score: 0
  };
  
  if (analysisData.marketAnalysis && Object.keys(analysisData.marketAnalysis).length > 0) {
    score += 40;
    quality.market = true;
  }
  
  if (analysisData.trendAnalysis && Object.keys(analysisData.trendAnalysis).length > 0) {
    score += 30;
    quality.news = true;
  }
  
  if (analysisData.audienceInsights && Object.keys(analysisData.audienceInsights).length > 0) {
    score += 30;
    quality.community = true;
  }
  
  quality.score = score;
  return quality;
}
```

## 🧪 **Stage 3: テスト・検証（所要時間: 1時間）**

### **3.1 段階的テスト**

```bash
# Step 1: API接続テスト
pnpm exec tsx src/scripts/test-api-connections.ts

# Step 2: データ収集テスト  
REAL_DATA_MODE=true TEST_MODE=true pnpm run test:data-collection

# Step 3: 統合テスト（投稿はしない）
REAL_DATA_MODE=true TEST_MODE=true pnpm dev

# Step 4: 実投稿テスト（慎重に）
REAL_DATA_MODE=true pnpm dev
```

### **3.2 期待される結果**

**テスト前（現在）:**
```
"📈 投資の基本原則：時間を味方につけよう ⏰"
```

**テスト後（期待）:**
```
🚨 【速報】Apple (AAPL) 決算発表
Q4売上: $1,234億（前年同期比+8.2%）

📊 市場反応:
• 株価: $180.50 → $185.20 (+2.6%)
• 時間外取引: +3.1%の上昇
• アナリスト目標: $195（強気評価）

💡 投資家への示唆:
iPhoneサイクル回復でハードウェア部門復調
サービス事業の安定成長も確認

次の注目点は中国市場の回復度 📱

#Apple #決算 #AAPL #テック株 #投資判断
```

## 📈 **Stage 4: 最適化・監視設定（所要時間: 1時間）**

### **4.1 パフォーマンス監視追加**

`src/lib/performance-monitor.ts` を新規作成：

```typescript
export class PerformanceMonitor {
  private metrics = {
    dataCollectionSuccess: 0,
    dataCollectionTotal: 0,
    apiResponseTime: [] as number[],
    contentGenerationTime: [] as number[],
    realDataUsage: 0
  };
  
  recordDataCollection(success: boolean, responseTime: number) {
    this.metrics.dataCollectionTotal++;
    if (success) this.metrics.dataCollectionSuccess++;
    this.metrics.apiResponseTime.push(responseTime);
  }
  
  recordContentGeneration(time: number, usedRealData: boolean) {
    this.metrics.contentGenerationTime.push(time);
    if (usedRealData) this.metrics.realDataUsage++;
  }
  
  getReport() {
    return {
      dataSuccess: (this.metrics.dataCollectionSuccess / this.metrics.dataCollectionTotal * 100).toFixed(1) + '%',
      avgResponseTime: (this.metrics.apiResponseTime.reduce((a, b) => a + b, 0) / this.metrics.apiResponseTime.length).toFixed(0) + 'ms',
      realDataUsage: (this.metrics.realDataUsage / this.metrics.contentGenerationTime.length * 100).toFixed(1) + '%'
    };
  }
}
```

### **4.2 自動フォールバック機能**

API失敗時の自動切り替え、レート制限対応の強化。

## ✅ **完了確認チェックリスト**

- [ ] APIキー取得・設定完了
- [ ] API接続テスト全て成功  
- [ ] 実データ収集機能動作確認
- [ ] 生成投稿に実データ反映確認
- [ ] パフォーマンス監視動作確認

## 🎯 **最終目標達成確認**

完成後のシステムは以下を満たす：
1. **実データ収集**: 複数ソースからリアルタイムデータ取得
2. **Claude自律分析**: 収集データの自動分析・戦略決定  
3. **時事性コンテンツ**: 最新市場情報を反映した投稿生成
4. **高エンゲージメント**: データ駆動による魅力的コンテンツ

**実装完了後**: 真の戦略的自律システムとして完全機能！