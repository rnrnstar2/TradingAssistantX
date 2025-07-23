# TASK-002: TypeScript型エラー修正

## 🎯 タスク概要
システム内の80+のTypeScript型エラーを体系的に修正し、型安全性を確保する。

## 🚨 緊急度
**最高優先度** - システムビルド・動作に必要

## 📊 エラー分析結果

### 主要エラーカテゴリ
1. **型エクスポート不足**: `AccountInfo`, `AccountMetrics` などの型が見つからない
2. **プロパティアクセスエラー**: `CollectionResult` インターフェース関連
3. **null安全性**: `textContent` などの null チェック不足
4. **型定義不整合**: 既存の型定義と実装の乖離

### 影響ファイル（優先度順）
1. `src/types/index.ts` - 型エクスポート修正（最優先）
2. `src/collectors/playwright-account.ts` - null安全性修正
3. `src/collectors/rss-collector.ts` - 型定義修正
4. `src/core/autonomous-executor.ts` - インターフェース修正
5. `src/services/content-creator.ts` - プロパティアクセス修正
6. `src/types/data-types.ts` - 型定義整合性修正

## 🔧 修正手順

### Phase 1: 型エクスポート修正（最優先）
**対象**: `src/types/index.ts`
**問題**: `AccountInfo`, `AccountMetrics` などの型がエクスポートされていない

**修正内容**:
```typescript
// 不足している型エクスポートを追加
export interface AccountInfo {
  // 実装を確認して適切な型定義を追加
}

export interface AccountMetrics {
  // 実装を確認して適切な型定義を追加  
}

export type MultiSourceCollectionResult = {
  // 実装を確認して適切な型定義を追加
}

export interface RssYamlSettings {
  // 実装を確認して適切な型定義を追加
}

export interface RSSSource {
  // 実装を確認して適切な型定義を追加
}

export type ProcessedData = {
  // 実装を確認して適切な型定義を追加
}
```

### Phase 2: null安全性修正
**対象**: `src/collectors/playwright-account.ts`
**問題**: `textContent` などのnullチェック不足

**修正パターン**:
```typescript
// 修正前
const text = element.textContent;

// 修正後  
const text = element.textContent ?? '';
// または
const text = element.textContent || 'default_value';
```

### Phase 3: CollectionResult型修正
**対象**: 複数ファイル
**問題**: `CollectionResult` インターフェースのプロパティアクセスエラー

**アプローチ**:
1. `CollectionResult` の型定義を確認
2. 不足しているプロパティを追加
3. 型ガード関数を実装してタイプセーフにアクセス

### Phase 4: プロパティアクセス修正
**対象**: `src/core/autonomous-executor.ts`, `src/services/content-creator.ts`
**問題**: オブジェクトプロパティの存在確認不足

**修正パターン**:
```typescript
// 修正前
obj.property

// 修正後
obj.property ?? defaultValue
// または
'property' in obj ? obj.property : defaultValue
```

## 📋 修正対象エラー一覧

### 重要度A（ビルド停止）
- `src/types/index.ts`: 型エクスポート不足（6件）
- `src/collectors/rss-collector.ts`: 型定義不足（10件）

### 重要度B（機能影響）
- `src/collectors/playwright-account.ts`: null安全性（5件）
- `src/core/autonomous-executor.ts`: プロパティアクセス（15件）

### 重要度C（品質向上）
- `src/services/content-creator.ts`: プロパティアクセス（20件）
- `src/types/data-types.ts`: 型定義整合性（10件）

## ✅ 実装要件

### 必須要件
1. **エラーゼロ**: `npx tsc --noEmit` でエラー0件達成
2. **型安全性**: strict モード対応
3. **既存機能**: 既存の動作を破壊しない
4. **コード品質**: ESLint ルール遵守

### 制約事項
1. **破壊的変更禁止**: 既存のAPIを変更しない
2. **パフォーマンス**: 型チェックによる性能劣化なし
3. **可読性**: 型定義は明確で理解しやすく

## 🔍 検証手順

### 段階的検証
```bash
# Phase 1完了後
npx tsc --noEmit src/types/index.ts

# Phase 2完了後  
npx tsc --noEmit src/collectors/playwright-account.ts

# 全体完了後
npx tsc --noEmit
pnpm run lint
pnpm run test
```

### 成功基準
- [ ] TypeScriptコンパイルエラー: 0件
- [ ] ESLintエラー: 0件
- [ ] 既存テスト: 全て通過
- [ ] 実行テスト: `pnpm dev` が正常動作

## 📂 出力管理
- **修正対象**: `src/` ディレクトリ内のファイルのみ
- **バックアップ**: 重要な変更前にGitコミット推奨
- **ログ出力**: 修正内容の詳細ログを記録

## 📋 報告書作成
実装完了後、以下に報告書を作成:
**報告書パス**: `tasks/20250723_104916/reports/REPORT-002-typescript-errors-fix.md`

**報告内容**:
- 修正したファイル一覧と変更内容
- Phase別の修正結果
- エラー数の変化（修正前→修正後）
- 残存する問題（あれば）
- 検証結果（tsc, lint, test）

## 🎯 実行順序
**Phase順次実行**: Phase 1 → Phase 2 → Phase 3 → Phase 4
**理由**: 型定義が基盤となるため、段階的に修正する必要がある

## ⚠️ 注意事項
1. **既存コード尊重**: 既存のロジックを変更せず、型安全性のみ向上
2. **最小限修正**: 必要最小限の変更に留める
3. **テスト実行**: 各Phaseで部分テストを実行
4. **コミット推奨**: Phase完了時点での中間コミット推奨