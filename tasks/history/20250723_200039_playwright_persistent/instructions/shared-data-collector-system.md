# 共有データディレクトリ対応 永続データ収集システム

## 🎯 修正版システム設計

**独立デーモン** + **共有dataディレクトリ** = 効率的なデータ収集

### 核心特徴
- ✅ **独立プロセス**: 収集システムは別ディレクトリ
- ✅ **データ共有**: TradingAssistantX/data/ に保存
- ✅ **永続起動**: 24/7 自動収集
- ✅ **既存システム連携**: 収集データを自動で活用可能

## 🏗️ システム構成

### ディレクトリ構造
```
TradingAssistantX/
├── data/                       # 共有データディレクトリ
│   ├── current/                # 既存のホットデータ
│   │   ├── account-status.yaml # 自動更新される
│   │   └── ...
│   ├── learning/               # 既存のウォームデータ
│   └── archives/               # 既存のコールドデータ
│
└── x-data-collector/           # 独立した収集システム
    ├── src/
    │   ├── daemon.ts           # メインデーモン
    │   ├── collector.ts        # データ収集
    │   ├── browser-manager.ts  # 永続Playwright
    │   └── data-writer.ts      # 共有データ書き込み
    ├── browser-data/           # ブラウザセッション保存
    ├── logs/
    ├── package.json
    └── tsconfig.json
```

## 🚀 コア実装

### 1. データ書き込みサービス

**ファイル**: `x-data-collector/src/data-writer.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export class SharedDataWriter {
  private readonly dataBasePath: string;
  
  constructor() {
    // 親ディレクトリのdataを使用
    this.dataBasePath = path.join(__dirname, '../../data');
  }
  
  async updateAccountStatus(data: AccountData): Promise<void> {
    const accountStatus = {
      username: data.username,
      display_name: data.displayName,
      bio: data.bio,
      followers_count: data.followersCount,
      following_count: data.followingCount,
      tweet_count: data.tweetCount,
      verified: data.verified,
      last_updated: new Date().toISOString(),
      collected_by: 'x-data-collector-daemon',
      collection_method: 'playwright-authenticated'
    };
    
    // 既存のaccount-status.yamlを更新
    const filePath = path.join(this.dataBasePath, 'current/account-status.yaml');
    await this.writeYaml(filePath, accountStatus);
    
    console.log('✅ Updated account-status.yaml');
  }
  
  async saveTodayPosts(tweets: TweetData[]): Promise<void> {
    const todayPosts = {
      date: new Date().toISOString().split('T')[0],
      posts: tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.createdAt,
        metrics: {
          likes: tweet.metrics.likes,
          retweets: tweet.metrics.retweets,
          replies: tweet.metrics.replies,
          impressions: tweet.metrics.impressions || 0
        },
        posted_by: 'self',
        collection_timestamp: new Date().toISOString()
      })),
      total_posts: tweets.length,
      collection_metadata: {
        source: 'x-data-collector',
        authenticated: true,
        collector_version: '1.0.0'
      }
    };
    
    // 既存のtoday-posts.yamlを更新
    const filePath = path.join(this.dataBasePath, 'current/today-posts.yaml');
    await this.writeYaml(filePath, todayPosts);
    
    console.log(`✅ Updated today-posts.yaml with ${tweets.length} tweets`);
  }
  
  async archiveDetailedData(data: CollectedData): Promise<void> {
    // 詳細データはアーカイブに保存
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const archivePath = path.join(
      this.dataBasePath, 
      `archives/${dateStr.substring(0, 7)}/account-data`
    );
    
    await fs.mkdir(archivePath, { recursive: true });
    
    const fileName = `account-snapshot-${timestamp.replace(/[:.]/g, '-')}.yaml`;
    await this.writeYaml(path.join(archivePath, fileName), {
      metadata: {
        collected_at: timestamp,
        collector: 'x-data-collector-daemon',
        type: 'full_account_snapshot'
      },
      data: data
    });
    
    console.log(`✅ Archived detailed snapshot: ${fileName}`);
  }
  
  async updateEngagementPatterns(metrics: EngagementData): Promise<void> {
    const filePath = path.join(this.dataBasePath, 'learning/engagement-patterns.yaml');
    
    // 既存データを読み込み
    let patterns = await this.readYaml(filePath) || {
      patterns: [],
      last_updated: null
    };
    
    // 新しいパターンを追加
    patterns.patterns.push({
      timestamp: new Date().toISOString(),
      average_likes: metrics.averageLikes,
      average_retweets: metrics.averageRetweets,
      engagement_rate: metrics.engagementRate,
      best_performing_hour: metrics.bestHour,
      follower_count_at_time: metrics.followerCount
    });
    
    // 最新100件のみ保持
    if (patterns.patterns.length > 100) {
      patterns.patterns = patterns.patterns.slice(-100);
    }
    
    patterns.last_updated = new Date().toISOString();
    
    await this.writeYaml(filePath, patterns);
    console.log('✅ Updated engagement-patterns.yaml');
  }
  
  private async writeYaml(filePath: string, data: any): Promise<void> {
    const yamlStr = yaml.dump(data, { 
      indent: 2,
      lineWidth: -1,
      noRefs: true 
    });
    await fs.writeFile(filePath, yamlStr, 'utf-8');
  }
  
  private async readYaml(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.load(content);
    } catch (error) {
      return null;
    }
  }
}
```

