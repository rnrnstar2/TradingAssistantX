# API設計書

## GraphQL API設計

### 基本設計方針
- **AWS AppSync**: GraphQL APIサービスとして使用
- **リアルタイム通信**: Subscriptionによるデータ同期
- **認証統合**: AWS Cognitoとの連携
- **型安全性**: TypeScript生成による開発効率向上

## データモデル

### User（ユーザー）
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: UserRole!
  pcStatus: PCStatus!
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

enum UserRole {
  CLIENT
  ADMIN
}

enum PCStatus {
  ONLINE
  OFFLINE
}
```

### Account（口座）
```graphql
type Account {
  id: ID!
  userId: ID!
  brokerType: BrokerType!
  accountNumber: String!
  serverName: String!
  displayName: String!
  balance: Float!
  credit: Float!
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

enum BrokerType {
  MT4
  MT5
}
```

### Position（ポジション）
```graphql
type Position {
  id: ID!
  userId: ID!
  accountId: ID!
  symbol: String!
  lotSize: Float!
  direction: PositionDirection!
  entryPrice: Float
  exitPrice: Float
  status: PositionStatus!
  trailSettings: TrailSettings
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

enum PositionDirection {
  BUY
  SELL
}

enum PositionStatus {
  PENDING
  OPEN
  CLOSED
  CANCELLED
}

type TrailSettings {
  trailDistance: Float!
  trailStep: Float!
  isEnabled: Boolean!
}
```

### Action（アクション）
```graphql
type Action {
  id: ID!
  userId: ID!
  positionId: ID!
  accountId: ID!
  actionType: ActionType!
  targetPrice: Float
  status: ActionStatus!
  executedAt: AWSDateTime
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

enum ActionType {
  ENTRY
  EXIT
  TRAIL_UPDATE
}

enum ActionStatus {
  PENDING
  EXECUTING
  COMPLETED
  FAILED
  CANCELLED
}
```

## Queries

### ユーザー関連
```graphql
type Query {
  getUser(id: ID!): User
  listUsers(filter: UserFilterInput): [User]
}
```

### 口座関連
```graphql
type Query {
  getAccount(id: ID!): Account
  listAccountsByUser(userId: ID!): [Account]
}
```

### ポジション関連
```graphql
type Query {
  getPosition(id: ID!): Position
  listPositionsByAccount(accountId: ID!): [Position]
  listPositionsByUser(userId: ID!): [Position]
}
```

### アクション関連
```graphql
type Query {
  getAction(id: ID!): Action
  listActionsByPosition(positionId: ID!): [Action]
  listPendingActions(userId: ID!): [Action]
}
```

## Mutations

### 口座管理
```graphql
type Mutation {
  createAccount(input: CreateAccountInput!): Account
  updateAccount(id: ID!, input: UpdateAccountInput!): Account
  deleteAccount(id: ID!): Boolean
}
```

### ポジション管理
```graphql
type Mutation {
  createPosition(input: CreatePositionInput!): Position
  updatePosition(id: ID!, input: UpdatePositionInput!): Position
  closePosition(id: ID!): Position
}
```

### アクション管理
```graphql
type Mutation {
  createAction(input: CreateActionInput!): Action
  updateActionStatus(id: ID!, status: ActionStatus!): Action
  cancelAction(id: ID!): Action
}
```

## Subscriptions

### リアルタイムデータ同期
```graphql
type Subscription {
  onPositionUpdate(accountId: String): Position
  onActionUpdate(userId: String): Action
  onAccountUpdate(userId: String): Account
}
```

## エラーハンドリング

### エラー分類
- **ValidationError**: 入力データの検証エラー
- **AuthorizationError**: 認証・認可エラー
- **BusinessLogicError**: ビジネスロジックエラー
- **SystemError**: システムエラー

### エラーレスポンス形式
```graphql
type Error {
  code: String!
  message: String!
  field: String
}
```

## 認証・認可

### AWS Cognitoユーザープール
- **認証方式**: Email + Password
- **MFA**: オプションで有効化可能
- **セッション管理**: JWT token based

### GraphQL認証ディレクティブ
```graphql
type Position @auth(rules: [
  { allow: owner, ownerField: "userId" }
  { allow: groups, groups: ["Admins"] }
]) {
  # フィールド定義
}
```