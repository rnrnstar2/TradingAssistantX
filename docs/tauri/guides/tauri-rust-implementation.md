# Tauri Rust実装ガイド

## 📋 概要
Tauri v2でRustバックエンドを実装する際の一般的なエラーを回避するための実践的なガイドライン。

## 🎯 原則
1. **コンパイル時エラーの早期検出** - cargo checkを頻繁に実行
2. **型安全性の確保** - Result型の適切な処理
3. **クロスプラットフォーム対応** - OS固有のAPIは条件付きコンパイル

---

## 🚨 よくあるエラーと対処法

### 1. Tauri Emitterトレイトのインポート忘れ

**❌ エラーになるコード**
```rust
use tauri::{Manager, AppHandle};

// emit()メソッドが見つからないエラー
app.emit("event-name", payload)?;
```

**✅ 正しいコード**
```rust
use tauri::{Manager, AppHandle, Emitter};  // Emitterトレイトを必ずインポート

app.emit("event-name", payload)?;
```

### 2. Serdeトレイトの適用忘れ

**❌ エラーになるコード**
```rust
#[derive(Serialize)]
pub struct ErrorEvent {
    pub error: String,
}

// Cloneトレイトがないためemit()でエラー
app.emit("error", error_event)?;
```

**✅ 正しいコード**
```rust
#[derive(Serialize, Clone)]  // Tauriのemitに必要なトレイトを追加
pub struct ErrorEvent {
    pub error: String,
}
```

### 3. 非同期処理とMutexGuard

**❌ エラーになるコード**
```rust
#[tauri::command]
async fn my_command(state: State<'_, AppState>) -> Result<String, String> {
    let mut data = state.data.lock().unwrap();
    
    // MutexGuardがawaitをまたぐとSendトレイトエラー
    let result = async_operation().await;
    
    *data = result;
    Ok("Done".to_string())
}
```

**✅ 正しいコード**
```rust
#[tauri::command]
async fn my_command(state: State<'_, AppState>) -> Result<String, String> {
    // MutexGuardのスコープを限定
    {
        let data = state.data.lock().unwrap();
        // 必要な値をコピー
        let current_value = data.clone();
    }
    
    // awaitはMutexGuardのスコープ外で実行
    let result = async_operation().await;
    
    // 更新が必要な場合は再度ロック
    {
        let mut data = state.data.lock().unwrap();
        *data = result;
    }
    
    Ok("Done".to_string())
}
```

### 4. Windows API使用時の注意点

**❌ エラーになるコード**
```rust
// 1. 不正なバイト文字列エスケープ
let pipe_name = b"\\\\.\\\pipe\\MyPipe\0";  // \pは無効なエスケープ

// 2. 戻り値の未処理
let pipe = CreateNamedPipeA(...);
if pipe == INVALID_HANDLE_VALUE {  // Result<HANDLE, Error>との比較エラー
```

**✅ 正しいコード**
```rust
// 1. 正しいバイト文字列エスケープ
let pipe_name = b"\\\\.\\pipe\\MyPipe\0";  // \\でエスケープ

// 2. Result型の適切な処理
let pipe = unsafe { CreateNamedPipeA(...) };
let pipe = match pipe {
    Ok(handle) if handle != INVALID_HANDLE_VALUE => handle,
    _ => return Err("Failed to create pipe".to_string()),
};
```

### 5. Windows crate機能の適切な指定

**❌ エラーになるコード（Cargo.toml）**
```toml
[dependencies]
windows = { version = "0.48", features = [
    "Win32_Foundation",
    "Win32_Security_SecurityBaseApi"  # 存在しない機能
]}
```

**✅ 正しいコード**
```toml
[dependencies]
windows = { version = "0.48", features = [
    "Win32_Foundation",
    "Win32_Security",
    "Win32_Storage_FileSystem",
    "Win32_System_Pipes",
    "Win32_System_IO",
    "Win32_System_Threading"
]}
```

### 6. アイコンファイルの生成

**❌ エラーになる手順**
```bash
# src-tauriディレクトリから実行するとパスエラー
cd src-tauri
pnpm tauri icon
```

**✅ 正しい手順**
```bash
# プロジェクトルートから実行
cd apps/hedge-system
pnpm tauri icon app/icon.png
```

---

## 📝 実装チェックリスト

### Tauriコマンド実装時
- [ ] `#[tauri::command]`属性を追加
- [ ] 非同期関数の場合、`Send`トレイトを考慮
- [ ] State使用時はMutexGuardのスコープに注意
- [ ] エラー型は`String`または`serde::Serialize`を実装

### Windows API使用時
- [ ] `cfg(target_os = "windows")`で条件付きコンパイル
- [ ] windows crateの適切な機能をCargo.tomlに追加
- [ ] API関数の戻り値`Result<T, Error>`を適切に処理
- [ ] 文字列リテラルのエスケープに注意

### 型定義時
- [ ] Tauriに渡す構造体には`Serialize`, `Deserialize`を実装
- [ ] `emit()`で使用する場合は`Clone`も必要
- [ ] エラー型には`Debug`を実装

---

## 🔧 デバッグのヒント

### cargo checkの活用
```bash
# 頻繁に実行してコンパイルエラーを早期発見
cargo check

# 警告も含めて確認
cargo clippy

# フォーマット確認
cargo fmt -- --check
```

### エラーメッセージの読み方
1. **trait bound `X: Y` is not satisfied**
   - 必要なトレイトをインポートまたは実装

2. **future cannot be sent between threads safely**
   - MutexGuardなど`!Send`な型がawaitをまたいでいる

3. **method not found**
   - 必要なトレイトがスコープにない（use文の確認）

---

## 📚 関連ドキュメント

### 実装分析
- **[Plugin Architecture分析](../analysis/plugin-architecture.md)** - プラグインシステムの詳細分析
- **[Window & WebView API分析](../analysis/window-webview-api.md)** - ウィンドウ管理・イベント処理の分析

### 実装ガイド
- **[Windows API Rust実装ガイド](./windows-api-rust.md)** - Windows API使用の基本パターン
- **[Named Pipe実装ガイド](./named-pipe-implementation.md)** - Named Pipeの詳細実装

### 外部資料
- [Tauri v2 Documentation](https://v2.tauri.app/)
- [Windows-rs Documentation](https://microsoft.github.io/windows-docs-rs/)
- [Rust Async Book](https://rust-lang.github.io/async-book/)