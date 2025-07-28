# TASK-003: 運用体制整備指示書

## 🎯 **ミッション**
本番運用開始に向けた監視・運用・保守体制の完全整備

## 📋 **前提条件**
- TASK-001完了（本番環境セットアップ完了）
- TASK-002完了（統合テスト完了）
- 本番環境での動作確認済み

## ✅ **実行項目**

### 📊 **STEP-1: 監視システム構築**

#### 実行監視ダッシュボード作成
```yaml
# 監視設定: src/data/config/monitoring-config.yaml
monitoring:
  enabled: true
  intervals:
    health_check: 300  # 5分間隔
    performance_check: 600  # 10分間隔
    cost_check: 3600  # 1時間間隔
  
  alerts:
    api_error_rate: 10  # 10%以上でアラート
    response_time: 1000  # 1秒以上でアラート
    cost_threshold: 50  # $50/日でアラート
```

#### ログ集約システム設定
- **対象**: `src/data/current/system-logs.yaml`
- **内容**: 
  - [ ] API呼び出しログ
  - [ ] エラーログ集約
  - [ ] パフォーマンスメトリクス
  - [ ] コスト追跡ログ

### 🚨 **STEP-2: アラートシステム構築**

#### エラー検知・通知設定
```typescript
// アラート定義: src/shared/alert-definitions.ts
export const AlertThresholds = {
  apiErrorRate: 10,        // 10%以上のエラー率
  responseTimeMs: 1000,    // 1秒以上の応答時間
  qpsViolation: 210,       // 210 QPS以上（制限超過）
  dailyCostUsd: 50,        // $50/日以上のコスト
  consecutiveFailures: 3   // 連続3回失敗
} as const;
```

#### 緊急停止システム
- **トリガー条件**:
  - [ ] API制限違反検知
  - [ ] 異常なコスト増加（$100/日超過）
  - [ ] 連続5回失敗
  - [ ] TwitterAPI.io障害検知

### 📈 **STEP-3: パフォーマンス最適化**

#### 自動QPS調整機能
```typescript
// QPS最適化: src/kaito-api/core/qps-optimizer.ts
export class QPSOptimizer {
  private currentQPS = 150;  // 初期値: 余裕を持った設定
  private maxQPS = 200;      // TwitterAPI.io制限
  
  public async optimizeQPS(responseTime: number): Promise<number> {
    if (responseTime > 700) {
      this.currentQPS = Math.max(100, this.currentQPS - 10);
    } else if (responseTime < 400) {
      this.currentQPS = Math.min(this.maxQPS, this.currentQPS + 5);
    }
    return this.currentQPS;
  }
}
```

#### キャッシュ戦略実装
- **対象データ**: ユーザー情報、トレンドデータ
- **キャッシュ期間**: 1時間
- **更新戦略**: 定期更新 + 必要時強制更新

### 🔄 **STEP-4: 自動運用システム**

#### 自動スケジューリング設定
```bash
# cron設定例（実際の設定は別途）
# 30分間隔実行
*/30 * * * * cd /path/to/TradingAssistantX && REAL_DATA_MODE=true pnpm dev

# 日次ログローテーション
0 0 * * * cd /path/to/TradingAssistantX && ./scripts/log-rotation.sh

# 週次レポート生成
0 9 * * 1 cd /path/to/TradingAssistantX && ./scripts/weekly-report.sh
```

#### 自動バックアップシステム
- **バックアップ対象**:
  - [ ] `src/data/learning/` - 学習データ
  - [ ] `src/data/current/` - 現在データ
  - [ ] `src/data/context/` - コンテキストデータ
- **バックアップ頻度**: 日次
- **保存期間**: 30日間

### 📋 **STEP-5: 運用手順書作成**

#### 日次運用チェックリスト
```markdown
## 日次運用チェックリスト

### 朝の確認（9:00）
- [ ] 夜間の実行状況確認
- [ ] エラーログ確認
- [ ] API使用量確認
- [ ] コスト状況確認

### 夕の確認（18:00）
- [ ] 日中の実行状況確認
- [ ] パフォーマンス指標確認
- [ ] 学習データ蓄積状況確認
- [ ] 翌日の予定確認
```

#### 障害対応手順書
```markdown
## 障害対応手順

### Level 1: API応答遅延
1. QPS設定確認・調整
2. ネットワーク状況確認
3. TwitterAPI.io状況確認

### Level 2: API認証エラー
1. APIキー有効性確認
2. 権限設定確認
3. APIキーローテーション実行

### Level 3: システム停止
1. 緊急停止実行
2. ログ収集・分析
3. 根本原因調査
4. 修正・再開手順実行
```

## 📊 **品質保証体制**

### 🔍 **定期品質チェック**
- **日次**: エラー率、応答時間、コスト確認
- **週次**: 学習データ品質、投稿品質評価
- **月次**: システム全体見直し、改善計画策定

### 📈 **継続的改善プロセス**
1. **データ分析**: 週次パフォーマンスデータ分析
2. **改善提案**: 月次改善提案作成
3. **実装計画**: 四半期改善実装計画
4. **効果測定**: 改善効果の定量的評価

## 💰 **コスト管理体制**

### 📊 **コスト監視設定**
```yaml
# コスト設定: src/data/config/cost-management.yaml
cost_management:
  daily_limit_usd: 30      # $30/日上限
  monthly_limit_usd: 800   # $800/月上限
  
  tracking:
    api_calls: true
    cost_per_call: 0.00015  # $0.00015/call
    
  alerts:
    daily_80_percent: true   # 日次80%到達でアラート
    monthly_90_percent: true # 月次90%到達でアラート
```

### 💡 **コスト最適化戦略**
- **効率的投稿**: 高エンゲージメント時間帯集中
- **APIコール最適化**: 必要最小限のデータ取得
- **キャッシュ活用**: 重複データ取得回避

## 📁 **出力ファイル**

### 📋 **運用ドキュメント**
- `tasks/20250727_222138_production_readiness/outputs/operation-manual.md`
- `tasks/20250727_222138_production_readiness/outputs/troubleshooting-guide.md`
- `tasks/20250727_222138_production_readiness/outputs/cost-management-guide.md`

### ⚙️ **設定ファイル**
- `src/data/config/monitoring-config.yaml`
- `src/data/config/cost-management.yaml`
- `src/shared/alert-definitions.ts`

### 📊 **監視データ**
- `src/data/current/performance-metrics.yaml`
- `src/data/current/cost-tracking.yaml`
- `src/data/current/system-health.yaml`

## 🎯 **完了条件**
監視システム・アラートシステム・運用手順書・コスト管理体制の完全整備が完了時点で完了とする

---
**Manager指示**: Worker権限で上記STEP-1〜5を順次実行し、本番運用に必要な全システムを構築・ドキュメント化すること