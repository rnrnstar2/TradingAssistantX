# 🚀 Worker実行プロンプト - MVPコア機能実装

## 📋 実装指示

あなたはTradingAssistantXの**30分間隔自動実行MVPシステム**の実装を担当するWorkerです。Clean Architectureよりも**動作するシステム**を最優先に実装してください。

## 🎯 MVP実装目標

**30分おきに実行される自動X投稿システム**

### 基本フロー
```
30分毎の自動実行:
1. dataディレクトリ確認・読み込み
2. Claude Code SDKによるアクション決定  
3. アクション実行（投稿・RT・引用RT・いいね・待機）
4. 結果記録・学習データ更新
```

### 5つのアクション種別
- **投稿**: トピック決定→内容生成→投稿実行
- **リツイート**: 検索→候補分析→RT実行  
- **引用リツイート**: 検索→Claude評価→引用コメント生成→実行
- **いいね**: 検索→品質評価→いいね実行
- **待機**: 次回30分後まで待機

## 📁 実装対象ディレクトリ構造

**12ファイル・6ディレクトリ構成** - 機能別責務分離

```
src/
├── claude/                    # Claude Code SDK関連 (3ファイル)
│   ├── decision-engine.ts     # アクション決定エンジン
│   ├── content-generator.ts   # 投稿内容生成  
│   └── post-analyzer.ts       # 投稿分析・品質評価
│
├── kaito-api/                 # KaitoTwitterAPI関連 (3ファイル)
│   ├── client.ts              # KaitoTwitterAPIクライアント
│   ├── search-engine.ts       # 投稿検索エンジン
│   └── action-executor.ts     # アクション実行統合
│
├── scheduler/                 # スケジュール制御 (2ファイル)
│   ├── core-scheduler.ts      # 30分間隔制御
│   └── main-loop.ts           # メイン実行ループ統合
│
├── data/                      # データ管理 (1ファイル)
│   └── data-manager.ts        # dataディレクトリ管理
│
├── shared/                    # 共通機能 (3ファイル)
│   ├── types.ts               # 型定義統合
│   ├── config.ts              # 設定管理
│   └── logger.ts              # ログ管理
│
└── main.ts                    # システム起動スクリプト (1ファイル)
```

## 🔧 実装要件詳細

### 1. スケジューラー実装 (scheduler/)

#### core-scheduler.ts
```typescript
export class CoreScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // 30分間隔での自動実行開始
  start(): void {
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.executeCore();
        } finally {
          this.isRunning = false;
        }
      }
    }, 30 * 60 * 1000); // 30分 = 1800秒
  }
  
  // 実行制御
  private async executeCore(): Promise<void>
}
```

#### main-loop.ts
```typescript
export class MainLoop {
  // メイン実行ループ
  async runMainLoop(): Promise<void> {
    // 1. データ読み込み
    // 2. Claude判断
    // 3. アクション実行
    // 4. 結果記録
  }
}
```

### 2. Claude機能実装 (claude/)

#### decision-engine.ts
```typescript
export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;
    searchQuery?: string;
    content?: string;
    targetTweetId?: string;
  };
  confidence: number;
}

export class ClaudeDecisionEngine {
  async makeDecision(context: SystemContext): Promise<ClaudeDecision>
}
```

### 3. KaitoTwitterAPI実装 (kaito-api/)

#### client.ts - 既存x-poster.tsを活用
```typescript
export class KaitoApiClient {
  // 投稿実行
  async createPost(content: string): Promise<PostResult>
  
  // リツイート実行  
  async retweet(tweetId: string): Promise<PostResult>
  
  // 引用リツイート実行
  async quoteTweet(tweetId: string, comment: string): Promise<PostResult>
  
  // いいね実行
  async like(tweetId: string): Promise<PostResult>
  
  // 投稿検索
  async searchTweets(query: string): Promise<Tweet[]>
}
```

### 4. データ管理実装 (data/)

#### data-manager.ts
```typescript
export class DataManager {
  // 学習データ読み込み
  async loadLearningData(): Promise<LearningData>
  
  // セッション記憶読み込み
  async loadSessionMemory(): Promise<SessionMemory>
  
  // 学習データ保存
  async saveLearningData(data: LearningData): Promise<void>
  
  // 現在コンテキスト構築
  async loadCurrentContext(): Promise<SystemContext>
}
```

## 🎯 実装優先順位

### Week 1: 基盤実装
1. **shared/types.ts** - 全型定義
2. **shared/config.ts** - 設定管理
3. **shared/logger.ts** - ログ管理
4. **data/data-manager.ts** - データ管理

### Week 2: コア機能実装  
5. **claude/decision-engine.ts** - Claude判断エンジン
6. **claude/content-generator.ts** - 投稿内容生成
7. **kaito-api/client.ts** - KaitoTwitterAPIクライアント

### Week 3: 統合実装
8. **kaito-api/search-engine.ts** - 検索機能
9. **kaito-api/action-executor.ts** - アクション実行
10. **scheduler/main-loop.ts** - メインループ

### Week 4: 完成・テスト
11. **scheduler/core-scheduler.ts** - スケジューラー
12. **main.ts** - システム起動

## ⚠️ 重要な実装原則

### MVP最優先
- **動作確実性 > 理論的完璧性**
- **シンプルな実装 > 複雑な最適化**
- **基本エラーハンドリング（try-catch + ログ）**

### 既存活用
- **既存x-poster.tsの活用**: KaitoAPI統合機能を最大活用
- **既存utils/の活用**: ログ・認証機能の流用
- **dataディレクトリ構造**: 学習データの継続活用

### 30分間隔実装
- **setInterval(30 * 60 * 1000)** による定期実行
- **isRunning**フラグによるオーバーラップ防止
- **エラー時の次回実行保証**

## 📊 成功指標

### 必須達成目標
- [ ] 30分間隔での確実な自動実行
- [ ] 5種類のアクション（投稿・RT・引用RT・いいね・待機）正常動作
- [ ] dataディレクトリからの学習データ活用
- [ ] Claude Code SDKによる適切なアクション判断
- [ ] KaitoTwitterAPIによる確実なアクション実行

### 品質目標
- [ ] エラー時の適切な復旧・継続実行
- [ ] 学習データの適切な蓄積・活用
- [ ] 投稿品質の維持（投資教育価値）
- [ ] システム稼働率95%以上

## 📋 完了後の必須作業

1. **動作確認**: 30分間隔実行の確認
2. **アクションテスト**: 全5種類のアクション動作確認
3. **学習データ**: データ蓄積・活用の確認
4. **エラーハンドリング**: 障害時の適切な処理確認

## 🚨 重要な注意点

### データ活用
- **dataディレクトリ必須**: 学習データからの判断材料取得
- **学習データ更新**: 実行結果の適切な記録・蓄積
- **セッション継続**: 30分間隔での状態引き継ぎ

### Claude統合
- **判断プロンプト**: 現在状況+学習データの統合分析
- **JSON返却**: 構造化されたアクション決定結果
- **confidence値**: 判断の確信度による実行制御

### KaitoTwitterAPI統合
- **既存機能活用**: x-poster.tsのKaitoAPI統合機能
- **フォールバック**: KaitoAPI失敗時の従来方式対応
- **レート制限**: 200 QPS制限内での適切な実行

---

## 🎯 最終目標

**30分おきに自動実行し、Claude判断でX投稿・RT・いいね等を行い、結果を学習して継続改善するMVPシステムの完成**

頑張ってください！動作するシステムの実現を最優先に実装を進めてください。🚀