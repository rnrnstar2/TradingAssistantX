# TASK-002: 重複機能統合・utils最適化

## 🎯 **タスク概要**
src/kaito-api/utils内の重複機能統合とdocs/directory-structure.md仕様準拠の実現

## 📋 **実行前必須確認**
1. **REQUIREMENTS.md読み込み**: MVP制約の理解
2. **docs/directory-structure.md確認**: utils仕様（6ファイル構成）の把握
3. **docs/kaito-api.md確認**: KaitoAPI実装仕様の理解
4. **TASK-001完了確認**: MVP違反ファイル削除の完了を必ず確認

## 🔄 **重複機能統合計画**

### 現在の状況（重複・分散）
```
現在のutils/（11ファイル）:
├── constants.ts          ✅ 仕様通り
├── errors.ts             ✅ 仕様通り  
├── response-handler.ts   ✅ 仕様通り
├── types.ts              ✅ 仕様通り
├── validator.ts          ✅ 仕様通り
├── index.ts              ✅ 仕様通り
├── normalizer.ts         ❌ 重複：response-handlerに統合すべき
├── type-checker.ts       ❌ 重複：validatorに統合すべき
├── rate-limiter.ts       ❌ 分散：client.tsに統合すべき
└── [TASK-001で削除済み]
    ├── metrics-collector.ts  
    └── batch-processor.ts    
```

### 目標の状況（docs/directory-structure.md準拠）
```
目標のutils/（6ファイル）:
├── constants.ts          # API URL・レート制限値等の定数
├── errors.ts             # X API特有のエラークラス
├── response-handler.ts   # レスポンス処理・正規化（normalizer統合後）
├── types.ts              # utils共通型（縮小版）
├── validator.ts          # 入力検証・型ガード（type-checker統合後）
└── index.ts              # utilsエクスポート
```

## ✅ **統合実行手順**

### 1. normalizer.ts → response-handler.ts 統合

#### 1-1. normalizer.tsの機能確認
```bash
# 現在のnormalizer.tsの内容確認
cat src/kaito-api/utils/normalizer.ts
```

#### 1-2. response-handler.tsに統合
```typescript
// src/kaito-api/utils/response-handler.ts に統合
// normalizer.tsの正規化機能をresponse-handlerに移植
// 重複する機能は統合、不要な機能は削除
```

#### 1-3. normalizer.ts削除
```bash
rm src/kaito-api/utils/normalizer.ts
```

### 2. type-checker.ts → validator.ts 統合

#### 2-1. type-checker.tsの機能確認
```bash
# 現在のtype-checker.tsの内容確認
cat src/kaito-api/utils/type-checker.ts
```

#### 2-2. validator.tsに統合
```typescript
// src/kaito-api/utils/validator.ts に統合
// type-checker.tsの型チェック機能をvalidatorに移植
// バリデーション機能として統一
```

#### 2-3. type-checker.ts削除
```bash
rm src/kaito-api/utils/type-checker.ts
```

### 3. rate-limiter.ts → core/client.ts 統合

#### 3-1. rate-limiter.tsの機能確認
```bash
# 現在のrate-limiter.tsの内容確認
cat src/kaito-api/utils/rate-limiter.ts
```

#### 3-2. core/client.tsに統合
```typescript
// src/kaito-api/core/client.ts に統合
// HTTPクライアント機能として統合
// レート制限処理をclient内部機能として実装
```

#### 3-3. rate-limiter.ts削除
```bash
rm src/kaito-api/utils/rate-limiter.ts
```

### 4. index.tsファイル更新
```typescript
// src/kaito-api/utils/index.ts から削除対象のexport文を除去
// 以下の行を削除:
// export * from './normalizer';
// export * from './type-checker';
// export * from './rate-limiter';

// 最終的なexport構成:
export * from './constants';
export * from './errors';
export * from './response-handler';
export * from './types';
export * from './validator';
```

## 📏 **統合品質基準**

### 必須チェック項目
- [ ] 統合後の各ファイルが正しく機能する
- [ ] 重複機能が適切に統合されている
- [ ] 削除されたファイルへの依存関係が解決されている
- [ ] TypeScript型エラーが発生しない
- [ ] utils/ディレクトリが仕様通り6ファイル構成になっている

### 統合後の機能テスト
```bash
# 各統合ファイルのimport/exportテスト
node -e "
const responseHandler = require('./src/kaito-api/utils/response-handler');
const validator = require('./src/kaito-api/utils/validator');
const client = require('./src/kaito-api/core/client');
console.log('統合機能テスト完了');
"
```

### TypeScript型チェック
```bash
# 統合後の型チェック
npx tsc --noEmit
echo "型チェック完了: $(date)"
```

## 🚫 **禁止事項（MVP制約厳守）**

### 統合時の禁止行為
- ❌ **新機能追加**: 統合時に新しい機能を追加しない
- ❌ **過度な最適化**: 統合を口実とした過剰な改良禁止
- ❌ **複雑化**: シンプルな統合のみ、アーキテクチャ変更禁止

### 保持すべき原則
- ✅ **既存機能保護**: 統合前の機能は全て保持
- ✅ **シンプル統合**: 最小限の変更で統合実現
- ✅ **MVP準拠**: 基本機能のみの統合

## 📂 **依存関係更新**

### core/client.ts更新（rate-limiter統合）
```typescript
// rate-limiter機能をclient内部に統合
// 既存のHTTPクライアント機能を保持しつつ統合
// 外部依存を減らしつつ機能統合
```

### 他ファイルへの影響確認
```bash
# 統合対象ファイルへの依存関係確認
grep -r "normalizer" src/kaito-api/
grep -r "type-checker" src/kaito-api/
grep -r "rate-limiter" src/kaito-api/

# 発見された依存関係を統合後の形式に更新
```

## 📄 **出力管理**

### 報告書作成先
```
tasks/20250729_170148_kaito_api_perfect_implementation/reports/REPORT-002-utils-optimization.md
```

### 報告書必須内容
1. **統合されたファイル詳細**（統合前後の差分）
2. **削除されたファイル一覧**
3. **index.ts更新内容**
4. **依存関係更新結果**
5. **TypeScript型チェック結果**
6. **最終的なutils/構成確認**

## 🎯 **完了条件**
- [ ] normalizer.ts → response-handler.ts 統合完了
- [ ] type-checker.ts → validator.ts 統合完了  
- [ ] rate-limiter.ts → core/client.ts 統合完了
- [ ] 削除対象ファイル3つが削除済み
- [ ] utils/ディレクトリが仕様通り6ファイル構成
- [ ] index.ts正しく更新済み
- [ ] 依存関係エラーゼロ
- [ ] TypeScript型チェックパス
- [ ] 報告書作成完了

## ⚠️ **TASK-001との協調**
- **前提条件**: TASK-001（MVP違反ファイル削除）の完了を必ず確認
- **並列実行**: TASK-001と並列実行可能
- **統合作業**: 両タスクの結果を統合して最終確認