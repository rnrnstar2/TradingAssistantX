# TASK-001 Decision Engine MVP実装・検証・最適化

## 🎯 **タスク概要**
フェーズ2の中核である`core/decision-engine.ts`のMVP適合性を検証し、過剰実装を削除して動作可能な最小限の意思決定エンジンに最適化する。

## 📋 **現状分析**
- `core/decision-engine.ts`が既に存在（1994行の大規模実装）
- 複雑すぎてMVP原則・YAGNI原則に反している可能性
- 実際の動作確認が未実施
- Claude Code SDKを使用した自律的意思決定システムが実装済み

## 🚨 **MVP制約チェック**
REQUIREMENTS.mdに基づく制約：
- ✅ RSS Collector中心の段階的実装
- ✅ 疎結合設計（CollectionResult型による統一インターフェース）
- ✅ 自律的意思決定（Claude Code SDK活用）
- ❌ **過剰実装の疑い**（1994行は明らかに過大）

## 🎯 **実装目標**

### 1. 現在実装の検証・分析
- [ ] 既存の`core/decision-engine.ts`の機能棚卸し
- [ ] 各メソッドのMVP必要性評価
- [ ] 複雑度分析（McCabe複雑度、コード行数）
- [ ] 実際の動作テスト実行

### 2. MVP適合への簡素化
- [ ] **核心機能の特定**：自律的意思決定の最小限実装
- [ ] **過剰機能の除去**：統計、分析、最適化の複雑な処理を削除
- [ ] **YAGNI原則適用**：今すぐ必要でない機能の除去
- [ ] **シンプルな意思決定ロジック**：original_post生成に特化

### 3. 疎結合設計の確認
- [ ] BaseCollector継承の確認
- [ ] CollectionResult型の統一インターフェース準拠
- [ ] RSS Collectorとの独立動作確認
- [ ] データソース依存関係の除去

### 4. Claude Code SDK統合最適化
- [ ] Claude Code SDK呼び出しの簡素化
- [ ] タイムアウト・エラーハンドリングの最適化
- [ ] 決定プロンプトの簡潔化
- [ ] レスポンス解析の高速化

## 🔧 **具体的実装指示**

### Phase 1: 現在実装の分析・検証
```typescript
// 実行テストを作成して既存実装の動作確認
// - SystemDecisionEngineのインスタンス化テスト
// - 基本的な意思決定メソッドの動作確認
// - Claude Code SDK連携の動作確認
// - エラーハンドリングの確認
```

### Phase 2: MVP核心機能の特定
必要最小限の機能のみ残す：
1. **基本意思決定** (`analyzeAndDecide`)
2. **Claude統合** (Claude Code SDK呼び出し)
3. **フォールバック決定** (エラー時の基本動作)
4. **統合コンテキスト処理** (IntegratedContext)

### Phase 3: 過剰実装の除去
削除対象（MVP不要）：
- Performance metrics (1256-1280行)
- Content convergence engine (1418-1768行)
- Autonomous exploration engine (1774-1805行)
- Context compression system (1904-1993行)
- 複雑なログシステム
- 統計・分析機能

### Phase 4: 簡素化された実装
```typescript
export class SystemDecisionEngine {
  // 核心メソッドのみ
  async analyzeAndDecide(context: Context): Promise<Decision[]>
  async planActionsWithIntegratedContext(integratedContext: IntegratedContext): Promise<Decision[]>
  private async makeIntegratedDecisions(integratedContext: IntegratedContext): Promise<Decision[]>
  private createFallbackDecisions(context: IntegratedContext): Decision[]
}
```

### Phase 5: 動作テスト・統合確認
- [ ] 簡素化後の動作テスト
- [ ] RSS Collectorとの統合テスト
- [ ] 実データでの意思決定確認
- [ ] Claude Code SDK連携確認

## 📊 **品質基準**

### コード品質
- **行数制限**: 400行以内（現在の1/5に削減）
- **複雑度**: McCabe複雑度 10以下/メソッド
- **型安全性**: TypeScript strict mode完全準拠
- **エラーハンドリング**: 全メソッドでtry-catch実装

### 機能品質
- **応答速度**: 意思決定プロセス3秒以内
- **信頼性**: フォールバック決定100%動作
- **疎結合度**: 他モジュールへの依存最小化
- **テスト可能性**: 単体テスト作成可能な構造

## 🚀 **実行順序**
1. **現在実装分析** (30分) - 既存コードの理解・問題点特定
2. **MVP機能設計** (20分) - 必要最小限機能の設計
3. **実装簡素化** (60分) - 過剰実装除去・核心機能実装
4. **動作テスト** (30分) - 簡素化後の動作確認
5. **統合確認** (20分) - システム全体との整合性確認

## 📂 **出力ファイル**
- `/Users/rnrnstar/github/TradingAssistantX/src/core/decision-engine.ts` (既存ファイル最適化)
- `/Users/rnrnstar/github/TradingAssistantX/tasks/20250723_000347/reports/REPORT-001-decision-engine-mvp.md`

## ⚠️ **重要制約**
- **モックデータ使用禁止**: 実データ収集のみ使用
- **YAGNI原則厳守**: 今すぐ必要でない機能は一切実装しない
- **MVP最優先**: 機能完璧性より動作可能性を重視
- **疎結合設計維持**: RSS Collectorとの独立性確保

## 🎯 **成功基準**
1. ✅ Decision Engineが400行以内に簡素化
2. ✅ Claude Code SDK連携が正常動作
3. ✅ RSS Collectorと独立して動作
4. ✅ original_post決定を3秒以内で生成
5. ✅ エラー時のフォールバック決定が動作

---
**実装完了後、必ず報告書を作成してください。**