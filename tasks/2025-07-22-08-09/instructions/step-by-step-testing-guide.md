# ステップバイステップ テスト実行ガイド

## 🎯 **目標**
実装した機能を段階的にテストし、問題を早期発見・修正して真の戦略的自律システムを完成させる

## ⏰ **所要時間: 1-2時間**

---

## 📋 **テスト実行ステップ**

### **Phase 1: 基礎設定確認 [10分]**
### **Phase 2: API接続テスト [15分]**
### **Phase 3: データ収集テスト [20分]**
### **Phase 4: 統合テスト（投稿なし） [15分]**
### **Phase 5: 実運用テスト [20分]**

---

## 🔧 **Phase 1: 基礎設定確認**

### **1.1 環境変数確認**

```bash
# 実行コマンド
node -e "require('dotenv').config({path: '.env.local'}); console.log('Alpha Vantage:', !!process.env.ALPHA_VANTAGE_API_KEY); console.log('CoinGecko:', !!process.env.COINGECKO_API_KEY); console.log('FRED:', !!process.env.FRED_API_KEY); console.log('Real Data Mode:', process.env.REAL_DATA_MODE);"
```

### **期待される出力**:
```bash
Alpha Vantage: true
CoinGecko: true  
FRED: true
Real Data Mode: true
```

### **❌ 失敗時の対処**:
- `false` が表示される場合: `.env.local` ファイルの設定を再確認
- ファイルが見つからない場合: `api-keys-setup-guide.md` を再実行

---

### **1.2 TypeScript構文チェック**

```bash
# 実行コマンド
pnpm exec tsc --noEmit
```

### **期待される出力**:
```bash
# エラーなし（無出力またはsuccessメッセージ）
```

### **❌ 失敗時の対処**:
- エラー内容を確認し、`code-implementation-guide.md` の指示を再確認
- import文のパス、型定義、構文エラーを修正

---

### **1.3 依存パッケージ確認**

```bash
# 実行コマンド  
pnpm list | grep -E "(dotenv|axios)"
```

### **期待される出力**:
```bash
dotenv 16.0.3
axios 1.x.x
```

### **❌ 失敗時の対処**:
```bash
pnpm add -D dotenv
pnpm add axios  # 未インストールの場合
```

---

## 🔧 **Phase 2: API接続テスト**

### **2.1 API接続テスト実行**

```bash
# 実行コマンド
pnpm exec tsx src/scripts/test-api-connections.ts
```

### **期待される出力**:
```bash
🧪 API接続テスト開始...

📊 テスト結果:
==================================================
✅ Alpha Vantage: 接続成功
   📄 データ例: 180.25
✅ CoinGecko: 接続成功  
   📄 データ例: Bitcoin: $43,250
✅ FRED: 接続成功
   📄 データ例: GDP: 27000.456
==================================================
📈 成功率: 3/3 (100%)
🎉 全てのAPI接続が成功しました！次のステップに進めます。
```

### **❌ 失敗パターンと対処**:

#### **パターン1: APIキー無効**
```bash
❌ Alpha Vantage: 接続失敗: Request failed with status code 403
```
**対処**: APIキーを再取得、`.env.local` を再設定

#### **パターン2: レート制限**
```bash
❌ CoinGecko: 接続失敗: Request failed with status code 429
```
**対処**: 5分待機後に再実行

#### **パターン3: ネットワークエラー**
```bash
❌ FRED: 接続失敗: connect ECONNREFUSED
```
**対処**: インターネット接続・ファイアウォール設定確認

---

### **2.2 個別API詳細テスト**

各APIが失敗した場合、個別に詳細テスト：

```bash
# Alpha Vantage詳細テスト
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_API_KEY"

# CoinGecko詳細テスト  
curl -H "x-cg-demo-api-key: YOUR_API_KEY" "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

# FRED詳細テスト
curl "https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=YOUR_API_KEY&file_type=json&limit=1"
```

---

## 🔧 **Phase 3: データ収集テスト**

### **3.1 市場データ収集テスト**

```bash
# 実行コマンド
node -e "
const { FXAPICollector } = require('./src/lib/fx-api-collector.js');
require('dotenv').config({path: '.env.local'});

async function test() {
  const collector = new FXAPICollector();
  console.log('🧪 [市場データテスト] FXAPICollector開始...');
  try {
    const data = await collector.collectForexRates(['USDJPY']);
    console.log('✅ 市場データ収集成功:', data?.length || 0, '件');
    console.log('📊 データ例:', JSON.stringify(data?.[0] || {}, null, 2));
  } catch (error) {
    console.error('❌ 市場データ収集失敗:', error.message);
  }
}
test();
"
```

