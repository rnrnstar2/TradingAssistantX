# トラブルシューティング・問題解決ガイド

## 🎯 **目的**
実装・運用中に発生する可能性のある問題を迅速に特定・解決し、システムの安定稼働を確保する

## 📋 **問題カテゴリ別索引**

### **🔧 [環境・設定問題](#環境設定問題)**
### **🔗 [API接続問題](#api接続問題)**  
### **📊 [データ収集問題](#データ収集問題)**
### **🧠 [Claude SDK問題](#claude-sdk問題)**
### **📝 [投稿生成・品質問題](#投稿品質問題)**
### **⚡ [パフォーマンス問題](#パフォーマンス問題)**
### **🚨 [緊急事態対応](#緊急事態対応)**

---

## 🔧 **環境・設定問題**

### **問題1: 環境変数が読み込まれない**

#### **症状**:
```bash
❌ [FXAPICollector] ALPHA_VANTAGE_API_KEY が設定されていません
Alpha Vantage: false
CoinGecko: false
```

#### **原因と解決策**:

**原因A: .env.local ファイルの問題**
```bash
# 確認方法
ls -la .env.local
cat .env.local

# 解決策
chmod 600 .env.local  # 権限修正
# ファイル内容に余分なスペース・改行がないか確認
```

**原因B: ファイルパスの問題**
```bash
# 確認方法
pwd  # プロジェクトルートにいるか確認

# 解決策  
cd /Users/rnrnstar/github/TradingAssistantX  # プロジェクトルートに移動
```

**原因C: 環境変数の形式問題**
```bash
# 正しい形式
ALPHA_VANTAGE_API_KEY=ABC123XYZ789

# ❌ 間違った形式
ALPHA_VANTAGE_API_KEY = ABC123XYZ789  # スペースあり
ALPHA_VANTAGE_API_KEY="ABC123XYZ789"  # クォート不要
```

---

### **問題2: TypeScript/Node.js実行エラー**

#### **症状**:
```bash
Error: Cannot find module '../lib/fx-api-collector.js'
SyntaxError: Unexpected token 'import'
```

#### **解決策**:

**ES Modules問題の解決**:
```typescript
// ❌ 問題のあるimport
import { FXAPICollector } from '../lib/fx-api-collector.js';

// ✅ 修正されたimport
import { FXAPICollector } from '../lib/fx-api-collector';
```

**Dynamic Import使用**:
```typescript
// require()エラーの場合
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  // ES Modulesの場合はdynamic importを使用
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
}
```

---

### **問題3: パッケージ依存関係問題**

#### **症状**:
```bash
Error: Cannot resolve dependency 'dotenv'
Module not found: Can't resolve 'axios'
```

#### **解決策**:
```bash
# 依存関係を再インストール
pnpm install

# 特定パッケージの追加
pnpm add dotenv axios

# キャッシュクリア
pnpm store prune
rm -rf node_modules
pnpm install
```

---

## 🔗 **API接続問題**

### **問題1: Alpha Vantage API接続失敗**

#### **症状**:
```bash
❌ Alpha Vantage: 接続失敗: Request failed with status code 403
❌ Alpha Vantage: 接続失敗: Request failed with status code 429
```

#### **解決策**:

**403 Forbidden (認証問題)**:
```bash
# APIキーの確認
echo $ALPHA_VANTAGE_API_KEY

# 手動テスト
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_API_KEY"

# 対処法
1. Alpha VantageダッシュボードでAPIキーの有効性確認
2. APIキーの再生成
3. .env.localファイルの更新
```

**429 Too Many Requests (レート制限)**:
```bash
# 対処法
1. 5-10分待機後に再実行
2. APIキーのプランを確認（無料プランは5 req/min、500 req/day）
3. プレミアムプランへのアップグレード検討
```

---

### **問題2: CoinGecko API接続失敗**

#### **症状**:
```bash
❌ CoinGecko: 接続失敗: Request failed with status code 429
```

#### **解決策**:
```bash
# レート制限の確認
# 無料プラン: 30 requests/分

# 手動テスト
curl -H "x-cg-demo-api-key: YOUR_API_KEY" "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

# 対処法
1. 1-2分待機後に再試行
2. API使用量をCoinGeckoダッシュボードで確認
3. より高いプランへの移行検討
```

