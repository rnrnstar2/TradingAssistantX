# TASK-002: TypeScript型定義修正

## 概要
kaito-apiの80+件のTypeScriptコンパイルエラーを系統的に修正し、品質基準（TypeScriptコンパイルエラーなし）を達成する。

## 要件定義書参照
- REQUIREMENTS.md: TypeScript strict mode準拠
- 品質基準: TypeScriptコンパイルエラーなし

## エラー分類と修正方針

### 1. 型不一致エラー（string vs number）
**対象ファイル**: client.ts, config.ts
```
error TS2322: Type 'string' is not assignable to type 'number'
```

**修正方針**:
- 数値プロパティには適切な型変換を適用
- 文字列プロパティには適切な型定義を使用

### 2. プロパティ名不一致エラー
**対象ファイル**: 各エンドポイント
```
error TS2561: Object literal may only specify known properties, but 'createdAt' does not exist in type 'TweetData'. Did you mean to write 'created_at'?
```

**修正方針**:
- TwitterAPI仕様に合わせてsnake_case（created_at）に統一
- 型定義とプロパティ名の一致確保

### 3. 不足プロパティエラー
**対象ファイル**: client.ts, config.ts
```
error TS2739: Type '{ ... }' is missing the following properties from type '...'
```

**修正方針**:
- 必要なプロパティをオブジェクトに追加
- 型定義でオプショナルにするか適切なデフォルト値を設定

### 4. 未知プロパティエラー
**対象ファイル**: config.ts, エンドポイント
```
error TS2353: Object literal may only specify known properties, and 'version' does not exist in type '...'
```

**修正方針**:
- 型定義に不足プロパティを追加
- 不要なプロパティは削除

### 5. 関数シグネチャエラー
**対象ファイル**: エンドポイント
```
error TS2554: Expected 1-2 arguments, but got 3
```

**修正方針**:
- 関数呼び出しを正しいシグネチャに修正
- 型定義を実際の使用方法に合わせて調整

## 修正対象ファイル別

### core/client.ts
- `tweetsProcessed`, `estimatedCost`等の数値型修正
- `CostTrackingInfo`型の完全実装
- `retryDelay`プロパティ追加

### core/config.ts
- 環境設定の型定義修正（"dev" → "development"等）
- 不足プロパティの追加
- 型定義の整合性確保

### core/session-manager.ts
- `SessionData`型の修正
- プロパティ名統一（expires_at → expiresAt）

### endpoints/authenticated/
- `tweetId`等のプロパティ名修正
- 応答型の完全実装
- TwitterAPI仕様に合わせた型調整

### endpoints/read-only/
- 検索オプション型の修正
- ユーザー情報型の統一
- レート制限情報の型修正

### utils/validator.ts
- 正規表現フラグの修正（ES6以降対応）

## 実装手順

### 1. 型定義の統一（utils/types.ts）
```typescript
// 統一された型定義の例
export interface TweetData {
  id: string;
  text: string;
  created_at: string;  // createdAt → created_at
  author_id: string;
  // ... 他のプロパティ
}

export interface CostTrackingInfo {
  cost: number;
  apiCalls: number;
  timestamp: number;
  endpoint: string;
  // 不足していたプロパティを追加
}
```

### 2. プロパティ名の統一
- TwitterAPI仕様に合わせてsnake_case使用
- 型定義とオブジェクトリテラルの一致確保

### 3. 数値型の修正
```typescript
// 修正前
tweetsProcessed: '0'  // string

// 修正後
tweetsProcessed: 0    // number
```

### 4. 関数シグネチャの修正
```typescript
// 修正前
someFunction(arg1, arg2, arg3)  // 3引数

// 修正後
someFunction(arg1, arg2)  // 2引数、または型定義を修正
```

### 5. ES6対応
```typescript
// 修正前
/pattern/u  // ES6フラグ

// 修正後  
/pattern/   // ES5互換、またはtsconfig.jsonでtarget調整
```

## 検証手順

### 1. 段階的修正
1. utils/types.ts の型定義修正
2. core/ディレクトリの修正
3. endpoints/ディレクトリの修正
4. 各段階でコンパイル確認

### 2. 完全性確認
```bash
# TypeScriptコンパイル確認
npx tsc --noEmit src/kaito-api/**/*.ts

# 目標: エラー0件
```

### 3. 機能確認
- 基本的なインポートテスト
- 型推論の正常動作確認

## 品質基準
- TypeScriptコンパイルエラー0件
- 型安全性の確保
- TwitterAPI仕様との整合性
- 実装可能性の確保

## 注意事項
- 機能の変更は最小限に
- TwitterAPI.io仕様を優先
- MVPに不要な複雑化は避ける
- 既存の動作は維持

## 成果物
- 修正されたソースコード
- TypeScriptコンパイル成功確認
- 修正内容の詳細記録
- 報告書: `tasks/20250729_131622_kaito_api_quality_fix/reports/REPORT-002-typescript-fixes.md`