# TASK-002 コード整合性検証・修復

## 🎯 タスク目標
構造整理後のコード整合性確保とTypeScript型安全性の完全実現

## 📋 権限・制約確認
- **Worker権限**: 実装・修正作業許可
- **出力先制限**: `tasks/outputs/`, `data/learning/`, `data/context/`のみ
- **依存関係**: TASK-001完了後に実行

## 🔍 検証・修復対象

### TypeScript整合性確認
1. **削除ファイル参照エラー修復**:
   - 削除されたファイルへのimport文除去
   - 削除された型定義の参照修正
   - 削除された関数・クラス呼び出し修正

2. **型定義整合性確認**:
   ```bash
   # 残存すべき型定義ファイル
   src/types/claude-types.ts       # Claude関連型
   src/types/core-types.ts         # システム・アクション・エラー型
   src/types/kaito-api-types.ts    # KaitoTwitterAPI型
   src/types/index.ts              # 統一エクスポート
   ```

3. **import/export整合性**:
   - 残存ファイル間の依存関係確認
   - 循環import回避
   - 未使用import除去

### 機能整合性確認

#### core/ディレクトリ (3ファイル)
```bash
src/core/claude-autonomous-agent.ts  # 中心的存在
src/core/decision-engine.ts          # 基本アクション決定
src/core/loop-manager.ts             # ループ管理
```

**確認項目**:
- Claude Code SDK統合が正常動作するか
- 基本的なアクション決定ロジックが完全か
- ループ管理が適切に実装されているか

#### services/ディレクトリ (4ファイル)
```bash
src/services/content-creator.ts      # 投稿生成
src/services/kaito-api-manager.ts    # KaitoTwitterAPI統合
src/services/x-poster.ts             # X投稿実行
src/services/performance-analyzer.ts # 基本分析・評価
```

**確認項目**:
- KaitoTwitterAPI統合が正常か
- 投稿生成ロジックが完全か
- X投稿実行が適切に実装されているか
- 基本分析機能が動作するか

#### utils/ディレクトリ (2ファイル)
```bash
src/utils/logger.ts           # ログ管理
src/utils/type-guards.ts      # 型ガード関数
```

**確認項目**:
- ログ管理が適切に動作するか
- 型ガード関数が正しく実装されているか

#### scripts/ディレクトリ (2ファイル)
```bash
src/scripts/dev.ts      # 単一実行（pnpm dev）
src/scripts/main.ts     # ループ実行（pnpm start）
```

**確認項目**:
- 実行スクリプトが正常動作するか
- 必要な依存関係が満たされているか

## 🔧 実装手順

### Phase 1: TypeScript型チェック
1. **型エラー特定**:
   ```bash
   npx tsc --noEmit --project tsconfig.json
   ```

2. **エラー分類・修復**:
   - Import/Export エラー
   - 型定義不整合エラー
   - 未定義参照エラー

### Phase 2: 依存関係修復
1. **Import文修正**:
   - 削除されたファイルへの参照除去
   - 正しいimportパス修正
   - 相対パス・絶対パス統一

2. **Export文修正**:
   - `src/types/index.ts`の統一エクスポート修正
   - 削除された型の除去
   - 必要な型のエクスポート追加

### Phase 3: 機能動作確認
1. **ビルド確認**:
   ```bash
   pnpm build  # または対応するビルドコマンド
   ```

2. **基本動作確認**:
   ```bash
   pnpm dev    # 単一実行テスト
   ```

3. **Lint確認**:
   ```bash
   pnpm lint   # または対応するlintコマンド
   ```

### Phase 4: 新規ファイル整合性確認
1. **data/learning/ファイル構造確認**:
   ```yaml
   # decision-patterns.yaml 基本構造
   decision_patterns: []
   
   # success-strategies.yaml 基本構造  
   success_strategies: []
   
   # error-lessons.yaml 基本構造
   error_lessons: []
   ```

2. **data/context/ファイル構造確認**:
   ```yaml
   # session-memory.yaml 基本構造
   session_data: {}
   
   # strategy-evolution.yaml 基本構造
   strategy_evolution: {}
   ```

## 🚨 過剰実装防止チェック

### MVP制約遵守確認
- **統計・分析機能**: 基本機能のみ、複雑な分析は除外
- **監視機能**: 基本ログのみ、詳細監視は除外  
- **自動最適化**: 基本判断のみ、高度な最適化は除外

### 🚫 実装禁止機能確認
- ResourceManagement系機能
- 詳細なパフォーマンス監視
- 自動リカバリー機能
- 複雑なロック管理
- ファイルサイズ自動監視

## 📊 成功基準
- [ ] TypeScript型エラー0個
- [ ] ビルド成功
- [ ] Lint通過
- [ ] `pnpm dev`正常実行
- [ ] 必要最小限の機能のみ実装
- [ ] MVP制約完全遵守

## 📋 報告要件
完了後、以下を含む報告書を作成：
- 修復したエラー一覧
- TypeScript型チェック結果
- ビルド・Lint結果
- 機能動作確認結果
- MVP制約遵守確認結果

**報告書出力先**: `tasks/20250723_230245_structure_optimization/reports/REPORT-002-code-integrity.md`