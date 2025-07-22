# TradingAssistantX パフォーマンス監視システム 使用ガイド

このディレクトリには、TradingAssistantXのパフォーマンス監視システムの使用例とサンプルコードが含まれています。

## 📁 ファイル構成

- `performance-monitoring-usage.ts` - 実行可能なサンプルコード
- `README.md` - このファイル（使用ガイド）

## 🚀 クイックスタート

### 1. 使用例の実行

```bash
# 全ての使用例を実行
node examples/performance-monitoring-usage.ts

# TypeScriptで直接実行（推奨）
tsx examples/performance-monitoring-usage.ts
```

### 2. ダッシュボードの起動

```bash
# メイン・ダッシュボード
node src/scripts/performance-dashboard.ts

# アラート確認
node src/scripts/performance-dashboard.ts alerts

# 最適化推奨事項
node src/scripts/performance-dashboard.ts optimize

# 履歴表示（最新20件）
node src/scripts/performance-dashboard.ts history

# 履歴表示（最新50件）
node src/scripts/performance-dashboard.ts history 50
```

## 📊 主要機能と使用例

### 1. 基本的なパフォーマンス監視

```typescript
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';

const monitor = new PerformanceMonitor();

// セッション開始
monitor.startSession();

// 情報収集時間の記録
const infoStart = Date.now();
await collectInformation(); // あなたの情報収集処理
monitor.recordInfoCollectionTime(infoStart, Date.now());

// コンテンツ生成時間の記録
const contentStart = Date.now();
await generateContent(); // あなたのコンテンツ生成処理
monitor.recordContentGenerationTime(contentStart, Date.now());

// 品質・リソース情報の記録
monitor.recordQualityMetrics(8.5, 9.2, true);
monitor.recordResourceUsage(2, 4, 15);

// セッション終了・データ保存
const metrics = await monitor.endSession();
```

### 2. 自動最適化推奨システム

```typescript
const recommendations = await monitor.generateOptimizationRecommendations();

recommendations.forEach(rec => {
  console.log(`${rec.title}: ${rec.description}`);
  console.log(`期待効果: ${rec.expectedImprovement}`);
  console.log(`実装方法: ${rec.implementation}`);
});
```

### 3. 異常検知とアラート

```typescript
const anomalies = await monitor.detectAnomalies();

anomalies.forEach(anomaly => {
  console.log(`異常タイプ: ${anomaly.type}`);
  console.log(`重要度: ${anomaly.severity}`);
  console.log(`説明: ${anomaly.description}`);
});
```

### 4. パフォーマンストレンド分析

```typescript
const trends = await monitor.analyzePerformanceTrends();

trends.forEach(trend => {
  console.log(`${trend.metric}: ${trend.trend} (${trend.changePercent.toFixed(1)}%)`);
});
```

## 🔗 既存システムとの統合

### AutonomousExecutorとの統合例

```typescript
export class AutonomousExecutor {
  private performanceMonitor = new PerformanceMonitor();

  async executeClaudeAutonomous(): Promise<Decision> {
    this.performanceMonitor.startSession();

    try {
      // あなたの既存処理にパフォーマンス監視を追加
      const decision = await this.existingLogic();
      
      // 品質・リソース情報の記録
      this.performanceMonitor.recordQualityMetrics(/* quality data */);
      this.performanceMonitor.recordResourceUsage(/* resource data */);
      
      return decision;
    } finally {
      await this.performanceMonitor.endSession();
    }
  }
}
```

### DecisionEngineとの統合例

```typescript
export class DecisionEngine {
  private performanceMonitor = new PerformanceMonitor();

  async makeDecision(): Promise<Decision> {
    this.performanceMonitor.startSession();

    // 情報収集フェーズの監視
    const infoStart = Date.now();
    const info = await this.collectInfo();
    this.performanceMonitor.recordInfoCollectionTime(infoStart, Date.now());

    // 決定生成フェーズの監視
    const decisionStart = Date.now();
    const decision = await this.generateDecision(info);
    this.performanceMonitor.recordContentGenerationTime(decisionStart, Date.now());

    // 品質評価
    const quality = this.evaluateDecision(decision);
    this.performanceMonitor.recordQualityMetrics(
      quality.score, 
      quality.relevance, 
      quality.success
    );

    await this.performanceMonitor.endSession();
    return decision;
  }
}
```

## 📈 ダッシュボード機能

### コマンドライン・インターフェイス

```bash
# 1. 総合ダッシュボード
node src/scripts/performance-dashboard.ts
# 表示内容:
# - システムヘルススコア
# - 現在のセッションメトリクス  
# - 検出異常
# - パフォーマンストレンド
# - 最適化推奨事項

# 2. 履歴表示
node src/scripts/performance-dashboard.ts history [件数]
# 表示内容:
# - 過去のセッション履歴
# - 実行時間・メモリ・品質の推移
# - テーブル形式での一覧表示

# 3. アラート専用表示
node src/scripts/performance-dashboard.ts alerts
# 表示内容:
# - 検出された異常一覧
# - 重要度別の分類
# - 発生時刻と詳細情報

# 4. 最適化推奨専用表示
node src/scripts/performance-dashboard.ts optimize
# 表示内容:
# - カテゴリ別推奨事項
# - 期待効果と実装方法
# - 優先度順の表示
```

