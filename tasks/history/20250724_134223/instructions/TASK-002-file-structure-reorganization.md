# TASK-002: ファイル構造再編成 - utils配置修正とディレクトリ整理

## 🚨 **緊急ミッション**
REQUIREMENTS.md準拠のディレクトリ構造を実現するため、誤配置されたファイルの移動と utils ディレクトリ構造を正しく配置する。

## 📋 **必須要件確認**
- **ROLE**: Worker権限での実装作業
- **実行タイミング**: 並列実行（Worker1・3と同時実行可能）
- **出力先**: `src/kaito-api/` 配下の適切なディレクトリ
- **最優先**: REQUIREMENTS.md完全準拠の11ファイル構成実現

## 🎯 **実行タスク**

### Phase 1: utils ディレクトリ構造修正

#### 現状問題
```
❌ 現在: src/kaito-api/response-handler.ts (ルートレベル)
✅ 要求: src/kaito-api/utils/response-handler.ts
```

#### 実行手順
1. **ファイル移動**: `response-handler.ts` を `utils/` ディレクトリへ移動
2. **import文修正**: 移動によって影響を受ける他ファイルのimport文を更新

```bash
# 実行コマンド
mv src/kaito-api/response-handler.ts src/kaito-api/utils/response-handler.ts
```

### Phase 2: 移動後の影響調査と修正

#### 影響を受ける可能性のあるファイル
- `src/kaito-api/core/client.ts`
- `src/kaito-api/endpoints/*.ts`
- その他のkaito-api関連ファイル

#### 修正内容例
```typescript
// 修正前
import { ResponseHandler } from '../response-handler';

// 修正後
import { ResponseHandler } from '../utils/response-handler';
```

### Phase 3: utils ディレクトリ内容の完全性確認

#### REQUIREMENTS.md要求の確認
```
utils/                 # ユーティリティ (1ファイル)
└── response-handler.ts    # レスポンス処理・エラーハンドリング
```

#### response-handler.ts の内容確認と最適化
現在のファイルが以下要件を満たしているか確認：

```typescript
/**
 * KaitoAPI レスポンスハンドラー
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * レスポンス処理・エラーハンドリング
 */

// 必須インターフェース
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  headers?: Record<string, string>;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// ResponseHandlerクラスの存在確認
export class ResponseHandler {
  // レスポンス処理メソッド
  processResponse(response: any): ApiResponse;
  
  // エラーハンドリングメソッド
  handleError(error: any): ErrorResponse;
  
  // レート制限処理
  handleRateLimit(response: any): Promise<void>;
}
```

## 🔧 **詳細実装要件**

### ファイル移動の安全な実行

```typescript
// 1. 現在のresponse-handler.tsの内容を確認
// 2. utils/ディレクトリが存在することを確認
// 3. 安全な移動実行
// 4. import文の自動検索・置換

// 検索対象パターン
const importPatterns = [
  "from '../response-handler'",
  "from './response-handler'", 
  "import { ResponseHandler } from '../response-handler'"
];

// 置換パターン
const replacements = [
  "from '../utils/response-handler'",
  "from './utils/response-handler'",
  "import { ResponseHandler } from '../utils/response-handler'"
];
```

### ディレクトリ構造の検証

```bash
# 期待される最終構造
src/kaito-api/
├── core/
│   ├── client.ts
│   └── config.ts
├── endpoints/
│   ├── user-endpoints.ts
│   ├── tweet-endpoints.ts
│   ├── engagement-endpoints.ts
│   ├── community-endpoints.ts      # Worker1が作成
│   ├── list-endpoints.ts           # Worker1が作成
│   ├── trend-endpoints.ts          # Worker1が作成
│   ├── login-endpoints.ts          # Worker1が作成
│   ├── action-endpoints.ts         # Worker1が作成
│   └── webhook-endpoints.ts        # Worker1が作成
└── utils/
    └── response-handler.ts         # このタスクで移動
```

## ⚠️ **重要な注意事項**

### 1. 並列実行との調整
- Worker1（endpoints作成）と同時実行されるため、import文の参照に注意
- 新規作成されるendpointsファイルが正しいパスを参照するよう確認

### 2. 既存機能への影響最小化
- 移動によるビルドエラーを即座に修正
- 他のWorkerの作業を阻害しないよう迅速な実行

### 3. Git操作の適切な管理
```bash
# 推奨Git操作
git add src/kaito-api/utils/response-handler.ts
git rm src/kaito-api/response-handler.ts
```

## 🔄 **実行フロー**

1. **事前確認**: 現在のresponse-handler.tsの場所と内容確認
2. **ディレクトリ準備**: utils/ディレクトリの存在確認
3. **ファイル移動実行**: 安全な移動操作
4. **import文修正**: 影響を受けるファイルの一括修正
5. **構造検証**: REQUIREMENTS.md準拠性の確認
6. **ビルドテスト**: TypeScript compilation確認

## ✅ **完了基準**

### 構造要件
- [ ] `src/kaito-api/utils/response-handler.ts` が正しく配置
- [ ] 元の場所 `src/kaito-api/response-handler.ts` が削除
- [ ] utils/ディレクトリ内に1ファイルのみ存在

### 機能要件
- [ ] 移動後もTypeScript compilationが通過
- [ ] import文が全て正しく修正されている
- [ ] ResponseHandlerクラスが他ファイルから正常にアクセス可能

### 統合要件
- [ ] Worker1（endpoints作成）との整合性維持
- [ ] Worker3（非準拠ファイル整理）との調整完了
- [ ] 既存システムへの影響なし

## 📋 **完了報告要件**

実装完了後、以下を含む報告書を作成：
- ファイル移動の詳細記録
- 修正したimport文の一覧
- REQUIREMENTS.md構造準拠の確認結果
- 他のWorkerとの統合状況

---

**このタスク完了により、REQUIREMENTS.md要求のutils構造が正しく実現され、疎結合アーキテクチャの完全性が向上します。**