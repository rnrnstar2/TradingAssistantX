# TASK-002: タイムアウトエラー修正・外部サイト収集無効化

## 🎯 実装目標

ActionSpecificCollectorの外部サイト収集を無効化し、PlaywrightAccountCollectorのツイート時間取得タイムアウトを修正する。

## 🚨 現在のエラー状況

### 1. 外部サイト収集タイムアウト
```
❌ [ターゲット収集エラー] https://finance.yahoo.com: page.goto: Timeout 30000ms exceeded.
❌ [ターゲット収集エラー] https://www.investopedia.com: page.goto: Timeout 30000ms exceeded.
```

### 2. ツイート時間取得タイムアウト
```
⚠️ [最新投稿時間取得エラー]: page.waitForSelector: Timeout 30000ms exceeded.
Call log: - waiting for locator('[data-testid="tweet"]')
```

## 📋 修正要件

### A. 外部サイト収集の完全無効化

**対象ファイル**: `src/lib/action-specific-collector.ts`

#### 修正内容:
1. **X専用モードの実装**: 外部サイト収集を完全に無効化
2. **設定ファイル修正**: X以外のソースを削除
3. **収集戦略の調整**: X内部の情報のみを活用

#### 具体的な修正:
```typescript
// X専用収集モードの実装
const isXOnlyMode = true; // 外部サイト収集を完全無効化

// 外部サイトをスキップする条件判定
private shouldSkipExternalSite(url: string): boolean {
  const xDomains = ['x.com', 'twitter.com'];
  return !xDomains.some(domain => url.includes(domain));
}

// collectFromTarget メソッドの修正
async collectFromTarget(url: string, ...): Promise<any> {
  if (this.shouldSkipExternalSite(url)) {
    console.log(`⏭️ [外部サイトスキップ] ${url}`);
    return { skipped: true, reason: 'X専用モード' };
  }
  // 既存のロジックを継続
}
```

### B. ツイート時間取得のタイムアウト修正

**対象ファイル**: `src/lib/playwright-account-collector.ts`

#### 修正内容:
1. **短縮タイムアウト**: tweet要素検索を5秒に短縮
2. **グレースフルフォールバック**: 要素が見つからない場合の適切な処理
3. **投稿なしアカウント対応**: 投稿が存在しない場合の適切なハンドリング

#### 具体的な修正:
```typescript
// extractLastTweetTimeSafe メソッドの改善
private async extractLastTweetTimeSafe(page: Page): Promise<number> {
  try {
    if (page.isClosed()) {
      throw new Error('ページが既に閉じられています');
    }

    // 短縮タイムアウトで投稿要素をチェック（5秒）
    const shortTimeout = 5000;
    
    try {
      await page.waitForSelector('[data-testid="tweet"]', { 
        timeout: shortTimeout,
        state: 'attached'
      });
    } catch (timeoutError) {
      // 投稿がないアカウントの場合の適切な処理
      console.log('📭 [投稿なし] このアカウントには投稿がありません');
      return Date.now() - (7 * 24 * 60 * 60 * 1000); // 1週間前をデフォルト
    }

    // 既存の投稿時間抽出ロジック
    // ...
  } catch (error) {
    console.warn('⚠️ [最新投稿時間取得エラー]:', error);
    return Date.now() - (7 * 24 * 60 * 60 * 1000);
  }
}
```

### C. 設定ファイルの修正

**対象ファイル**: `data/action-collection-strategies.yaml`

#### 修正内容:
外部サイトのソースを削除し、X専用の収集戦略に変更

```yaml
# 修正前（例）
strategies:
  original_post:
    sources:
      - url: "https://finance.yahoo.com"
      - url: "https://www.investopedia.com"
      - url: "https://x.com/search?q=trading"

# 修正後
strategies:
  original_post:
    sources:
      - url: "https://x.com/search?q=trading"
      - url: "https://x.com/search?q=investment"
    collectMethods:
      - type: "x_search"
        focusArea: "トレンド分析"
```

## ✅ 品質要件

### TypeScript厳格モード
- **完全な型安全性**: 修正箇所の型定義を明確化
- **エラーハンドリング**: タイムアウト・接続エラーの適切な処理
- **フォールバック戦略**: 外部サイト無効化時の代替収集方法

### パフォーマンス要件
- **高速化**: 外部サイトアクセス排除により処理時間短縮
- **安定性**: タイムアウトエラーの削減
- **リソース効率**: 不要なネットワークアクセスの排除

### 機能要件
- **X専用収集**: X内部コンテンツのみでの価値ある情報収集
- **投稿なしアカウント対応**: 新規・非アクティブアカウントでの正常動作
- **エラー耐性**: ネットワーク問題時の適切な継続処理

## 📁 出力管理規則

### 承認された出力場所
- **修正ファイル**: 既存ファイルの編集のみ
- **設定ファイル修正**: `data/action-collection-strategies.yaml` の更新
- **一時ファイル**: `tasks/20250721_155226/outputs/` 配下

### 禁止事項
- **ルートディレクトリ**: 直下への任意のファイル作成は絶対禁止
- **新規外部依存**: 外部サイト収集の代替として新しい外部依存を追加しない

## 🚀 実装手順

### Step 1: ActionSpecificCollector修正
1. X専用モード実装
2. 外部サイトスキップロジック追加
3. 収集戦略の調整

### Step 2: PlaywrightAccountCollector修正
1. ツイート時間取得の短縮タイムアウト実装
2. 投稿なしアカウント対応ロジック追加
3. エラーハンドリング強化

### Step 3: 設定ファイル修正
1. action-collection-strategies.yaml から外部サイト削除
2. X専用収集戦略への変更
3. 収集効率の最適化

### Step 4: テスト・検証
1. 外部サイトアクセスが発生しないことの確認
2. 投稿なしアカウントでの動作確認
3. 全体的な処理時間の改善確認

## 📋 完了条件

### 必須条件
- [x] 外部サイト（yahoo.com, investopedia.com等）へのアクセス完全停止
- [x] ツイート時間取得タイムアウトエラーの解消
- [x] 投稿なしアカウントでの正常動作
- [x] X専用の価値ある情報収集の実現
- [x] TypeScript strict mode でのエラーゼロ
- [x] 処理時間の大幅短縮

### 検証条件
- [x] `pnpm dev` コマンドでタイムアウトエラーなく動作完了
- [x] ネットワークログで外部サイトアクセスなしの確認
- [x] 新規アカウント（投稿なし）での動作テスト
- [x] 処理時間が従来の50%以下に短縮

## 🎯 実用性重視

### 価値提供
- **高速化**: 外部サイト排除による劇的な処理速度向上
- **安定性**: タイムアウトエラー排除による信頼性向上
- **プライバシー**: X専用でのデータ収集によるセキュリティ向上

### ユーザー要望への対応
- **「X以外の情報源からデータ収集は良くない」**: 外部サイト収集を完全無効化
- **エラー修正**: 全タイムアウトエラーの解消
- **実用性重視**: X内部のみでも十分価値のある情報収集を実現

---

**重要**: この修正により、TradingAssistantX システムはX専用の高速・安定した自律実行システムとなり、外部サイト依存によるタイムアウトエラーが完全に解消されます。