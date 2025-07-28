# ESLintエラー修正指示書

## 🚨 修正対象ファイル
`src/collectors/rss-collector.ts`

## 🔧 修正が必要なESLintエラー

### 1. fetchのimport追加（line 1付近）

```typescript
import fetch from 'node-fetch';
```

または

```typescript
import { fetch } from 'node-fetch';
```

### 2. 未使用のimport削除（lines 5-8）

以下の未使用importを削除：
```typescript
RSSSourceConfig,
RSSItem, 
RSSFeedResult,
createCollectionResult,
```

### 3. 正規表現のエスケープ文字修正（line 507）

**現在**:
```typescript
cleaned = cleaned.replace(/([a-zA-Z-]+)=(?!["\'\w])/g, '$1=""');
```

**修正後**:
```typescript
cleaned = cleaned.replace(/([a-zA-Z-]+)=(?!["'\w])/g, '$1=""');
```

### 4. 制御文字正規表現の修正（line 513）

**現在**:
```typescript
cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
```

**修正後**:
```typescript
cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
```

### 5. 正規表現の不要エスケープ修正（line 519）

**現在**:
```typescript
cleaned = cleaned.replace(/<([^>\s]+)[^>]*(?<![\/"])>/g, (match, tagName) => {
```

**修正後**:
```typescript
cleaned = cleaned.replace(/<([^>\s]+)[^>]*(?<![/"])>/g, (match, _tagName) => {
```

### 6. 未使用変数修正

- `tagName` → `_tagName` に変更（使用しない変数の明示）
- `context` パラメータを使用するか `_context` に変更

## ✅ 修正完了チェック

修正後、以下コマンドでエラーがないことを確認：
```bash
npx eslint src/collectors/rss-collector.ts
```

## 🎯 期待結果

ESLintエラー0件、警告のみの状態にする