---

### **問題3: FRED API接続失敗**

#### **症状**:
```bash
❌ FRED: 接続失敗: Request failed with status code 400
❌ FRED: データが取得できません
```

#### **解決策**:
```bash
# APIキー確認
curl "https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=YOUR_API_KEY&file_type=json&limit=1"

# 対処法
1. FRED APIキーの再確認・再生成
2. series_idの正確性確認（GDP、UNRATE、CPIAUCSL等）
3. APIレスポンス形式の確認
```

---

## 📊 **データ収集問題**

### **問題1: データ収集完了だが件数ゼロ**

#### **症状**:
```bash
✅ [データ収集完了]: { market: 0, news: 0, community: 0, economic: 0 }
📊 [データ品質評価]: { score: 0, market: false, news: false }
```

#### **解決策**:

**市場データ収集の問題**:
```bash
# デバッグ実行
DEBUG_API=true REAL_DATA_MODE=true TEST_MODE=true pnpm dev

# 個別テスト
node -e "
const { FXAPICollector } = require('./src/lib/fx-api-collector.js');
require('dotenv').config({path: '.env.local'});
const collector = new FXAPICollector();
collector.collectForexRates(['USDJPY']).then(console.log).catch(console.error);
"
```

**RSS収集の問題**:
```bash
# RSS URLの手動確認
curl -I "https://finance.yahoo.com/rss/topstories"
curl -I "https://feeds.reuters.com/reuters/businessNews"

# 対処法
1. RSS URLの有効性確認
2. User-Agentヘッダーの追加
3. タイムアウト時間の延長
```

---

### **問題2: 部分的なデータ収集失敗**

#### **症状**:
```bash
✅ [データ収集完了]: { market: 3, news: 0, community: 5, economic: 0 }
📊 [データ品質評価]: { score: 55, economic: false }
```

#### **解決策**:
```bash
# 失敗したデータソースの個別調査
# 経済データの場合
node -e "
const axios = require('axios');
require('dotenv').config({path: '.env.local'});

async function testFRED() {
  try {
    const response = await axios.get(
      \`https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=\${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc\`
    );
    console.log('✅ FRED Success:', response.data.observations?.[0]);
  } catch (error) {
    console.error('❌ FRED Error:', error.response?.status, error.message);
  }
}
testFRED();
"
```

---

### **問題3: データ形式・品質問題**

#### **症状**:
```bash
✅ [データ収集完了]: { market: 5, news: 8, community: 3, economic: 2 }
❌ 投稿内容: "投資の基本原則：時間を味方につけよう..."  # 実データが反映されていない
```

#### **解決策**:
```bash
# データ構造の確認
node -e "
// 収集データの詳細確認
console.log('=== 市場データ詳細 ===');
// データ収集メソッドを個別実行してデータ構造を確認
"

# データ統合の確認
node -e "
// buildIntegratedContext メソッドのテスト実行
// Claude SDKに渡されるデータの確認
"
```

---

## 🧠 **Claude SDK問題**

### **問題1: Claude SDKレスポンス解析失敗**

#### **症状**:
```bash
❌ [Claude戦略決定エラー]: SyntaxError: Unexpected token in JSON
❌ [Claude実行計画エラー]: Cannot parse response
```

#### **解決策**:
```typescript
// JSON解析の強化
const jsonMatch = response.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  try {
    const parsedData = JSON.parse(jsonMatch[0]);
    return parsedData;
  } catch (parseError) {
    console.error('JSON解析エラー:', parseError);
    console.log('Raw response:', response.slice(0, 500));
    return this.createFallbackResponse();
  }
} else {
  console.warn('JSON形式のレスポンスが見つかりません');
  console.log('Response preview:', response.slice(0, 200));
  return this.createFallbackResponse();
}
```

---

### **問題2: Claude SDKタイムアウト**

#### **症状**:
```bash
❌ [Claude戦略決定エラー]: timeout of 8000ms exceeded
```

#### **解決策**:
```typescript
// タイムアウト時間の調整
const response = await claude()
  .withModel('sonnet')
  .withTimeout(15000)  // 8000ms → 15000ms
  .query(contentPrompt)
  .asText();
```

