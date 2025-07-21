# TASK-001: Playwright実データ収集実装

## 🎯 実装目標

**現在の問題**: `EnhancedInfoCollector`がMockDataのみ返している  
**解決目標**: 実際のX.comからPlaywrightでリアルデータ収集

## 📋 実装要件

### 1. X_TEST_MODE対応実装

```typescript
// src/lib/enhanced-info-collector.ts
constructor() {
  this.testMode = process.env.X_TEST_MODE === 'true';
  this.initializeTargets();
}

private async collectTrendInformation(): Promise<CollectionResult[]> {
  if (this.testMode) {
    return this.getMockTrendData(); // 既存Mock
  }
  
  // 実際のPlaywright実装
  return this.collectRealTrendData();
}
```

### 2. Playwright実装メソッド

**実装必須メソッド**:
- `collectRealTrendData()`: X.com/explore からトレンド収集
- `collectRealCompetitorData()`: 競合アカウント投稿分析  
- `collectRealMarketNews()`: 市場ニュース収集
- `collectRealHashtagData()`: ハッシュタグ活動分析

### 3. エラーハンドリング

```typescript
private async collectRealTrendData(): Promise<CollectionResult[]> {
  try {
    // Playwright実装
    const browser = await playwright.chromium.launch();
    // 実装詳細...
  } catch (error) {
    console.error('❌ Real data collection failed, falling back to mock:', error);
    return this.getMockTrendData(); // フォールバック
  }
}
```

## 🔧 技術要件

- Playwright使用（既存依存関係）
- X.com利用制限の回避（レート制限対応）
- データ品質フィルタリング実装
- 既存Mock構造との互換性保持

## ✅ 完了条件

1. 全4つのcollectメソッドPlaywright実装完了
2. X_TEST_MODE=falseで実データ収集動作
3. エラー時のMockフォールバック動作確認
4. パフォーマンステスト（90秒以内完了）

**実装完了後**: `pnpm dev`で実際のデータ収集開始