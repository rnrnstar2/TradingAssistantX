# Amplify Gen2 実装ガイド - 必須参照版

## ⚠️ 重要：バックエンド設定の保護

### 🚫 絶対に削除してはいけない設定
以下のバックエンド設定は**システムの根幹**を成すため、絶対に削除しないこと：

1. **スキーマ定義**（`packages/shared-backend/amplify/data/resource.ts`）
   - enum値の定義（PCStatus, SubscriptionStatus, Symbol等）
   - モデル間のリレーション設定
   - セカンダリインデックス設定

2. **認証設定**（`packages/shared-backend/amplify/auth/resource.ts`）
   - パスワードポリシー設定
   - ユーザー属性設定
   - グループ設定（admin, client）

3. **生成された型定義**
   - `amplify_outputs.json`との一致が必須
   - 型の不整合はシステム全体に影響

### 💡 変更が必要な場合の対応
- **追加のみ可能**：新しいenum値、フィールド、モデルの追加はOK
- **既存の削除は禁止**：既存のenum値、フィールド、モデルの削除は厳禁
- **変更前に影響確認**：`grep -r "削除対象" apps/` で全アプリの影響を確認

## 🚨 実装前必須チェックリスト

### **Step 1: 公式ドキュメント確認（必須）**
実装開始前に以下を**必ず**確認：

#### **クライアントサイド実装時（最重要）**
- **📖 クエリ操作**: https://docs.amplify.aws/react/build-a-backend/data/query-data/
- **📝 ミューテーション**: https://docs.amplify.aws/react/build-a-backend/data/mutate-data/
- **🔄 リアルタイム**: https://docs.amplify.aws/react/build-a-backend/data/subscribe-data/

#### **スキーマ設計時**
- **🏗️ メインドキュメント**: https://docs.amplify.aws/react/build-a-backend/data/
- **📊 データモデリング**: https://docs.amplify.aws/react/build-a-backend/data/data-modeling/
- **🔗 リレーションシップ**: https://docs.amplify.aws/react/build-a-backend/data/data-modeling/relationships/
- **🆔 識別子（identifiers）**: https://docs.amplify.aws/react/build-a-backend/data/data-modeling/identifiers/
- **🔐 認証・認可**: https://docs.amplify.aws/react/build-a-backend/data/customize-authz/
- **👤 Owner-based認証**: https://docs.amplify.aws/react/build-a-backend/data/customize-authz/per-user-per-owner-data-access/

### **Step 2: 実装アプローチ**
1. **ドキュメント確認** → 2. **実装** → 3. **TypeScript確認** → 4. **テスト**

## 🔗 公式ドキュメントURL（カテゴリ別）

## 💻 クライアントサイド実装パターン（最新版）

### **1. クライアント初期化とTypeScript型定義**

```typescript
// 1. クライアント生成（必須）
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/resource'; // または '@workspace/shared-backend/amplify/data/resource'

const client = generateClient<Schema>();

// 2. TypeScript型の取得（推奨）
type User = Schema['User']['type'];
type Account = Schema['Account']['type'];
type CreateUserInput = Schema['User']['createType'];
type UpdateUserInput = Schema['User']['updateType'];
```

### **2. CRUD操作パターン（公式ドキュメント準拠）**

#### **📖 Read操作**
```typescript
// リスト取得
const { data: accounts, errors } = await client.models.Account.list({
  filter: {
    userId: { eq: currentUserId },
    isActive: { eq: true }
  },
  limit: 100
});

// 単一取得
const { data: account, errors } = await client.models.Account.get({
  id: accountId
});

// 複合フィルタ
const { data: users, errors } = await client.models.User.list({
  filter: {
    or: [
      { role: { eq: 'ADMIN' } },
      { role: { eq: 'CLIENT' } }
    ]
  }
});
```