---

### **問題3: 実データがプロンプトに反映されない**

#### **症状**:
```bash
📊 [データ品質評価]: { score: 85, market: true }
🧪 [テストモード] 投稿内容: "投資の基本原則..."  # 汎用的内容
```

#### **解決策**:
```typescript
// プロンプトにデータ詳細を明示的に追加
const contentPrompt = `
【緊急】以下は実際のリアルタイムデータです。必ずこのデータを使用してください：

市場データ（${dataQuality.marketCount}件）:
${JSON.stringify(analysisData.marketAnalysis, null, 2)}

ニュースデータ（${dataQuality.newsCount}件）:
${JSON.stringify(analysisData.trendAnalysis, null, 2)}

⚠️ 重要: 上記の具体的な数値・企業名・ニュース内容を必ず投稿に含めてください。
汎用的な内容は絶対に生成しないでください。
`;
```

---

## 📝 **投稿品質問題**

### **問題1: ハッシュタグが生成されない**

#### **症状**:
```bash
投稿内容: "市場分析情報..."  # ハッシュタグなし
```

#### **解決策**:
```typescript
// フォールバックコンテンツの強化
private createFallbackContent(): { theme: string; content: string; actionType: string } {
  const hashtags = ['#投資教育', '#資産運用', '#市場分析', '#投資戦略', '#金融リテラシー'];
  const selectedTags = hashtags.slice(0, Math.floor(Math.random() * 2) + 3); // 3-5個
  
  return {
    theme: 'investment_education',
    content: `💡 投資初心者必見！リスク分散の具体的手法\n\n📊 分散投資の重要ポイント:\n1️⃣ セクター分散で業界リスク軽減\n2️⃣ 地域分散で為替リスク管理\n3️⃣ 時間分散で価格変動平滑化\n\n🎯 長期視点での資産形成を心がけましょう！\n\n${selectedTags.join(' ')}`,
    actionType: 'original_post'
  };
}
```

---

### **問題2: エモジが適切に使用されない**

#### **解決策**:
```typescript
// エモジライブラリの活用
const investmentEmojis = ['📈', '📊', '💰', '🏦', '💡', '🎯', '⚡', '🚀', '📱', '💎'];
const warningEmojis = ['⚠️', '🚨', '❗', '🔴'];
const positiveEmojis = ['✅', '🎉', '💪', '🌟', '🔥'];

// プロンプトにエモジ指定を追加
const emojiInstruction = `
必須エモジ使用例:
- 市場情報: 📈📊💰🏦
- 注意喚起: ⚠️🚨❗🔴  
- ポジティブ: ✅🎉💪🌟
- アクション: 💡🎯⚡🚀
`;
```

---

### **問題3: 投稿内容が重複する**

#### **症状**:
```bash
類似の投稿が短期間で複数回投稿される
```

#### **解決策**:
```typescript
// 重複検出の強化
private async checkContentDuplication(newContent: string): Promise<boolean> {
  try {
    const postingHistory = JSON.parse(fs.readFileSync('data/posting-history.yaml', 'utf8'));
    const recentPosts = postingHistory.posts.slice(-10); // 直近10件
    
    for (const post of recentPosts) {
      const similarity = this.calculateSimilarity(newContent, post.content);
      if (similarity > 0.7) {  // 70%以上の類似度
        console.warn('⚠️ 類似投稿検出:', similarity);
        return true; // 重複と判定
      }
    }
    return false;
  } catch (error) {
    console.error('重複チェックエラー:', error);
    return false;
  }
}

private calculateSimilarity(str1: string, str2: string): number {
  // 簡易的な類似度計算（Jaccard係数使用）
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
```

---

## ⚡ **パフォーマンス問題**

### **問題1: データ収集が遅い**

#### **症状**:
```bash
📊 [実行レポート]: { '実行時間': '180秒' }  # 異常に遅い
```

