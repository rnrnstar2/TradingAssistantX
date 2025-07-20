# Tauri V2トラブルシューティングガイド

## 📋 概要

Tauri V2実装で発生する可能性のある問題と、その解決手順を体系的に整理。分析結果を基にした実践的なトラブルシューティング手順。

## 🚨 よくある問題と解決手順

### 1. プラグイン関連の問題

#### 問題: プラグインが見つからない
```
error: could not find `tauri_plugin_dialog` in `tauri`
```

**原因**: プラグインがCargo.tomlに追加されていない、またはバージョン不整合

**解決手順**:
1. **Cargo.toml確認**
```bash
cd apps/hedge-system/src-tauri
grep "tauri-plugin" Cargo.toml
```

2. **必要なプラグインを追加**
```toml
tauri-plugin-dialog = "2.0.0"
tauri-plugin-fs = "2.0.0"
tauri-plugin-notification = "2.0.0"
```

3. **初期化コード確認**（src/lib.rs）
```rust
.plugin(tauri_plugin_dialog::init())
.plugin(tauri_plugin_fs::init())
.plugin(tauri_plugin_notification::init())
```

#### 問題: RC版プラグインの警告
```
warning: package `tauri-plugin-log` uses unstable version `2.0.0-rc`
```

**解決方針**: 現在は問題なし。安定版リリース後に以下で対応
```toml
# 将来の安定版リリース時
tauri-plugin-log = "2.0.0"  # RC削除
```

### 2. ビルド関連の問題

#### 問題: cargo コマンドが見つからない
```
bash: cargo: command not found
```

**原因**: Rustツールチェーンが未インストール

**解決手順**:
1. **WSL環境でのRustインストール**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

2. **必要な依存関係インストール**
```bash
sudo apt update
sudo apt install build-essential libssl-dev pkg-config
```

3. **ビルドテスト実行**
```bash
cd apps/hedge-system
npm run tauri build
```

#### 問題: Windows API関連エラー
```
error: failed to resolve: could not find `Win32_System_Pipes` in `windows`
```

**原因**: windows crateの機能指定不足

**解決手順**:
1. **Cargo.toml確認**
```toml
windows = { version = "0.48", features = [
    "Win32_Foundation",
    "Win32_Security",
    "Win32_Storage_FileSystem",
    "Win32_System_Pipes",      # 必要
    "Win32_System_IO",
    "Win32_System_Threading"
]}
```

### 3. Named Pipe関連の問題

#### 問題: Named Pipe作成失敗
```
Error: Failed to create named pipe: Access denied
```

**原因**: 権限不足またはパイプ名重複

**解決手順**:
1. **管理者権限で実行**
```bash
# Windows側で管理者権限でアプリを起動
```

2. **パイプ名の確認**
```rust
// named_pipe.rs内で確認
let pipe_name = b"\\\\.\\pipe\\HedgeSystemBridge\0";
```

3. **既存パイプの確認**
```bash
# 他のインスタンスが起動していないか確認
```

#### 問題: データ受信エラー
```
Error: Failed to read from named pipe: Broken pipe
```

**原因**: EA側の接続断またはデータ形式不整合

**解決手順**:
1. **EA側ログ確認**
```
// MT4/MT5のExpert Advisorログをチェック
```

2. **パイプ状態確認**
```rust
// named_pipe.rs内でログ出力追加
log::info!("Pipe status: {:?}", pipe_status);
```

3. **再接続処理確認**
```rust
// 自動再接続ロジックの動作確認
```

### 4. フロントエンド連携の問題

#### 問題: イベント送信エラー
```
Error: Failed to emit event: Window not found
```

**原因**: ウィンドウが初期化される前のイベント送信

**解決手順**:
1. **イベント送信タイミング調整**
```rust
// ウィンドウ確認後に送信
if let Some(window) = app.get_webview_window("main") {
    window.emit("event-name", payload)?;
} else {
    app.emit("event-name", payload)?;  // フォールバック
}
```

