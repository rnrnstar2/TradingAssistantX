# TASK-003: 最終クリーンアップと動作検証

## 📋 **実装概要**

**目的**: Claude SDK完全移行の最終調整とMVP最小構成への適合
**重要性**: システム品質保証と安定動作の確立

## 🎯 **現状分析結果**

### 残存問題
1. **decision-engine参照残存**: 10件の旧参照が未修正
2. **learning/ディレクトリ存在**: MVP後実装予定だが現存
3. **新データ構造未検証**: 実動作での検証未実施

## 🚀 **実装作業指示**

### Phase 1: decision-engine参照の完全除去

**1. 残存参照の詳細調査**
```bash
# 具体的なファイルと行番号を特定
grep -rn "decision-engine" src/ --include="*.ts" | grep -v "node_modules"
```

**2. 参照パターン別修正**

**パターンA: インポート修正**
```typescript
// 修正前
import { ClaudeDecisionEngine } from '../claude/decision-engine';
import { DecisionEngine } from '../claude/decision-engine';

// 修正後
import { makeDecision, type ClaudeDecision } from '../claude';
```

**パターンB: クラスインスタンス修正**
```typescript
// 修正前
const decisionEngine = new ClaudeDecisionEngine(searchEngine, kaitoClient);
const decision = await decisionEngine.makeEnhancedDecision();

// 修正後（main-workflows内での使用）
import { makeDecision } from '../claude';
const decision = await makeDecision({
  context: {
    account: accountInfo,
    system: systemHealth,
    market: marketContext
  },
  learningData: learningData,
  currentTime: new Date()
});
```

**パターンC: 型定義修正**
```typescript
// 修正前
private decisionEngine: ClaudeDecisionEngine;

// 修正後（必要に応じて削除または関数参照に変更）
// 削除するか、makeDecision関数を直接使用
```

### Phase 2: MVP最小構成への適合

**1. learning/ディレクトリの処理**
```bash
# MVP後実装のため一時退避
mv src/data/learning src/data/_learning_future

# または.gitkeepのみ残して中身を空に
rm src/data/learning/*.yaml
echo "# MVP後に実装予定" > src/data/learning/.gitkeep
```

**2. REQUIREMENTS.md準拠確認**
- current/history/config/context のみが存在
- learning/は空ディレクトリまたは退避済み
- 余計なファイルが存在しないこと

### Phase 3: 新データ構造の動作検証

**1. 実行サイクルテスト**
```typescript
// data-manager.tsの新機能を実際に使用確認
// main-workflows/execution-flow.ts内で：

// サイクル開始
const cycleId = await dataManager.startNewCycle();
console.log('新サイクル開始:', cycleId);

// Claude結果保存
await dataManager.saveToCurrentCycle('claude-outputs', {
  decision: decision,
  timestamp: new Date().toISOString()
});

// 実行終了時のアーカイブ
await dataManager.archiveCycle(cycleId);
```

**2. ディレクトリ構造確認**
```bash
# 実行後の構造確認
ls -la src/data/current/
ls -la src/data/history/

# execution-YYYYMMDD-HHMM形式で作成されているか
# claude-outputs/等のサブディレクトリが作成されているか
```

### Phase 4: 統合動作確認

**1. 完全起動テスト**
```bash
# クリーンな状態で起動
pnpm dev

# 30秒以上安定動作確認
# エラーログがないこと
# Claude判断が正常に実行されること
```

**2. データフロー確認**
- システム起動 → 新サイクル作成
- Claude判断実行 → current/に保存
- 実行完了 → history/へアーカイブ

**3. エラーハンドリング確認**
- KaitoAPI接続エラー時の継続動作
- Claude SDK エラー時のフォールバック
- データ保存エラー時の復旧処理

## 📊 **品質基準**

### 必須要件
- ✅ decision-engine参照ゼロ
- ✅ MVP最小構成準拠（learning/は空または退避）
- ✅ pnpm dev完全正常動作
- ✅ データサイクル管理動作確認

### コード品質
- ✅ TypeScript型エラーなし
- ✅ 未使用インポート削除
- ✅ console.logの適切な使用
- ✅ エラーハンドリング完備

## 🔒 **実装制約**

### MVP制約
- **learning/**: 使用禁止（空または退避）
- **過剰実装禁止**: 現時点で必要な機能のみ
- **シンプル維持**: 複雑な抽象化は避ける

### 品質制約
- **動作確認必須**: 各修正後に起動確認
- **段階的修正**: 一度に大量修正しない
- **バックアップ不要**: Gitで管理

## 🎯 **成功基準**

### 完了条件
1. ✅ grep "decision-engine" 結果ゼロ
2. ✅ src/data/がMVP最小構成
3. ✅ 30秒以上の安定動作
4. ✅ データサイクル正常動作

### 最終確認
```bash
# 1. 参照確認
grep -r "decision-engine" src/ | wc -l  # 0であること

# 2. 構造確認
ls src/data/  # current/ history/ config/ context/ data-manager.ts のみ

# 3. 起動確認
pnpm dev  # エラーなし、30秒以上安定

# 4. データ確認
ls src/data/current/  # execution-*ディレクトリが作成される
ls src/data/history/  # アーカイブが作成される
```

## 💡 **実装優先度**

**最優先**: Phase 1（decision-engine参照除去）
**必須**: Phase 2（MVP構成適合）
**重要**: Phase 3（データ構造検証）
**最終**: Phase 4（統合動作確認）

## ⚠️ **注意事項**

### 修正時の注意
- 一つずつ確実に修正
- 修正後は必ず動作確認
- 型エラーは即座に対応

### データ構造の注意
- 既存のconfig/context/は変更しない
- currentは実行毎にクリア
- historyは月別に整理

---

**重要**: この作業でClaude SDK移行とMVP最小構成が完成します。品質を最優先に、確実に作業を進めてください。