## 📊 メトリクス仕様

### PerformanceMetrics インターフェイス

```typescript
interface PerformanceMetrics {
  execution: {
    totalTime: number;           // 総実行時間 (ms)
    infoCollectionTime: number;  // 情報収集時間 (ms) 
    contentGenerationTime: number; // コンテンツ生成時間 (ms)
    memoryUsage: number;         // メモリ使用量 (MB)
  };
  quality: {
    contentScore: number;        // コンテンツ品質スコア (0-10)
    informationRelevance: number; // 情報関連性 (0-10)
    generationSuccess: boolean;  // 生成成功フラグ
  };
  resources: {
    browserCount: number;        // アクティブブラウザ数
    activeContexts: number;      // アクティブコンテキスト数
    networkRequests: number;     // ネットワーク要求数
  };
}
```

## 🛠️ カスタマイズ

### 閾値の設定

`data/metrics-history.yaml`のperformanceConfigurationセクションで閾値をカスタマイズできます：

```yaml
performanceConfiguration:
  anomaly_detection:
    execution_time_threshold: 1.5  # 基準の1.5倍で異常
    memory_threshold: 1.8          # 基準の1.8倍で異常
    quality_threshold: 0.7         # 基準の70%以下で異常
  
  optimization_thresholds:
    execution_time_warning: 30000  # 30秒以上で警告
    memory_warning: 200            # 200MB以上で警告
    quality_minimum: 7.0           # 品質スコア7.0以下で警告
    browser_count_maximum: 3       # ブラウザ3個以上で警告
```

### カスタム品質評価

```typescript
// あなた独自の品質評価ロジック
function evaluateCustomQuality(decision: Decision): QualityMetrics {
  let contentScore = 5.0;
  let informationRelevance = 5.0;
  let generationSuccess = false;

  // カスタム評価ロジック
  if (decision.reasoning?.includes('投資教育')) {
    contentScore += 2.0;
    informationRelevance += 1.5;
  }

  if (decision.action?.type === 'original_post') {
    contentScore += 1.0;
    generationSuccess = true;
  }

  return {
    contentScore: Math.min(10, contentScore),
    informationRelevance: Math.min(10, informationRelevance),
    generationSuccess
  };
}

// パフォーマンス監視への統合
const quality = evaluateCustomQuality(decision);
monitor.recordQualityMetrics(
  quality.contentScore,
  quality.informationRelevance,
  quality.generationSuccess
);
```

## 📁 データ保存場所

- **メトリクス履歴**: `data/metrics-history.yaml`
- **パフォーマンス設定**: `data/metrics-history.yaml` (performanceConfigurationセクション)
- **一時データ**: メモリ内（セッション毎にファイルに保存）

## 🔍 トラブルシューティング

### よくある問題と解決方法

1. **メトリクスが保存されない**
   ```bash
   # データディレクトリの権限を確認
   ls -la data/
   # 必要に応じて権限を設定
   chmod 755 data/
   ```

2. **ダッシュボードが表示されない**
   ```bash
   # TypeScriptファイルを直接実行
   tsx src/scripts/performance-dashboard.ts
   # または事前にビルド
   npm run build
   node dist/scripts/performance-dashboard.js
   ```

3. **異常検知が動作しない**
   - 最低5セッション以上のデータが必要
   - `examples/performance-monitoring-usage.ts`を数回実行してデータを蓄積

4. **メモリ使用量が異常に高い**
   ```typescript
   // セッション終了を確実に実行
   try {
     // your code
   } finally {
     await monitor.endSession();  // 必須
   }
   ```

## 🎯 ベストプラクティス

1. **セッション管理**
   ```typescript
   // 必ずtry-finallyでセッション終了を保証
   monitor.startSession();
   try {
     // your logic
   } finally {
     await monitor.endSession();
   }
   ```

2. **メトリクス記録タイミング**
   ```typescript
   // 実際の処理前後で正確に計測
   const start = Date.now();
   await actualWork();
   const end = Date.now();
   monitor.recordInfoCollectionTime(start, end);
   ```

3. **品質評価の一貫性**
   ```typescript
   // 一貫した基準で品質を評価
   const quality = evaluateQuality(result);
   monitor.recordQualityMetrics(
     quality.score,      // 0-10の範囲
     quality.relevance,  // 0-10の範囲
     quality.success     // boolean
   );
   ```

## 📞 サポート

問題や質問がある場合は：
1. このREADMEを再確認
2. `examples/performance-monitoring-usage.ts`の使用例を参照
3. `src/scripts/performance-dashboard.ts help`でヘルプを確認