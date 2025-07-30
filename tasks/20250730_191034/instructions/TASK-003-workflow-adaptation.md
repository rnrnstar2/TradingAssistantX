# TASK-003: ワークフロー新構造適応

## 🎯 実装目標

引き継ぎ資料に基づき、MainWorkflowを「1実行 = 1アクション = 1ファイル」原則に完全対応させ、新しいデータ構造（post.yaml統合、学習データ2ファイル構成）でスムーズに動作させる。

## 📋 現在の状況と修正内容

### 🔧 修正が必要な箇所

#### 1. データ保存ロジック（853-877行目）
**現在の問題**:
- `saveResults()`メソッドが古い複雑な構造を想定
- TASK-001で変更されるDataManager新構造に対応が必要

**修正内容**:
- DataManagerの新`savePost()`メソッドに完全対応
- post.yaml統合形式での保存ロジック最適化

#### 2. 学習データ使用部分（384-396行目）
**現在の問題**:
- 複雑な学習データ構造を想定したコード
- TASK-002で変更される2ファイル構成に対応が必要

**修正内容**:
- 新engagement-patterns.yaml, successful-topics.yaml構造に対応
- 学習データ参照ロジックの簡素化

#### 3. コンテキスト構築部分（275-300行目）
**現在の問題**:
- 過剰に複雑なシステムコンテキスト構築
- MVP簡素化に合わない詳細情報収集

**修正内容**:
- MVP要件に最適化されたコンテキスト構築
- 必要最小限の情報に絞り込み

## 🔧 具体的な修正作業

### Phase 1: DataManager連携の修正

#### saveResults()メソッド適応（853-877行目）
**修正前**（複雑な構造）:
```typescript
await this.getDataManager().savePost({
  actionType: decision.action as 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow',
  content: actionResult.content || actionResult.text || '',
  tweetId: actionResult.tweetId || actionResult.id,
  result: {
    success: actionResult.success,
    message: actionResult.message || '',
    data: actionResult.data || {}
  },
  engagement: actionResult.engagement || actionResult.metrics || {
    likes: 0,
    retweets: 0,
    replies: 0
  }
});
```

**修正後**（post.yaml統合形式）:
```typescript
await this.getDataManager().savePost({
  actionType: decision.action,
  content: actionResult.content,
  tweetId: actionResult.targetTweetId || actionResult.tweetId,
  result: actionResult.result,
  engagement: actionResult.engagement,
  claudeSelection: actionResult.claudeSelection, // AI選択情報も統合
  metadata: {
    searchQuery: actionResult.searchQuery,
    timestamp: actionResult.timestamp,
    executionContext: {
      scheduled: !!options?.scheduledAction,
      topic: decision.parameters?.topic
    }
  }
});
```

### Phase 2: 学習データ使用の簡素化

#### 学習データ参照ロジック（384-396行目）
**修正前**（複雑な抽出）:
```typescript
const recentPatterns = learningData.decisionPatterns?.slice(-5) || [];
const successfulTopics = recentPatterns
  .filter((p: any) => p.result?.success && p.result?.engagement_rate > 3)
  .map((p: any) => p.context?.topic || p.decision?.topic)
  .filter(Boolean) as string[];

systemContext.learningData = {
  recentTopics: [...new Set(successfulTopics)].slice(0, 3),
  totalPatterns: learningData.decisionPatterns?.length || 0,
  avgEngagement: recentPatterns.reduce((sum: number, p: any) => 
    sum + (p.result?.engagement_rate || 0), 0) / (recentPatterns.length || 1)
};
```

**修正後**（2ファイル構成対応）:
```typescript
// 新構造：直接的で明確な学習データ使用
const { engagementPatterns, successfulTopics } = learningData;

systemContext.learningData = {
  recentTopics: successfulTopics?.topics?.slice(0, 3).map(t => t.topic) || [],
  optimalTimeSlot: this.getCurrentTimeSlotPattern(engagementPatterns),
  avgEngagement: this.calculateCurrentEngagementExpectation(engagementPatterns)
};
```

### Phase 3: アクション実行ロジックの最適化

#### 投稿アクション（365-445行目）
**修正内容**:
- 新学習データ構造を活用したコンテンツ生成最適化
- post.yaml統合保存への対応

#### リツイート・いいね・引用ツイートアクション
**修正内容**:
- Claude選択結果の詳細保存（post.yaml統合形式）
- 検索パフォーマンスの学習データ蓄積

### Phase 4: ヘルパーメソッド追加

