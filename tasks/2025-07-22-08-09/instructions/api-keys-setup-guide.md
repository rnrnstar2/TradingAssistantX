# APIキー取得・設定 詳細手順書

## 🎯 **目標**
外部データAPIとの接続に必要な認証情報を取得・設定し、リアルタイムデータ収集を可能にする

## ⏰ **所要時間: 30分**

---

## 🔑 **必須APIキー取得手順**

### **1. Alpha Vantage API（株式・FXデータ）**

#### **取得手順**:
1. https://www.alphavantage.co/support/#api-key にアクセス
2. "GET YOUR FREE API KEY TODAY" をクリック
3. フォームに以下を入力：
   ```
   First Name: [あなたの名前]
   Last Name: [あなたの姓]
   Email: [有効なメールアドレス]
   Organization: Trading Analysis
   ```
4. "GET FREE API KEY" をクリック
5. 画面に表示される **APIキーをメモ**（例: `ABC123XYZ789`）

#### **提供データ**:
- 株式リアルタイム価格
- FXレート（USDJPY、EURUSD等）
- 暗号通貨価格
- 経済指標

---

### **2. CoinGecko API（暗号通貨データ）**

#### **取得手順**:
1. https://www.coingecko.com/en/api/pricing にアクセス
2. "Developer Plan" の "Get Started" をクリック（無料プラン）
3. アカウント作成：
   ```
   Email: [有効なメールアドレス]
   Password: [強力なパスワード]
   ```
4. メール認証を完了
5. ダッシュボードから **APIキーを取得**（例: `CG-xyz789abc123`）

#### **提供データ**:
- 暗号通貨価格・ボリューム
- トレンド分析
- 市場キャップデータ

---

### **3. FRED API（経済指標データ）**

#### **取得手順**:
1. https://fred.stlouisfed.org/docs/api/api_key.html にアクセス
2. "Request an API Key" をクリック
3. アカウント作成（無料）：
   ```
   Email: [有効なメールアドレス]
   Password: [パスワード]
   First/Last Name: [氏名]
   ```
4. "API Keys" セクションで **新しいAPIキーを生成**
5. **APIキーをメモ**（例: `fred123abc789xyz`）

#### **提供データ**:
- GDP、失業率等の経済指標
- 金利データ
- インフレ率

---

## 🔧 **環境変数設定**

### **1. 環境ファイル作成**

プロジェクトルートで以下を実行：

```bash
# .env.local ファイル作成
touch .env.local

# 権限設定（セキュリティ対策）
chmod 600 .env.local
```

### **2. APIキー設定**

`.env.local` ファイルに以下の内容を追加：

```bash
# 必須APIs（無料）
ALPHA_VANTAGE_API_KEY=ここに取得したAlpha VantageのAPIキーを入力
COINGECKO_API_KEY=ここに取得したCoinGeckoのAPIキーを入力
FRED_API_KEY=ここに取得したFREDのAPIキーを入力

# 実データモード有効化
REAL_DATA_MODE=true

# デバッグモード（問題時に有効）
DEBUG_API=false
```

### **3. 設定例**

```bash
# 実際の設定例（キーは仮想）
ALPHA_VANTAGE_API_KEY=ABC123XYZ789
COINGECKO_API_KEY=CG-xyz789abc123
FRED_API_KEY=fred123abc789xyz
REAL_DATA_MODE=true
DEBUG_API=false
```

---

## 🧪 **接続テスト**

### **1. テストスクリプト作成**

`src/scripts/test-api-connections.ts` を作成：

```typescript
#!/usr/bin/env tsx
import dotenv from 'dotenv';
import axios from 'axios';

// .env.local の読み込み
dotenv.config({ path: '.env.local' });

interface TestResult {
  service: string;
  success: boolean;
  message: string;
  data?: any;
}

async function testAlphaVantage(): Promise<TestResult> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return { service: 'Alpha Vantage', success: false, message: 'APIキーが設定されていません' };
  }
  
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`,
      { timeout: 10000 }
    );
    
    if (response.data['Global Quote']) {
      return { 
        service: 'Alpha Vantage', 
        success: true, 
        message: '接続成功', 
        data: response.data['Global Quote']['05. price']
      };
    } else {
      return { service: 'Alpha Vantage', success: false, message: 'データ形式が不正です' };
    }
  } catch (error) {
    return { 
      service: 'Alpha Vantage', 
      success: false, 
      message: `接続失敗: ${error.message}` 
    };
  }
}

