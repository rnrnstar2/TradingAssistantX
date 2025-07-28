# Worker指示書: DataManager拡張実装（current/history対応）

## 🎯 実装目的
REQUIREMENTS.mdに記載されているcurrent/history 2層アーキテクチャに対応するためDataManagerを拡張する。

## 📋 実装要件

### 1. 既存DataManagerの拡張
**対象ファイル**: `src/data/data-manager.ts`

#### 必須追加機能：
1. **Current層管理**
   - 実行サイクル毎のディレクトリ作成（execution-YYYYMMDD-HHMM形式）
   - Claude出力の保存（decision.yaml, content.yaml, analysis.yaml, search-query.yaml）
   - Kaito応答の保存（最新20件制限対応）
   - 投稿データの1投稿1ファイル管理（post-TIMESTAMP.yaml）
   - 投稿インデックス自動更新（post-index.yaml）
   - 実行サマリー作成（execution-summary.yaml）

2. **History層管理**
   - Current層の自動アーカイブ機能（実行完了後）
   - 月別フォルダ構造管理（YYYY-MM/DD-HHMM）
   - アーカイブ完了確認機能

3. **既存機能の維持**
   - config/, context/, learning/ディレクトリは変更なし
   - 既存メソッドの互換性維持

### 2. 新規メソッド実装

#### Current層管理メソッド
```typescript
// 新規実行サイクル開始
async initializeExecutionCycle(): Promise<string>

// Claude出力保存
async saveClaudeOutput(type: 'decision' | 'content' | 'analysis' | 'search-query', data: any): Promise<void>

// Kaito応答保存（最新20件制限対応）
async saveKaitoResponse(type: string, data: any): Promise<void>

// 投稿データ保存（1投稿1ファイル）
async savePost(postData: any): Promise<void>

// 実行サマリー更新
async updateExecutionSummary(summary: ExecutionSummary): Promise<void>
```

#### History層管理メソッド
```typescript
// Current層をHistoryにアーカイブ
async archiveCurrentToHistory(): Promise<void>

// 過去データ参照（月指定）
async getHistoryData(yearMonth: string): Promise<any>

// アーカイブ整合性チェック
async validateArchive(): Promise<boolean>
```

#### データ取得統合メソッド
```typescript
// 現在の実行データ取得
async getCurrentExecutionData(): Promise<CurrentExecutionData>

// 過去投稿データ取得（差分取得対応）
async getRecentPosts(limit: number = 20): Promise<PostData[]>
```

### 3. 型定義追加

```typescript
interface ExecutionSummary {
  executionId: string;
  startTime: string;
  endTime?: string;
  decision: ClaudeDecision;
  actions: Array<{
    type: string;
    timestamp: string;
    success: boolean;
    result?: any;
  }>;
  metrics: {
    totalActions: number;
    successCount: number;
    errorCount: number;
  };
}

interface CurrentExecutionData {
  executionId: string;
  claudeOutputs: {
    decision?: any;
    content?: any;
    analysis?: any;
    searchQuery?: any;
  };
  kaitoResponses: Record<string, any>;
  posts: PostData[];
  summary: ExecutionSummary;
}

interface PostData {
  id: string;
  timestamp: string;
  content: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}
```

### 4. ディレクトリ構造の自動作成

初回実行時に以下のディレクトリ構造を自動作成：
```
src/data/
├── current/               # 新規追加
├── history/               # 新規追加
├── config/                # 既存維持
├── context/               # 既存維持
└── learning/              # 既存維持
```

### 5. エラーハンドリング

- ディスク容量チェック（current: 1MB制限、history: 無制限だが警告）
- ファイル数制限チェック（current内20ファイル上限）
- 書き込み権限エラーの適切な処理
- アーカイブ失敗時のリトライ機構

### 6. 実装時の注意事項

1. **破壊的変更の禁止**
   - 既存メソッドのシグネチャ変更禁止
   - 既存の返却値の形式維持

2. **パフォーマンス配慮**
   - 大量ファイル操作時の非同期処理
   - インデックスファイルによる高速検索

3. **データ整合性**
   - トランザクション的な操作（全成功or全失敗）
   - 中断時の復旧機能

4. **KaitoAPI制限対応**
   - 最新20件制限を考慮した差分取得ロジック
   - 効率的なキャッシュ活用

## ✅ 完了条件

1. すべての新規メソッドが実装され、TypeScriptの型チェックを通過
2. 既存機能との互換性が維持されている
3. current/historyディレクトリの自動作成・管理が正常動作
4. エラーハンドリングが適切に実装されている
5. lint/type-checkが通過する

## 🚫 禁止事項

- 既存メソッドの破壊的変更
- config/context/learningディレクトリの構造変更
- モックデータの使用
- テストコードの実装（MVPでは不要）

## 📝 実装優先度

1. initializeExecutionCycle（最優先）
2. saveClaudeOutput, saveKaitoResponse
3. archiveCurrentToHistory
4. その他のメソッド

必ずREQUIREMENTS.mdの仕様に従って実装すること。