# TradingAssistantX テストガイド

## テスト設計方針

本プロジェクトのテストは**実APIを使用した統合テスト**を基本としています。
ただし、APIコストとレート制限を考慮し、実行は必要な時に限定します。

## テスト実行方法

### 1. 通常のテスト実行（実APIスキップ）
```bash
pnpm test
```
- CI/CDや日常の開発で使用
- 実APIへの接続をスキップ
- 高速実行、コストなし

### 2. 実APIテスト実行
```bash
# 環境変数を設定して実行
KAITO_API_TOKEN=your-token pnpm test

# または.envファイルを使用
echo "KAITO_API_TOKEN=your-token" >> .env.test
pnpm test
```

### 3. 特定のテストのみ実行
```bash
# kaito-apiのみ
KAITO_API_TOKEN=your-token pnpm test tests/kaito-api

# 特定のファイル
pnpm test tests/kaito-api/core/client.test.ts
```

## 実APIテスト実行タイミング

- **プルリクエスト前**: 必ず実APIテストを実行
- **機能追加・修正後**: 関連する実APIテストを実行
- **リリース前**: 全実APIテストを実行
- **定期実行**: 週1回程度、APIの仕様変更検知のため

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| KAITO_API_TOKEN | Kaito API認証トークン | Kaitoテスト時 |
| TEST_TIMEOUT | テストタイムアウト（ミリ秒） | オプション |

## 注意事項

1. **APIコスト**: 実APIテストはコストが発生します
2. **レート制限**: 連続実行時は制限に注意
3. **環境変数管理**: APIキーは.gitignoreに含めること
4. **並列実行**: 実APIテストは並列実行を避ける

## テストのベストプラクティス

1. **新機能開発時**
   - まず実APIでテストを書く
   - 動作確認後、必要に応じてモックを追加

2. **バグ修正時**
   - 実APIで再現テストを書く
   - 修正後、実APIで動作確認

3. **リファクタリング時**
   - 既存の実APIテストで動作保証
   - 新しいテストも実APIベース

## トラブルシューティング

### 401 Unauthorizedエラー
```bash
# APIトークンが正しく設定されているか確認
echo $KAITO_API_TOKEN
```

### タイムアウトエラー
```bash
# タイムアウトを延長
TEST_TIMEOUT=30000 pnpm test
```

### レート制限エラー
```bash
# 実行間隔を空ける、または並列実行を無効化
pnpm test --no-parallel
```