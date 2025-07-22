# 命名規則

## ファイル・ディレクトリ
```typescript
// TypeScript/JavaScript: kebab-case
user-auth.ts, api-client.ts, x-api-manager.ts

// クラス名: PascalCase  
class ContentGenerator, class XApiManager

// 設定ファイル: {機能名}-config.yaml
autonomous-config.yaml, account-config.yaml
```

## 変数・関数
```typescript
// 変数: camelCase
const userAccount = 'john';
const postingFrequency = 15;

// 関数: camelCase + 動詞
function generateContent(theme: string) { }
function schedulePost(content: PostContent) { }

// 定数: UPPER_SNAKE_CASE
const MAX_POSTS_PER_DAY = 15;
const API_BASE_URL = 'https://api.example.com';
```

## 型定義
```typescript
// インターフェース: PascalCase
interface PostContent { }
interface AccountStrategy { }

// 型: PascalCase + Type
type ConfigType = 'production' | 'development';
type PostingPhase = 'growth' | 'engagement';
```

## 配置ルール
- **設定**: `data/` ディレクトリ直下のみ
- **出力**: `tasks/outputs/` または `tasks/{TIMESTAMP}/outputs/`
- **タスク**: `TASK-XXX-{name}-{type}.{ext}`