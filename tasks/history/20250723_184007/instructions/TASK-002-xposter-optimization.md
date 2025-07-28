# TASK-002: XPoster最適化とレガシーメソッド削除

## 🎯 実装目標

XPosterクラスを最適化し、レガシーメソッドを削除してClaude統合を強化する。

## ✅ 必須要件

### 1. レガシーメソッド削除
- 不要な複雑な認証処理の簡素化
- 重複するバリデーション機能の統合
- 使われていないヘルパーメソッドの削除

### 2. Claude統合強化
- エラー発生時のClaude連携改善
- 投稿失敗時のインテリジェントリトライ
- エンゲージメントデータの精度向上

### 3. パフォーマンス最適化
- API呼び出しの最適化
- メモリリークの防止
- 並列処理の改善

## 📝 実装詳細

### ファイル: `src/services/x-poster.ts`

#### A. レガシーメソッド削除対象

##### 1. 重複バリデーション機能
```typescript
// 削除対象: 重複する文字列処理
private calculateSimilarity(str1: string, str2: string): number
private levenshteinDistance(str1: string, str2: string): number

// 統合: 1つの効率的な類似度計算メソッドに統合
private calculatePostSimilarity(content1: string, content2: string): number
```

##### 2. 複雑なOAuth処理の簡素化
```typescript
// 簡素化対象: OAuth1.0a処理の冗長な部分
private normalizeParameters(params: Record<string, string>): string
private createSignatureBaseString(method: string, url: string, normalizedParams: string): string

// 統合: OAuth処理を1つのクラスに統合
class OAuth1Handler {
  generateAuthHeader(method: string, url: string, params: Record<string, string>): string
}
```

#### B. Claude統合強化

##### 1. インテリジェントエラーハンドリング
```typescript
/**
 * Claude連携エラーハンドリング
 */
private async handlePostErrorWithClaude(error: Error, content: string): Promise<PostResult> {
  // Claudeにエラー内容を分析させ、改善案を取得
  const errorAnalysis = await this.analyzeErrorWithClaude(error, content);
  
  if (errorAnalysis.shouldRetry) {
    // Claudeの提案に基づく内容修正
    const improvedContent = await this.improveContentWithClaude(content, errorAnalysis);
    return await this.retryPost(improvedContent);
  }
  
  return this.createErrorResult(error.message, content);
}
```

##### 2. エンゲージメント予測精度向上
```typescript
/**
 * Claude支援エンゲージメント予測
 */
private async predictEngagementWithClaude(content: string): Promise<EngagementPrediction> {
  // Claudeに内容を分析させてエンゲージメント予測
  const analysis = await claude()
    .withModel('sonnet')
    .query(`投稿内容を分析してエンゲージメント予測してください: ${content}`)
    .asText();
    
  return this.parseEngagementPrediction(analysis);
}
```

#### C. パフォーマンス最適化

##### 1. 接続プール実装
```typescript
/**
 * HTTP接続プール
 */
private connectionPool = new Map<string, any>();

private async getOptimizedConnection(url: string): Promise<any> {
  // 接続プールからの再利用
  if (this.connectionPool.has(url)) {
    return this.connectionPool.get(url);
  }
  
  // 新しい接続を作成してプールに保存
  const connection = await this.createConnection(url);
  this.connectionPool.set(url, connection);
  return connection;
}
```

##### 2. バッチ処理対応
```typescript
/**
 * 複数投稿のバッチ処理
 */
async batchPost(contents: GeneratedContent[]): Promise<PostResult[]> {
  const results = await Promise.allSettled(
    contents.map(content => this.postToX(content))
  );
  
  return results.map((result, index) => 
    result.status === 'fulfilled' 
      ? result.value 
      : this.createErrorResult(result.reason, contents[index])
  );
}
```

## 🗑️ 削除対象コード（詳細）