#### **📝 Create/Update/Delete操作**
```typescript
// 作成
const { data: newAccount, errors } = await client.models.Account.create({
  userId: currentUserId,
  brokerType: 'MT4',
  brokerName: 'BIGBOSS',
  accountNumber: 'AUTO',
  serverName: 'DefaultServer',
  displayName: `Account-${userId.slice(0,8)}`,
  isActive: true,
  lastUpdated: new Date().toISOString()
});

// 更新
const { data: updatedAccount, errors } = await client.models.Account.update({
  id: accountId,
  balance: 10000,
  credit: 5000,
  lastUpdated: new Date().toISOString()
});

// 削除
const { data: deletedAccount, errors } = await client.models.Account.delete({
  id: accountId
});
```

### **3. エラーハンドリング（ベストプラクティス）**

```typescript
// 推奨パターン
async function safeAccountOperation() {
  try {
    const { data, errors } = await client.models.Account.list({
      filter: { userId: { eq: currentUserId } }
    });
    
    // エラーチェック（重要）
    if (errors) {
      console.error('GraphQL errors:', errors);
      return [];
    }
    
    // リクエストキャンセルチェック
    if (client.isCancelError(errors)) {
      console.log('Request was cancelled');
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}
```

### **4. リアルタイムサブスクリプション**

```typescript
// リアルタイムリスト監視
const subscription = client.models.Position.observeQuery({
  filter: { 
    userId: { eq: currentUserId },
    status: { eq: 'OPEN' }
  }
}).subscribe({
  next: ({ items, isSynced }) => {
    console.log('Positions updated:', items);
    setPositions(items);
  },
  error: (error) => console.error('Subscription error:', error)
});

// クリーンアップ
useEffect(() => {
  return () => subscription.unsubscribe();
}, []);
```

## 📚 スキーマ設計パターン

### 1. データモデリングの基本
```typescript
const schema = a.schema({
  Todo: a.model({
    content: a.string(),
    completed: a.boolean(),
  }).authorization(allow => [allow.authenticated()])
});
```

### 2. Identifiers（識別子）
- **デフォルト**: 自動的に`id: ID`が生成される
- **カスタム単一**: `.identifier(['customField'])`
- **複合キー**: `.identifier(['field1', 'field2'])`
- **⚠️ 複合キーは複雑になるため、MVPでは避ける**

### 3. リレーションシップ
```typescript
// 単純なリレーション（推奨）
Post: a.model({
  authorId: a.id(),
  author: a.belongsTo('User', 'authorId'),
})

// 複合キーリレーション（複雑）
Post: a.model({
  authorName: a.string(),
  authorDoB: a.date(),
  author: a.belongsTo('User', ['authorName', 'authorDoB']),
})
```

### 4. 認証・認可のパターン
```typescript
// MVPシンプル認証（今回採用）
.authorization(allow => [
  allow.authenticated().to(['create', 'read', 'update', 'delete'])
])

// Owner-based認証
.authorization(allow => [
  allow.owner() // 自動的にownerフィールド追加
])

// カスタムOwnerフィールド
.authorization(allow => [
  allow.ownerDefinedIn('userId')
])

// Public API Key認証（サーバーサイド用）
.authorization(allow => [
  allow.authenticated(),
  allow.publicApiKey().to(['update']) // 特定の操作のみ許可
])
```

### 5. Lambda関数（Post-confirmationトリガー等）の権限設定

#### **認証リソースでの権限設定（auth/resource.ts）**
```typescript
import { defineAuth } from "@aws-amplify/backend";
import { postConfirmation } from "./post-confirmation/resource";

export const auth = defineAuth({
  loginWith: {
    email: true
  },
  triggers: {
    postConfirmation,
  },
  // Lambda関数にCognito操作権限を付与
  access: (allow) => [
    allow.resource(postConfirmation).to(['addUserToGroup']),
  ],
});
```

#### **データスキーマでの権限設定（data/resource.ts）**
```typescript
import { postConfirmation } from "../auth/post-confirmation/resource";

const schema = a.schema({
  // ... モデル定義 ...
})
.authorization((allow) => [
  // Lambda関数にGraphQL API権限を付与
  allow.resource(postConfirmation).to(['query', 'mutate']),
]);
```

