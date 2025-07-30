# TASK-001: DataManager大幅簡素化 - 1実行=1アクション対応

## 🎯 タスク概要

`src/shared/data-manager.ts`の大幅な簡素化を実行します。「1実行 = 1アクション」の原則に基づき、過剰に複雑な構造を削除し、新しいディレクトリ構造に対応させます。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. 削除対象メソッド（大幅削除）

以下のメソッドを完全削除してください：

#### Context管理関連（contextディレクトリ廃止）
- `loadSessionMemory()`
- `saveSessionMemory()`
- `loadCurrentStatus()`
- `saveCurrentStatus()`
- `updateAccountStatus()`
- `getDefaultSessionMemory()`
- `getDefaultCurrentStatus()`
- `normalizeKaitoAccountInfo()`
- `estimateTodayTweets()`

#### 複雑なExecution管理（簡素化）
- `saveClaudeOutput()`
- `saveKaitoResponse()`
- `savePost()`
- `updatePostIndex()`
- `loadPostsFromDirectory()`
- `getCurrentExecutionData()`
- `getRecentPosts()`
- `getRecentPostsFromHistory()`

### 2. 簡素化対象メソッド

#### `initializeExecutionCycle()` 
```typescript
async initializeExecutionCycle(): Promise<string> {
  // 既存currentをhistoryにアーカイブ（存在する場合）
  if (this.currentExecutionId) {
    await this.archiveCurrentToHistory();
  }

  // 新規実行ID生成
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  this.currentExecutionId = `execution-${year}${month}${day}-${hour}${minute}`;
  
  // 実行ディレクトリ作成（単一ディレクトリのみ）
  const executionDir = path.join(this.currentDir, this.currentExecutionId);
  await fs.mkdir(executionDir, { recursive: true });

  console.log(`✅ 新規実行サイクル初期化完了: ${this.currentExecutionId}`);
  return this.currentExecutionId;
}
```

#### 新規メソッド追加: `savePost()`
```typescript
async savePost(postData: {
  actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
  content?: string;
  tweetId?: string;
  result: any;
  engagement?: any;
}): Promise<void> {
  if (!this.currentExecutionId) {
    throw new Error('No active execution cycle');
  }

  const post = {
    executionId: this.currentExecutionId,
    actionType: postData.actionType,
    timestamp: new Date().toISOString(),
    content: postData.content || '',
    result: postData.result,
    engagement: postData.engagement || {
      likes: 0,
      retweets: 0,
      replies: 0
    }
  };

  const postPath = path.join(
    this.currentDir,
    this.currentExecutionId,
    'post.yaml'
  );

  await fs.writeFile(
    postPath,
    yaml.dump(post, { indent: 2 }),
    'utf-8'
  );

  console.log(`✅ 投稿データ保存完了: ${postData.actionType}`);
}
```

### 3. インターフェース整理

以下のインターフェースを削除：
- `SessionMemory`
- `CurrentStatus`
- `ExecutionSummary`
- `CurrentExecutionData`
- `PostData`

### 4. プロパティ削除

以下のプロパティを削除：
- `private readonly contextDir`
- プロパティに関連するensureDirectories()の該当部分

### 5. 新しいディレクトリ構造対応

#### 構造変更後：
```
data/current/execution-YYYYMMDD-HHMM/
└── post.yaml  # 全実行情報を1ファイルに統合
```

#### 削除対象ディレクトリ構造：
```
execution-YYYYMMDD-HHMM/
├── claude-outputs/     # 削除
├── kaito-responses/    # 削除
├── posts/              # 削除
└── execution-summary.yaml  # 削除
```

## 🚨 重要な制約事項

### MVP制約遵守
- **過剰な機能は実装しない**: 最小限の機能のみ
- **統計機能は含めない**: 分析・集計機能は除外
- **シンプルさ優先**: 複雑性を避ける

### TypeScript品質要件
- **型安全性**: strict mode遵守
- **エラーハンドリング**: 適切なエラー処理
- **コメント不要**: コメントは追加しない

## 📝 実装手順

1. **ドキュメント読込み**: 必須ドキュメントの確認
2. **メソッド削除**: 指定されたメソッドの完全削除
3. **インターフェース整理**: 不要なインターフェースの削除
4. **新メソッド実装**: 簡素化されたsavePost()の実装
5. **プロパティ整理**: 不要なプロパティの削除
6. **動作確認**: TypeScriptコンパイル確認

## ✅ 完了条件

- [ ] 指定されたメソッドがすべて削除されている
- [ ] 新しいsavePost()メソッドが実装されている
- [ ] 不要なインターフェースが削除されている
- [ ] TypeScriptエラーが発生しない
- [ ] ファイルサイズが大幅に削減されている（目安：50%以上削減）

## 📋 注意事項

- **既存コードとの互換性**: 他のファイルでの使用箇所があるため、メソッド削除時は注意深く行う
- **ファイル構造**: data/contextディレクトリは削除しない（他のWorkerが担当）
- **出力先制限**: tasks/20250730_180627/reports/REPORT-001-datamanager-simplification.md にのみ報告書を出力

## 🎯 期待される効果

- ファイルサイズ50%以上削減
- メソッド数の大幅削減
- 保守性の向上
- 新しいディレクトリ構造への完全対応