### 1. 重複機能
- `calculateSimilarity()` と `levenshteinDistance()` → `calculatePostSimilarity()`に統合
- `extractHashtags()` と `countHashtags()` → 1つのメソッドに統合
- 複数の時間処理メソッド → `TimeUtils`クラスに統合

### 2. 不要な複雑性
- 過度に細分化されたOAuth処理メソッド
- 使われていないエラーコード定数
- 古いAPI呼び出し形式のサポート

### 3. 冗長なログ処理
- 重複するログ出力処理
- 不要なデバッグ情報

## ⚡ パフォーマンス改善目標

### 1. レスポンス時間
- API呼び出し時間: 30%短縮
- 認証処理時間: 50%短縮
- 全体処理時間: 25%短縮

### 2. メモリ使用量
- オブジェクト生成数: 40%削減
- メモリリーク: 完全排除
- ガベージコレクション頻度: 30%削減

### 3. エラー率
- ネットワークエラー耐性: 50%向上
- 認証エラー: 90%削減
- リトライ成功率: 80%向上

## 🧪 テスト要件

### 1. 機能テスト
```typescript
describe('XPoster Optimization', () => {
  it('should handle batch posting efficiently', async () => {
    const contents = generateTestContents(10);
    const results = await xPoster.batchPost(contents);
    
    expect(results).toHaveLength(10);
    expect(results.every(r => r.success || r.error)).toBe(true);
  });
  
  it('should retry with Claude suggestions', async () => {
    const failingContent = generateFailingContent();
    const result = await xPoster.postToX(failingContent);
    
    // Claudeによる改善後の成功を確認
    expect(result.success).toBe(true);
  });
});
```

### 2. パフォーマンステスト
```typescript
describe('Performance Tests', () => {
  it('should post within performance targets', async () => {
    const startTime = Date.now();
    await xPoster.postToX(generateTestContent());
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
  });
});
```

## 📊 成功基準

### 機能面
- ✅ 全既存機能の維持
- ✅ Claude統合の正常動作
- ✅ エラーハンドリングの改善

### パフォーマンス面
- ✅ レスポンス時間25%短縮
- ✅ メモリ使用量40%削減
- ✅ エラー率50%改善

### コード品質面
- ✅ コード行数20%削減
- ✅ 複雑度スコア30%改善
- ✅ テストカバレッジ95%以上

## 🔍 検証方法

### 1. パフォーマンス測定
```bash
# ベンチマークテスト実行
pnpm test:benchmark src/services/x-poster.benchmark.ts

# メモリプロファイリング
node --inspect src/scripts/profile-x-poster.js
```

### 2. 統合テスト
```bash
# core-runner.tsとの統合確認
pnpm test src/core/execution/core-runner.integration.test.ts

# 実際の投稿テスト（DEVモード）
pnpm dev
```

## 📋 実装後チェックリスト

- [ ] レガシーメソッド削除完了
- [ ] Claude統合強化完了
- [ ] パフォーマンス最適化完了
- [ ] バッチ処理実装完了
- [ ] エラーハンドリング改善完了
- [ ] テスト実装・実行完了
- [ ] パフォーマンス測定・確認完了
- [ ] メモリリーク検証完了

## 💡 注意点

### 1. 後方互換性
- 既存のpostToX()インターフェースは維持
- 設定ファイル形式の変更は最小限に
- 他のサービスクラスへの影響を最小化

### 2. セキュリティ
- OAuth認証の安全性を維持
- APIキーの適切な管理
- エラーログでの機密情報漏洩防止

### 3. 安定性
- 本番環境への影響を考慮
- 段階的なデプロイメント対応
- ロールバック手順の準備

## 🎯 完了条件

1. **機能完全性**: 全ての既存機能が正常動作
2. **パフォーマンス**: 目標値達成
3. **品質**: コード品質指標の改善
4. **テスト**: 全テストケースが通過
5. **統合**: core-runner.tsとの完全統合

---

**重要**: XPosterは投稿の最終段階を担当する重要なサービスです。慎重にテストを実行し、段階的に最適化を進めてください。