#### **⚠️ 重要な注意点**
- **backend.tsでの権限設定は不要**: Amplify Gen2では各リソース定義内で権限を設定
- **古いパターンは使用しない**: `grantMutation()`や`addToPrincipalPolicy()`はbackend.tsで使わない
- **権限は必要最小限に**: 必要な操作のみを許可（'query', 'mutate', 'addUserToGroup'等）

### 6. リアルタイムサブスクリプション（最新パターン）
```typescript
// ❌ スキーマレベルでの手動定義は不要（Gen2では自動生成）
onPositionUpdated: a.subscription()...

// ✅ 単一アイテムの変更監視
const subscription = client.models.Position.onUpdate({
  filter: { userId: { eq: currentUserId } }
}).subscribe({
  next: (data) => {
    console.log('Position updated:', data);
    // 状態更新ロジック
  },
  error: (error) => console.error('Subscription error:', error)
});

// ✅ リアルタイムリスト取得（推奨）
const listSubscription = client.models.Position.observeQuery({
  filter: { 
    userId: { eq: currentUserId },
    status: { eq: 'OPEN' }
  }
}).subscribe({
  next: ({ items, isSynced }) => {
    if (isSynced) {
      setPositions(items);
    }
  }
});

// ✅ 作成・削除監視
const createSubscription = client.models.Position.onCreate({
  filter: { userId: { eq: currentUserId } }
}).subscribe({
  next: (newPosition) => console.log('New position:', newPosition)
});
```

### 6. 管理者-ユーザー関係の実装パターン
```typescript
// 自己参照リレーションシップ（管理者-ユーザー関係）
User: a
  .model({
    email: a.string().required(),
    name: a.string().required(),
    role: a.ref("UserRole").required(),
    parentAdminId: a.string(),
    // 双方向リレーション
    managedUsers: a.hasMany("User", "parentAdminId"),
    parentAdmin: a.belongsTo("User", "parentAdminId"),
  })
  .secondaryIndexes((index) => [
    index("parentAdminId").sortKeys(["role"]),
  ])

// 管理対象データにも管理者IDを追加
Account: a
  .model({
    userId: a.string().required(),
    parentAdminId: a.string(),
    // 管理者リレーション
    parentAdmin: a.belongsTo("User", "parentAdminId"),
  })
  .secondaryIndexes((index) => [
    index("parentAdminId"),
  ])
```

### 7. サーバーサイド認証（Webhook用）

#### **Public API Key認証パターン**
```typescript
// 1. スキーマに追加
.authorization((allow) => [
  allow.authenticated(),
  allow.publicApiKey().to(['update']) // Webhook用
])

// 2. サーバークライアント (amplify_outputs.json自動読込)
import amplifyOutputs from '../../../amplify_outputs.json';
export const serverClient = generateClient<Schema>({
  config: amplifyOutputs,
  authMode: 'apiKey',
});
```

