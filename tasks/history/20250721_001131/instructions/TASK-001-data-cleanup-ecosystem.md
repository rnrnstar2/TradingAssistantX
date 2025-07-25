# TASK-001: データクリーンアップエコシステム実装

## 🎯 実装目的

定期実行システムの**データエコシステム問題**を解決：
- **180KB**の不要な一時ファイル蓄積
- **削除メカニズム完全欠如**
- **MVP原則違反**（過剰な中間データ保存）

## 🚨 MVP制約（必須遵守）

### 絶対禁止
- **統計・分析システム** - データ削除の統計取得禁止
- **複雑なエラーハンドリング** - リトライ機構等は実装しない
- **将来の拡張機能** - 設定可能パラメータは最小限のみ

### 実装範囲
**最小限のクリーンアップ機能のみ**：
1. 一時ファイル自動削除
2. 古いタスクセッション削除
3. 実行完了後の清掃

## 📋 実装対象ファイル

### 削除対象データ
```
data/
├── contexts/        (40KB - 11個の一時ファイル)
├── intermediate/    (56KB - 18個の一時ファイル)
├── status/         (32KB - 13個の一時ファイル)
└── communication/  (20KB - 4個の通信ファイル)
```

### 保持対象データ（重要・削除禁止）
```
data/
├── account-strategy.yaml
├── content-patterns.yaml
├── growth-targets.yaml
├── posting-history.yaml
├── performance-insights.yaml
├── quality-assessments.yaml
├── strategic-decisions.yaml
└── collection-results.yaml
```

### 古いタスクセッション
```
tasks/
├── 20250720-124300/    (削除対象)
├── 20250720_193739/    (削除対象)
├── 20250720_194351_*/  (削除対象)
├── 20250720_232710/    (削除対象)
└── 20250721_000325/    (削除対象)
```

## 🔧 実装要件

### 1. クリーンアップスクリプト作成
**ファイル**: `scripts/cleanup/data-cleanup.ts`

**機能**（最小限）：
- 一時ディレクトリの完全削除
- 7日以上古いタスクセッション削除
- 実行ログの簡単な出力

### 2. 自動実行統合
**ファイル**: 既存の定期実行スクリプトに統合

**統合点**：
- システム実行完了後に自動実行
- 失敗しても全体を停止しない

### 3. package.json コマンド追加
```json
{
  "scripts": {
    "cleanup": "tsx scripts/cleanup/data-cleanup.ts",
    "cleanup:force": "tsx scripts/cleanup/data-cleanup.ts --force"
  }
}
```

## 🛡️ 安全性要件

### 削除前チェック（必須）
1. **保護対象ファイル**をチェック（YAML設定ファイル）
2. **現在実行中**のファイルは削除しない
3. **削除対象**の明確な判定

### エラー処理（最小限）
- ファイル削除失敗時は**ログ出力のみ**
- 処理継続（他ファイルの削除を停止しない）
- **複雑なリトライ禁止**

## 📂 出力管理（強制遵守）

### 出力先
- **一時ファイル**: `tasks/20250721_001131/outputs/`
- **ログファイル**: `tasks/20250721_001131/outputs/TASK-001-cleanup-log.txt`

### 禁止出力先
- **ルートディレクトリ直下**は絶対禁止
- `*-analysis.md`, `*-report.md` 等の分析ファイル作成禁止

## ✅ 実装手順

1. **削除対象の特定**
   - 一時ディレクトリのファイル一覧取得
   - 古いタスクセッションの特定
   
2. **クリーンアップスクリプト作成**
   - TypeScript strict mode
   - 最小限のエラーハンドリング
   - 明確な削除ログ

3. **統合テスト**
   - 手動実行テスト
   - 保護対象ファイルの安全性確認

4. **自動実行統合**
   - 既存システムへの組み込み

## 🚫 実装禁止事項

- **統計計算**（削除ファイル数、容量削減率等）
- **複雑な設定システム**
- **バックアップ機能**
- **復元機能**
- **詳細な分析レポート**

## 🎯 成功基準

1. **一時ファイル完全削除**（180KB → 0KB）
2. **古いタスクセッション削除**（5ディレクトリ → 1ディレクトリ）
3. **自動実行統合完了**
4. **MVP制約完全遵守**

## 📋 報告書要件

**報告書**: `tasks/20250721_001131/reports/REPORT-001-data-cleanup-ecosystem.md`

**含める内容**：
- 削除されたファイル/ディレクトリの一覧
- 実装されたクリーンアップ機能
- 自動実行統合の詳細
- MVP制約遵守の確認

**含めない内容**：
- 統計・分析情報
- パフォーマンス指標
- 詳細な技術解説

---

**重要**: この実装により、定期実行システムの**データエコシステム**が確立され、**無制限蓄積問題**が解決されます。