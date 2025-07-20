# Windows API Rust実装ガイド

## 📋 概要
TauriアプリケーションでWindows APIを使用する際の実装ガイドとベストプラクティス。

## 🎯 原則
1. **型安全性** - windows-rsクレートの型システムを活用
2. **エラーハンドリング** - Result型の適切な処理
3. **メモリ安全性** - unsafeブロックの最小化

---

## 🔧 基本設定

### Cargo.toml設定
```toml
[dependencies]
windows = { version = "0.48", features = [
    "Win32_Foundation",
    "Win32_System_Pipes",
    "Win32_Storage_FileSystem",
    "Win32_Security",
    "Win32_System_IO",
    "Win32_System_Threading"
]}
```

### 条件付きコンパイル
```rust
#[cfg(target_os = "windows")]
mod windows_specific {
    // Windows専用コード
}

#[cfg(not(target_os = "windows"))]
mod cross_platform {
    // 他プラットフォーム用のスタブ実装
}
```

---

## 🚨 よくある実装パターン

### 1. Named Pipe作成

💡 **Named Pipeの詳細な実装**: [Named Pipe実装ガイド](./named-pipe-implementation.md)を参照

**✅ 基本パターン**
```rust
use windows::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE};
use windows::Win32::System::Pipes::CreateNamedPipeA;
use windows::core::PCSTR;

pub fn create_named_pipe() -> Result<HANDLE, String> {
    // 正しいエスケープ: \\.\pipe\PipeName
    let pipe_name = b"\\\\.\\pipe\\MyPipe\0";
    
    let pipe = unsafe {
        CreateNamedPipeA(
            PCSTR::from_raw(pipe_name.as_ptr()),
            // その他のパラメータは実装ガイドを参照
        )
    };
    
    match pipe {
        Ok(handle) if handle != INVALID_HANDLE_VALUE => Ok(handle),
        _ => Err("Failed to create named pipe".to_string()),
    }
}
```

### 2. ファイル読み書き

**✅ 正しい実装**
```rust
use windows::Win32::Storage::FileSystem::{ReadFile, WriteFile};
use std::ffi::c_void;

pub fn read_from_handle(handle: HANDLE) -> Result<Vec<u8>, String> {
    let mut buffer = vec![0u8; 8192];
    let mut bytes_read = 0u32;
    
    let success = unsafe {
        ReadFile(
            handle,
            Some(buffer.as_mut_ptr() as *mut c_void),
            buffer.len() as u32,
            Some(&mut bytes_read),
            None,
        )
    };
    
    if success.is_ok() && bytes_read > 0 {
        buffer.truncate(bytes_read as usize);
        Ok(buffer)
    } else {
        Err("Failed to read data".to_string())
    }
}

pub fn write_to_handle(handle: HANDLE, data: &[u8]) -> Result<(), String> {
    let mut bytes_written = 0u32;
    
    let success = unsafe {
        WriteFile(
            handle,
            Some(data),
            Some(&mut bytes_written),
            None,
        )
    };
    
    if success.is_ok() && bytes_written == data.len() as u32 {
        Ok(())
    } else {
        Err("Failed to write data".to_string())
    }
}
```

### 3. ハンドルのクリーンアップ

**✅ 正しい実装**
```rust
use windows::Win32::Foundation::CloseHandle;

pub struct SafeHandle(HANDLE);

impl Drop for SafeHandle {
    fn drop(&mut self) {
        if self.0 != INVALID_HANDLE_VALUE {
            unsafe { let _ = CloseHandle(self.0); }
        }
    }
}

impl SafeHandle {
    pub fn new(handle: HANDLE) -> Self {
        SafeHandle(handle)
    }
    
    pub fn get(&self) -> HANDLE {
        self.0
    }
}
```

### 4. エラーコードの取得

**✅ 正しい実装**
```rust
use windows::Win32::Foundation::GetLastError;

pub fn get_windows_error() -> String {
    let error_code = unsafe { GetLastError() };
    format!("Windows error: {:?}", error_code)
}
```

---

## 📝 文字列処理

### バイト文字列リテラル
```rust
// ❌ 間違い: \pは無効なエスケープ
let path = b"\\\\.\\\pipe\\MyPipe\0";

// ✅ 正解: 正しいエスケープ
let path = b"\\\\.\\pipe\\MyPipe\0";

// パス要素の説明:
// \\\\.\\  -> \\.\  (Windowsの特殊デバイスプレフィックス)
// pipe     -> pipe  (Named Pipeディレクトリ)
// \\       -> \     (区切り文字)
// MyPipe   -> MyPipe (パイプ名)
// \0       -> NULL終端
```

### PCSTR型への変換
```rust
use windows::core::PCSTR;

// バイト文字列から
let bytes = b"Hello\0";
let pcstr = PCSTR::from_raw(bytes.as_ptr());

// &strから（NULL終端に注意）
let string = "Hello\0";
let pcstr = PCSTR::from_raw(string.as_ptr());
```

---

## 🔍 デバッグのヒント

### 1. エラーコードの確認
```rust
if result.is_err() {
    let error = unsafe { GetLastError() };
    eprintln!("Windows error code: {:?}", error);
}
```

### 2. ハンドル値の検証
```rust
match handle_result {
    Ok(handle) => {
        if handle == INVALID_HANDLE_VALUE {
            eprintln!("Got INVALID_HANDLE_VALUE");
        }
    }
    Err(e) => eprintln!("Error creating handle: {:?}", e),
}
```

### 3. 権限問題のトラブルシューティング
- 管理者権限でアプリケーションを実行
- アンチウイルスソフトの除外設定を確認
- Windows Defenderのリアルタイム保護を一時的に無効化

---

## ⚡ パフォーマンスのヒント

1. **バッファサイズの最適化**
   
   統一されたバッファサイズ設定を使用してください：
   
   📋 **統一バッファサイズ**: [`docs/common/system-constants.md`](../../common/system-constants.md)
   
   ```rust
   const BUFFER_SIZE: u32 = 65536;  // 64KB - 大容量データ転送用
   // または
   const BUFFER_SIZE: u32 = 32768;  // 32KB - MVP推奨（メモリ効率とパフォーマンスのバランス）
   ```

2. **非同期I/Oの活用**
   ```rust
   use windows::Win32::Storage::FileSystem::FILE_FLAG_OVERLAPPED;
   // OVERLAPPED構造体を使用した非同期処理
   ```

3. **エラーチェックの最小化**
   ```rust
   // ホットパスではGetLastError()の呼び出しを最小限に
   ```

---

## 📚 関連ドキュメント

### 実装ガイド
- **[Named Pipe実装ガイド](./named-pipe-implementation.md)** - Named Pipeの詳細な実装方法
- **[Tauri Rust実装ガイド](./tauri-rust-implementation.md)** - Tauri固有のエラーと対処法

### 外部資料
- [Windows-rs Documentation](https://microsoft.github.io/windows-docs-rs/)
- [Named Pipes Documentation](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes)
- [Win32 API Reference](https://docs.microsoft.com/en-us/windows/win32/)