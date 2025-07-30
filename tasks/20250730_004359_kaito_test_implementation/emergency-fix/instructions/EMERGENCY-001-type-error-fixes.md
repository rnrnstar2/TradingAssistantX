# EMERGENCY-001: TypeScript型エラー緊急修正指示書

## 🚨 **緊急度**: CRITICAL - 最優先

**実行モード**: 単独実行 - 型エラー解消に集中  
**推定時間**: 60-90分  
**成功基準**: `npx tsc --noEmit` でエラー0件

## 📋 **現状把握**

**型エラー数**: 83件  
**影響範囲**: src/kaito-api/配下の中核機能  
**深刻度**: コンパイル不可 - 本番デプロイ不可能状態

## 🔧 **優先度別修正タスク**

### **Priority 1: API定数エラー修正（1件）**

**問題**: `API_ENDPOINTS.myAccountInfo`が存在しない

**修正方法**:
```typescript
// src/kaito-api/core/client.ts (Line 589)
// 削除
myAccountInfo: API_ENDPOINTS.myAccountInfo,

// または、以下に修正
// myAccountInfo: API_ENDPOINTS.userInfo, // fallback to userInfo
```

### **Priority 2: TwitterAPIResponse型構造修正（22件）**

**問題**: TwitterAPIResponseに`status`, `tweet_id`等のプロパティが存在しない

**修正箇所**: src/kaito-api/core/client.ts (Lines 1426-1478)

**修正方法**:
```typescript
// TwitterAPI.ioのレスポンス構造に合わせて型ガードを追加
// 例: Line 1426
if ('status' in response && response.status === 'success') {
  // TwitterAPI.io形式の処理
} else if (response?.data?.id) {
  // 標準Twitter API v2形式の処理
}
```

### **Priority 3: PostRequest型プロパティ修正（14件）**

**問題**: `content` vs `tweet_text`、`mediaIds` vs `media_ids`のプロパティ名不一致

**修正箇所**: src/kaito-api/endpoints/authenticated/tweet.ts

**修正方法**:
```typescript
// PostRequestインターフェースの確認
// content → tweet_text
// mediaIds → media_ids
// または型定義側を修正
```

### **Priority 4: 型エクスポート修正（4件）**

**問題**: 未エクスポート型の参照

**修正箇所**: 
- src/kaito-api/endpoints/authenticated/follow.ts
- src/kaito-api/endpoints/authenticated/tweet.ts

**修正方法**:
```typescript
// src/kaito-api/utils/types.tsに以下を追加
export interface FollowResult { ... }
export interface UnfollowResult { ... }
export interface DeleteTweetResult { ... }
export type CreateTweetV2Response = TwitterAPIBaseResponse<TweetData>;
```

### **Priority 5: APIResult型継承エラー修正（10件）**

**問題**: APIResultがobject型でないため継承できない

**修正箇所**: 
- src/kaito-api/endpoints/read-only/tweet-search.ts
- src/kaito-api/endpoints/read-only/user-info.ts

**修正方法**:
```typescript
// interfaceの継承を修正
interface TweetResponse {
  success: boolean;
  data?: TweetData;
  error?: string;
  rateLimit?: RateLimitInfo;
}
// extends APIResult<TweetData>を削除
```

### **Priority 6: プロパティ名修正（残り全件）**

**各種プロパティ名の不一致を修正**:
- `createdAt` → `created_at`
- `tweet_volume` → `tweetVolume`
- `maxResults` → `max_results`
- `count` → 適切なプロパティ名

## ⚠️ **修正制約**

### **絶対遵守事項**
1. **最小限修正**: 型エラー解消のみ - 機能追加禁止
2. **既存動作維持**: ロジック変更禁止
3. **型安全性**: any型使用禁止
4. **テスト維持**: 既存テストの破壊禁止

### **修正範囲**
- **対象**: src/kaito-api/配下のみ
- **除外**: tests/配下は現段階で触らない

## 📝 **検証手順**

```bash
# 1. 型チェック（必須）
npx tsc --noEmit --project .

# 2. 該当ファイルのみテスト
npm test src/kaito-api/core/client.test.ts

# 3. 全体影響確認
npm test kaito-api -- --run
```

## ✅ **完了基準**

1. **型エラー0件**: `npx tsc --noEmit`でエラーなし
2. **コンパイル成功**: ビルド可能状態
3. **テスト影響最小**: 既存テストの破壊なし

## 🚨 **重要注意事項**

**型定義の整合性を最優先**
- TwitterAPI.ioの実際のレスポンス形式に合わせる
- docs/kaito-api.mdのWebドキュメントを参照
- 推測での型定義追加は禁止

**影響範囲を最小化**
- 型エラー修正以外の変更は一切禁止
- 新機能追加・リファクタリング禁止
- コメント追加も最小限

---
**🔥 このタスクは最優先です。型エラーが解消されるまで他の作業は進められません。**