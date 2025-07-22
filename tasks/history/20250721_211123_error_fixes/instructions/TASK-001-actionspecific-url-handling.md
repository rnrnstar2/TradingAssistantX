# TASK-001: ActionSpecificCollector URL処理エラー修正

## 🎯 任務概要
ActionSpecificCollectorで発生している2つの重大なURL処理エラーを修正する。

## 🔍 問題分析結果

### 問題1: Reuters URLエラー 
```
net::ERR_NAME_NOT_RESOLVED at https://feeds.reuters.com/reuters/businessNews
```
- **原因**: 現在の`action-collection-strategies.yaml`からReutersソースが削除されているが、どこかでレガシー設定が参照されている
- **影響**: RSS収集が失敗し、情報収集の品質が低下

### 問題2: 未定義URL エラー（複数発生）
```
page.goto: url: expected string, got undefined
```
- **原因**: `resolveApiSourceUrl`メソッドが`platform`フィールドのみを持つソース（reddit_investing等）に対して適切なURLを生成できない
- **問題箇所**: `src/lib/action-specific-collector.ts:1310-1326`

## 🔧 修正要求

### 修正1: resolveApiSourceUrl メソッド強化
**ファイル**: `src/lib/action-specific-collector.ts`

**現在の問題コード** (行1310-1326):
```typescript
private resolveApiSourceUrl(source: any): string {
  // source.urlがある場合はそのまま返却
  if (source.url) {
    return source.url;
  }
  
  // APIソースでproviderがある場合、multi-source-configからbase_urlを取得
  if (source.provider && this.multiSourceConfig && this.multiSourceConfig.apis) {
    const apiConfig = this.multiSourceConfig.apis[source.provider];
    if (apiConfig && apiConfig.base_url) {
      return apiConfig.base_url;
    }
  }
  
  // フォールバック：providerをそのまま返却（下位互換性）
  return source.provider || '';
}
```

**必要な修正**:
1. `platform`フィールドを持つソース（Reddit等）のサポート追加
2. `multi-source-config.yaml`からの適切なURL解決
3. 未定義URLの防止（空文字が返されないよう）
4. エラーハンドリング強化とログ出力

**実装すべきロジック**:
```typescript
private resolveApiSourceUrl(source: any): string {
  // 1. 直接URL指定の場合
  if (source.url) {
    return source.url;
  }
  
  // 2. APIプロバイダの場合
  if (source.provider && this.multiSourceConfig?.apis) {
    const apiConfig = this.multiSourceConfig.apis[source.provider];
    if (apiConfig?.base_url) {
      return apiConfig.base_url;
    }
  }
  
  // 3. プラットフォーム（Reddit等）の場合
  if (source.platform && this.multiSourceConfig?.community) {
    const platformConfig = this.multiSourceConfig.community[source.platform];
    if (platformConfig?.base_url) {
      // subredditがある場合は適切なパスを構築
      if (source.subreddits?.length > 0) {
        return `${platformConfig.base_url}/r/${source.subreddits[0]}`;
      }
      return platformConfig.base_url;
    }
  }
  
  // 4. RSSソース（multi-source-configから）の場合
  if (source.type === 'rss' && this.multiSourceConfig?.rss?.sources) {
    const rssConfig = this.multiSourceConfig.rss.sources[source.name];
    if (rssConfig?.base_url) {
      return rssConfig.base_url;
    }
  }
  
  // 5. エラー時のログ出力とthrow
  console.error(`❌ [URL解決エラー] ソース設定が不完全: ${JSON.stringify(source)}`);
  throw new Error(`Invalid source configuration: unable to resolve URL for ${source.name}`);
}
```

### 修正2: エラーハンドリング強化
**ファイル**: `src/lib/action-specific-collector.ts`

**問題箇所**: `collectFromTargetWithTimeout` メソッド (行723-735)
```typescript
await page.goto(target.source, { 
  waitUntil: 'networkidle',
  timeout 
});
```

**必要な修正**:
1. URL妥当性の事前チェック
2. より詳細なエラーログ
3. Graceful degradation の改善

### 修正3: レガシー設定クリーンアップ
**確認・修正が必要な箇所**:
1. Reutersソースがどこで参照されているか特定
2. 不要な設定の完全削除
3. 設定ファイル間の整合性確保

## 📋 テスト要件

### 単体テスト
1. `resolveApiSourceUrl`メソッドの各パターンテスト:
   - URL直接指定
   - APIプロバイダ（alphavantage, coingecko）
   - プラットフォーム（reddit）
   - 無効な設定での例外処理

### 統合テスト  
1. 実際のActionSpecificCollector実行でエラーが発生しないことを確認
2. 各ソースタイプからの正常な情報収集

## 🚫 制約・注意事項

### MVP制約遵守
- **既存機能の保持**: 動作している既存のソース（Yahoo Finance, Bloomberg等）は影響を受けないこと
- **最小限の変更**: 過剰な機能追加は行わず、エラー修正に集中
- **後方互換性**: 既存の設定ファイルとの互換性を維持

### TypeScript要件
- **Strict mode**: すべての型定義を適切に行う
- **エラーハンドリング**: try-catch文とログ出力を適切に配置
- **型安全性**: `any`型の使用を最小限に抑制

## 📤 出力要件

### 出力先
- **レポート**: `tasks/20250721_211123_error_fixes/outputs/TASK-001-fix-results.md`
- **テストログ**: `tasks/20250721_211123_error_fixes/outputs/TASK-001-test-log.txt`

### レポート内容
1. 修正内容の詳細
2. テスト実行結果
3. 修正前後の動作比較
4. 残存課題・推奨事項

## ✅ 完了定義
1. `pnpm dev` 実行時にURL関連エラーが発生しない
2. すべてのソースタイプで適切なURL解決が動作
3. TypeScript型チェックが通る
4. 単体・統合テストが成功
5. 完了レポートが提出される

**実装優先度**: CRITICAL
**推定工数**: 2-3時間