# TASK-001 決定→アクション変換システム修復

## 🎯 実装目標

Xアカウント自動化システムの決定エンジンで発生している「アクション実行常時空配列」問題を修復し、自律実行システムを完全動作状態に復旧する。

## 🚨 Critical問題

**現状**: 2時間以上、決定は生成されるがアクション変換で全て失敗、実行履歴が空配列継続

**根本原因**: 
1. **ファイルパス不一致**: `data/decisions/strategic-decisions.yaml` vs 実際の `data/strategic-decisions.yaml`
2. **decision.type不一致**: `strategy_shift` がマッピングテーブルにない

## 📋 必須修復内容

### 1. ファイルパス修正
**ファイル**: `src/core/decision-engine.ts`
**場所**: L145

```typescript
// 修正前
const decisionsPath = path.join(process.cwd(), 'data', 'decisions', 'strategic-decisions.yaml');

// 修正後  
const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
```

### 2. マッピングテーブル拡張
**ファイル**: `src/core/decision-engine.ts`
**場所**: L112-120 `mapDecisionToActionType()関数`

**現在のマッピング**:
```typescript
const typeMapping: Record<string, string> = {
  'collect_content': 'content_collection',
  'immediate_post': 'post_immediate', 
  'analyze_performance': 'performance_analysis',
  'optimize_timing': 'timing_optimization',
  'clean_data': 'data_cleanup'
};
```

**必須追加**:
```typescript
const typeMapping: Record<string, string> = {
  'collect_content': 'content_collection',
  'immediate_post': 'post_immediate',
  'analyze_performance': 'performance_analysis', 
  'optimize_timing': 'timing_optimization',
  'clean_data': 'data_cleanup',
  // 🔥 CRITICAL: 実際に使用されているtypeを追加
  'strategy_shift': 'strategy_optimization',
  'content_generation': 'content_creation',
  'posting_schedule': 'schedule_optimization'
};
```

### 3. エラーハンドリング強化
**同ファイル**: L96-109 `convertDecisionToAction()関数`

**追加実装**:
```typescript
private async convertDecisionToAction(decision: Decision): Promise<Action | null> {
  const actionType = this.mapDecisionToActionType(decision);
  
  // 🔥 CRITICAL: デバッグログ追加
  if (!actionType) {
    console.log(`❌ Unknown decision type: "${decision.type}" - Available types:`, 
      Object.keys(this.getTypeMappingForDebug()));
    return null;
  }
  
  console.log(`✅ Mapped decision "${decision.type}" to action "${actionType}"`);
  
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: actionType,
    priority: decision.priority,
    params: decision.params || {},
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

// デバッグ用ヘルパー関数追加
private getTypeMappingForDebug(): Record<string, string> {
  return {
    'collect_content': 'content_collection',
    'immediate_post': 'post_immediate',
    'analyze_performance': 'performance_analysis',
    'optimize_timing': 'timing_optimization', 
    'clean_data': 'data_cleanup',
    'strategy_shift': 'strategy_optimization',
    'content_generation': 'content_creation',
    'posting_schedule': 'schedule_optimization'
  };
}
```

## 🚫 MVP制約遵守

- **統計・分析システム追加禁止**: パフォーマンス測定は既存に留める
- **複雑なエラーハンドリング禁止**: 基本的なデバッグログのみ
- **将来拡張禁止**: 現在の問題解決のみに集中

## ✅ 実装完了条件

1. **ファイルパス修正完了**: decisionsPath更新
2. **マッピング追加完了**: strategy_shift等の対応追加
3. **デバッグログ追加完了**: アクション変換過程の可視化
4. **動作確認**: 実行履歴でactions配列に要素が含まれることを確認

## 🔧 テスト方法

```bash
# 1. 自律実行中のプロセス確認
ps aux | grep autonomous-runner

# 2. 実行履歴確認（修復前後比較）
tail -5 data/context/execution-history.json

# 3. デバッグログ確認
tail -20 /tmp/debug_final.log | grep -E "(Unknown decision|Mapped decision)"
```

## 📋 報告書要件

**報告書パス**: `tasks/20250721_000325/reports/REPORT-001-decision-action-mapping-fix.md`

**必須記載内容**:
1. 修正実施状況（ファイルパス、マッピング、ログ）
2. 動作確認結果（実行履歴の変化）
3. 発見された追加問題（あれば）
4. 自律実行システムの完全復旧確認

## 🚀 実装手順

1. **現状バックアップ**: `cp src/core/decision-engine.ts src/core/decision-engine.ts.backup`
2. **修正実装**: 上記3箇所の修正適用
3. **TypeScript確認**: `npm run typecheck`
4. **動作確認**: 自律実行ログの変化確認
5. **報告書作成**: 修復完了報告

---

**⚡ 緊急度**: Critical - システム機能停止中
**🎯 期待結果**: 自律実行システムの完全復旧、アクション生成・実行の正常化