#### 時間帯最適化メソッド
```typescript
/**
 * 現在時刻に最適な時間帯パターンを取得
 */
private static getCurrentTimeSlotPattern(engagementPatterns: any): string {
  const currentHour = new Date().getHours();
  const timeSlot = this.getTimeSlotForHour(currentHour);
  return engagementPatterns?.timeSlots?.[timeSlot]?.successRate > 0.8 
    ? timeSlot 
    : 'optimal_fallback';
}

/**
 * 現在の時間帯でのエンゲージメント期待値計算
 */
private static calculateCurrentEngagementExpectation(engagementPatterns: any): number {
  const currentHour = new Date().getHours();
  const timeSlot = this.getTimeSlotForHour(currentHour);
  return engagementPatterns?.timeSlots?.[timeSlot]?.avgEngagement || 2.5;
}

/**
 * 時刻から時間帯スロットを決定
 */
private static getTimeSlotForHour(hour: number): string {
  if (hour >= 7 && hour < 10) return '07:00-10:00';
  if (hour >= 12 && hour < 14) return '12:00-14:00';
  if (hour >= 20 && hour < 22) return '20:00-22:00';
  return 'other';
}
```

## 🎯 実装指針

### MVP制約遵守
- **シンプル第一**: 複雑なロジックを排除し、理解しやすいコードに
- **必要最小限**: 実際に使用する機能のみ実装
- **学習効率**: 2ファイル構成による効率的な学習データ活用

### パフォーマンス最適化
- **データ読み込み**: 必要な学習データのみ効率的に読み込み
- **保存処理**: post.yaml統合による書き込み処理の簡素化
- **メモリ使用**: 不要なデータ保持を避ける

### エラーハンドリング
- **グレースフルデグラデーション**: 学習データ不備時のフォールバック
- **詳細ログ**: デバッグに有用な情報出力
- **状態追跡**: 実行ステップごとの状態記録

## 📁 影響するファイル

### 主要修正対象
- `src/workflows/main-workflow.ts` - メインファイル（重点修正）

### 連携確認対象
- `src/shared/data-manager.ts` - TASK-001で修正されるDataManager
- `data/learning/engagement-patterns.yaml` - TASK-002で作成される新構造
- `data/learning/successful-topics.yaml` - TASK-002で作成される新構造

### 動作確認対象
- `src/dev.ts` - 開発実行での動作確認
- `src/main.ts` - スケジュール実行での動作確認

## ⚠️ 重要な制約

### TASK間の依存関係
- **TASK-001完了後**: DataManagerの新メソッドが利用可能
- **TASK-002完了後**: 新学習データ構造が利用可能
- **並行作業不可**: DataManagerと学習データの新構造が必要

### 後方互換性
- 既存のpost.yamlファイル読み込み互換性維持
- エラー時の適切なフォールバック処理
- 段階的な移行対応

## ✅ 完了基準

1. **DataManager連携完了**: 新savePost()メソッドを正しく使用
2. **学習データ活用完了**: 2ファイル構成の効率的な使用
3. **コンテキスト簡素化完了**: MVP要件に最適化されたコンテキスト構築
4. **ヘルパーメソッド追加完了**: 時間帯最適化・エンゲージメント計算ロジック
5. **エラーハンドリング完了**: 新構造での適切なエラー処理
6. **動作確認完了**: dev実行・スケジュール実行の両方で正常動作
7. **パフォーマンス確認**: メモリ使用量・実行時間の改善確認

## 🔧 実装順序

1. **Phase 1**: ヘルパーメソッド追加（時間帯処理・エンゲージメント計算）
2. **Phase 2**: 学習データ使用ロジック修正（384-396行目）
3. **Phase 3**: saveResults()メソッド修正（853-877行目）
4. **Phase 4**: コンテキスト構築ロジック簡素化（275-300行目）
5. **Phase 5**: エラーハンドリング強化
6. **Phase 6**: 統合テスト・動作確認

## 📋 報告書作成要件

実装完了後、`tasks/20250730_191034/reports/REPORT-003-workflow-adaptation.md`に以下内容で報告書を作成：

1. **修正サマリー**: 変更した機能・削除したコード行数
2. **新構造活用状況**: post.yaml統合・学習データ2ファイル構成の活用詳細
3. **パフォーマンス改善**: 実行時間・メモリ使用量の変化
4. **動作確認結果**: dev実行・スケジュール実行での動作テスト結果
5. **今後の保守**: コードの理解しやすさ・拡張性の向上状況

---

**🚨 CRITICAL**: このワークフロー適応により、「1実行 = 1アクション = 1ファイル」原則が完全に実現され、システム全体の整合性と保守性が大幅に向上する。MVP要件への最適化の最終段階。