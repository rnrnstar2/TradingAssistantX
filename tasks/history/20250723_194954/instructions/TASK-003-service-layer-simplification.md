# TASK-003: サービス層簡素化

## 🎯 目的
`src/services/` 配下のサービス層をMVP要件に合わせて簡素化する

## 📋 実装対象
- `src/services/content-creator.ts`
- `src/services/x-poster.ts`
- `src/services/data-optimizer.ts`（削除候補）

## 🚨 現状分析
現在のサービス層は複雑な機能を持っているが、MVP要件では「シンプルな3層構成」「基本的なデータフロー」のみが必要。

## ✅ MVP要件（REQUIREMENTS.md準拠）

### シンプルな3層構成
```
データ収集 (RSS Collector): 投資関連情報の取得
     ↓ 
投稿作成 (Claude Code SDK): 教育的価値の高いコンテンツ生成
     ↓ 
投稿実行 (X Poster): 作成したコンテンツの投稿と記録
```

### MVP判断基準
- フォロワー数に基づく投稿頻度調整
- RSS データの有無による収集判断
- 前回投稿からの経過時間
- 基本的なエラーハンドリング

## 🔧 実装指示

### 1. content-creator.ts の簡素化

#### MVPバージョンの実装
```typescript
export class ContentCreator {
  // 複雑な分析・最適化ロジックを削除
  // シンプルなコンテンツ生成のみ
  
  async createPost(
    rssData?: any, 
    followerCount: number
  ): Promise<PostData> {
    // Claude Code SDKによる基本的なコンテンツ生成
    // 複雑な戦略切替は削除
    // 教育的価値重視の単純ロジック
  }
}
```

#### 削除すべき複雑機能
- 高度なコンテンツ最適化
- 複雑な戦略切替ロジック
- 詳細な分析機能
- A/Bテスト機能

### 2. x-poster.ts の簡素化

#### MVPバージョンの実装
```typescript
export class XPoster {
  // 基本的な投稿機能のみ
  
  async post(content: string): Promise<PostResult> {
    // シンプルな投稿実行
    // 基本的な結果記録
    // フォロワー数取得（MVP唯一の指標）
  }
  
  async getFollowerCount(): Promise<number> {
    // フォロワー数のみ取得（MVP指標）
  }
}
```

#### 削除すべき複雑機能
- 詳細なエンゲージメント分析
- 複雑な投稿タイミング調整
- 高度な認証・セキュリティ機能
- パフォーマンス最適化機能

### 3. data-optimizer.ts の評価と削除検討

#### MVP要件との適合性確認
- この機能はMVP要件に含まれているか？
- 「基本的なファイル保存のみ」「手動でのデータ整理で十分」との整合性
- 削除が適切であれば git rm で削除

### 4. 新しいMVPサービス構成

#### 簡素化されたサービス関係
```typescript
// RSS Collector (既存) → Content Creator (簡素化) → X Poster (簡素化)
// 直線的で単純なデータフロー
// 複雑な依存関係の排除
```

## 🚫 MVP制約（実装禁止）

### 過剰機能の禁止
- 詳細なエンゲージメント分析機能
- 複雑な投稿最適化ロジック
- 高度な学習・改善機能
- パフォーマンス分析機能

### 将来拡張の禁止
- 拡張性を考慮した複雑な設計
- プラグイン機能
- 戦略パターンの実装
- 設定可能な複雑オプション

## 📁 出力制約
- **サービス層**: `src/services/` 配下のファイル修正・削除
- **出力禁止**: ルートディレクトリへの新規ファイル作成
- **依存関係**: 他ファイルとの依存関係も同時修正

## 🎯 完了条件
1. content-creator.tsがMVP要件に簡素化
2. x-poster.tsが基本機能のみに簡素化
3. 不要なサービスファイルの削除完了
4. サービス間の依存関係が単純化
5. TypeScript strict モード通過

## 📋 実装後報告書
実装完了後、以下を作成：
`tasks/20250723_194954/reports/REPORT-003-service-layer-simplification.md`

**報告内容**:
- 削除した複雑機能の一覧
- 簡素化したサービス構成
- MVPデータフロー確認結果
- 削除したファイル一覧
- 依存関係修正結果