#### **解決策**:
```typescript
// 並列処理の最適化
private async collectAllData(): Promise<any> {
  const collectWithTimeout = (promise: Promise<any>, timeout: number) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
  };

  const tasks = [
    collectWithTimeout(this.collectMarketData(), 15000),   // 15秒
    collectWithTimeout(this.collectNewsData(), 20000),     // 20秒
    collectWithTimeout(this.collectCommunityData(), 10000), // 10秒
    collectWithTimeout(this.collectEconomicData(), 25000)   // 25秒
  ];

  const results = await Promise.allSettled(tasks);
  return results.map(result => result.status === 'fulfilled' ? result.value : []);
}
```

---

### **問題2: メモリ使用量増加**

#### **症状**:
```bash
📊 [実行レポート]: { 'メモリ使用量': '156MB' }  # 通常の6倍
```

#### **解決策**:
```typescript
// メモリ使用量の監視と制限
private monitorMemoryUsage(): void {
  const used = process.memoryUsage();
  const heapMB = Math.round(used.heapUsed / 1024 / 1024);
  
  console.log(`💾 [メモリ使用量] Heap: ${heapMB}MB`);
  
  if (heapMB > 100) {  // 100MB超過時の対処
    console.warn('⚠️ メモリ使用量が高いです。ガベージコレクション実行');
    global.gc && global.gc();
  }
}

// データサイズの制限
private limitDataSize(data: any[], maxItems: number = 50): any[] {
  return data.slice(0, maxItems);
}
```

---

## 🚨 **緊急事態対応**

### **緊急事態1: 大量の不適切な投稿**

#### **対応手順**:
```bash
# 1. 即座にシステム停止
pkill -f "pnpm dev"

# 2. 緊急停止フラグ設定
echo "EMERGENCY_STOP=true" >> .env.local

# 3. 問題投稿の削除
# X(Twitter)で手動削除または削除スクリプト実行
```

#### **予防システム**:
```typescript
// 緊急停止チェック
private async checkEmergencyStop(): Promise<boolean> {
  try {
    require('dotenv').config({ path: '.env.local' });
    if (process.env.EMERGENCY_STOP === 'true') {
      console.log('🚨 [緊急停止] システムが緊急停止モードです');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}
```

---

### **緊急事態2: API制限による完全停止**

#### **対応手順**:
```bash
# 1. API使用量確認
echo "=== API使用状況 ==="
echo "Alpha Vantage: https://www.alphavantage.co/support/#support"
echo "CoinGecko: dashboard確認"
echo "FRED: 制限なし（通常）"

# 2. フォールバックモード有効化
echo "FALLBACK_MODE=true" >> .env.local

# 3. 最小限モードで運用
echo "MINIMAL_MODE=true" >> .env.local
```

---

### **緊急事態3: システムクラッシュ・無限ループ**

#### **対応手順**:
```bash
# 1. プロセス強制終了
ps aux | grep "pnpm dev"
kill -9 [PID]

# 2. ログ確認
tail -100 /var/log/system.log | grep TradingAssistant
tail -50 ~/.pm2/logs/trading-assistant-error.log

# 3. セーフモード起動
SAFE_MODE=true TEST_MODE=true pnpm dev
```

---

## 📞 **サポート・連絡先**

### **技術サポート**:
- Claude Code SDK: https://docs.anthropic.com/en/docs/claude-code
- Alpha Vantage: https://www.alphavantage.co/support/
- CoinGecko: https://www.coingecko.com/en/api
- FRED API: https://fred.stlouisfed.org/docs/api/

### **緊急時連絡**:
1. システム管理者への連絡
2. APIプロバイダーへのサポート要請
3. 必要に応じてX(Twitter)アカウントの一時停止

---

## ✅ **予防保守チェックリスト**

### **日次チェック**:
- [ ] システム稼働状況確認
- [ ] API使用量確認
- [ ] 投稿品質確認
- [ ] エラーログ確認

### **週次チェック**:
- [ ] データ収集成功率確認
- [ ] パフォーマンスメトリクス確認
- [ ] APIキー有効期限確認
- [ ] セキュリティ更新確認

### **月次チェック**:
- [ ] 全体システムレビュー
- [ ] API料金・制限確認
- [ ] バックアップデータ確認
- [ ] 改善点の特定・実装

**このガイドを活用して、安定した戦略的自律システムの運用を実現してください！**