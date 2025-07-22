# TASK-001: レガシー設定モード問題の完全解決

## 🎯 **タスク概要**
システムが「レガシー設定を検出、従来モードで初期化」と表示され、モダンな多様情報源データ収集システムが無効化されている問題を解決する。

## 🚨 **問題の詳細分析**

### 現在のエラー状況
```
ℹ️ [設定読み込み] レガシー設定を検出、従来モードで初期化
🔗 [ActionSpecificCollector] MultiSourceCollector統合準備完了（実装待ち）
```

### 根本原因
`/Users/rnrnstar/github/TradingAssistantX/src/lib/action-specific-collector.ts:2633` にて以下の条件判定が失敗：

```typescript
if (rawConfig.sourceSelection && rawConfig.qualityStandards) {
  // Modern mode
} else {
  // Legacy mode fallback ← ここが実行されている
}
```

**不足要素**: `data/action-collection-strategies.yaml` に `sourceSelection` セクションが存在しない

## 🔧 **実装要求**

### 1. action-collection-strategies.yaml の modernization

`data/action-collection-strategies.yaml` に以下の `sourceSelection` セクションを追加：

```yaml
# 既存の設定はそのまま維持し、以下を追加
sourceSelection:
  original_post:
    preferred: ["rss", "api", "community"]
    fallback: ["community", "rss"]
    priority: "diversity"  # options: quality, speed, diversity
    
  quote_tweet:
    preferred: ["community", "rss"]
    fallback: ["community", "rss"]
    priority: "quality"
    
  reply:
    preferred: ["twitter", "community"]
    fallback: ["community", "rss"]  
    priority: "speed"
    
  like:
    preferred: ["twitter"]
    fallback: ["community"]
    priority: "speed"
    
  retweet:
    preferred: ["twitter", "community"]
    fallback: ["community"]
    priority: "quality"

  # 長期投資戦略に特化した設定
  long_term_investment:
    preferred: ["api", "rss", "community"]
    fallback: ["rss", "community"]
    priority: "quality"
    
  # 市場分析特化設定
  market_analysis:
    preferred: ["api", "rss"]
    fallback: ["rss", "community"]
    priority: "diversity"
```

### 2. Multi-source データ収集システムの統合確認

現在「実装待ち」状態の MultiSourceCollector 統合を確認し、必要に応じて完全統合する：

1. `ActionSpecificCollector` の `MultiSourceCollector` 統合状況を検証
2. `multi-source-config.yaml` との連携確認
3. 必要に応じて統合実装の完了

### 3. 設定検証システムの実装

レガシーモード回避を確実にするため：

```typescript
// 設定検証ロジックの強化
private validateModernConfig(config: any): boolean {
  const hasSourceSelection = config.sourceSelection && 
    Object.keys(config.sourceSelection).length > 0;
  const hasQualityStandards = config.qualityStandards && 
    config.qualityStandards.relevanceScore;
    
  if (!hasSourceSelection) {
    console.error('❌ [設定エラー] sourceSelection セクションが必要です');
  }
  if (!hasQualityStandards) {
    console.error('❌ [設定エラー] qualityStandards セクションが必要です');
  }
  
  return hasSourceSelection && hasQualityStandards;
}
```

## 🔍 **検証要求**

### 実行時検証
1. `pnpm dev` 実行後に以下ログが表示されることを確認：
   ```
   ✅ [設定読み込み] 拡張設定を検出、多様情報源モードで初期化
   ```

2. レガシーモードメッセージが表示されないことを確認

### 機能検証
1. 多様情報源データ収集の動作確認
2. `sourceSelection` による動的ソース選択の動作確認
3. 長期投資戦略に特化したデータ収集の動作確認

## 📋 **品質基準**

### TypeScript strict compliance
- 型安全性の完全確保
- lint エラーゼロ
- type-check エラーゼロ

### YAML設定検証
- YAML syntax の完全正確性
- 設定項目の完全性確認
- デフォルト値の適切性

### 後方互換性
- 既存機能への影響なし
- レガシー設定の適切な処理維持

## 🚫 **実装制約**

### MVP原則遵守
- 過剰機能の追加禁止
- 最小限の変更で最大効果を追求
- 統計・分析機能の追加禁止

### 出力管理
- ルートディレクトリへの出力禁止
- `tasks/outputs/` のみ使用許可

## 📁 **影響ファイル**

### 必須修正対象
- `data/action-collection-strategies.yaml` - sourceSelection セクション追加
- `src/lib/action-specific-collector.ts` - 検証ロジック強化（必要に応じて）

### 検証対象
- `data/multi-source-config.yaml` - 連携確認
- `src/core/autonomous-executor.ts` - 統合動作確認

## 📊 **成功指標**

1. **レガシーモード完全排除**: レガシーモードメッセージが表示されない
2. **モダンモード正常動作**: 多様情報源モードでの正常初期化
3. **データ収集品質向上**: sourceSelection による最適データ収集の実現
4. **システム安定性**: 既存機能の無影響動作

## ⚡ **実行順序**

1. **設定ファイル修正**: action-collection-strategies.yaml の modernization
2. **統合確認**: MultiSourceCollector 統合状況の検証
3. **検証実装**: 設定検証ロジックの強化
4. **動作確認**: pnpm dev での完全検証

---

**CRITICAL**: この修正により Claude Code SDK 中心の完全自律システムの性能が大幅向上します。必ず品質基準を満たして実装してください。