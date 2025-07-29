# TASK-001: KaitoAPI Utils 型一貫性とエラーハンドリング統一

## 概要
src/kaito-api/utils/内の全ファイルで型の一貫性を確保し、統一されたエラーハンドリングを実装する。

## 背景
現在のutilsディレクトリには高品質なコードが実装されているが、以下の点で改善の余地がある：
- 型定義の使用に一部不整合がある可能性
- エラーハンドリングの方法が統一されていない箇所
- 定数の使用が徹底されていない部分

## 実装対象ファイル
- `/src/kaito-api/utils/response-handler.ts`
- `/src/kaito-api/utils/validator.ts`
- `/src/kaito-api/utils/normalizer.ts`
- `/src/kaito-api/utils/type-checker.ts`

## 実装要件

### 1. 型の一貫性確保
- すべてのファイルで`types.ts`からインポートした型を使用
- `any`型の使用を最小限に抑え、適切な型を定義
- 型ガード関数を`types.ts`に定義されているものを使用

### 2. エラーハンドリングの統一
- `errors.ts`に定義されたエラークラスを使用
- エラーメッセージの形式を統一
- エラーコードの一貫性を保つ

### 3. 定数の活用
- `constants.ts`の定数を適切に使用
- マジックナンバーの排除
- URL、制限値などは必ず定数から参照

### 4. 実装詳細

#### response-handler.ts の改善
```typescript
// 現在のエラー定義を errors.ts のクラスに置き換え
import { KaitoAPIError, RateLimitError, ValidationError } from './errors';

// APIError インターフェースを削除し、KaitoAPIError を使用
// ApiError の代わりに TwitterAPIError 型を使用
```

#### validator.ts の改善
```typescript
// 定数の使用を徹底
import { TWEET_MAX_LENGTH, SEARCH_MAX_RESULTS } from './constants';

// エラーメッセージを ValidationError クラスでラップ
throw new ValidationError('Invalid input', fieldName);
```

#### normalizer.ts の改善
```typescript
// 型ガードの使用
import { isTweetData, isUserData } from './types';

// any型の排除
function normalizeTweetData(apiTweet: unknown): TweetData {
  if (!isTweetData(apiTweet)) {
    throw new ValidationError('Invalid tweet data structure');
  }
  // ...
}
```

#### type-checker.ts の改善
```typescript
// types.ts の型ガードと統合
import { isTwitterAPIError, isTweetData, isUserData } from './types';

// 重複する型ガードの削除
// types.ts に定義されているものを使用
```

### 5. テスト要件
- 各改善点に対する単体テストを追加
- エラーケースのテストを充実
- 型安全性のテストを実装

## 制約事項
- 既存のAPIとの互換性を保つ
- パフォーマンスを劣化させない
- TypeScript strict モードでエラーがないこと

## 完了条件
- [ ] すべてのファイルで`types.ts`の型を使用
- [ ] `errors.ts`のエラークラスを統一的に使用
- [ ] `constants.ts`の定数を適切に使用
- [ ] `any`型の使用を最小限に抑制
- [ ] 単体テストの追加と成功
- [ ] lint/type-check の通過

## 参考資料
- `/docs/kaito-api.md` - KaitoAPI仕様書
- `/src/kaito-api/utils/types.ts` - 統合型定義
- `/src/kaito-api/utils/errors.ts` - エラークラス定義
- `/src/kaito-api/utils/constants.ts` - 定数定義