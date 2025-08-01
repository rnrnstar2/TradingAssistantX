# TASK-002: ワークフローフォロー統合実装

## 🎯 **実装目標**
MainWorkflowのフォローアクションを修正し、Claude AI選択機能を統合して戦略的フォロー対象選別を実現する。

## 📋 **前提条件**
✅ **依存関係**: TASK-001（Claude選択機能フォロー対応）の完了が必須  
Worker1の実装完了後に開始してください。

## 📋 **MVP制約確認**
- ✅ **必要最小限**: フォローアクション修正のみ（重複防止は最小限）
- ✅ **シンプル性重視**: 既存のワークフロー構造を維持、過剰な機能追加禁止
- ✅ **実用性最優先**: Claude AI選択による品質向上に集中

## 📁 **対象ファイル**
- **主要修正**: `src/workflows/main-workflow.ts`
- **設定ファイル**: `data/config/schedule.yaml`（検索クエリ多様化・オプション）

## 🔍 **実装要件**

### 1. **main-workflow.ts修正**

#### **executeFollowAction関数の完全改修**
**修正箇所**: `src/workflows/main-workflow.ts:650-716`

**現在のコード（問題）**:
```typescript
// 最初のツイートの作者をフォロー対象として選択（機械的選択）
const targetTweet = otherstweets[0];
const targetUserId = targetTweet.author_id;
```

**修正後のコード（Claude AI選択）**:
```typescript
// Claude最適選択機能を使用（フォロー専用評価）
let selectedTweet: SelectedTweet;
try {
  // 型変換: TweetData[] → TweetCandidate[]
  const candidates: TweetCandidate[] = otherstweets.map(convertTweetDataToCandidate);
  
  // Claude選択実行（フォロー戦略的評価）
  selectedTweet = await selectOptimalTweet({
    candidates: candidates,
    selectionType: 'follow',
    criteria: {
      topic: 'investment_education_expert',
      qualityThreshold: 7,
      engagementWeight: 0.2, // 影響力評価
      relevanceWeight: 0.8   // 専門性・相互フォロー可能性重視
    },
    context: {
      userProfile: this.convertAccountInfoToProfile(currentUser),
      learningData: undefined // フォローには学習データ不要
    }
  });
  
  console.log(`✅ Claude最適選択完了: ${selectedTweet.tweetId} (スコア: ${selectedTweet.score}/10)`);
  console.log(`💡 選択理由: ${selectedTweet.reasoning}`);
  
} catch (claudeError) {
  console.warn('⚠️ Claude選択に失敗、フォールバック選択を使用:', claudeError);
  // フォールバック: 最初のツイートを選択
  const fallbackTweet = otherstweets[0];
  selectedTweet = {
    tweetId: fallbackTweet.id,
    authorId: fallbackTweet.author_id,
    score: 5,
    reasoning: 'Claude選択エラーによるフォールバック選択',
    expectedImpact: 'medium'
  };
}

// 選択されたツイートでフォロー実行
const targetUserId = selectedTweet.authorId;
```

#### **フォロー結果レスポンス修正**
**修正箇所**: 戻り値にClaude選択情報を追加
```typescript
return {
  success: followResult.success,
  action: WORKFLOW_CONSTANTS.ACTIONS.FOLLOW,
  targetUserId: targetUserId,
  targetTweetText: otherstweets.find(t => t.id === selectedTweet.tweetId)?.text.substring(0, 100) || 'Unknown',
  searchQuery: targetQuery,
  result: followResult,
  claudeSelection: {                    // ← 追加
    score: selectedTweet.score,
    reasoning: selectedTweet.reasoning,
    expectedImpact: selectedTweet.expectedImpact
  },
  error: followResult.error,
  timestamp: new Date().toISOString()
};
```

### 2. **Import文の追加**
**修正箇所**: `src/workflows/main-workflow.ts:13`
```typescript
import { generateContent, selectOptimalTweet, convertTweetDataToCandidate } from '../claude';
import { type SelectedTweet, type TweetSelectionParams, type TweetCandidate, type AccountInfo } from '../claude/types';
```

### 3. **schedule.yaml検索クエリ多様化（オプション）**

#### **現在の単一クエリ**
```yaml
- time: "16:00"
  action: "follow"
  target_query: "投資 勉強中"
```

#### **多様化クエリ例（実装したい場合）**
```yaml
- time: "16:00"
  action: "follow"
  target_query: "投資初心者 質問"
- time: "16:30"
  action: "follow"
  target_query: "資産形成 相談"
- time: "17:00"
  action: "follow"
  target_query: "NISA 始め方"
```

**注意**: schedule.yaml修正は**オプション**。main-workflow.tsの修正が主要目標。

## 🧪 **必須実装内容**

### **Core機能実装**
1. **executeFollowAction関数の完全改修**
2. **Claude AI選択機能の統合**
3. **エラーハンドリング強化（フォールバック選択）**
4. **選択情報のレスポンス追加**

### **品質要件**
- ✅ **TypeScript Strict**: 型安全性確保
- ✅ **既存機能保持**: 他のアクション（post/retweet/like/quote_tweet）に影響なし
- ✅ **エラーハンドリング**: Claude選択失敗時の適切なフォールバック

## 📖 **必須参照ドキュメント**
**Worker実装前に必ず読み込み必須**:
- `docs/workflow.md` - メインワークフロー・フォローアクション仕様
- `docs/claude.md` - Claude SDK選択機能・エンドポイント設計
- `docs/kaito-api.md` - フォロー機能・エンドポイント仕様
- `docs/directory-structure.md` - ファイル構造・責任範囲

## 🚫 **実装禁止事項**
- ❌ **高機能重複防止**: 複雑なフォロー履歴管理システム
- ❌ **統計・分析機能**: フォローパフォーマンス分析・ダッシュボード
- ❌ **設定ファイル大幅修正**: schedule.yaml構造変更（オプション実装のみ）
- ❌ **新規ファイル作成**: 既存ファイル拡張のみ

## 🧪 **テスト要件**

### **動作確認**
1. **フォローアクション実行テスト**
```bash
pnpm dev:follow
```

2. **Claude選択ログ確認**
- Console出力でClaude選択情報（スコア・理由）確認
- フォールバック動作確認

3. **既存機能影響確認**
```bash
pnpm dev:post
pnpm dev:retweet
pnpm dev:like
```

## 📋 **完了条件**
1. ✅ `pnpm dev:follow`でClaude AI選択による戦略的フォロー実行
2. ✅ Console出力でClaude選択情報（スコア・理由）表示
3. ✅ Claude選択エラー時のフォールバック動作確認
4. ✅ 既存アクション（post/retweet/like/quote_tweet）が正常動作
5. ✅ TypeScript型チェック・lintエラーなし

## 📁 **報告書作成**
実装完了後、以下のパスに報告書を作成してください：
**報告書**: `tasks/20250731_012458/reports/REPORT-002-workflow-follow-integration.md`

### **報告書必須内容**
- 実装した機能の詳細
- 修正したファイルとその内容
- テスト実行結果（`pnpm dev:follow`実行ログ）
- 既存機能への影響確認結果
- Claude選択機能の動作確認結果