# 独立ディレクトリ構造での実装指示書

## 🎯 ディレクトリ構成

**完全分離**: 収集システムはTradingAssistantXの外部に配置

```
/Users/rnrnstar/github/
├── TradingAssistantX/           # 既存システム
│   └── data/                    # 共有データディレクトリ
│       ├── current/
│       ├── learning/
│       └── archives/
│
└── x-data-collector/            # 完全独立の収集システム
    ├── src/
    │   ├── daemon.ts            # メインデーモン
    │   ├── collector.ts         # 収集ロジック
    │   ├── browser-manager.ts   # Playwright管理
    │   ├── data-writer.ts       # 共有data書き込み
    │   └── config.ts
    ├── browser-data/            # ブラウザセッション
    ├── logs/                    # システムログ
    ├── config/
    │   └── settings.json
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

## 🚀 実装手順

### Step 1: プロジェクト作成

```bash
# TradingAssistantXの外に新規プロジェクト作成
cd /Users/rnrnstar/github
mkdir x-data-collector
cd x-data-collector

# プロジェクト初期化
npm init -y
mkdir -p src browser-data logs config
```

### Step 2: 依存関係インストール

```bash
# package.json
{
  "name": "x-data-collector",
  "version": "1.0.0",
  "description": "Persistent X.com data collector for TradingAssistantX",
  "main": "dist/daemon.js",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && node dist/daemon.js",
    "start:dev": "ts-node src/daemon.ts",
    "setup": "ts-node src/setup.ts"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "js-yaml": "^4.1.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/js-yaml": "^4.0.0",
    "ts-node": "^10.9.0"
  }
}

npm install
```

### Step 3: 設定ファイル

**config/settings.json**
```json
{
  "tradingAssistantX": {
    "dataPath": "../TradingAssistantX/data"
  },
  "collection": {
    "intervalMinutes": 60,
    "username": "rnrnstar"
  },
  "browser": {
    "headless": false,
    "persistentContextDir": "./browser-data"
  }
}
```

### Step 4: コア実装ファイル

**src/config.ts**
```typescript
import * as path from 'path';
import * as fs from 'fs';

export class Config {
  private settings: any;
  
  constructor() {
    const configPath = path.join(__dirname, '../config/settings.json');
    this.settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  
  get dataPath(): string {
    // TradingAssistantXのdataディレクトリへの絶対パス
    return path.resolve(__dirname, '..', this.settings.tradingAssistantX.dataPath);
  }
  
  get intervalMs(): number {
    return this.settings.collection.intervalMinutes * 60 * 1000;
  }
  
  get username(): string {
    return this.settings.collection.username;
  }
}
```

**src/data-writer.ts**
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Config } from './config.js';

export class DataWriter {
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  async writeToSharedData(subPath: string, data: any): Promise<void> {
    const fullPath = path.join(this.config.dataPath, subPath);
    
    // ディレクトリが存在しない場合は作成
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
    
    await fs.writeFile(fullPath, yamlContent, 'utf-8');
    console.log(`✅ Saved to: ${subPath}`);
  }
  
  async updateAccountStatus(accountData: any): Promise<void> {
    await this.writeToSharedData('current/account-status.yaml', accountData);
  }
  
  async updateSelfTweets(tweets: any[]): Promise<void> {
    await this.writeToSharedData('current/self-tweets.yaml', {
      recent_tweets: tweets.slice(0, 20),
      last_updated: new Date().toISOString(),
      total_collected: tweets.length
    });
  }
}
```

**src/browser-manager.ts**
```typescript
import { chromium, BrowserContext } from 'playwright';
import * as path from 'path';

export class BrowserManager {
  private context: BrowserContext | null = null;
  
  async startPersistent(): Promise<void> {
    const userDataDir = path.join(__dirname, '../browser-data');
    
    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    });
    
    console.log('🌐 Persistent browser started');
  }
  
  async openLoginPage(): Promise<void> {
    const page = await this.context!.newPage();
    await page.goto('https://x.com/login');
  }
  
  getContext(): BrowserContext {
    if (!this.context) throw new Error('Browser not initialized');
    return this.context;
  }
}
```

**src/daemon.ts**
```typescript
import { BrowserManager } from './browser-manager.js';
import { DataCollector } from './collector.js';
import { DataWriter } from './data-writer.js';
import { Config } from './config.js';
import * as readline from 'readline';

export class XDataCollectorDaemon {
  private browser: BrowserManager;
  private collector: DataCollector;
  private writer: DataWriter;
  private config: Config;
  private running: boolean = false;
  
  constructor() {
    this.config = new Config();
    this.browser = new BrowserManager();
    this.writer = new DataWriter(this.config);
    this.collector = new DataCollector(this.browser, this.writer);
  }
  
  async start(): Promise<void> {
    console.log('🚀 X Data Collector starting...');
    console.log(`📂 Data will be saved to: ${this.config.dataPath}`);
    
    await this.browser.startPersistent();
    
    // 初回ログイン確認
    if (!await this.checkLoginStatus()) {
      await this.requestLogin();
    }
    
    this.running = true;
    await this.runLoop();
  }
  
  private async requestLogin(): Promise<void> {
    console.log('\n🔐 ログインが必要です');
    console.log('1. ブラウザでX.comにログインしてください');
    console.log('2. 完了したらEnterキーを押してください\n');
    
    await this.browser.openLoginPage();
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => rl.question('', resolve));
    rl.close();
  }
  
  private async runLoop(): Promise<void> {
    while (this.running) {
      try {
        console.log(`\n📊 Collecting at ${new Date().toLocaleString()}`);
        await this.collector.collect();
        console.log(`⏰ Next collection in ${this.config.intervalMs / 60000} minutes`);
        
        await this.sleep(this.config.intervalMs);
      } catch (error) {
        console.error('❌ Error:', error);
        await this.sleep(60000); // 1分後リトライ
      }
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async checkLoginStatus(): Promise<boolean> {
    // ログイン状態確認ロジック
    return false; // 仮実装
  }
}

// メイン実行
const daemon = new XDataCollectorDaemon();
daemon.start().catch(console.error);

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});
```

### Step 5: 実行方法

```bash
# 初回セットアップ（ログイン）
cd /Users/rnrnstar/github/x-data-collector
npm run setup

# デーモン起動
npm start

# バックグラウンド実行
nohup npm start > logs/daemon.log 2>&1 &
```

## 📊 データフロー

```
x-data-collector（独立プロセス）
     ↓
browser-data/（セッション保持）
     ↓
X.com（認証済みアクセス）
     ↓
../TradingAssistantX/data/（共有ディレクトリ）
    ├── current/
    ├── learning/
    └── archives/
```

## 🔧 systemdサービス化（オプション）

**/etc/systemd/system/x-data-collector.service**
```ini
[Unit]
Description=X Data Collector Daemon
After=network.target

[Service]
Type=simple
User=rnrnstar
WorkingDirectory=/Users/rnrnstar/github/x-data-collector
ExecStart=/usr/bin/node /Users/rnrnstar/github/x-data-collector/dist/daemon.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# サービス登録
sudo systemctl enable x-data-collector
sudo systemctl start x-data-collector
sudo systemctl status x-data-collector
```

## ✅ この構成のメリット

1. **完全独立**: TradingAssistantXのコードに一切触れない
2. **データ共有**: dataディレクトリのみ共有
3. **保守性**: 各システムが独立して更新可能
4. **安定性**: 片方が落ちても影響なし

---

これで独立したディレクトリ構造での実装準備が整いました。実装を開始してよろしいでしょうか？