2. **フロントエンド側でイベント待機**
```typescript
// React側でイベントリスナー設定
useEffect(() => {
    const unlisten = listen('event-name', (event) => {
        // イベント処理
    });
    return () => unlisten();
}, []);
```

### 5. アップデート機能の問題

#### 問題: アップデートチェック失敗
```
Error: Update check failed: Network error
```

**原因**: ネットワーク接続またはアップデートサーバー問題

**解決手順**:
1. **ネットワーク接続確認**
```bash
ping github.com
```

2. **アップデート設定確認**（tauri.conf.json）
```json
{
  "updater": {
    "active": true,
    "endpoints": [...]
  }
}
```

3. **手動アップデートテスト**
```rust
// メニューから手動チェック実行
```

## 🔧 デバッグ手順

### 1. ログ確認手順

#### Tauriログ確認
```bash
# 開発時ログ
cd apps/hedge-system
npm run tauri dev

# ログレベル調整（src/lib.rs）
.level(log::LevelFilter::Debug)  # より詳細なログ
```

#### システムログ確認
```bash
# Windows イベントビューアー
# アプリケーションログをチェック
```

### 2. ビルド検証手順

#### 段階的ビルド確認
```bash
# 1. Rust構文チェック
cd apps/hedge-system/src-tauri
cargo check

# 2. 警告チェック
cargo clippy

# 3. フォーマットチェック
cargo fmt -- --check

# 4. 完全ビルド
cd ../
npm run tauri build
```

### 3. 動作確認手順

#### 基本機能テスト
```
1. アプリ起動確認
2. MT Bridge起動確認
3. Named Pipe接続確認
4. イベント送受信確認
5. メニュー動作確認
```

#### 統合テスト
```
1. EA接続テスト
2. リアルタイムデータ受信テスト
3. アップデート機能テスト
4. エラーハンドリングテスト
```

## 📋 緊急時対応手順

### 1. アプリが起動しない場合

**段階的診断**:
1. **ログファイル確認**
2. **設定ファイル確認**（tauri.conf.json）
3. **依存関係確認**（package.json, Cargo.toml）
4. **前回動作していたコミットに戻す**

### 2. Named Pipe接続が失敗する場合

**緊急対応**:
1. **アプリ再起動**
2. **EA再起動**
3. **システム再起動**
4. **ファイアウォール確認**

### 3. ビルドが失敗する場合

**緊急対応**:
1. **依存関係の再インストール**
```bash
cd apps/hedge-system
rm -rf node_modules
npm install
```

2. **Cargoキャッシュクリア**
```bash
cd src-tauri
cargo clean
```

## 📞 サポート情報

### 内部リソース
- **実装ガイド**: `docs/tauri/guides/tauri-v2-implementation-best-practices.md`
- **一般的なRustエラー**: `docs/tauri/guides/tauri-rust-implementation.md`
- **Named Pipe実装**: `apps/hedge-system/src-tauri/src/named_pipe.rs`

### 外部リソース
- **Tauri V2 Documentation**: https://v2.tauri.app/
- **Windows-rs Documentation**: https://microsoft.github.io/windows-docs-rs/
- **Rust Error Index**: https://doc.rust-lang.org/error-index.html

## 📝 問題報告テンプレート

```
### 環境情報
- OS: [Windows/Linux/macOS]
- Tauriバージョン: [バージョン]
- Rustバージョン: [バージョン]

### 問題の詳細
- 発生状況: [具体的な操作]
- エラーメッセージ: [完全なエラーメッセージ]
- 期待される動作: [何が起こるべきか]

### 再現手順
1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

### ログ
```
[関連するログメッセージ]
```

---

**重要**: トラブルシューティング時は、必ず現在の動作を破壊しないよう段階的に対応し、各手順でバックアップを確保すること。