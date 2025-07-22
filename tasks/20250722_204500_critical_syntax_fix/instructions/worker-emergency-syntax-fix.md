# 🚨 緊急ワーカー指示書: x-client.ts構文エラー修正

## ❗ **CRITICAL: 緊急構文修正ミッション**
システム全体がビルド不可状態。x-client.ts構文破損の即座修正が必要。

## 📋 **緊急修正対象**

### 🔥 主要エラー箇所
**エラー位置**: `src/providers/x-client.ts:331`
```
ERROR: Expected ";" but found ":"
Transform failed - ビルド完全停止
```

### 🔍 破損パターン特定
```bash
# 構文エラー検索
grep -n "method:" src/providers/x-client.ts
# 結果: 8箇所のmethod:記述で構文不正疑い
```

## 🔧 **修正戦略**

### 1. 構文破損箇所の特定・修正
**問題箇所例**:
```typescript
// 破損状態（予想）
method: 'GET',
url: fullUrl  // <- セミコロン・構造不正
});

// 修正後
const response = await fetch(fullUrl, {
  method: 'GET',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  }
});
```

### 2. OAuth設定関連修正
**修正対象**: 無効なOAuth設定オブジェクト
```typescript
// 問題例
const authHeader = `Bearer ${this.authToken}`; // Simplified auth
  method: 'POST',  // <- 無効な位置
  url: url,
  params: {}
});

// 修正
const authHeader = `Bearer ${this.authToken}`;
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(params)
});
```

### 3. 全fetch呼び出し正規化
**対象メソッド**:
- `getEngagementMetrics()`: 331行目
- `quoteTweet()`: 400行目周辺  
- `retweet()`: 460行目周辺
- `replyToTweet()`: 520行目周辺

## ⚡ **修正手順**

### Step 1: 即座診断
```bash
# 構文エラー全箇所特定
pnpm tsc --noEmit 2>&1 | grep "x-client.ts" | head -20
```

### Step 2: パターン修正
```typescript
// 標準fetch呼び出しパターン
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${this.authToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(bodyParams)
});
```

### Step 3: 修正確認
```bash
# 段階的確認
pnpm tsc --noEmit
pnpm dev --help
```

## 🎯 **修正品質基準**

### 必須条件
- ✅ **構文エラー**: 完全ゼロ
- ✅ **ビルド可能**: `pnpm dev --help` 正常実行  
- ✅ **型安全**: TypeScriptエラーなし
- ✅ **機能保持**: 既存API呼び出し動作維持

### 最優先修正
1. **331行目周辺**: fetch構文修正
2. **400-600行目**: OAuth設定オブジェクト除去・fetch正規化
3. **全method:**パターン**: 正しいfetch構造に修正

## ⏱️ **修正時間制限**
**制限**: 15分以内完了
**理由**: システム全体停止中のため即座復旧必須

## 📊 **完了確認**
```bash
# 必須確認コマンド
pnpm tsc --noEmit               # TypeScriptエラー0件
pnpm dev --help                 # 正常起動確認
node -p "Date.now()"            # Node.js基本動作確認
```

## ✅ **完了条件**
1. ✅ 構文エラー完全解消（60+エラー→0エラー）
2. ✅ ビルド・実行正常化
3. ✅ x-client.ts全fetch呼び出し正規化完了
4. ✅ 既存機能動作保証

**⚡ 即座実行開始してください。システム復旧最優先。**