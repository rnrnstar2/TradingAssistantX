# TASK-003: データ構造再編・緊急最適化実装

## 🚨 **緊急実装指示**

**CRITICAL**: 実行中にファイルが864行まで肥大化 - 即座の構造再編が必要

## 🎯 **実装目標**

TASK-001・002完了後の新構造を活用し、Claude Code読み取り最適化・自動更新メカニズム・リアルタイム監視システムを統合実装

## 📋 **緊急対応実装対象**

### **即座対応が必要なファイル**（実行中に肥大化）
1. **expanded-action-decisions.yaml** (864行) 🚨 **EMERGENCY**
2. **account-analysis-data.yaml** (215行) ⚠️ **URGENT**
3. **daily-action-data.yaml** (実行エラー蓄積) 🚨 **ERROR HANDLING**

### **新構造統合実装**
4. **data/claude-summary.yaml** → src/コード読み込み統合
5. **data/core/system-state.yaml** → リアルタイム更新システム
6. **自動アーカイブシステム** → 肥大化防止メカニズム

## ✅ **実装戦略**

### **Phase 1: 緊急データ分離**（TASK-001依存）

#### **expanded-action-decisions.yaml 緊急処理**
```yaml
# 現状: 864行（重複含む大量データ）
# 目標: 30行以内の現在データ + アーカイブ分離

緊急分離ターゲット:
  current_decisions: 最新3エントリ（30行以内）
  template_patterns: 決定パターンテンプレート（20行）
  archive_bulk: 残り800行以上をアーカイブに移動
```

#### **account-analysis-data.yaml 軽量化**
```yaml
# 現状: 215行（重複分析データ）
# 目標: 15行の現在分析 + 履歴アーカイブ

軽量化ターゲット:
  current_analysis: health_score, engagement_rate, followers_count（最新のみ）
  recommendations: 現在の推奨事項のみ（3項目）
  archive_history: 200行の履歴データをアーカイブ移動
```

### **Phase 2: Claude Code統合実装**（TASK-002依存）

#### **src/コード修正 - claude-summary.yaml読み込み統合**
```typescript
// 読み込み対象ファイル修正（優先度順）:

// 1. 最優先読み込み（30行）
const claudeSummary = loadYamlSafe('data/claude-summary.yaml');

// 2. 詳細必要時のみ（15行）
const systemState = loadYamlSafe('data/core/system-state.yaml');

// 3. 意思決定時のみ（20行）
const decisionContext = loadYamlSafe('data/core/decision-context.yaml');

// 従来読み込み削除:
// × data/expanded-action-decisions.yaml (864行)
// × data/account-analysis-data.yaml (215行)
```

#### **対象修正ファイル**
```bash
# 検索・修正対象:
src/lib/account-analyzer.ts: data/account-analysis-data.yaml参照削除
src/lib/daily-action-planner.ts: claude-summary.yaml読み込み統合
src/core/autonomous-executor.ts: 軽量データでの意思決定実装
src/utils/config-loader.ts: claude-summary.yaml統合
```

### **Phase 3: 自動更新・監視システム実装**

#### **リアルタイム更新メカニズム**
```typescript
// 自動更新対象フィールド:
interface AutoUpdateFields {
  current_health: number;        // 分析実行時
  posts_today: number;          // 投稿成功時  
  last_action: string;          // アクション実行時
  time_since_last_post: number; // リアルタイム計算
  engagement_rate: number;      // メトリクス更新時
}

// 自動更新タイミング:
- 投稿成功: posts_today++, last_action更新
- 分析完了: current_health更新
- アクション実行: time_since_last_post計算・更新
```

#### **肥大化監視システム**
```typescript
// ファイルサイズ監視:
const FILE_SIZE_LIMITS = {
  'claude-summary.yaml': 30,      // 行数制限
  'system-state.yaml': 15,
  'decision-context.yaml': 20,
  'current-decisions.yaml': 30,
  'current-analysis.yaml': 20
};

// 自動アーカイブトリガー:
- expanded-action-decisions.yaml > 50行 → 自動アーカイブ実行
- account-analysis-data.yaml > 30行 → 履歴データ移動
- daily-action-data.yaml エラー > 10件 → エラーログアーカイブ
```

### **Phase 4: 統合テスト・検証**

#### **Claude Code読み込み効率テスト**
```bash
# 読み込み前後比較:
従来: 2,044行（expanded-action-decisions.yaml 864行含む）
最適化後: 65行（claude-summary.yaml 30行 + α）

コンテキスト削減率: 96.8%
読み込み速度改善: 予想90%以上向上
```

