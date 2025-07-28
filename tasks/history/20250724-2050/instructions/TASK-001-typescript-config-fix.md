# Worker指示書: TypeScript設定修正とESMモジュール問題解決

## 🚨 緊急修正項目

実装されたDataManager拡張が実行時エラーで動作しない問題を解決する。

## 📋 実装要件

### 1. TypeScript設定修正（tsconfig.json）

現在のエラー:
```
error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', or 'nodenext'.
error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

#### 修正内容：
```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "node16",
    "moduleResolution": "node16",
    "downlevelIteration": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### 2. ESMモジュール解決エラー修正

現在のエラー:
```
SyntaxError: The requested module '../types' does not provide an export named 'AccountInfo'
```

#### kaito-api/index.ts作成
`src/kaito-api/index.ts`ファイルを作成し、統一されたエクスポートを提供：

```typescript
// ============================================================================
// KAITO API UNIFIED EXPORTS
// ============================================================================

// Core exports
export { KaitoApiClient, KaitoTwitterAPIClient } from './core/client';
export { KaitoAPIConfig } from './core/config';

// Type exports
export type {
  AccountInfo,
  PostResult,
  CoreRetweetResult,
  QuoteTweetResult,
  LikeResult,
  KaitoClientConfig,
  RateLimitStatus,
  RateLimitInfo,
  CostTrackingInfo
} from './types';

// Endpoint exports
export { ActionEndpoints } from './endpoints/action-endpoints';
export { TweetEndpoints } from './endpoints/tweet-endpoints';
export { UserEndpoints } from './endpoints/user-endpoints';
export { TrendEndpoints } from './endpoints/trend-endpoints';
export { CommunityEndpoints } from './endpoints/community-endpoints';
export { ListEndpoints } from './endpoints/list-endpoints';
export { LoginEndpoints } from './endpoints/login-endpoints';
export { WebhookEndpoints } from './endpoints/webhook-endpoints';

// Utility exports
export { ResponseHandler } from './utils/response-handler';
```

### 3. 相対インポートパス修正

必要に応じて以下のファイルのインポートパスを修正：

#### shared/types.ts
```typescript
// 修正前
} from '../kaito-api/types';

// 修正後
} from '../kaito-api';
```

#### その他のファイル
- main-workflows/system-lifecycle.ts
- main-workflows/execution-flow.ts
- shared/component-container.ts

各ファイルで`from '../kaito-api/core/client'` → `from '../kaito-api'`に統一

### 4. package.json確認

以下の設定が存在することを確認：
```json
{
  "type": "module",
  "engines": {
    "node": ">=18"
  }
}
```

## ✅ 完了条件

1. TypeScript設定エラーが解消されている
2. ESMモジュール解決エラーが解消されている
3. `npm run dev`が正常に起動する
4. 型チェック（npx tsc --noEmit）が通過する

## 🚫 禁止事項

- 既存のファイル内容の大幅な変更
- 実装ロジックの変更
- REQUIREMENTS.mdに記載のない機能追加

## 📝 作業手順

1. tsconfig.json修正
2. kaito-api/index.ts作成
3. インポートパス統一
4. 動作確認（npm run dev）
5. 型チェック確認

## 💡 実装のヒント

- 既存の機能は一切変更せず、設定とエクスポートのみ修正
- ESM（ECMAScript Modules）の仕様に準拠
- Node.js 18+の環境を前提とした設定

緊急修正のため、最小限の変更で最大の効果を狙う。