### **期待される出力**:
```bash
🔑 [FXAPICollector] API認証情報読み込み: { alphaVantage: true, finnhub: false, fmp: false }
🧪 [市場データテスト] FXAPICollector開始...
✅ 市場データ収集成功: 1 件
📊 データ例: {
  "symbol": "USDJPY",
  "bid": 149.25,
  "ask": 149.27,
  "timestamp": 1642649234
}
```

---

### **3.2 ニュースデータ収集テスト**

```bash
# 実行コマンド
node -e "
const axios = require('axios');

async function testNews() {
  console.log('🧪 [ニュースデータテスト] RSS収集開始...');
  try {
    const response = await axios.get('https://finance.yahoo.com/rss/topstories', { timeout: 10000 });
    console.log('✅ ニュースデータ収集成功');
    console.log('📊 データサイズ:', response.data.length, '文字');
    console.log('📄 データ例:', response.data.slice(0, 200) + '...');
  } catch (error) {
    console.error('❌ ニュースデータ収集失敗:', error.message);
  }
}
testNews();
"
```

---

### **3.3 コミュニティデータ収集テスト**

```bash
# 実行コマンド
node -e "
const axios = require('axios');

async function testCommunity() {
  console.log('🧪 [コミュニティデータテスト] Reddit収集開始...');
  try {
    const response = await axios.get('https://www.reddit.com/r/investing/hot.json?limit=3', { 
      timeout: 10000,
      headers: { 'User-Agent': 'TradingAssistant/1.0' }
    });
    const posts = response.data?.data?.children || [];
    console.log('✅ コミュニティデータ収集成功:', posts.length, '件');
    if (posts.length > 0) {
      console.log('📊 投稿例:', {
        title: posts[0].data.title.slice(0, 50) + '...',
        score: posts[0].data.score
      });
    }
  } catch (error) {
    console.error('❌ コミュニティデータ収集失敗:', error.message);
  }
}
testCommunity();
"
```

---

## 🔧 **Phase 4: 統合テスト（投稿なし）**

### **4.1 実データ統合テスト**

```bash
# 実行コマンド
REAL_DATA_MODE=true TEST_MODE=true pnpm dev
```

### **期待されるログ出力**:

```bash
🎯 [DecisionLogger] 拡張意思決定ロギングシステム初期化完了
📊 [リアルデータモード] 外部データ収集を開始...
📈 [市場データ収集] FX・株式データ収集中...
📰 [ニュースデータ収集] RSS収集中...
💬 [コミュニティデータ収集] Reddit/HN収集中...
📊 [経済データ収集] FRED API使用...
✅ [データ収集完了]: { market: 3, news: 8, community: 5, economic: 3 }
📊 [データ品質評価]: { score: 85, market: true, news: true, community: true, economic: true }
🧪 [テストモード] 投稿内容:
🚨 【速報】USDJPY最新動向: 149.25円で推移

📊 現在の市場状況:
• USD/JPY: 149.25円（前日比+0.3%）
• 日銀政策据え置きで円安継続
• Reddit投資コミュニティでは強気な意見が優勢

💡 投資家への示唆:
為替ヘッジの重要性が高まる局面
輸出関連株への注目度上昇中

あなたの為替戦略は？ 📈

#USDJPY #為替 #日銀政策 #投資戦略 #円安
```

### **✅ 成功判定基準**:
- データ収集完了ログが表示される
- データ品質スコアが60以上
- 投稿内容に具体的な数値・企業名が含まれる
- ハッシュタグが3-5個含まれる

### **❌ 失敗パターンと対処**:

#### **パターン1: データ収集ゼロ**
```bash
✅ [データ収集完了]: { market: 0, news: 0, community: 0, economic: 0 }
```
**対処**: Phase 3のデータ収集テストを再実行、各API設定を確認

#### **パターン2: 一般的な投稿内容**
```bash
投稿内容: "📈 投資の基本原則：時間を味方につけよう..."
```
**対処**: Claude SDKプロンプトの修正、データ品質評価の確認

#### **パターン3: データ品質スコア低下**
```bash
データ品質評価: { score: 20, market: false, news: false }
```
**対処**: 個別API接続テストを再実行、設定確認

---

## 🔧 **Phase 5: 実運用テスト**

### **5.1 少量投稿テスト**

⚠️ **注意**: 実際にX（Twitter）に投稿されます

```bash
# 実行コマンド（投稿数制限）
REAL_DATA_MODE=true MAX_POSTS=2 pnpm dev
```

### **期待される結果**:
- 2件の高品質な投稿が生成・投稿される
- 各投稿に実際のデータが反映される
- エンゲージメント率の向上

### **投稿品質チェック**:
投稿された内容を確認：

