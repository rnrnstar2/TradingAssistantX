# TASK-002 Playwright Account Collector実装・復活・最適化

## 🎯 **タスク概要**
フェーズ2の重要コンポーネント`collectors/playwright-account.ts`の無効化された外部依存を復活させ、実際に動作する自アカウント分析システムを実装する。

## 📋 **現状分析**
- `collectors/playwright-account.ts`が存在（594行の完全実装）
- **重大問題**: 外部依存が無効化されている
  - `PlaywrightBrowserManager`: "ブラウザー機能は無効化されています"
  - `SimpleXClient`: "アカウント情報取得は無効化されています"
- 疎結合設計は正しく実装済み（BaseCollector継承）
- アカウント分析ロジックは完全実装済み

## 🚨 **REQUIREMENTS.md制約確認**
- ✅ **アカウント分析専用**: 自アカウント分析のみPlaywright使用
- ✅ **API制限回避**: X APIの制限を回避し確実にデータ取得
- ✅ **疎結合設計**: 分析と収集の分離、完全独立動作
- ❌ **実データ収集**: 現在無効化により実データ収集不可

## 🎯 **実装目標**

### 1. 無効化された外部依存の復活
- [ ] `PlaywrightBrowserManager`の実装復活
- [ ] `SimpleXClient`の実装復活  
- [ ] Playwright実行環境の構築確認
- [ ] X.com認証・セッション管理の実装

### 2. 実データ収集の確立
- [ ] 自アカウント情報の実際の取得
- [ ] フォロワー数・フォロー数の正確な取得
- [ ] エンゲージメント率の実測
- [ ] 投稿履歴の実際の分析

### 3. エラーハンドリングの強化
- [ ] Playwright起動失敗時の対応
- [ ] X.com認証失敗時のフォールバック
- [ ] レート制限への対応
- [ ] ネットワークエラーのリトライ機能

### 4. MVP適合性の確保
- [ ] 必要最小限の機能に絞り込み
- [ ] 過剰な分析機能の除去
- [ ] 疎結合設計の維持
- [ ] パフォーマンスの最適化

## 🔧 **具体的実装指示**

### Phase 1: PlaywrightBrowserManager復活
```typescript
class PlaywrightBrowserManager {
  // 実際のPlaywright機能を実装
  async getContext(): Promise<BrowserContext | null> {
    // 実際のブラウザ起動とコンテキスト取得
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    return await browser.newContext();
  }
}
```

### Phase 2: SimpleXClient復活
```typescript
class SimpleXClient {
  async getMyAccountInfo(): Promise<any> {
    // X.com WebページからPlaywrightでスクレイピング
    // フォロワー数、フォロー数、プロフィール情報取得
  }
  
  async getMyRecentTweets(): Promise<any[]> {
    // 自分の最近のツイート取得
    // public_metricsも含める
  }
}
```

### Phase 3: 認証・セッション管理
- [ ] X.comへの自動ログイン実装
- [ ] セッション永続化（Cookieなど）
- [ ] 認証失敗時の検出と対応
- [ ] セッション有効性の定期確認

### Phase 4: データ収集の最適化
- [ ] **フォロワー分析**: 正確な数値取得
- [ ] **エンゲージメント**: いいね・RT・リプライ数の実測
- [ ] **投稿分析**: 投稿時間とエンゲージメントの相関
- [ ] **アカウント健康度**: 総合的な評価指標

## 📊 **品質基準**

### 機能品質
- **データ精度**: 手動確認との誤差5%以内
- **実行速度**: アカウント分析30秒以内完了
- **信頼性**: ネットワーク問題でも基本データ取得
- **堅牢性**: 認証失敗でもフォールバック動作

### コード品質
- **エラーハンドリング**: 全外部API呼び出しにtry-catch
- **リトライ機能**: ネットワーク系エラーの自動再試行
- **ログ出力**: デバッグ可能な詳細ログ
- **型安全性**: TypeScript strict mode準拠

## 🔐 **セキュリティ・認証要件**

### X.com認証
- [ ] 環境変数でのクレデンシャル管理
- [ ] セッショントークンの安全な保存
- [ ] 認証失敗時のログ出力制御
- [ ] レート制限の適切な処理

### Playwright設定
- [ ] ヘッドレスモード設定
- [ ] User-Agentの適切な設定
- [ ] 画像・CSS読み込みの最適化
- [ ] メモリ使用量の制御

## 🚀 **実行順序**
1. **依存関係確認** (15分) - Playwright・関連パッケージのインストール確認
2. **BrowserManager実装** (45分) - 実際のブラウザ制御機能
3. **XClient実装** (60分) - X.comスクレイピング機能
4. **認証実装** (30分) - ログイン・セッション管理
5. **統合テスト** (30分) - 実データでの動作確認

## 📂 **出力ファイル**
- `/Users/rnrnstar/github/TradingAssistantX/src/collectors/playwright-account.ts` (既存ファイル修正)
- `/Users/rnrnstar/github/TradingAssistantX/tasks/20250723_000347/reports/REPORT-002-playwright-account-collector.md`

## ⚠️ **重要制約**
- **実データ収集必須**: モックデータは一切使用禁止
- **疎結合設計維持**: BaseCollector継承を維持
- **MVP最優先**: 完璧性より動作可能性重視
- **セキュリティ**: クレデンシャル情報の適切な管理

## 🎯 **成功基準**
1. ✅ PlaywrightBrowserManagerが実際にブラウザ起動
2. ✅ 自アカウント情報の正確な取得（フォロワー数など）
3. ✅ 最近のツイートとエンゲージメント数取得
4. ✅ 30秒以内でアカウント分析完了
5. ✅ エラー時のフォールバック動作確認

## 📚 **技術参考情報**
- Playwright公式ドキュメント: https://playwright.dev/
- X.com DOM構造の調査が必要
- 環境変数設定: `X_USERNAME`, `X_PASSWORD`

---
**実装完了後、必ず報告書を作成してください。**