# TASK-000: kaito-api エンドポイント構造修正・整理

## 🚨 **緊急リファクタリング要求**

**優先度**: 最高（単体テスト作成前の必須作業）
**対象範囲**: `src/kaito-api/endpoints/` 全体
**出力先**: 修正は元ファイル上で実行

kaito-api endpointsの構造問題を解決し、MVP要件に準拠した適切なAPI設計に修正する。

## 📋 **特定された問題**

### 🚫 **不要ファイル（即削除対象）**
1. **`community-endpoints.ts`**
   - MVP要件に記載なし
   - 全メソッドが `throw new Error('MVP後実装予定')`
   - コミュニティ機能はMVP範囲外

2. **`list-endpoints.ts`**
   - MVP要件に記載なし  
   - 全メソッドが `throw new Error('MVP後実装予定')`
   - リスト機能はMVP範囲外

3. **`login-endpoints.ts`**
   - `core/client.ts`で認証処理済み（重複機能）
   - MVP要件では認証はcore layerで処理
   - エンドポイント分離不適切

4. **`webhook-endpoints.ts`**
   - MVP要件に記載なし
   - リアルタイム処理はMVP後実装
   - 30分間隔システムには不要

### ✅ **必要ファイル（継続保持）**
1. **`action-endpoints.ts`** - 投稿・RT・いいね機能（MVP必須）
2. **`tweet-endpoints.ts`** - ツイート検索・作成・削除（MVP必須）
3. **`user-endpoints.ts`** - ユーザー情報・フォロー関係（MVP必須）
4. **`trend-endpoints.ts`** - トレンド情報取得（MVP必須）

### 🔧 **機能混在問題（要修正）**
- **API以外の機能混在**: エンドポイントに分析・計算ロジックが混在
- **関数分離不備**: 単一責任原則違反
- **型定義重複**: types.tsとの不整合

## 🎯 **修正要件**

### Phase 1: 不要ファイル削除
- `community-endpoints.ts`、`list-endpoints.ts`、`login-endpoints.ts`、`webhook-endpoints.ts`を削除
- `index.ts`からの該当export削除
- `types.ts`から不要型定義削除

### Phase 2: 必要ファイル機能純化
- **API呼び出し専用**: HTTPリクエスト・レスポンス処理のみ
- **ビジネスロジック分離**: 計算・分析・判定ロジックを適切な場所に移動
- **単一責任**: 1エンドポイント = 1つのAPIカテゴリ責任

### Phase 3: 型定義整理
- `types.ts`から削除されたエンドポイント関連型を除去
- 重複型定義の統合
- MVP要件に必要な型のみ保持

## 📝 **詳細修正指示**

### 1. ファイル削除実行
```bash
rm src/kaito-api/endpoints/community-endpoints.ts
rm src/kaito-api/endpoints/list-endpoints.ts  
rm src/kaito-api/endpoints/login-endpoints.ts
rm src/kaito-api/endpoints/webhook-endpoints.ts
```

### 2. index.ts修正
```typescript
// 削除対象exportの除去
// export { CommunityEndpoints } from './endpoints/community-endpoints';
// export { ListEndpoints } from './endpoints/list-endpoints';
// export { LoginEndpoints } from './endpoints/login-endpoints';
// export { WebhookEndpoints } from './endpoints/webhook-endpoints';
```

### 3. types.ts修正
**削除対象型**:
- `CommunityInfo`, `CommunityMember`, `CommunityPost`
- `TwitterList`, `ListMember`
- `LoginRequest`, `LoginResponse`, `AuthStatus`
- `WebhookRule`, `WebhookEvent`

### 4. 必要エンドポイント機能純化

#### action-endpoints.ts修正方針
- **保持**: HTTP API呼び出し部分
- **移動**: 教育的価値判定ロジック → 別モジュール
- **純化**: createPost, performEngagement, uploadMedia等のAPI操作のみ

#### tweet-endpoints.ts修正方針
- **保持**: ツイートCRUD、検索API呼び出し
- **移動**: バリデーションロジック → utils層
- **純化**: TwitterAPI呼び出しに特化

#### user-endpoints.ts修正方針  
- **保持**: ユーザー情報取得、フォロー操作API
- **移動**: プライバシー保護・分析ロジック → 適切な層
- **純化**: UserAPI呼び出しに特化

#### trend-endpoints.ts修正方針
- **保持**: トレンド取得API呼び出し
- **純化**: シンプルなトレンドデータ取得のみ

## ⚠️ **重要な制約**

### MVP制約厳守
- **必要最小限**: MVP要件に記載された機能のみ保持
- **YAGNI原則**: 将来機能は一切実装しない
- **シンプル設計**: 複雑な抽象化は避ける

### API設計原則
- **単一責任**: 1エンドポイント = 1つのAPIカテゴリ責任
- **レイヤー分離**: API層とビジネスロジック層の明確な分離
- **型安全**: TypeScript strict mode完全対応

### 後方互換性
- **既存インターフェース保持**: 他のコードから呼び出される部分は維持
- **段階的移動**: 削除されたロジックは適切な場所に移動先を明示

## 🎯 **完了判定基準**

- [ ] 不要な4つのエンドポイントファイルが削除されている
- [ ] index.tsから該当exportが削除されている
- [ ] types.tsから不要型定義が削除されている
- [ ] 必要な4つのエンドポイントが適切にAPI特化されている
- [ ] 移動されたロジックの移動先が明確になっている
- [ ] TypeScript strict modeでコンパイルエラーなし
- [ ] 既存の呼び出し元コードとの互換性が保持されている

## 📋 **実行後報告事項**

### 削除ファイル一覧
- [ ] community-endpoints.ts削除完了
- [ ] list-endpoints.ts削除完了  
- [ ] login-endpoints.ts削除完了
- [ ] webhook-endpoints.ts削除完了

### 型定義整理結果
- [ ] 削除型一覧の明記
- [ ] 残存型一覧の確認
- [ ] types.tsサイズ削減効果

### 機能移動計画
- [ ] 移動されたロジックの一覧
- [ ] 各ロジックの適切な移動先提案
- [ ] 移動作業の優先順位

**完了時は `tasks/20250724_213715_kaito_api_unittest/reports/REPORT-000-kaito-api-refactor.md` に報告書を作成してください。**