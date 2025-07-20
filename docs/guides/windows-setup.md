# Windows環境でのセットアップガイド

## 概要

このドキュメントでは、Windows環境でArbitrage Assistantプロジェクトを正しく動作させるための設定方法を説明します。

## 前提条件

- Windows 10/11
- Node.js 20.14.0以上
- Git for Windows（改行コード自動変換を有効にする）
- Windows Terminal（推奨）またはPowerShell

## セットアップ手順

### 1. リポジトリのクローン

```powershell
git clone https://github.com/yourusername/ArbitrageAssistant.git
cd ArbitrageAssistant
```

### 2. 依存関係のインストール

```powershell
# メインの依存関係をインストール
pnpm install

# 各ワークスペースの依存関係を確実にインストール
cd apps/hedge-system
pnpm install
cd ../..
```

### 3. 開発環境の起動

#### 方法1: Windows専用npm scripts（推奨）

```powershell
# hedge-systemの開発
pnpm run dev:hedge:win

# パッケージの開発
pnpm run dev:packages:win
```

**注意**: Windows環境では`NODE_ENV=production`のような環境変数設定やUTF-8エンコーディング関連のエラーが発生する可能性があります。`pnpm run dev:hedge:win`はこれらの問題を自動的に解決します。

#### 方法2: PowerShellスクリプト

```powershell
# PowerShellで実行権限を設定してから実行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# hedge-systemの開発
.\dev-hedge-windows.ps1

# パッケージの開発
.\dev-packages-windows.ps1
```

## 完全リセット手順（問題が解決しない場合）

問題が解決しない場合は、以下の手順で手動リセットを実行してください：

1. **管理者権限でコマンドプロンプトを開く**
   - スタートメニューで「cmd」を検索
   - 右クリックして「管理者として実行」

2. **手動リセット手順**
   ```batch
   cd C:\Users\cloud\github\ArbitrageAssistant
   
   # node_modulesを削除
   rmdir /s /q node_modules
   
   # パッケージキャッシュをクリア
   pnpm store prune
   
   # 依存関係を再インストール
   pnpm install
   ```

3. **hedge-systemを起動**
   ```batch
   pnpm run dev:hedge:win
   ```

## トラブルシューティング

### モジュール解決エラー

「Module not found: Can't resolve '@workspace/ui/components/...'」エラーが発生する場合：

1. **UIパッケージを再ビルド**
   ```powershell
   pnpm run build:ui
   ```

2. **node_modulesを再インストール**
   ```powershell
   rimraf node_modules
   pnpm install
   ```

3. **Turbopackを無効化**
   - hedge-systemはWindows環境では自動的にturbopackを無効化します
   - これによりモジュール解決の問題を回避します

### UTF-8エラーが発生する場合

「Windows stdio in console mode does not support writing non-UTF-8 byte sequences」エラーが発生する場合：

1. **コンソールのコードページを変更**
   ```powershell
   chcp 65001
   ```

2. **環境変数を設定**
   ```powershell
   $env:LANG = "en_US.UTF-8"
   ```

3. **Windows Terminal を使用**（cmd.exeより推奨）

### システムレベルの解決策

1. **Windows言語設定の変更**
   - コントロールパネル → 地域 → 管理 → システムロケールの変更
   - 「ベータ：ワールドワイド言語サポートでUnicode UTF-8を使用」をチェック
   - システム再起動が必要

### 改行コードの問題

プロジェクトには`.gitattributes`ファイルが含まれており、改行コードを自動的に管理します。
しかし、Gitの設定によっては手動で設定が必要な場合があります：

```powershell
# LF改行コードを保持する設定
git config core.autocrlf input
```

## Windows固有の注意事項

1. **パス区切り文字**
   - プロジェクトは自動的にWindows/Unix両方のパス形式に対応

2. **シェルスクリプト**
   - `.sh`ファイルはWindows環境では直接実行できません
   - 代わりにNode.js版のスクリプトを使用します（例：`sync-amplify-outputs.js`）

3. **ファイル監視**
   - Windows環境では`CHOKIDAR_USEPOLLING=true`が自動的に設定されます

## 推奨ツール

- **Windows Terminal**: より良いUTF-8サポート
- **Visual Studio Code**: クロスプラットフォーム対応のエディタ
- **Git Bash**: Unix系コマンドが必要な場合

## サポート

問題が解決しない場合は、以下の情報と共にイシューを作成してください：

- Windows バージョン
- Node.js バージョン（`node -v`）
- pnpm バージョン（`pnpm -v`）
- エラーメッセージの全文
- 実行したコマンド