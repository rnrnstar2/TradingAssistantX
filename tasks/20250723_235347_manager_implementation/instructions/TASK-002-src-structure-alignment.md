# TASK-002: src構造REQUIREMENTS.md適合実装

## 🎯 実装目標

現在のsrc構造をREQUIREMENTS.mdの「19ファイル・6ディレクトリ構成」に完全適合させる

## 📋 実装詳細

### 1. **不足ファイル実装**

#### `src/scheduler/main-loop.ts` 作成
**目的**: メイン実行ループ統合
```typescript
interface MainLoopConfig {
  intervalMs: number; // 30分間隔 = 1800000ms
  claudeDecisionEngine: ClaudeDecisionEngine;
  kaitoActionExecutor: KaitoActionExecutor;
  dataManager: DataManager;
}

class MainLoop {
  // 30分間隔実行制御
  // Claude判断→KaitoAPI実行→結果記録
}
```

#### `src/shared/` ディレクトリ整備
**作成ファイル**:
- `types.ts` - 型定義統合
- `config.ts` - 設定管理
- `logger.ts` - ログ管理

#### `src/main.ts` 移動・統合
**対象**: `src/scripts/main.ts` → `src/main.ts`
**目的**: システム起動スクリプト統一

### 2. **既存ディレクトリ整理**

#### `src/core/` 統合判断
**現在の内容**:
- `claude-autonomous-agent.ts`
- `decision-engine.ts`
- `loop-manager.ts`

**実装方針**:
- `decision-engine.ts` → `src/claude/decision-engine.ts`に統合
- `loop-manager.ts` → `src/scheduler/main-loop.ts`に統合
- `claude-autonomous-agent.ts` → 機能を適切なディレクトリに分散

#### `src/services/` 統合判断
**現在の内容**:
- `content-creator.ts` → `src/claude/content-generator.ts`と統合検討
- `kaito-api-manager.ts` → `src/kaito-api/client.ts`と統合検討
- `performance-analyzer.ts` → 将来拡張として保留
- `x-poster.ts` → `src/kaito-api/action-executor.ts`と統合検討

## 🎯 **REQUIREMENTS.md目標構造**

```
src/ (19ファイル・6ディレクトリ)
├── claude/ (3ファイル)
│   ├── decision-engine.ts
│   ├── content-generator.ts
│   └── post-analyzer.ts
├── kaito-api/ (3ファイル)
│   ├── client.ts
│   ├── search-engine.ts
│   └── action-executor.ts
├── scheduler/ (2ファイル)
│   ├── core-scheduler.ts
│   └── main-loop.ts ←新規作成
├── data/ (8ファイル)
│   ├── data-manager.ts
│   ├── config/
│   ├── learning/
│   └── context/
├── shared/ (3ファイル)
│   ├── types.ts ←新規作成
│   ├── config.ts ←新規作成
│   └── logger.ts ←新規作成
└── main.ts (1ファイル) ←移動・統合
```

## 🚫 **MVP制約事項**

### 制限事項
- **機能削除禁止**: 既存動作機能を損なわない
- **複雑な統合回避**: シンプルな移動・統合のみ
- **過剰設計禁止**: 将来拡張は考慮しない

### 必須事項
- **動作継続性**: 既存の`pnpm dev`, `pnpm start`動作維持
- **型安全性**: TypeScript strict維持
- **依存関係保持**: インポート・エクスポート関係維持

## 📂 **出力管理**

### 出力先制限
- **ソースコード**: `src/`配下のみ
- **移動・統合**: 既存ファイルの適切な移動・統合
- **削除判断**: 不要ファイルの安全な削除

### 禁止事項
- **データ破壊**: 既存機能・データの破壊
- **無計画削除**: 依存関係を考慮しない削除

## ✅ **実装完了基準**

### 構造要件
- [ ] REQUIREMENTS.md構造完全適合（19ファイル・6ディレクトリ）
- [ ] 不足ファイル全作成（main-loop.ts, shared/配下3ファイル, main.ts）
- [ ] 余分ディレクトリ整理完了（core/, services/統合）

### 動作要件
- [ ] `pnpm dev`正常動作
- [ ] `pnpm start`正常動作
- [ ] 30分間隔実行機能維持

### 品質要件
- [ ] TypeScript strict通過
- [ ] npm run lint通過
- [ ] npm run typecheck通過
- [ ] 既存テスト全通過

## 🎯 **完了報告書**

実装完了後、以下を作成：
**報告書**: `tasks/20250723_235347_manager_implementation/reports/REPORT-002-src-structure-alignment.md`

**報告内容**:
- 構造変更詳細（移動・統合・新規作成一覧）
- REQUIREMENTS.md適合度確認
- 動作確認結果
- 品質チェック結果

## ⚠️ **実行順序**

**依存関係**: TASK-001完了後に開始
**理由**: kaito-api最適化後の構造を基準とした統合が必要

---

**📝 重要**: 既存動作を破壊せず、REQUIREMENTS.md構造に段階的に適合させる慎重な実装を実行