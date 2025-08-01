# TASK-002: .envファイル読み込み機能追加指示書

## ✅ 実装概要

**目的**: scripts/fetch-my-tweets.tsに.envファイル読み込み機能を追加  
**権限**: Worker権限必須  
**対象ファイル**: `scripts/fetch-my-tweets.ts`

## 🎯 要求仕様

### 現在のスクリプト問題点
- 環境変数を直接`process.env`から取得
- `.env`ファイルからの自動読み込み未対応
- ユーザーが手動で環境変数設定する必要がある

### 修正要求
- `.env`ファイルから`X_USERNAME`と`KAITO_API_TOKEN`を自動読み込み
- 既存のmain.ts、dev.tsと同じdotenv実装パターンを適用

## 📋 実装手順

### 1. dotenvインポート追加

**ファイル**: `scripts/fetch-my-tweets.ts`

**修正箇所**: ファイル先頭に追加
```typescript
import { config } from 'dotenv';
import { KaitoApiClient } from '../src/kaito-api';
import { DataManager } from '../src/shared/data-manager';
import type { Tweet } from '../src/kaito-api/endpoints/read-only/types';

// .envファイル読み込み
config();
```

### 2. 既存実装パターンの参考

**参考ファイル**: `src/main.ts`、`src/dev.ts`
```typescript
// 既存実装例（main.ts）
import { config } from 'dotenv';

// .envファイルを読み込み
config();
```

### 3. 環境変数読み込み確認強化

**現在のコード**:
```typescript
constructor() {
  // 環境変数X_USERNAMEから取得
  this.username = process.env.X_USERNAME!;
  if (!this.username) {
    throw new Error('X_USERNAME環境変数が設定されていません');
  }
  
  this.kaitoClient = new KaitoApiClient();
  this.dataManager = new DataManager();
}
```

**修正不要**: 既存のエラーチェックは維持

## 🧪 テスト要件

### 1. .envファイル作成
```bash
# プロジェクトルートに.envファイル作成
echo "X_USERNAME=your_twitter_username" >> .env
echo "KAITO_API_TOKEN=your_kaito_api_token" >> .env
```

### 2. 動作確認
```bash
# .envファイルから読み込まれることを確認
npx tsx scripts/fetch-my-tweets.ts
```

### 3. エラーケーステスト
```bash
# .envファイル未設定時のエラー確認
mv .env .env.backup
npx tsx scripts/fetch-my-tweets.ts
# → "X_USERNAME環境変数が設定されていません" エラーが表示されること

# .envファイル復元
mv .env.backup .env
```

## ⚠️ 重要な注意事項

### 1. 既存機能の保持
- 既存のエラーハンドリングは変更しない
- process.envからの読み込み方法は変更しない
- dotenv.config()のみ追加

### 2. import順序
```typescript
// 正しい順序
import { config } from 'dotenv';
import { KaitoApiClient } from '../src/kaito-api';
// ...

// .envファイル読み込み（インポート直後）
config();
```

### 3. 依存関係確認
- dotenvパッケージは既にpackage.jsonに存在することを確認
- 新規依存関係の追加は不要

## 📊 期待される動作

### 修正前（現在）
```bash
# 環境変数手動設定が必要
export X_USERNAME="username"
export KAITO_API_TOKEN="token"
npx tsx scripts/fetch-my-tweets.ts
```

### 修正後（期待）
```bash
# .envファイルのみで動作
# .env内容:
# X_USERNAME=username
# KAITO_API_TOKEN=token

npx tsx scripts/fetch-my-tweets.ts  # 自動で.envから読み込み
```

## ✅ 完了基準

### 必須実装項目
- [ ] dotenvインポート追加
- [ ] config()呼び出し追加
- [ ] .envファイルからの読み込み動作確認
- [ ] エラーハンドリング動作確認（.env未設定時）

### テスト項目
- [ ] .envファイル設定時の正常動作
- [ ] .envファイル未設定時の適切なエラー表示
- [ ] 既存の環境変数手動設定との互換性維持

## 🔧 実装後の確認コマンド

```bash
# 1. .envファイル作成（サンプル）
cat > .env << EOF
X_USERNAME=test_username
KAITO_API_TOKEN=test_token
EOF

# 2. 動作確認
npx tsx scripts/fetch-my-tweets.ts

# 3. エラーケース確認
mv .env .env.backup
npx tsx scripts/fetch-my-tweets.ts
mv .env.backup .env
```

## 📝 修正対象ファイル

**対象**: `scripts/fetch-my-tweets.ts`  
**修正行数**: 2行追加のみ  
**影響範囲**: スクリプト初期化時のみ  
**破壊的変更**: なし（既存機能は完全保持）

---

**実装時間目安**: 5分  
**テスト時間目安**: 5分  
**合計**: 10分程度の簡単な修正

**🎯 実装者**: Worker権限で実装してください