#### **✅ 良い投稿例**:
```
🚨 【米株速報】Apple (AAPL) 時間外取引で急騰

📊 最新状況:
• 株価: $180.25 → $185.40 (+2.85%)
• 出来高: 通常の1.8倍
• アナリスト目標株価: $195に引き上げ

💡 要因:
iPhone 15販売好調、中国市場回復期待

次の決算発表まで要注目 📱

#Apple #AAPL #決算 #iPhone #投資判断
```

#### **❌ 改善が必要な投稿例**:
```
投資の基本：リスク管理の重要性について
#投資教育 #リスク管理
```

---

### **5.2 継続運用テスト**

問題がなければ通常運用開始：

```bash
# 実行コマンド
REAL_DATA_MODE=true pnpm dev
```

### **監視項目**:
- データ収集成功率: >90%
- 投稿品質スコア: >80
- エンゲージメント率の推移
- システムエラーの発生頻度

---

## 📊 **Phase 6: パフォーマンス評価**

### **6.1 品質評価メトリクス**

```bash
# 実行後の評価
node -e "
console.log('📊 システムパフォーマンス評価');
console.log('='.repeat(40));

// 過去のセッションデータを分析
const fs = require('fs');
const sessions = fs.readdirSync('data/autonomous-sessions/')
  .filter(file => file.includes(new Date().toISOString().split('T')[0]))
  .map(file => JSON.parse(fs.readFileSync(\`data/autonomous-sessions/\${file}\`, 'utf8')));

if (sessions.length > 0) {
  const latestSession = sessions[sessions.length - 1];
  console.log('最新セッション結果:');
  console.log('- 自律スコア:', latestSession.autonomyScore + '%');
  console.log('- 戦略柔軟性:', latestSession.performanceMetrics?.strategicFlexibility + '%');
  console.log('- 学習効果:', latestSession.performanceMetrics?.learningEffectiveness + '%');
  console.log('- 実行成功率:', 
    Math.round(latestSession.execution.successfulActions / latestSession.execution.totalActions * 100) + '%');
} else {
  console.log('セッションデータが見つかりません');
}
"
```

---

### **6.2 Before/After比較**

#### **実装前の投稿**:
```
"投資基礎教育：初心者が知るべき分散投資の重要性と具体的実践方法"
```

#### **実装後の期待投稿**:
```
🚨 【日銀会合速報】政策金利0.1%据え置き決定

📊 市場反応（発表後30分）:
• USDJPY: 149.85円→149.42円（-0.29%）
• 日経平均先物: +120円の上昇
• 10年債利回り: 0.98%で安定

💡 投資インプリケーション:
1️⃣ 長期金利安定で不動産株に追い風  
2️⃣ 輸出企業は為替影響要注意
3️⃣ 金融株は低金利継続で重石感

市場コンセンサスを上回る結果 🎯

#日銀 #金利政策 #USDJPY #市場分析 #投資戦略
```

---

## ✅ **全テスト完了確認チェックリスト**

### **Phase 1: 基礎設定** 
- [ ] 環境変数が正しく設定されている
- [ ] TypeScript構文エラーなし
- [ ] 必要パッケージがインストール済み

### **Phase 2: API接続**
- [ ] Alpha Vantage API接続成功
- [ ] CoinGecko API接続成功  
- [ ] FRED API接続成功
- [ ] 全API成功率100%

### **Phase 3: データ収集**
- [ ] 市場データ収集機能動作
- [ ] ニュースデータ収集機能動作
- [ ] コミュニティデータ収集機能動作
- [ ] 各データソースから実データ取得確認

### **Phase 4: 統合テスト**
- [ ] 実データモードで動作
- [ ] データ品質スコア60以上
- [ ] 投稿内容に実データ反映
- [ ] ハッシュタグ・エモジ適切に使用

### **Phase 5: 実運用テスト**  
- [ ] 実投稿成功（2件テスト）
- [ ] 投稿品質が大幅向上
- [ ] エンゲージメント向上確認
- [ ] システム安定動作

### **Phase 6: パフォーマンス評価**
- [ ] 自律スコア60%以上
- [ ] 実行成功率90%以上
- [ ] Before/After比較で明確な改善
- [ ] 継続運用準備完了

---

## 🎉 **テスト完了・運用開始**

全フェーズのテストが完了したら、**真の戦略的自律システム**の完成です！

### **達成した機能**:
- 🔄 リアルタイムデータ収集
- 🧠 Claude SDK完全統合
- 📊 データ駆動コンテンツ生成
- 📈 戦略的投稿最適化
- 🚀 完全自律運用

### **期待される成果**:
- アカウント成長率: 2-3倍向上
- エンゲージメント: 1.5-2倍向上
- 専門性認知: 大幅向上
- 運用コスト: ゼロ（完全自動化）

**おめでとうございます！世界最高水準の戦略的自律システムが完成しました！** 🎊