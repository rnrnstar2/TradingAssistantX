# シンプル自動データ収集システム設計

## 🎯 新しい要求

**完全独立型**: 自分のX.comデータを定期収集する専用デーモンシステム

### 核心特徴
- ✅ **永続起動**: 24/7 でずっと動き続ける
- ✅ **定期実行**: 設定間隔でデータ更新
- ✅ **完全分離**: 既存システムと独立
- ✅ **シンプル**: データ収集→保存のみ

## 🏗️ システム構成

### ディレクトリ構造
```
PersonalXDataCollector/          # 完全新規ディレクトリ
├── src/
│   ├── daemon.ts               # メインデーモンプロセス
│   ├── collector.ts            # データ収集ロジック
│   ├── browser-manager.ts      # 永続Playwrightブラウザ
│   └── config.ts               # 設定管理
├── data/                       # データ蓄積専用
│   ├── profile/                # プロフィール情報
│   ├── tweets/                 # ツイートデータ
│   ├── followers/              # フォロワー情報
│   └── metrics/                # 各種指標
├── config/
│   └── collector-config.yaml   # 収集設定
├── logs/
│   └── daemon.log              # 動作ログ
├── package.json
└── README.md
```

## 🚀 コア機能設計

### 1. メインデーモン

**ファイル**: `src/daemon.ts`

```typescript
import { BrowserManager } from './browser-manager.js';
import { DataCollector } from './collector.js';
import { Config } from './config.js';

export class XDataCollectorDaemon {
  private collector: DataCollector;
  private browser: BrowserManager;
  private config: Config;
  private running: boolean = false;
  
  async start(): Promise<void> {
    console.log('🚀 X Data Collector Daemon starting...');
    
    // 永続ブラウザ起動
    await this.browser.startPersistent();
    console.log('✅ Browser started');
    
    // 初回ログイン支援
    await this.requestInitialLogin();
    
    // 定期実行開始
    this.running = true;
    this.scheduleCollection();
    
    console.log('🔄 Daemon running. Press Ctrl+C to stop.');
  }
  
  private async scheduleCollection(): Promise<void> {
    while (this.running) {
      try {
        console.log(`📊 Collecting data at ${new Date().toISOString()}`);
        await this.collector.collectAllData();
        console.log('✅ Data collection completed');
        
        // 次回実行まで待機
        await this.sleep(this.config.intervalMs);
        
      } catch (error) {
        console.error('❌ Collection error:', error);
        await this.sleep(60000); // 1分後にリトライ
      }
    }
  }
  
  private async requestInitialLogin(): Promise<void> {
    console.log(`
🔐 初回セットアップが必要です

1. ブラウザが自動で開きます
2. X.com にログインしてください
3. ログイン完了後、このターミナルでEnterキーを押してください

ブラウザは閉じずに、そのまま維持されます。
    `);
    
    await this.browser.openLoginPage();
    await this.waitForUserInput();
    
    console.log('✅ ログイン完了。データ収集を開始します。');
  }
}
```

### 2. データ収集器

**ファイル**: `src/collector.ts`

```typescript
export interface CollectedData {
  profile: ProfileData;
  recentTweets: TweetData[];
  followers: FollowerData;
  metrics: MetricsData;
  timestamp: string;
}

export class DataCollector {
  private browser: BrowserManager;
  
  async collectAllData(): Promise<CollectedData> {
    const page = await this.browser.getPage();
    
    const data: CollectedData = {
      profile: await this.collectProfile(page),
      recentTweets: await this.collectRecentTweets(page),
      followers: await this.collectFollowerMetrics(page),
      metrics: await this.collectEngagementMetrics(page),
      timestamp: new Date().toISOString()
    };
    
    await this.saveData(data);
    return data;
  }
  
  private async collectProfile(page: Page): Promise<ProfileData> {
    await page.goto('https://x.com/rnrnstar');
    
    return await page.evaluate(() => {
      // プロフィール情報を抽出
      return {
        displayName: document.querySelector('[data-testid="UserName"]')?.textContent,
        bio: document.querySelector('[data-testid="UserDescription"]')?.textContent,
        followersCount: this.extractFollowersCount(),
        followingCount: this.extractFollowingCount(),
        tweetCount: this.extractTweetCount(),
        profileImageUrl: this.extractProfileImage(),
        timestamp: new Date().toISOString()
      };
    });
  }
  
  private async saveData(data: CollectedData): Promise<void> {
    const timestamp = data.timestamp.replace(/[:.]/g, '-');
    
    // 各データを個別ファイルに保存
    await writeFile(`data/profile/profile-${timestamp}.json`, 
                   JSON.stringify(data.profile, null, 2));
    
    await writeFile(`data/tweets/tweets-${timestamp}.json`, 
                   JSON.stringify(data.recentTweets, null, 2));
    
    await writeFile(`data/followers/followers-${timestamp}.json`, 
                   JSON.stringify(data.followers, null, 2));
    
    await writeFile(`data/metrics/metrics-${timestamp}.json`, 
                   JSON.stringify(data.metrics, null, 2));
    
    // 最新データも保存
    await writeFile('data/latest.json', JSON.stringify(data, null, 2));
  }
}
```

