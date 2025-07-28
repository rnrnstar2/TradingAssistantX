# TASK-003: 統合テスト・動作確認タスク

## 🎯 タスク概要

**目的**: Worker1・Worker2の作業完了後、全体システムの統合テスト・動作確認を実行

**優先度**: 高重要 - 品質保証・システム健全性確認

**実行順序**: 🔄 **直列実行** - Worker1・Worker2の両方完了後に開始

## 📋 作業前必須確認

### 権限・環境チェック
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**⚠️ ROLE=worker 必須、権限確認完了まで作業開始禁止**

### 依存関係確認
```bash
# 両方のWorkerの作業完了を確認
ls tasks/20250724_134113/reports/REPORT-001-main-workflow-implementation.md
ls tasks/20250724_134113/reports/REPORT-002-mainloop-simplification.md
```
**⚠️ Worker1・Worker2の両報告書確認必須 - 完了していない場合は待機**

### 要件定義書確認
```bash
cat REQUIREMENTS.md | head -30
```

## 🎯 テスト要件

### 統合テスト観点
1. **ワークフロー透明性**: main.tsでワークフローが明確に理解できる
2. **責任分離**: MainLoopがスケジュール専用化されている  
3. **動作継続性**: 30分毎自動実行が正常に動作する
4. **エラー処理**: 適切なエラーハンドリングと復旧機能
5. **品質基準**: TypeScript・Lint・型安全性の確保

### 成功基準
- **可読性向上**: main.tsを見ればワークフロー全体が理解できる
- **責任明確化**: MainLoopは純粋なスケジュール制御のみ
- **システム安定性**: 変更後もシステムが正常に動作する

## 🔧 具体的テストタスク

### Phase 1: コード品質確認

#### TypeScript型チェック
```bash
# 厳密な型チェック実行
pnpm run typecheck
```
**期待結果**: エラー0件、警告最小化

#### Lint実行
```bash  
# コード品質チェック
pnpm run lint
```
**期待結果**: Lintエラー0件、統一されたコードスタイル

#### コンパイル確認
```bash
# ビルド実行
pnpm run build
```
**期待結果**: ビルドエラー0件、正常なdist生成

### Phase 2: ワークフロー透明性テスト

#### main.ts構造確認
```typescript
// 以下の関数が明確に実装されているかチェック
✅ executeWorkflow(): Promise<ExecutionResult>
✅ loadSystemContext(): Promise<SystemContext>  
✅ makeClaudeDecision(context: SystemContext): Promise<ClaudeDecision>
✅ executeAction(decision: ClaudeDecision): Promise<ActionResult>
✅ recordResults(result: ActionResult, context: SystemContext): Promise<void>
```

#### ワークフロー可読性評価
- [ ] **30分毎ワークフローの4ステップが明確**
- [ ] **各ステップの処理内容が具体的に理解できる**
- [ ] **REQUIREMENTS.md との整合性が取れている**
- [ ] **コメント・ログ出力が適切**

### Phase 3: MainLoop責任分離テスト

#### MainLoop構造確認
```typescript
// 以下がMainLoopから適切に削除されているかチェック
❌ analyzeCurrentSituation() - 削除済み
❌ makeDecision() - 削除済み
❌ executeDecision() - 削除済み
❌ recordResults() - 削除済み

// 以下がMainLoopに残されているかチェック
✅ runOnce() - スケジュール制御のみ
✅ getMetrics() - メトリクス管理
✅ performHealthCheck() - ヘルスチェック
```

#### 責任分離評価
- [ ] **MainLoopがスケジュール機能のみに専念**
- [ ] **main.tsのexecuteWorkflow()を適切に呼び出し**
- [ ] **ビジネスロジックが一切含まれていない**
- [ ] **薄いラッパーとして機能している**

### Phase 4: 動作確認テスト

#### 基本動作テスト
```bash
# 開発モード実行（単発）
pnpm run dev
```
**確認項目**:
- [ ] システム起動が正常
- [ ] ワークフローが1回実行される
- [ ] 各ステップのログが適切に出力
- [ ] エラーなしで完了

#### スケジュール動作テスト
```bash
# 本格実行（30分間隔）- 短時間で停止
timeout 10s pnpm start || true
```
**確認項目**:
- [ ] スケジューラー起動が正常
- [ ] 30分間隔の設定が正しい
- [ ] ワークフローが定期実行される
- [ ] システム停止が正常

#### エラーハンドリングテスト
**意図的エラー発生での確認**:
- [ ] エラー時の適切なログ出力
- [ ] システム継続実行（停止しない）
- [ ] 次回実行への正常復帰

### Phase 5: パフォーマンス・品質確認

#### メモリ・CPU使用量確認
```bash
# リソース使用量監視
top -pid $(pgrep -f "node.*main") -l 3
```

#### ログ品質確認
- [ ] **適切なログレベル**: info, warn, error の使い分け
- [ ] **詳細情報**: 実行時間、アクション内容、結果
- [ ] **エラー詳細**: スタックトレース、原因特定情報

#### 設定・データファイル確認
```bash
# data/ディレクトリの整合性確認
ls -la data/config/ data/learning/ data/context/
```

## 🧪 実行・確認手順

### Step 1: 事前準備
```bash
# 依存関係インストール
pnpm install

# 環境変数確認
cat .env | grep -E "(CLAUDE_API_KEY|KAITO_API)"
```

### Step 2: 品質チェック実行
```bash
# 全品質チェック実行
pnpm run typecheck && pnpm run lint && pnpm run build
```

### Step 3: 動作確認実行
```bash
# 単発実行テスト
pnpm run dev

# スケジュール実行テスト（短時間）
timeout 30s pnpm start || echo "Test completed"
```

### Step 4: 詳細分析
```bash
# ログファイル確認
tail -n 50 logs/system.log

# データファイル確認
cat data/context/current-status.yaml
```

## 📝 成果物・出力先

### テスト結果レポート
```
tasks/20250724_134113/reports/REPORT-003-integration-testing.md
```

### 必須レポート内容
1. **品質確認結果**
   - TypeScript型チェック結果
   - Lint実行結果  
   - ビルド実行結果

2. **ワークフロー透明性評価**
   - main.ts構造分析
   - 可読性評価
   - REQUIREMENTS.md整合性

3. **責任分離評価**
   - MainLoop簡素化確認
   - 責任範囲明確化確認

4. **動作確認結果**
   - 基本動作テスト結果
   - スケジュール動作確認
   - エラーハンドリング確認

5. **推奨改善事項**
   - 発見された課題
   - 今後の改善提案
   - パフォーマンス最適化案

### 品質保証書類
```
tasks/20250724_134113/reports/quality-assurance-summary.md
```
**内容**: 全体品質保証の統合レポート

## ⚠️ 重要注意事項

### 品質最優先原則
- **妥協禁止**: 品質確保を最優先、問題発見時は改善提案
- **完全確認**: 全テスト項目の確実な実行
- **詳細記録**: 発見事項の詳細な記録と分析

### 問題発見時の対応
- **即座報告**: 重大な問題発見時は即座に報告書記載
- **影響分析**: 問題の影響範囲と対処法を分析
- **改善提案**: 具体的な解決策を提案

### 次ステップ準備
- **本格運用準備**: 本格運用に向けた推奨事項整理
- **監視項目**: 継続監視すべきポイントの明確化
- **保守計画**: 今後の保守・改善計画の提案

---

**🎯 成功基準**: 全テスト項目をクリアし、ワークフロー透明性・責任分離・システム安定性が確保され、本格運用可能な品質レベルに到達すること