# pnpm-npm ハイブリッド環境ガイド

## 概要
本プロジェクトでは、開発環境でpnpm、本番環境（AWS Amplify）でnpmを使用するハイブリッドアプローチを採用しています。

## 開発環境（pnpm）

### インストール
```bash
pnpm install
```

### パッケージ追加
```bash
pnpm add <package-name>
pnpm add -D <package-name>  # 開発依存関係
```

### ワークスペース内のパッケージ追加
```bash
pnpm add <package-name> --filter <workspace-name>
```

## 本番環境（npm）

本番環境（AWS Amplify）では自動的にnpmが使用されます。
特別な操作は不要です。

## 注意事項

1. **lockファイル**: `pnpm-lock.yaml`のみをコミット。`package-lock.json`は自動生成
2. **CI/CD**: Amplifyビルド時に自動的にpackage-lock.jsonが生成される
3. **依存関係の追加**: 必ずpnpmを使用（`pnpm add`）

## トラブルシューティング

### ローカルでnpmの動作を確認したい場合
```bash
npm run generate:npm-lock
npm ci
```