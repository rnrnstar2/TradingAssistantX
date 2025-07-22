# TASK-001: 多様な情報源統合システム実装

## 🎯 実装目標
X（Twitter）以外の情報源を統合し、多様な金融・投資情報を収集できるシステムを構築します。

## 📊 現状の問題
- ActionSpecificCollectorがX（Twitter）にのみ依存
- ログイン問題により実質的に情報収集が困難
- フォールバックデータのみでコンテンツ生成している状況

## 🚀 実装要件

### 1. 多様な情報源統合システム設計
以下の情報源を統合するライブラリを実装：

#### RSS配信サービス
- Yahoo Finance RSS
- Reuters Finance RSS  
- Bloomberg RSS（公開フィード）
- 日本経済新聞RSS（公開部分）

#### 金融データAPI（無料枠活用）
- Alpha Vantage API（株価・為替データ）
- IEX Cloud API（米国株価データ）
- CoinGecko API（仮想通貨データ）
- FRED API（経済指標データ）

#### コミュニティデータ
- Reddit公開API（r/investing、r/stocksの投稿）
- Hacker Newsの金融関連投稿

### 2. 実装ファイル

#### 新規作成ファイル
```
src/lib/multi-source-collector.ts - メインの統合収集システム
src/lib/sources/rss-collector.ts - RSS情報収集
src/lib/sources/api-collector.ts - API情報収集  
src/lib/sources/community-collector.ts - コミュニティ情報収集
src/types/multi-source.ts - 型定義
```

### 3. 技術要件

#### 依存関係追加
- `rss-parser`: RSS解析
- `node-fetch`: HTTP リクエスト
- `cheerio`: HTML解析（必要に応じて）

#### エラーハンドリング
- API制限対応
- タイムアウト処理
- フォールバック機能

#### レート制限対応  
- API制限を考慮した適切な間隔
- 並列リクエスト数の制限
- キャッシュ機能の実装

### 4. インターフェース設計

```typescript
interface MultiSourceResult {
  source: 'rss' | 'api' | 'community';
  provider: string;
  data: CollectionResult[];
  timestamp: number;
  metadata: {
    requestCount: number;
    rateLimitRemaining?: number;
    cacheUsed: boolean;
  };
}

interface MultiSourceCollector {
  collectFromRSS(sources: string[]): Promise<MultiSourceResult>;
  collectFromAPIs(config: APIConfig): Promise<MultiSourceResult>;
  collectFromCommunity(platforms: string[]): Promise<MultiSourceResult>;
  executeMultiSourceCollection(): Promise<MultiSourceResult[]>;
}
```

## 📋 実装手順

### Phase 1: RSS統合システム
1. RSS収集ライブラリの実装
2. 主要RSS配信源との接続確立
3. データ正規化システムの構築

### Phase 2: API統合システム  
1. 金融API統合システムの実装
2. レート制限・エラーハンドリングの実装
3. データキャッシュ機能の実装

### Phase 3: コミュニティ統合
1. Reddit API統合の実装
2. コミュニティデータの品質フィルタリング

### Phase 4: 統合テスト
1. 全情報源の並列収集テスト
2. パフォーマンス最適化
3. エラーハンドリングの検証

## ⚠️ 制約・注意事項

### API制限対応
- 各APIの制限内での運用設計
- 制限超過時のフォールバック機能
- 適切なキャッシュ戦略

### データ品質管理
- 情報の信頼性チェック
- 重複コンテンツの除去
- 関連性スコアリング

### パフォーマンス要件
- 90秒以内の実行完了
- 並列処理による効率化
- メモリ使用量の最適化

## ✅ 完了基準

1. **機能完了**
   - RSS、API、コミュニティからの情報収集が正常に動作
   - エラーハンドリングが適切に機能
   - レート制限が守られている

2. **品質基準**
   - TypeScript strict mode準拠
   - ESLint/Prettier通過
   - 適切なエラーハンドリング

3. **テスト基準**
   - 各情報源との接続テスト合格
   - 並列処理のパフォーマンステスト合格
   - エラーケースの検証完了

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_190718_information_source_expansion/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-001-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- 実装した情報源の詳細
- API制限・制約の対応状況  
- パフォーマンステスト結果
- 今後の改善提案

---

**実装品質**: 妥協なく高品質な統合システムの構築を目指してください。情報の多様性が投稿品質の向上に直結します。