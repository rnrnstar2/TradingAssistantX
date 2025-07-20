# Turborepoキャッシュ戦略ガイド

## 概要

このドキュメントでは、ArbitrageAssistantプロジェクトにおけるTurborepoのキャッシュ戦略について説明します。

## キャッシュレベル

### 1. ローカルキャッシュ
- **場所**: `.turbo/cache`
- **保持期間**: 自動管理（LRU）
- **サイズ制限**: デフォルト10GB

### 2. リモートキャッシュ（チーム開発用）
```bash
# 環境変数設定
TURBO_TOKEN=your_token_here
TURBO_TEAM=your_team_name
```

## キャッシュ最適化設定

### .turboignore
ビルドハッシュ計算から除外するファイル:
- ログファイル
- エディタ設定
- テスト結果
- 一時ファイル
- ドキュメント（README除く）

### turbo.jsonの最適化ポイント

#### 1. グローバル依存関係
```json
"globalDependencies": [
  "packages/shared-backend/amplify_outputs.json",
  ".env*",
  "package-lock.json"
]
```

#### 2. タスク固有の入力設定
```json
"build": {
  "inputs": [
    "$TURBO_DEFAULT$",
    ".env*",
    "amplify_outputs.json",
    "!**/*.test.*",
    "!**/*.spec.*"
  ]
}
```

#### 3. 出力ディレクトリの最適化
```json
"outputs": [
  "dist/**",
  "out/**", 
  ".next/**",
  "!.next/cache/**"
]
```

## CI/CDでのキャッシュ活用

### GitHub Actions設定
```yaml
- name: Cache Turbo
  uses: actions/cache@v4
  with:
    path: |
      .turbo
      node_modules/.cache/turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
```

## キャッシュコマンド

### キャッシュ状態確認
```bash
npx turbo run build --dry-run
```

### キャッシュクリア
```bash
# ローカルキャッシュクリア
npx turbo run clean:cache

# 完全クリア
rm -rf .turbo node_modules/.cache/turbo
```

### キャッシュヒット率向上のコツ

1. **一貫した環境変数**
   - 必要な環境変数のみturbo.jsonに定義
   - 不要な環境変数は除外

2. **適切な入力ファイル指定**
   - テストファイルはビルドから除外
   - 頻繁に変更されるファイルは最小限に

3. **出力の正確な指定**
   - 生成されるファイルを正確に指定
   - 不要なキャッシュファイルは除外

## パフォーマンス指標

### 目標値
- キャッシュヒット率: 80%以上
- ビルド時間短縮: 60%以上（キャッシュヒット時）
- CI/CD時間: 5分以内

### 計測方法
```bash
# キャッシュ統計表示
TURBO_RUN_SUMMARY=true npx turbo build
```

## トラブルシューティング

### キャッシュが効かない場合

1. **入力ファイルの確認**
   ```bash
   npx turbo run build --dry-run=json | jq '.tasks[].hash'
   ```

2. **環境変数の確認**
   - turbo.jsonのglobalEnvを確認
   - 不要な環境変数が含まれていないか

3. **キャッシュディレクトリの権限**
   ```bash
   ls -la .turbo
   chmod -R 755 .turbo
   ```

### リモートキャッシュの設定

1. **Vercel Remote Cache**（推奨）
   ```bash
   npx turbo login
   npx turbo link
   ```

2. **カスタムリモートキャッシュ**
   ```bash
   TURBO_API=https://your-cache-server.com
   TURBO_TOKEN=your-token
   ```

## ベストプラクティス

1. **定期的なキャッシュクリーンアップ**
   - 週1回程度、古いキャッシュをクリア
   - CI/CDでは定期的にフルビルド

2. **キャッシュサイズの監視**
   ```bash
   du -sh .turbo
   ```

3. **セキュリティ考慮事項**
   - シークレットはキャッシュに含めない
   - .env.localはキャッシュから除外

## まとめ

適切なキャッシュ戦略により:
- 開発効率の大幅向上
- CI/CD時間の短縮
- チーム全体の生産性向上

定期的にキャッシュ効率を見直し、継続的な最適化を行いましょう。