# TASK-003: X Poster実装 + Services清理

## 🎯 実装目標
1. X API投稿を担当する`x-poster.ts`を実装
2. 不要なservicesファイルを削除しREQUIREMENTS.mdに準拠した構成に整理

## 📋 実装仕様

### ファイル場所
- **作成ファイル**: `src/services/x-poster.ts`

### 核心機能
1. **X API投稿システム**
   - 生成されたコンテンツの自動投稿
   - 投稿時間の最適化機能
   - エラーハンドリングと再試行機能

2. **投稿品質管理**
   - 文字数制限への自動調整
   - ハッシュタグの最適配置
   - 投稿フォーマットの統一

3. **投稿結果追跡**
   - 投稿の成功・失敗記録
   - エンゲージメント初期データ収集
   - 学習データへの投稿結果反映

### 実装要件

#### 1. クラス構造
```typescript
export class XPoster {
  constructor(apiKey: string, apiSecret: string, accessToken: string, accessTokenSecret: string) {}
  
  async postToX(content: GeneratedContent): Promise<PostResult>
  async validatePost(content: string): Promise<ValidationResult>
  async formatPost(content: GeneratedContent): Promise<string>
  async trackPostResult(postId: string): Promise<void>
}
```

#### 2. 型定義
```typescript
interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  timestamp: Date;
  finalContent: string;
}

interface ValidationResult {
  isValid: boolean;
  charCount: number;
  issues: string[];
  suggestions: string[];
}
```

#### 3. X API統合
- OAuth 1.0a認証実装
- エラーハンドリングとレート制限対応
- 投稿成功時のデータ記録
- 失敗時の再試行ロジック

#### 4. 投稿最適化
- **文字数管理**: X(Twitter)の文字制限対応
- **ハッシュタグ最適化**: 効果的な配置と選択
- **投稿時間最適化**: `data/config/posting-times.yaml`活用
- **リーチ最大化**: プラットフォーム特性に最適化

### 削除対象のサービス
現在の`src/services/`配下の以下ファイルを削除：
- `context-integrator.ts`
- `data-communication-system.ts` 
- `expanded-action-executor.ts`
- `information-evaluator.ts`
- `oauth1-client.ts`
- `playwright-common-config.ts`

### 最終的なservices構成
削除完了後、以下3ファイルのみ残す：
- `content-creator.ts` (Worker-A作成)
- `data-optimizer.ts` (Worker-B作成)  
- `x-poster.ts` (このWorkerで作成)

### OAuth実装注意点
`oauth1-client.ts`を参考に、必要な部分のみ`x-poster.ts`に統合：
- 認証機能をx-poster内部に組み込み
- 外部依存を最小化
- セキュリティを確保した実装

### 品質基準
1. **X API連携動作確認**
2. **投稿成功率の確保**
3. **エラーハンドリング完備**
4. **TypeScript strict・Lint通過**

### 出力管理
- **作業ファイル出力先**: `tasks/20250722_202606/outputs/`
- **削除作業ログ**: 上記ディレクトリ配下のみ
- **ルートディレクトリ出力禁止**

### 実装完了後
**報告書作成**: `tasks/20250722_202606/reports/REPORT-003-x-poster-cleanup.md`
- X投稿機能の実装詳細
- 削除したファイルと理由
- X API連携の動作確認結果
- services構成の最終状態

## 🚫 制約事項
- API認証情報の安全な管理
- 投稿失敗時のデータ整合性確保
- 削除前の重要機能確認

## ✅ 動作確認要件
1. X API投稿の成功確認
2. エラーハンドリングのテスト
3. 投稿結果のデータ記録確認
4. services削除の完了確認

**並列実行**: この作業は他のWorkerと同時実行可能

## 🔗 参考ファイル調査
実装前に以下を調査し参考にする：
- `src/services/oauth1-client.ts` (削除前に内容確認)
- `data/config/` 配下の設定ファイル
- 既存の型定義やインターフェース