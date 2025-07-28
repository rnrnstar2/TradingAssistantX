# original_post専用化作業指示書

## 🎯 **作業概要**
現在のシステムがreplyや引用ツイート機能を実行しようとしているが、現時点では不要。original_postのみに絞った実装に修正する。

## 🔍 **調査結果**
以下の箇所でreply・quote_tweet機能が定義・実行されている：

### 1. 戦略決定プロンプト
**ファイル**: `src/lib/claude-autonomous-agent.ts:83`
```
**アクションタイプ自由選択**: ['original_post', 'quote_tweet', 'retweet', 'reply'] から最適な組み合わせを選択
```

### 2. 実行処理
**ファイル**: `src/lib/claude-autonomous-agent.ts:456-472`
- reply処理（456-460行）
- quote_tweet処理（462-466行）
- retweet処理（468-472行）

### 3. フォールバック戦略
**ファイル**: `src/lib/claude-autonomous-agent.ts:505`
```
actionTypes: ['original_post', 'quote_tweet'],
```

## 🛠️ **実装作業**

### タスク1: 戦略決定プロンプトの修正
**ファイル**: `src/lib/claude-autonomous-agent.ts`
**行番号**: 83

**変更前**:
```
1. **アクションタイプ自由選択**: ['original_post', 'quote_tweet', 'retweet', 'reply'] から最適な組み合わせを選択
```

**変更後**:
```
1. **アクションタイプ選択**: ['original_post'] のみを使用（現在はoriginal_postのみサポート）
```

### タスク2: 実行処理のコメントアウト
**ファイル**: `src/lib/claude-autonomous-agent.ts`
**行番号**: 456-472

以下の処理をコメントアウト:
- reply処理（456-460行）
- quote_tweet処理（462-466行）
- retweet処理（468-472行）

**修正例**:
```typescript
case 'original_post':
  result = await this.xClient.post(action.content);
  break;
  
// 以下の機能は現在未実装のためコメントアウト
/*
case 'reply':
  console.log('🔄 [Reply] リプライ機能は対象ツイートID特定の実装が必要');
  result = { success: false, error: 'Reply target not specified' };
  break;
  
case 'quote_tweet':
  console.log('🔄 [Quote] 引用ツイート機能は対象ツイートID特定の実装が必要');
  result = { success: false, error: 'Quote target not specified' };
  break;
  
case 'retweet':
  console.log('🔄 [Retweet] リツイート機能は対象ツイートID特定の実装が必要');
  result = { success: false, error: 'Retweet target not specified' };
  break;
*/
```

### タスク3: フォールバック戦略の修正
**ファイル**: `src/lib/claude-autonomous-agent.ts`
**行番号**: 505

**変更前**:
```typescript
actionTypes: ['original_post', 'quote_tweet'],
```

**変更後**:
```typescript
actionTypes: ['original_post'],
```

### タスク4: その他のactionTypes配列の修正
**検索して確認**: 他にもactionTypesで複数のタイプを定義している箇所があれば、すべて`['original_post']`のみに修正

## ⚡ **実行後確認**
修正完了後、以下を実行して動作確認:
```bash
pnpm dev
```

**期待される結果**:
- original_postのみが実行される
- reply・quote_tweetの実行エラーが発生しない
- 1投稿のみ成功のログが表示される

## 📝 **注意事項**
- プロダクションコードの編集作業のため、Worker権限で実行
- 変更は最小限に留める
- 将来的にreply・quote_tweet機能を実装する際は、コメントアウト部分を参考に実装可能

## ✅ **作業完了条件**
1. システムがoriginal_postのみを実行する
2. reply・quote_tweetの実行エラーが発生しない
3. ログで「1/3成功」ではなく「1/1成功」が表示される