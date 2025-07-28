# 🎯 Worker権限実装指示書 - データアーキテクチャ実装

## 📋 タスク概要
REQUIREMENTS.md更新に基づく、新しいデータディレクトリ構造の実装

**目標**: MVP最小構成（current/history）の実装 - 既存ディレクトリ（config/、context/）は変更なし

## 🔧 実装タスク一覧

### Task 1: ディレクトリ構造作成
```bash
# 新ディレクトリ構造作成（既存ディレクトリには触れない）
src/data/
├── current/           # 新規作成
├── history/           # 新規作成
├── config/            # 既存（変更なし）
└── context/           # 既存（変更なし）

# 注: learning/ディレクトリはMVPでは作成しない
```

### Task 2: 環境変数設定

#### 2-1. .envファイル作成
```bash
# .envファイル（ルートディレクトリ）
KAITO_API_TOKEN=your-api-token-here
POSTS_PER_HOUR=10
RETWEETS_PER_HOUR=20
LIKES_PER_HOUR=50
CLAUDE_MODEL=claude-3-sonnet
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7
```

### Task 3: DataManager拡張実装

#### 3-1. サイクル管理機能追加
```typescript
// src/data/data-manager.ts に追加

interface ExecutionCycle {
  cycleId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'archived';
}

class DataManager {
  // 新メソッド追加
  async startNewCycle(): Promise<string> {
    // 1. 前サイクルのアーカイブ
    await this.archivePreviousCycle();
    
    // 2. 新サイクルディレクトリ作成
    const cycleId = this.generateCycleId();
    await this.createCycleDirectory(cycleId);
    
    // 3. active-session.yaml初期化
    await this.initializeActiveSession(cycleId);
    
    return cycleId;
  }
  
  async archivePreviousCycle(): Promise<void> {
    // current/execution-* を history/YYYY-MM/DD-HHMM/ に移動
  }
  
  private generateCycleId(): string {
    const now = new Date();
    return `execution-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  }
}
```

#### 3-2. Claude出力保存機能
```typescript
// Claude各エンドポイント結果の保存
async saveClaudeDecision(decision: ClaudeDecision, cycleId: string): Promise<void> {
  const filePath = `current/${cycleId}/claude-outputs/decision.yaml`;
  await this.saveYaml(filePath, {
    timestamp: new Date().toISOString(),
    decision,
    executionId: cycleId
  });
}

async saveGeneratedContent(content: GeneratedContent, cycleId: string): Promise<void> {
  const filePath = `current/${cycleId}/claude-outputs/content.yaml`;
  await this.saveYaml(filePath, {
    timestamp: new Date().toISOString(),
    content,
    executionId: cycleId
  });
}

// 同様にanalysis.yaml, search-query.yaml用メソッドも実装
```

#### 3-3. 投稿データ管理（1投稿1ファイル）
```typescript
interface PostData {
  id: string;
  timestamp: string;
  content: string;
  type: 'original' | 'retweet' | 'quote' | 'reply';
  creation: {
    claudeDecision?: any;
    generatedContent?: any;
    kaitoResponse?: any;
  };
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    lastUpdated: string;
  };
  analysis?: {
    performanceScore: number;
    learningInsights: string[];
  };
}

async savePost(postData: PostData, cycleId: string): Promise<void> {
  // 1. 個別ファイル保存
  const filename = `post-${postData.timestamp.replace(/[:.]/g, '-')}.yaml`;
  const filePath = `current/${cycleId}/posts/${filename}`;
  await this.saveYaml(filePath, postData);
  
  // 2. インデックス更新
  await this.updatePostIndex(postData, cycleId);
  
  // 3. 月別アーカイブに追加
  await this.addToMonthlyArchive(postData);
}

