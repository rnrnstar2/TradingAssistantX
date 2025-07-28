# TASK-002: TwitterAPI.io完全準拠APIクライアント実装

## 🎯 タスク概要

src/kaito-api/core/client.tsを中心としたAPIクライアントをTwitterAPI.io仕様に完全準拠させ、エラーハンドリングとパフォーマンスを向上させる。

## 📋 実装要件

### 1. TwitterAPI.io仕様完全準拠

**参考ドキュメント**: https://docs.twitterapi.io/introduction

**重要仕様ポイント**:
- **QPS制限**: 200 QPS per client の厳密な制御
- **コスト管理**: $0.15/1k tweets の正確な追跡
- **認証方式**: Bearer Token + User Session の2層認証
- **エンドポイント**: 最新API仕様に基づく正確なエンドポイント
- **レスポンス形式**: 統一されたレスポンス処理

### 2. コアクライアントの改善

**対象ファイル**: `src/kaito-api/core/client.ts`

**改善項目**:
- QPS制御の精度向上
- エラーハンドリングの標準化
- リトライ機能の最適化
- パフォーマンス監視の強化
- メモリ使用量の最適化

## 🔧 具体的な実装内容

### Phase 1: QPS制御システムの改善

```typescript
class EnhancedQPSController {
  private requestTimes: number[] = [];
  private readonly QPS_LIMIT = 200; // TwitterAPI.io specification
  private readonly MONITORING_WINDOW = 1000; // 1秒
  private readonly SAFETY_BUFFER = 50; // 安全マージン (ms)

  async enforceQPS(): Promise<void> {
    const now = Date.now();
    
    // 1秒以内のリクエスト履歴をフィルタリング
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.MONITORING_WINDOW
    );
    
    if (this.requestTimes.length >= this.QPS_LIMIT) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.MONITORING_WINDOW - (now - oldestRequest) + this.SAFETY_BUFFER;
      
      if (waitTime > 0) {
        console.log(`⏱️ QPS制限により待機: ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
    
    this.requestTimes.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentQPS(): number {
    const now = Date.now();
    return this.requestTimes.filter(
      time => now - time < this.MONITORING_WINDOW
    ).length;
  }
}
```

### Phase 2: エラーハンドリング標準化

```typescript
class TwitterAPIErrorHandler {
  static mapError(error: any, context: string): TwitterAPIError {
    // TwitterAPI.io specific error mapping
    if (error.response?.status === 429) {
      return {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded in ${context}`,
          type: 'rate_limit'
        }
      };
    }
    
    if (error.response?.status === 401) {
      return {
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: `Authentication failed in ${context}`,
          type: 'authentication'
        }
      };
    }
    
    // ... その他のエラーマッピング
  }

  static async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) break;
        
        // 指数バックオフ + ジッター
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`🔄 リトライ ${attempt + 1}/${maxRetries} (${delay}ms後)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}
```

### Phase 3: コスト追跡システムの精密化

```typescript
class CostTracker {
  private readonly COST_PER_1K_TWEETS = 0.15; // TwitterAPI.io pricing
  private tweetsProcessed = 0;
  private monthlyBudget = 50.0; // デフォルト月額予算
  
  trackRequest(requestType: 'tweet' | 'user' | 'search'): void {
    this.tweetsProcessed++;
    
    const currentCost = this.getEstimatedCost();
    
    if (currentCost > this.monthlyBudget * 0.8) {
      console.warn(`⚠️ 予算警告: ${currentCost.toFixed(2)}$ / ${this.monthlyBudget}$`);
    }
    
    if (currentCost > this.monthlyBudget) {
      throw new Error(`予算上限に達しました: ${currentCost.toFixed(2)}$`);
    }
  }
  
  getEstimatedCost(): number {
    return (this.tweetsProcessed / 1000) * this.COST_PER_1K_TWEETS;
  }
}
```

## 📝 必須実装項目

### 1. QPS制御システム改善
- [ ] 精密なQPS制御ロジック実装
- [ ] リアルタイムQPS監視機能
- [ ] 安全マージンを含む待機制御

### 2. エラーハンドリング標準化
- [ ] TwitterAPI.io専用エラーマッピング
- [ ] 指数バックオフリトライ機能
- [ ] エラーログの構造化

### 3. パフォーマンス最適化
- [ ] HTTPクライアントの最適化
- [ ] メモリ使用量の監視と制限
- [ ] コネクションプールの実装

### 4. 認証システム強化
- [ ] Bearer Token検証の強化
- [ ] User Session管理の改善
- [ ] 認証失敗時の自動再認証

### 5. 監視・ログ機能
- [ ] リクエスト/レスポンス詳細ログ
- [ ] パフォーマンスメトリクス収集
- [ ] デバッグ情報の構造化出力

## 🚫 制約事項

### MVP制約
- **複雑な機能回避**: 基本動作の確実性優先
- **統計機能最小限**: 過剰な分析機能は実装しない
- **設定項目最小限**: 必要最小限の設定のみ

### パフォーマンス制約
- **メモリ使用量制限**: 100MB以下を維持
- **CPU使用率制限**: 継続的な高負荷回避
- **ネットワーク最適化**: 不要な通信の削減

## 📊 品質基準

### 機能要件
- 200 QPS制限の完全遵守
- エラー発生時の適切な処理と継続
- 認証失敗時の自動復旧

### パフォーマンス要件
- 平均レスポンス時間: 500ms以下
- QPS制御精度: ±5%以内
- メモリリーク: なし

### 信頼性要件
- 24時間連続動作可能
- ネットワークエラー時の自動復旧
- 認証トークン期限切れ時の自動更新

## 🔄 実装順序

1. **QPS制御改善**: 精密な制御ロジック実装
2. **エラーハンドリング**: 標準化されたエラー処理
3. **認証システム**: 2層認証の強化
4. **パフォーマンス最適化**: メモリとCPU使用量最適化
5. **監視機能**: ログとメトリクス収集
6. **統合テスト**: 全機能の動作確認

## 📋 テスト要件

### 単体テスト
- [ ] QPS制御の精度テスト
- [ ] エラーハンドリングの網羅テスト
- [ ] 認証機能の境界値テスト

### 統合テスト
- [ ] TwitterAPI.io実環境テスト
- [ ] 長時間動作テスト
- [ ] 負荷テスト

### パフォーマンステスト
- [ ] QPS制限下での安定動作
- [ ] メモリ使用量測定
- [ ] レスポンス時間測定

## 📄 成果物

### 必須ファイル
- `src/kaito-api/core/client.ts` (改善版)
- `src/kaito-api/core/qps-controller.ts` (新規/改善)
- `src/kaito-api/core/error-handler.ts` (新規/改善)
- `src/kaito-api/core/cost-tracker.ts` (新規)

### ドキュメント
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/api-compliance-report.md`
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/performance-metrics.md`

## 🎯 重要な注意事項

1. **TwitterAPI.io仕様厳守**: 公式ドキュメントとの完全一致
2. **後方互換性維持**: 既存のAPI使用箇所への影響回避
3. **パフォーマンス重視**: レスポンス時間とメモリ使用量の最適化
4. **エラー処理充実**: 予期しない状況での安定動作
5. **ログ出力適切**: デバッグに必要な情報の構造化出力

---

**実装完了後、報告書を作成してください**:
📋 報告書: `tasks/20250727_223237_kaito_api_quality_improvement/reports/REPORT-002-api-client-compliance.md`