### 2. メインデーモン（修正版）

**ファイル**: `x-data-collector/src/daemon.ts`

```typescript
import { BrowserManager } from './browser-manager.js';
import { DataCollector } from './collector.js';
import { SharedDataWriter } from './data-writer.js';
import { Config } from './config.js';

export class XDataCollectorDaemon {
  private collector: DataCollector;
  private browser: BrowserManager;
  private writer: SharedDataWriter;
  private config: Config;
  private running: boolean = false;
  
  constructor() {
    this.browser = new BrowserManager();
    this.writer = new SharedDataWriter();
    this.collector = new DataCollector(this.browser, this.writer);
    this.config = new Config();
  }
  
  async start(): Promise<void> {
    console.log('🚀 X Data Collector Daemon starting...');
    console.log('📂 Data will be saved to: ../data/');
    
    // 永続ブラウザ起動
    await this.browser.startPersistent();
    
    // ログイン確認
    if (!await this.browser.isLoggedIn()) {
      await this.requestInitialLogin();
    }
    
    // 定期実行開始
    this.running = true;
    await this.runCollectionLoop();
  }
  
  private async runCollectionLoop(): Promise<void> {
    while (this.running) {
      try {
        console.log(`\n📊 Starting data collection at ${new Date().toLocaleString()}`);
        
        const data = await this.collector.collectAllData();
        
        // 共有dataディレクトリに保存
        await this.writer.updateAccountStatus(data.profile);
        await this.writer.saveTodayPosts(data.recentTweets);
        await this.writer.updateEngagementPatterns(data.metrics);
        await this.writer.archiveDetailedData(data);
        
        console.log('✅ Data collection and save completed');
        console.log(`⏰ Next collection in ${this.config.intervalMinutes} minutes`);
        
        await this.sleep(this.config.intervalMs);
        
      } catch (error) {
        console.error('❌ Collection error:', error);
        console.log('⏰ Retrying in 1 minute...');
        await this.sleep(60000);
      }
    }
  }
  
  async stop(): Promise<void> {
    console.log('🛑 Stopping daemon...');
    this.running = false;
    await this.browser.close();
    console.log('✅ Daemon stopped');
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (daemon) {
    await daemon.stop();
  }
  process.exit(0);
});
```

### 3. 設定ファイル

**ファイル**: `x-data-collector/config.json`

```json
{
  "collection": {
    "intervalMinutes": 60,
    "targets": {
      "profile": true,
      "tweets": true,
      "followers": true,
      "engagement": true
    },
    "tweetsToCollect": 50
  },
  "browser": {
    "headless": false,
    "userDataDir": "./browser-data",
    "timeout": 30000
  },
  "dataSync": {
    "updateCurrent": true,
    "archiveDetailed": true,
    "updateLearning": true
  }
}
```

### 4. package.json

```json
{
  "name": "x-data-collector",
  "version": "1.0.0",
  "description": "Persistent X.com data collector daemon",
  "main": "dist/daemon.js",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && node dist/daemon.js",
    "start:dev": "ts-node src/daemon.ts",
    "setup": "npm run build && node dist/setup.js"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "js-yaml": "^4.1.0",
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/js-yaml": "^4.0.0",
    "ts-node": "^10.9.0"
  }
}
```

## 🚀 セットアップ・実行手順

### 1. 初期セットアップ
```bash
# x-data-collectorディレクトリ作成
cd TradingAssistantX
mkdir x-data-collector
cd x-data-collector

# 依存関係インストール
npm init -y
npm install playwright js-yaml typescript
npm install -D @types/node @types/js-yaml ts-node

# ディレクトリ作成
mkdir -p src browser-data logs
```

### 2. 初回起動（ログイン）
```bash
# ビルド & 起動
npm run start

# ブラウザが開く → X.comにログイン → Enterキー
```

### 3. デーモン化
```bash
# バックグラウンド実行（nohup使用）
nohup npm run start > logs/daemon.log 2>&1 &

# または PM2 使用
npm install -g pm2
pm2 start npm --name "x-collector" -- start
pm2 save
pm2 startup
```

## 📊 データフロー

```
x-data-collector (独立デーモン)
     ↓ [収集]
Playwrightブラウザ（永続化・認証済み）
     ↓ [取得]
X.com データ（認証必要な詳細情報含む）
     ↓ [保存]
TradingAssistantX/data/ (共有ディレクトリ)
     ├── current/account-status.yaml    ← 自動更新
     ├── current/today-posts.yaml       ← 自動更新
     ├── learning/engagement-patterns.yaml ← 蓄積
     └── archives/YYYY-MM/              ← 詳細保存
```

## 🎯 メリット

- ✅ **データ統合**: TradingAssistantXが自動で最新データ利用可能
- ✅ **認証データ**: ログイン後の詳細情報取得
- ✅ **既存互換**: 既存のYAMLフォーマット維持
- ✅ **独立運用**: メインシステムと分離した安定動作
- ✅ **自動更新**: current/配下のデータが常に最新

## ⚠️ 注意事項

- dataディレクトリの書き込み権限確認
- YAMLフォーマットの整合性維持
- 同時書き込み時のロック考慮（将来実装）

---

これで**独立したデータ収集システム**が**既存のdataディレクトリ**にデータを自動保存し、TradingAssistantXが即座に活用できます。