async function testCoinGecko(): Promise<TestResult> {
  const apiKey = process.env.COINGECKO_API_KEY;
  
  if (!apiKey) {
    return { service: 'CoinGecko', success: false, message: 'APIキーが設定されていません' };
  }
  
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { 
        headers: { 'x-cg-demo-api-key': apiKey },
        timeout: 10000 
      }
    );
    
    if (response.data.bitcoin?.usd) {
      return { 
        service: 'CoinGecko', 
        success: true, 
        message: '接続成功',
        data: `Bitcoin: $${response.data.bitcoin.usd}`
      };
    } else {
      return { service: 'CoinGecko', success: false, message: 'データ形式が不正です' };
    }
  } catch (error) {
    return { 
      service: 'CoinGecko', 
      success: false, 
      message: `接続失敗: ${error.message}` 
    };
  }
}

async function testFRED(): Promise<TestResult> {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    return { service: 'FRED', success: false, message: 'APIキーが設定されていません' };
  }
  
  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`,
      { timeout: 15000 }
    );
    
    if (response.data.observations?.length > 0) {
      return { 
        service: 'FRED', 
        success: true, 
        message: '接続成功',
        data: `GDP: ${response.data.observations[0].value}`
      };
    } else {
      return { service: 'FRED', success: false, message: 'データが取得できません' };
    }
  } catch (error) {
    return { 
      service: 'FRED', 
      success: false, 
      message: `接続失敗: ${error.message}` 
    };
  }
}

async function runAllTests() {
  console.log('🧪 API接続テスト開始...\n');
  
  const tests = [
    testAlphaVantage(),
    testCoinGecko(),
    testFRED()
  ];
  
  const results = await Promise.all(tests);
  
  console.log('📊 テスト結果:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.service}: ${result.message}`);
    if (result.data) {
      console.log(`   📄 データ例: ${result.data}`);
    }
    if (result.success) successCount++;
  }
  
  console.log('=' .repeat(50));
  console.log(`📈 成功率: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount === results.length) {
    console.log('🎉 全てのAPI接続が成功しました！次のステップに進めます。');
  } else {
    console.log('⚠️  一部のAPI接続に問題があります。設定を確認してください。');
  }
}

// スクリプト実行
runAllTests().catch(console.error);
```

### **2. テスト実行**

```bash
# 実行権限付与
chmod +x src/scripts/test-api-connections.ts

# テスト実行
pnpm exec tsx src/scripts/test-api-connections.ts
```

### **3. 期待される出力**

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

---

## ❌ **トラブルシューティング**

### **問題1: APIキーが無効**
```bash
❌ Alpha Vantage: 接続失敗: Request failed with status code 403
```

**解決方法**:
1. APIキーが正しくコピーされているか確認
2. APIキーの有効性を各サービスのダッシュボードで確認
3. 使用制限に達していないか確認

### **問題2: 環境変数が読み込まれない**
```bash
❌ Alpha Vantage: APIキーが設定されていません
```

**解決方法**:
1. `.env.local` ファイルがプロジェクトルートにあるか確認
2. ファイル内容に余分なスペースや改行がないか確認
3. 以下のコマンドで環境変数を確認：
   ```bash
   node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.ALPHA_VANTAGE_API_KEY)"
   ```

### **問題3: ネットワーク接続エラー**
```bash
❌ FRED: 接続失敗: connect ECONNREFUSED
```

**解決方法**:
1. インターネット接続を確認
2. ファイアウォール設定を確認
3. プロキシ設定が必要な場合は設定

### **問題4: レート制限エラー**
```bash
❌ CoinGecko: 接続失敗: Request failed with status code 429
```

**解決方法**:
1. 少し時間をおいて再実行
2. APIの使用制限を確認
3. 必要に応じてプレミアムプランへのアップグレード

---

## ✅ **完了確認**

以下が全て ✅ になることを確認：

- [ ] Alpha Vantage APIキー取得・設定完了
- [ ] CoinGecko APIキー取得・設定完了  
- [ ] FRED APIキー取得・設定完了
- [ ] `.env.local` ファイル作成・権限設定完了
- [ ] テストスクリプト作成・実行完了
- [ ] 全API接続テスト成功確認

**全て完了したら次のステップ「コード変更実装」に進んでください。**

---

## 📞 **サポート情報**

### **各APIの公式ドキュメント**:
- Alpha Vantage: https://www.alphavantage.co/documentation/
- CoinGecko: https://www.coingecko.com/en/api/documentation
- FRED: https://fred.stlouisfed.org/docs/api/

### **制限事項**:
- Alpha Vantage: 5 requests/分、500 requests/日
- CoinGecko (無料): 30 requests/分
- FRED: 120 requests/分

**この手順書に従って設定することで、外部APIとの接続が確立され、リアルタイムデータ収集が可能になります。**