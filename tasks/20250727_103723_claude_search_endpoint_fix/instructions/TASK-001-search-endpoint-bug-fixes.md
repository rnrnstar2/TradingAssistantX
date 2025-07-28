# TASK-001: Search Endpoint Bug Fixes

## 📋 **実装目標**

search-endpoint.ts のテスト失敗を修正し、完璧な動作を実現する

## 🚨 **検出された問題**

### 1. topic別クエリ最適化の問題
- **期待**: クエリにtopicが含まれる
- **実際**: '投資 教育 初心者 -spam' の固定文字列
- **影響**: topic='投資信託'でも投資信託がクエリに含まれない

### 2. constraints設定反映の問題  
- **timeframe制約**: 入力'6h'が'24h'になる
- **minEngagement制約**: 期待値と実際値の不一致

### 3. フィルター条件の不整合
- **engagement期待値**: purpose='engagement'で15以上期待だが10になる
- **制約適用順序**: Claude応答 vs 入力制約の優先順位不明確

## 🎯 **修正要件**

### A. topic反映の完全修正
```typescript
// 修正前（問題のあるコード）
function optimizeSearchQuery(claudeResult: any, input: SearchInput): any {
  return {
    query: claudeResult.query.substring(0, 200), // topicが含まれない
    // ...
  };
}

// 修正後（期待動作）
function optimizeSearchQuery(claudeResult: any, input: SearchInput): any {
  const baseQuery = claudeResult.query || input.topic;
  return {
    query: baseQuery.includes(input.topic) ? 
      baseQuery.substring(0, 200) :
      `${input.topic} ${baseQuery}`.substring(0, 200),
    // ...
  };
}
```

### B. constraints制約の確実な反映
```typescript
// timeframe制約の確実な適用
function optimizeSearchQuery(claudeResult: any, input: SearchInput): any {
  return {
    // ...
    filters: {
      // 入力制約を優先適用
      maxAge: input.constraints?.timeframe || claudeResult.time_range,
      minEngagement: input.constraints?.minEngagement || claudeResult.engagement_min,
      // ...
    }
  };
}
```

### C. purpose別minEngagement基準の統一
```typescript
// purpose別の最小エンゲージメント基準を明確化
const MIN_ENGAGEMENT_BY_PURPOSE = {
  retweet: 10,
  like: 5, 
  trend_analysis: 3,
  engagement: 15  // 'engagement' = quote_tweet用
} as const;
```

## 🔧 **修正対象ファイル**

### 主要修正: `src/claude/endpoints/search-endpoint.ts`

1. **optimizeSearchQuery関数**: topic反映ロジック修正
2. **optimizeRetweetQuery関数**: constraints優先適用  
3. **optimizeLikeQuery関数**: minEngagement計算修正
4. **optimizeQuoteQuery関数**: engagement基準統一
5. **フォールバック関数群**: 同様の修正適用

## 📋 **実装手順**

### 1. 問題原因の詳細分析
- search-endpoint.ts の現在の実装確認
- テスト失敗箇所の詳細特定
- Claude応答解析ロジックの検証

### 2. topic反映ロジックの修正
- Claude応答にtopicが含まれない場合の対処
- 全最適化関数でのtopic確実反映
- フォールバック時のtopic含有確認

### 3. constraints制約適用の統一
- 入力制約とClaude応答の優先順位明確化
- timeframe、minEngagement等の確実反映
- 全エンドポイント関数での一貫性確保

### 4. purpose別基準の統一
- MIN_ENGAGEMENT_BY_PURPOSE定数追加
- purpose='engagement'(quote用)の15基準適用
- テスト期待値との完全一致

### 5. 回帰テストの実行
```bash
npm test tests/claude/endpoints/search-endpoint.test.ts
```

## ✅ **成功基準**

### 必須達成項目
- [ ] 全search-endpoint.test.tsテストの成功
- [ ] topic別クエリでのtopic含有確認
- [ ] constraints設定の100%反映
- [ ] purpose別minEngagement基準の正確適用

### 品質確認項目  
- [ ] フォールバック時の動作確認
- [ ] エラーハンドリングの保持
- [ ] 型安全性の維持
- [ ] パフォーマンステストの成功

## 📚 **参考情報**

### テスト失敗箇所
```bash
# 失敗テスト
× topic別のクエリ最適化確認
× constraints設定の反映確認  
× エンゲージメント最小値の調整
× minEngagement設定の反映確認
× timeframe制約の適用
× 不適切なpurpose指定時のエラー処理
```

### REQUIREMENTS.md準拠確認
- エンドポイント別設計の維持
- Claude SDK使用の継続
- 型安全性の確保
- MVP制約の遵守

## 🚫 **注意事項**

### 変更禁止事項
- ❌ エンドポイント関数のシグネチャ変更
- ❌ 既存の型定義変更  
- ❌ Claude SDK使用方法の変更
- ❌ テスト構造の変更

### 品質保証
- ✅ 全修正箇所のユニットテスト確認
- ✅ エラーケースの動作維持
- ✅ TypeScript strict モード準拠
- ✅ 既存機能の回帰防止

---

**🎯 期待成果**: search-endpoint.ts の完全な動作確認と全テスト成功による品質確保