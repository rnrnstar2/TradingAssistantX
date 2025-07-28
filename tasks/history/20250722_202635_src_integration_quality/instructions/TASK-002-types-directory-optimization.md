# Task: types/ ディレクトリ整理・最適化タスク

## 概要
srcディレクトリの types/ 配下を分析・整理し、REQUIREMENTS.mdで定義された理想構造に適合する最適化されたタイプ定義システムを構築します。

## 現在のtypes/ディレクトリ構成
```
src/types/
├── action-types.ts
├── adaptive-collection.d.ts
├── autonomous-system.ts
├── claude-tools.ts
├── collection-common.ts
├── convergence-types.ts
├── decision-logging-types.ts
├── decision-types.ts
├── index.ts
├── multi-source.ts
└── rss-collection-types.ts
```

## 最適化戦略

### Phase 1: 使用状況分析
各型定義ファイルの実際の利用状況を徹底分析し、以下を判定：
- **必須**: 現在のシステムで使用中
- **統合候補**: 他ファイルと統合可能
- **廃止候補**: 使用されていない・重複している

### Phase 2: 統合・最適化
関連する型定義を論理的にグループ化し、以下の原則で統合：
- **機能別統合**: 同一機能領域の型を統一ファイル化
- **依存関係最小化**: 循環依存の排除
- **型安全性向上**: より厳密な型定義への改善

### Phase 3: ディレクトリ最適化
REQUIREMENTS.mdに準拠した最適化構造の構築

## 実装手順

### Step 1: 詳細分析フェーズ
1. **使用状況調査**
   ```bash
   # 各型ファイルの使用箇所を全検索
   find src -name "*.ts" -exec grep -l "import.*from.*types/" {} \;
   ```
   
2. **依存関係マッピング**
   - 各型定義の相互依存関係を調査
   - 循環依存の検出・記録
   
3. **重複型定義の特定**
   - 似た役割を持つ型定義の発見
   - 統合可能性の評価

### Step 2: 統合設計フェーズ
1. **統合パターンの決定**
   ```typescript
   // 例: 収集関連型の統合
   // rss-collection-types.ts + collection-common.ts + adaptive-collection.d.ts
   // → collection-types.ts として統合
   
   // 例: 意思決定関連型の統合
   // decision-types.ts + decision-logging-types.ts
   // → decision-types.ts として統合
   ```

2. **型階層の最適化**
   - 基底型と派生型の関係を明確化
   - ジェネリクス活用による型の汎用化

### Step 3: 実装フェーズ
1. **統合型ファイルの作成**
   - 論理的にグループ化された新しい型定義ファイル作成
   - 既存の型定義内容を保持しつつ最適化

2. **index.ts の更新**
   - 統合された型定義の適切なexport管理
   - 外部からのアクセス方法の統一

3. **不要ファイルの整理**
   - 統合済み・未使用ファイルの削除
   - バックアップ作成

### Step 4: 統合確認フェーズ
1. **import文の更新**
   - src/全体での型import文を新構造に合わせて修正
   - 破壊的変更の最小化

2. **TypeScript厳格チェック**
   - `pnpm run typecheck` で型エラー0確認
   - strict mode での動作確認

## 予想される最適化構造

### 統合候補グループ
```typescript
// 1. データ収集関連 → collection-types.ts
// - rss-collection-types.ts
// - collection-common.ts
// - adaptive-collection.d.ts
// - multi-source.ts

// 2. システム制御関連 → system-types.ts
// - autonomous-system.ts
// - action-types.ts

// 3. 意思決定関連 → decision-types.ts (既存を拡張)
// - decision-types.ts
// - decision-logging-types.ts

// 4. 外部連携関連 → integration-types.ts
// - claude-tools.ts

// 5. 特殊機能関連 → specialized-types.ts
// - convergence-types.ts
```

## 技術要件

### 必須遵守項目
- **型安全性**: TypeScript strict mode完全対応
- **後方互換性**: 既存コードの動作を破壊しない
- **疎結合設計**: 循環依存の完全排除
- **REQUIREMENTS.md準拠**: 定義構造からの逸脱禁止

### パフォーマンス要件
- **コンパイル速度**: 型チェック時間の短縮
- **バンドルサイズ**: 不要な型定義による肥大化防止
- **開発体験**: import文の簡素化

## 品質基準

### コード品質
- **TypeScript strict**: エラー・警告 0件
- **ESLint**: 全ルール通過
- **型安全性**: any型の使用最小化
- **保守性**: 明確な型階層と命名

### 統合性確認
- **`pnpm run typecheck`**: エラーなし
- **`pnpm run build`**: ビルド成功
- **`pnpm dev`**: システム正常動作

## 出力管理

### バックアップ
- 削除・変更前のファイルバックアップ: `tasks/20250722_202635_src_integration_quality/backup/types-original/`

### 最適化後の構造
- 最適化された `src/types/` ディレクトリ
- 更新された `src/types/index.ts`

### レポートファイル
- 最適化レポート: `tasks/20250722_202635_src_integration_quality/reports/REPORT-002-types-directory-optimization.md`

## 成功基準の明確化

### 定量的指標
1. **ファイル数削減**: 統合による適切な削減
2. **型エラー 0**: TypeScript strict mode
3. **import文の簡素化**: より直感的なimport構造
4. **循環依存 0**: 依存関係の最適化

### 定性的指標
1. **保守性向上**: 型定義の論理的整理
2. **開発体験向上**: 分かりやすい型構造
3. **将来拡張性**: 新機能追加時の型定義容易性

## 注意事項

### 重要な制約
1. **既存システム継続動作**: 最適化中も動作保証
2. **段階的移行**: 一度に全変更せず段階的実施
3. **品質優先**: 行数制限なし、完全性重視
4. **Manager権限制限**: Worker作業のみでManager実装なし

### リスク管理
- **バックアップ作成**: 全変更前に必須
- **段階的確認**: 各段階でのtypecheck実行
- **依存関係監視**: 破壊的変更の早期検出