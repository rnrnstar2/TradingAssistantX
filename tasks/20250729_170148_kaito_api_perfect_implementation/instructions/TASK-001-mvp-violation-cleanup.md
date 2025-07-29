# TASK-001: MVP違反ファイル削除・清掃作業

## 🎯 **タスク概要**
src/kaito-api内のMVP違反ファイル（統計・分析機能）の削除とディレクトリ構造の仕様準拠化

## 📋 **実行前必須確認**
1. **REQUIREMENTS.md読み込み**: MVP制約の理解
2. **docs/directory-structure.md確認**: 正しい構造仕様の把握
3. **docs/kaito-api.md確認**: KaitoAPI仕様の理解

## 🚫 **MVP違反ファイル削除リスト**

### 削除対象ファイル（統計・分析機能）
```bash
# MVP明確違反：統計・分析機能
src/kaito-api/utils/metrics-collector.ts  # パフォーマンス分析・統計機能

# 過剰実装：仕様外の複雑機能
src/kaito-api/utils/batch-processor.ts    # バッチ処理（仕様外）
```

**削除理由**:
- **metrics-collector.ts**: 統計・分析・パフォーマンス監視機能は MVP原則違反
  - 「統計・分析機能を含まないか？」チェックに明確に抵触
  - REQUIREMENTS.mdでは「基本的なエラーハンドリング」のみ要求
- **batch-processor.ts**: docs/kaito-api.mdに記載のない過剰実装

## ✅ **実行手順**

### 1. MVP違反ファイル削除
```bash
# 統計・分析機能削除
rm src/kaito-api/utils/metrics-collector.ts
rm src/kaito-api/utils/batch-processor.ts
```

### 2. index.tsファイル更新
```typescript
// src/kaito-api/utils/index.ts から削除対象のexport文を除去
// 以下の行を削除:
// export * from './metrics-collector';
// export * from './batch-processor';
```

### 3. 依存関係チェック・修正
```bash
# 削除したファイルへの依存を検索
grep -r "metrics-collector" src/
grep -r "batch-processor" src/
grep -r "MetricsCollector" src/
grep -r "BatchProcessor" src/
```

発見された依存関係は以下のように対処:
- **metrics-collector依存**: 削除（統計機能はMVP不要）
- **batch-processor依存**: 標準的な処理に置き換え

### 4. 削除されたファイルの清掃確認
Git statusで削除されたファイルが正しく反映されているか確認:
```bash
git status
git add -A  # 削除の反映
```

## 📏 **品質基準**

### 必須チェック項目
- [ ] MVP違反ファイルが完全削除されている
- [ ] index.tsから該当exportが除去されている
- [ ] 依存関係エラーが発生しない
- [ ] TypeScript型エラーが発生しない
- [ ] 既存の正常ファイルに影響がない

### コンパイル確認
```bash
# TypeScript型チェック
npx tsc --noEmit

# 型エラーなしで完了することを確認
echo "型チェック完了: $(date)"
```

## 🚫 **禁止事項（MVP制約厳守）**

### 実装禁止
- ❌ **統計・分析機能の追加**: メトリクス、パフォーマンス分析、レポート生成
- ❌ **複雑なバッチ処理**: 仕様にない高度な処理機能
- ❌ **将来の拡張性を考慮した設計**: MVP原則違反

### 代替禁止
- ❌ metrics-collectorの代替実装は作成しない
- ❌ 削除機能の「改良版」は作成しない
- ❌ 統計機能の「簡素版」は作成しない

## 📄 **出力管理**

### 報告書作成先
```
tasks/20250729_170148_kaito_api_perfect_implementation/reports/REPORT-001-mvp-violation-cleanup.md
```

### 報告書必須内容
1. **削除されたファイル一覧**
2. **修正されたindex.tsの差分**
3. **依存関係チェック結果**
4. **TypeScript型チェック結果**
5. **git status確認結果**

## 🎯 **完了条件**
- [ ] MVP違反ファイル（metrics-collector.ts, batch-processor.ts）が削除済み
- [ ] index.tsから該当export削除済み
- [ ] 依存関係エラーゼロ
- [ ] TypeScript型チェックパス
- [ ] 報告書作成完了

## ⚠️ **重要注意事項**
- **Manager権限制限**: 実装作業はWorker権限でのみ実行
- **MVP原則厳守**: 削除のみ、追加・改良は一切禁止
- **既存機能保護**: 正常なファイルは一切変更しない