async updatePostIndex(post: PostData, cycleId: string): Promise<void> {
  const indexPath = `current/${cycleId}/posts/post-index.yaml`;
  const index = await this.loadYaml(indexPath) || { posts: [] };
  
  index.posts.push({
    id: post.id,
    timestamp: post.timestamp,
    type: post.type,
    performanceScore: post.analysis?.performanceScore || 0
  });
  
  await this.saveYaml(indexPath, index);
}
```

#### 3-4. Kaito API差分取得対応
```typescript
interface KaitoSyncStrategy {
  lastFullSync?: string;
  cachedPosts: Map<string, any>;
}

async syncTwitterPosts(): Promise<PostData[]> {
  const strategy = await this.loadSyncStrategy();
  const now = new Date();
  
  if (this.shouldPerformFullSync(strategy.lastFullSync)) {
    // 24時間毎のフル同期（最新20件）
    return await this.fullPostSync();
  } else {
    // 差分取得（最新5件）
    return await this.incrementalSync(strategy.cachedPosts);
  }
}

private shouldPerformFullSync(lastSync?: string): boolean {
  if (!lastSync) return true;
  const hoursSinceLastSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastSync > 24;
}
```

### Task 4: 実行フロー統合

#### 4-1. ExecutionFlowクラス修正
```typescript
// src/main-workflows/execution-flow.ts

async executeMainLoop(): Promise<ExecutionResult> {
  const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
  
  // 新サイクル開始
  const cycleId = await dataManager.startNewCycle();
  
  try {
    // 既存の4ステップワークフロー実行
    // ... 
    
    // 各ステップでの保存処理追加
    await dataManager.saveClaudeDecision(decision, cycleId);
    await dataManager.saveGeneratedContent(content, cycleId);
    // ...
    
  } finally {
    // 実行サマリー保存
    await dataManager.saveExecutionSummary(result, cycleId);
  }
}
```

### Task 5: 月次整理機能（MVP簡易版）

```typescript
// MVP版：historyデータのみ整理
async performMonthlyMaintenance(): Promise<void> {
  // 1. 古いhistoryデータの圧縮
  await this.compressOldHistory();
  
  // 2. インデックスの再構築
  await this.rebuildHistoryIndex();
}
```

## 📝 実装チェックリスト（MVPシンプル版）

- [ ] 新ディレクトリ作成（current/、history/のみ）
- [ ] DataManagerクラス拡張（既存機能に影響なし）
  - [ ] サイクル管理機能
  - [ ] Claude出力保存
  - [ ] 投稿データ管理
  - [ ] Kaito API差分取得
- [ ] ExecutionFlow統合
- [ ] 月次整理機能（historyのみ）
- [ ] 既存ディレクトリの動作確認
- [ ] ユニットテスト作成
- [ ] 統合テスト実施

## ⚠️ 注意事項

1. **既存データの保護**
   - config/、context/ディレクトリは一切変更しない
   - 既存のファイル・データ構造をそのまま維持
   - 新機能は新ディレクトリ（current/、history/）のみで実装

2. **後方互換性**
   - 既存のloadConfig()、loadCurrentStatus()等のメソッドは変更なし
   - loadLearningData()はMVPでは空データ返却のみ（将来拡張用）
   - 新機能は既存機能から完全に独立して実装
   - current/history関連は新規メソッドとして追加

3. **エラーハンドリング**
   - ディレクトリ作成失敗時の対処
   - YAML読み書きエラーの適切な処理

4. **パフォーマンス考慮**
   - 大量の投稿データでも高速動作
   - インデックスの効率的な管理

## 🎯 完了条件

1. `pnpm dev`でcurrent/、history/ディレクトリが自動作成される
2. 30分実行毎にcurrent→historyアーカイブが動作
3. Claude出力・Kaito応答が適切に保存される
4. 投稿データが1投稿1ファイルで管理される
5. 既存ディレクトリ（config/、context/）が変更されていない
6. learning/ディレクトリが作成されていない（MVPでは不要）
7. 全テストがパスする