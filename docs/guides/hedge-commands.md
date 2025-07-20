# Hedge System 起動コマンド

## 🚀 開発時の起動方法

### メインコマンド（推奨）

```bash
# プロジェクトルートから
pnpm dev:hedge
```

これで以下が自動的に起動します：
- ✅ Tauriデスクトップアプリ
- ✅ Next.js開発サーバー（ポート3000）
- ✅ Named Pipe サーバー
- ✅ EA統合ブリッジ

### その他のコマンド

| コマンド | 説明 | 用途 |
|----------|------|------|
| `pnpm dev:hedge` | Tauri + 全サーバー起動 | **MT5接続開発時** |
| `pnpm dev:hedge:web` | Next.jsのみ起動 | Web UI開発時 |
| `pnpm tauri:dev` | hedge-systemディレクトリから起動 | 直接起動時 |

## ✅ MT5接続確認

1. **起動確認**
   ```bash
   pnpm dev:hedge
   ```

2. **コンソールログ確認**
   ```
   ✅ Named Pipe server started successfully
   📌 EA接続: パイプ名 \\.\ pipe\HedgeSystemPipe
   ```

3. **接続確認**
   - Named Pipe通信でEA接続確認

## 🎯 配布時

```bash
pnpm tauri:build
```

生成される実行ファイル：
- Windows: `HedgeSystem.exe`
- すべてのサーバーが内蔵
- ダブルクリックで起動完了

## ⚠️ 注意事項

- `pnpm dev:hedge:web`はMT5接続不可（Named Pipeサーバーなし）
- 開発時は必ず`pnpm dev:hedge`を使用
- Named Pipe通信で高速・安定接続

## 📁 EAファイル

シンプルな構造（eaディレクトリ直下）：
- `HedgeSystemSimple.mq5` - MT5本番用
- `TestConnectionSimple.mq5` - MT5テスト用
- `HedgeSystemSimple.mq4` - MT4本番用
- `TestConnectionSimple.mq4` - MT4テスト用