**参考**: [サーバーランタイム接続](https://docs.amplify.aws/react/build-a-backend/data/connect-from-server-runtime/nextjs-server-runtime/)

### 8. 管理者によるデータフィルタリング（最新パターン）
```typescript
// 管理者が管理するユーザー一覧取得
export const listManagedUsers = async (adminId: string) => {
  const { data, errors } = await client.models.User.list({
    filter: { parentAdminId: { eq: adminId } },
    limit: 100
  });
  
  if (errors) {
    console.error('Error listing managed users:', errors);
    return [];
  }
  
  return data || [];
};

// 管理者が管理するアカウント一覧取得
export const listManagedAccounts = async (adminId: string) => {
  const { data, errors } = await client.models.Account.list({
    filter: { parentAdminId: { eq: adminId } },
    limit: 100
  });
  
  if (errors) {
    console.error('Error listing managed accounts:', errors);
    return [];
  }
  
  return data || [];
};

// 複合条件での管理対象フィルタリング
export const listActiveUserPositions = async (adminId: string) => {
  const { data, errors } = await client.models.Position.list({
    filter: {
      and: [
        { parentAdminId: { eq: adminId } },
        { status: { eq: 'OPEN' } }
      ]
    }
  });
  
  return data || [];
};
```

## 🚨 よくある間違いと対策（最新版）

### **🔥 Gen1とGen2の混在（最重要）**

#### **⚠️ 古いGen1ファイルの残存**
**❌ 深刻な問題**: Amplify Gen1の自動生成ファイルがGen2プロジェクトに混在
```
packages/shared-backend/
  ├── API.ts          ❌ Gen1の型定義（削除必須）
  ├── mutations.ts    ❌ Gen1のGraphQL文字列（削除必須）
  ├── queries.ts      ❌ Gen1のGraphQL文字列（削除必須）
  ├── subscriptions.ts ❌ Gen1のGraphQL文字列（削除必須）
  └── amplify/        ✅ Gen2の正しい構造
      └── data/
          └── resource.ts  ✅ 正しいスキーマ定義
```

**🚨 なぜ危険か**:
- Gen1のファイルは`amplify codegen`で自動生成されたもの
- Gen2では完全に不要で、混乱の元になる
- 誤ってこれらのファイルを使うと古いパターンで実装してしまう

**✅ 対処法**:
```bash
# Gen1ファイルの存在確認
ls packages/shared-backend/{API,mutations,queries,subscriptions}.*

# 安全な削除（使用確認後）
grep -r "shared-backend/API\|shared-backend/mutations" apps/ || echo "安全"
rm -f packages/shared-backend/{API,mutations,queries,subscriptions}.{ts,js,d.ts,d.ts.map}
```

**📌 覚え方**: Gen2では`client.models.*`のみ使用。GraphQL文字列は一切不要。

### **⚠️ 実装プロセスの間違い**

#### **1. ドキュメント未確認での実装**
**❌ 問題**: 公式ドキュメントを確認せずに古いパターンで実装
```typescript
// 古いパターン（避けるべき）
const mutation = `mutation CreateAccount($input: CreateAccountInput!) { ... }`;
const result = await executeGraphQL({ query: mutation, variables: input });
```

**✅ 解決**: 必ず公式ドキュメント確認後に実装
```typescript
// 最新パターン（推奨）
const { data, errors } = await client.models.Account.create(input);
```

#### **2. TypeScript型の不適切な使用**
**❌ 問題**: 手動型定義や型キャストの乱用
```typescript
return result.data.createAccount as Account; // 避けるべき
```

**✅ 解決**: Schema型の直接使用
```typescript
type Account = Schema['Account']['type'];
return result.data; // 型推論で安全
```

### **⚠️ CRUD操作の間違い**

#### **3. エラーハンドリングの不備**
**❌ 問題**: errorsフィールドの未チェック
```typescript
const { data } = await client.models.Account.list(); // errorsを無視
return data;
```

**✅ 解決**: 適切なエラーチェック
```typescript
const { data, errors } = await client.models.Account.list();
if (errors) {
  console.error('GraphQL errors:', errors);
  return [];
}
return data || [];
```

#### **4. フィルタ条件の型エラー**
**❌ 問題**: 不正なフィルタ構文
```typescript
filter: { isActive: true } // Boolean直接指定（エラー）
```

**✅ 解決**: 正しいフィルタ構文
```typescript
filter: { isActive: { eq: true } } // 比較演算子使用
```

### **⚠️ Lambda権限設定の間違い**

#### **5. backend.tsでの権限設定（古いパターン）**
**❌ 問題**: backend.tsで権限を設定する古いパターン
```typescript
// backend.tsで以下のような設定をしない
backend.data.resources.graphqlApi.grantMutation(postConfirmation, "createUser");
postConfirmation.grantPrincipal.addToPrincipalPolicy({...});
```

**✅ 解決**: 各リソース定義内で権限設定
```typescript
// auth/resource.ts
access: (allow) => [
  allow.resource(postConfirmation).to(['addUserToGroup']),
]

// data/resource.ts
.authorization((allow) => [
  allow.resource(postConfirmation).to(['query', 'mutate']),
])
```

### **⚠️ スキーマ設計の間違い**

#### **6. 複合identifierの使いすぎ**
**❌ 問題**: `.identifier(['brokerType', 'accountNumber', 'serverName'])`
**✅ 解決**: デフォルトの`id: ID`を使用、必要に応じてsecondaryIndexで対応

#### **7. 不適切な認証設定**
**❌ 問題**: `allow.owner("userId")` （型エラー）
**✅ 解決**: `allow.ownerDefinedIn("userId")` または単純に`allow.authenticated()`

#### **8. Boolean型をsortKeysに使用**
**❌ 問題**: `index("pcStatus").sortKeys(["isActive"])` （Boolean型エラー）
**✅ 解決**: String/Number型に変換（例: `"true"`/`"false"` または `1`/`0`）
**理由**: DynamoDBはsortKeyにstring、number、binary型のみサポート

### **⚠️ リアルタイム機能の間違い**

#### **9. サブスクリプションのメモリリーク**
**❌ 問題**: unsubscribeの忘れ
```typescript
const sub = client.models.Position.observeQuery().subscribe(...);
// unsubscribeなし
```

**✅ 解決**: 適切なクリーンアップ
```typescript
useEffect(() => {
  const sub = client.models.Position.observeQuery().subscribe(...);
  return () => sub.unsubscribe(); // クリーンアップ
}, []);
```

## 🎯 MVP開発のベストプラクティス（実装手順）

### **Phase 1: 実装前準備**
1. **📖 公式ドキュメント確認**: 該当機能の公式ドキュメントを必読
2. **🏗️ スキーマ確認**: `packages/shared-backend/amplify/data/resource.ts`の最新状態確認
3. **🔧 TypeScript設定**: `generateClient<Schema>()`とSchema型の準備

### **Phase 2: 実装**
1. **シンプルさ最優先**: 複合キーや複雑な認証は避ける
2. **デフォルト活用**: `id: ID`、`allow.authenticated()`を基本とする
3. **client.models.*使用**: 自動生成されたCRUD APIを活用
4. **エラーハンドリング**: `errors`フィールドの適切なチェック

### **Phase 3: 検証**
1. **TypeScript確認**: `pnpm run check-types`でエラーなし
2. **テスト実行**: 基本機能の動作確認
3. **リアルタイム確認**: サブスクリプション動作とクリーンアップ

## 📋 実装後チェックリスト

- [ ] 公式ドキュメントを確認済み
- [ ] `client.models.*`パターンを使用
- [ ] `Schema['ModelName']['type']`で型定義
- [ ] `errors`フィールドをチェック済み
- [ ] TypeScriptエラーなし
- [ ] サブスクリプションにunsubscribe設定
- [ ] 基本的な動作テスト完了

## 📝 参考コマンド

```bash
# 開発環境
pnpm run sandbox              # サンドボックス起動
pnpm run check-types         # TypeScript確認
pnpm run dev                 # 開発サーバー起動

# Amplify関連
npx ampx generate graphql-client-code  # 型生成確認
npx ampx build                         # スキーマ検証
npx ampx sandbox delete                # サンドボックス削除
```

## 💡 トラブルシューティング（段階別）

### **実装前**
- **URL確認**: 公式ドキュメントのURLが有効か確認
- **Schema確認**: 最新のスキーマ定義を確認

### **実装中**
- **型エラー**: `Schema['ModelName']['type']`パターンを使用
- **フィルタエラー**: `{ field: { eq: value } }`形式を使用
- **認証エラー**: `allow.authenticated()`から開始

### **実装後**
- **データ取得エラー**: セカンダリインデックスとフィルタ条件を確認
- **リアルタイムエラー**: サブスクリプションのクリーンアップを確認
- **パフォーマンス問題**: limit設定とページネーション実装

## 🚀 実装時の黄金ルール

1. **ドキュメントファースト**: 実装前に必ず公式ドキュメント確認
2. **型安全重視**: 手動型キャストではなくSchema型を使用
3. **エラーハンドリング必須**: すべてのCRUD操作でerrorsチェック
4. **段階的実装**: 基本機能→拡張機能の順序で実装

---

**最終更新**: 2025-01-09
**対象バージョン**: Amplify Gen2 (2024-2025)
**重要**: このガイドは実装時の必須参照ドキュメントです