#### **システム統合テスト**
```bash
# 動作確認項目:
1. claude-summary.yaml読み込みでの正常判断
2. 自動更新メカニズムの動作確認
3. アーカイブシステムの正常動作
4. src/コード修正による既存機能維持
5. 肥大化監視システムのアラート動作
```

## 🔧 **実装手順**

### **Step 1: TASK-001・002完了確認**
```bash
# 前提条件確認:
- data/archives/ ディレクトリ構造作成済み
- data/claude-summary.yaml 作成済み
- 大容量ファイル分割完了済み

# 依存関係確認後に実装開始
```

### **Step 2: src/コード修正実装**
```bash
# 1. 読み込みファイル変更:
# account-analyzer.ts: claude-summary.yaml統合
# daily-action-planner.ts: 軽量データ使用
# autonomous-executor.ts: 最低限データでの判断

# 2. 自動更新機能追加:
# claude-summary.yaml自動更新メソッド実装
# system-state.yaml リアルタイム更新

# 3. 肥大化監視システム:
# ファイルサイズチェック機能
# 自動アーカイブトリガー実装
```

### **Step 3: 統合システムテスト**
```bash
# 1. 読み込み効率テスト:
# 従来vs最適化後のコンテキスト使用量比較
# Claude Code判断精度確認

# 2. 自動更新テスト:
# 投稿実行→posts_today更新確認
# 分析実行→current_health更新確認

# 3. 監視システムテスト:
# 意図的ファイル肥大化→自動アーカイブ動作確認
```

### **Step 4: 本番統合・監視開始**
```bash
# 1. 既存システム置き換え:
# 従来の大容量ファイル読み込み完全停止
# claude-summary.yaml読み込みに完全移行

# 2. 継続監視開始:
# ファイルサイズ定期チェック開始
# 自動アーカイブシステム稼働開始
```

## 🚨 **制約・注意事項**

### **依存関係管理**
- **前提条件**: TASK-001（アーカイブ）・TASK-002（サマリー作成）完了必須
- **実装順序**: データ分離 → コード修正 → システム統合
- **段階確認**: 各Phaseでの動作確認必須

### **既存システム影響**
- **下位互換性**: 既存機能の完全維持
- **段階移行**: 急激な変更回避・段階的実装
- **ロールバック**: 問題発生時の即座復旧準備

### **緊急対応重要性**
- **現在状況**: expanded-action-decisions.yaml が864行まで肥大化中
- **リスク**: Claude Codeコンテキスト圧迫による判断精度低下
- **対応優先度**: 最高レベル（即座実装必要）

### **出力管理規則**
- **承認された出力場所**: `tasks/20250721_195256_data_optimization/reports/`
- **報告書ファイル名**: `REPORT-003-data-structure-reorganization.md`
- **禁止**: ルートディレクトリへの一時ファイル作成

## ✅ **完了基準**

1. **緊急対応完了**: 肥大化ファイルが30行以内に軽量化済み
2. **Claude Code統合**: src/コードがclaude-summary.yaml読み込みに移行済み
3. **自動更新稼働**: リアルタイム更新メカニズムが正常稼働
4. **監視システム稼働**: 肥大化防止システムが継続監視中
5. **性能改善確認**: コンテキスト使用量96%削減達成
6. **システム安定性**: 既存機能の完全維持確認

## 📊 **期待効果**

### **Claude Code効率革命**
- **コンテキスト**: 2,044行 → 65行（▲96.8%削減）
- **判断速度**: 大幅向上（推定90%以上改善）
- **判断精度**: 最低限データでの高精度意思決定実現

### **システム自律性向上**
- **自動メンテナンス**: ファイル肥大化の自動防止
- **リアルタイム性**: 最新状態での即座判断
- **継続安定性**: 長期運用での性能維持

### **開発・運用効率化**
- **メンテナンス工数**: 大幅削減
- **システム安定性**: 継続的高性能保証
- **拡張性**: 新機能追加時の構造対応力向上

## 🎯 **実装優先度**

**EMERGENCY**: expanded-action-decisions.yaml緊急軽量化（864→30行）
**CRITICAL**: src/コードのclaude-summary.yaml読み込み統合
**HIGH**: 自動更新・監視システム稼働開始

**成功指標**: Claude Code自律システムが最小コンテキストで最大効率の価値創造を実現

---

**重要**: この構造再編により、TradingAssistantXは真の意味でのClaude Code自律システムとして進化し、制限のために働くのではなく価値創造のために働く理想的なシステムが完成します。