### 3. 永続ブラウザ管理

**ファイル**: `src/browser-manager.ts`

```typescript
export class BrowserManager {
  private context: BrowserContext | null = null;
  private userDataDir: string;
  
  async startPersistent(): Promise<void> {
    this.userDataDir = path.join(process.cwd(), 'browser-data');
    
    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless: false,  // ログイン操作のため
      viewport: { width: 1280, height: 800 },
      locale: 'ja-JP',
      args: ['--no-sandbox']
    });
    
    console.log('🌐 Persistent browser started');
  }
  
  async openLoginPage(): Promise<void> {
    const page = await this.context!.newPage();
    await page.goto('https://x.com/login');
    // ページは開いたまま（人間のログイン操作用）
  }
  
  async getPage(): Promise<Page> {
    return await this.context!.newPage();
  }
  
  async isLoggedIn(): Promise<boolean> {
    const page = await this.getPage();
    try {
      await page.goto('https://x.com/home');
      const isHome = await page.waitForSelector('[data-testid="primaryColumn"]', 
                                               { timeout: 5000 });
      await page.close();
      return !!isHome;
    } catch {
      await page.close();
      return false;
    }
  }
}
```

### 4. 設定管理

**ファイル**: `config/collector-config.yaml`

```yaml
# 収集間隔（ミリ秒）
collection_interval: 3600000  # 1時間

# 収集対象
targets:
  profile: true
  tweets: true
  followers: true
  metrics: true

# ツイート収集設定
tweets:
  max_count: 50
  include_replies: false
  include_retweets: true

# データ保存設定
storage:
  keep_history: true
  max_files_per_day: 24
  compress_old_data: false

# ブラウザ設定
browser:
  headless: false  # ログイン操作のため
  timeout: 30000
  user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

# ログ設定
logging:
  level: "info"
  file: "logs/daemon.log"
  max_size: "10MB"
```

## 🚀 実行方法

### 1. 初期セットアップ
```bash
# 新しいディレクトリ作成
mkdir PersonalXDataCollector
cd PersonalXDataCollector

# パッケージ初期化
npm init -y
npm install playwright typescript @types/node

# 設定ファイル作成
mkdir -p config data/{profile,tweets,followers,metrics} logs
```

### 2. デーモン起動
```bash
# 初回起動（ログイン支援付き）
npm run start:setup

# 通常起動
npm run start

# バックグラウンド実行
npm run start:daemon
```

### 3. データ確認
```bash
# 最新データ確認
cat data/latest.json

# ファイル一覧
ls data/profile/
ls data/tweets/
```

## 📊 データ蓄積例

### Profile データ
```json
{
  "displayName": "rnrnstar",
  "bio": "...",
  "followersCount": 123,
  "followingCount": 456,
  "tweetCount": 789,
  "timestamp": "2025-01-23T12:00:00Z"
}
```

### Tweets データ
```json
[
  {
    "id": "tweet_123",
    "text": "ツイート内容",
    "createdAt": "2025-01-23T11:30:00Z",
    "metrics": {
      "likes": 5,
      "retweets": 2,
      "replies": 1
    }
  }
]
```

## 🎯 運用フロー

1. **初回**: `npm run start:setup` → ブラウザでログイン → Enter
2. **自動**: 設定間隔でデータ収集継続
3. **確認**: `data/latest.json` で最新状況確認
4. **履歴**: `data/*/` 各フォルダで時系列データ確認

## 💡 メリット

- ✅ **完全自動**: 一度セットアップすれば放置可能
- ✅ **永続化**: ブラウザセッション維持で認証不要
- ✅ **シンプル**: 最小限の機能で最大の効果
- ✅ **独立性**: 既存システムに影響なし
- ✅ **データ蓄積**: 時系列でデータ追跡可能

---

**このシステムは完全に独立して動作し、既存のTradingAssistantXとは分離されます。**