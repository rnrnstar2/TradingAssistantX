# TASK-001: X アカウント情報管理システム実装

## 🎯 実装目的

@rnrnstar アカウントのID、フォロワー数、エンゲージメント等を取得・管理するMVPシステムを実装する。

## 📋 MVP制約確認済み

- ✅ 今すぐ必要: フォロワー数・エンゲージメント確認のため
- ✅ 最小限実装: 基本的なAPI呼び出しとデータ保存のみ  
- ✅ 統計・分析機能なし: メトリクス取得は基本機能として許可
- ✅ 複雑エラーハンドリングなし: 基本的なエラー処理のみ
- ✅ 将来拡張性考慮なし: 最小限の実装

## 🔨 実装タスク

### 1. 型定義拡張 (src/types/index.ts)

```typescript
// 以下の型定義を追加
export interface AccountInfo {
  username: string;
  user_id: string;
  display_name: string;
  verified: boolean;
}

export interface AccountMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  last_updated: number;
}

export interface UserResponse {
  data: {
    id: string;
    username: string;
    name: string;
    verified: boolean;
    public_metrics: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
      listed_count: number;
    };
  };
}
```

### 2. X Client拡張 (src/lib/x-client.ts)

以下のメソッドを SimpleXClient クラスに追加：

```typescript
// ユーザー名からアカウント情報取得
async getUserByUsername(username: string): Promise<AccountInfo & AccountMetrics> {
  // X API v2: GET /2/users/by/username/{username}?user.fields=public_metrics
  // エラーハンドリング：基本的なtry-catchのみ
  // 成功時：アカウント情報とメトリクスを返す
}

// 自分のアカウント情報取得  
async getMyAccountInfo(): Promise<AccountInfo & AccountMetrics> {
  // X API v2: GET /2/users/me?user.fields=public_metrics
  // エラーハンドリング：基本的なtry-catchのみ
}

// アカウント情報をファイルに保存
private saveAccountInfo(accountData: AccountInfo & AccountMetrics): void {
  // data/account-info.yaml に保存
}
```

### 3. 設定ファイル構造 (data/account-info.yaml)

```yaml
# 初期ファイル構造を作成
account:
  username: "rnrnstar" 
  user_id: ""  # API取得後に更新
  display_name: ""  # API取得後に更新
  verified: false  # API取得後に更新

current_metrics:
  followers_count: 0
  following_count: 0  
  tweet_count: 0
  listed_count: 0
  last_updated: 0

history:
  # 過去のメトリクス履歴（直近10件のみ保持）
  - timestamp: 0
    followers_count: 0
```

## 🚫 実装禁止事項

- 統計分析機能（平均、成長率計算など）
- 複雑なリトライ機構
- 詳細なエラーログシステム  
- 複数アカウント対応
- 高度なキャッシュ機能

## ✅ 実装要件

### 技術要件
- TypeScript strict mode 準拠
- 既存のコードスタイルを維持
- X API v2 Bearer Token認証使用
- エラー時は基本的なconsole.errorのみ

### 品質要件  
- 実装完了後 `npm run check-types` が成功すること
- 既存テストが通ること
- lint エラーがないこと

### MVP準拠
- 最小限の機能実装（100行程度）
- シンプルな構造
- 直感的な使用方法

## 📁 出力管理規則

**🚨 ROOT DIRECTORY POLLUTION PREVENTION 必須**

- **禁止**: ルートディレクトリへの一時ファイル・分析ファイル出力
- **承認場所**: `tasks/20250721_113658/outputs/` のみ使用
- **命名規則**: `TASK-001-{name}-output.{ext}` 形式

## 🧪 テスト方法

実装完了後、以下で動作確認：

```typescript
// 簡単な動作確認コード（出力ディレクトリに保存）
const client = new SimpleXClient(process.env.X_API_KEY || '');
const accountInfo = await client.getUserByUsername('rnrnstar');
console.log('Account Info:', accountInfo);
```

## 📋 完了条件

1. ✅ 型定義追加完了
2. ✅ x-client.ts メソッド追加完了  
3. ✅ account-info.yaml 構造作成完了
4. ✅ TypeScript型チェック成功
5. ✅ 基本動作確認完了

## 💡 実装のヒント

- 既存の `post()` メソッドの構造を参考にする
- `fetch` の使用方法は既存コードと統一する  
- YAML操作は既存の `yaml-utils.ts` を活用する
- テストモード対応も既存パターンに従う

---

**Remember**: MVPの本質は価値の素早い提供です。完璧さより実用性を重視してください。