# Named Pipe実装ガイド（Rust + Windows）

## 📋 概要
WindowsのNamed Pipeを使用したプロセス間通信（IPC）の実装ガイド。MT4/MT5のEAとTauriアプリケーション間の通信に最適化。

## 🎯 Named Pipeの基本概念

### パイプ名の構造
```
\\.\pipe\PipeName
│ │ │    └── パイプの名前（任意）
│ │ └────── Pipeディレクトリ
│ └──────── ドット（ローカルマシン）
└────────── Windowsの特殊デバイスプレフィックス
```

### サーバー/クライアントモデル
- **サーバー**: CreateNamedPipe()でパイプを作成
- **クライアント**: CreateFile()でパイプに接続

---

## 🔧 実装例

### 1. サーバー側実装（Tauri）

```rust
use windows::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE, GENERIC_READ, GENERIC_WRITE, BOOL};
use windows::Win32::Storage::FileSystem::{FILE_FLAGS_AND_ATTRIBUTES, ReadFile, WriteFile};
use windows::Win32::System::Pipes::{CreateNamedPipeA, ConnectNamedPipe, PIPE_TYPE_BYTE, PIPE_WAIT};
use windows::core::PCSTR;
use std::ffi::c_void;

pub struct NamedPipeServer {
    pipe_name: Vec<u8>,
    buffer_size: u32,
}

impl NamedPipeServer {
    pub fn new(name: &str) -> Self {
        // 正しいパス形式: \\.\pipe\name
        let pipe_name = format!("\\\\.\\pipe\\{}\0", name).into_bytes();
        Self {
            pipe_name,
            buffer_size: 8192,
        }
    }
    
    pub async fn run(&self) -> Result<(), String> {
        loop {
            // パイプインスタンス作成
            let pipe = self.create_pipe_instance()?;
            
            // クライアント接続待機
            self.wait_for_connection(pipe)?;
            
            // 通信処理（別スレッドで実行推奨）
            tokio::spawn(async move {
                if let Err(e) = handle_client(pipe).await {
                    eprintln!("Client handling error: {}", e);
                }
                // ハンドルは自動的にクローズ
                unsafe { let _ = windows::Win32::Foundation::CloseHandle(pipe); }
            });
        }
    }
    
    fn create_pipe_instance(&self) -> Result<HANDLE, String> {
        let pipe = unsafe {
            CreateNamedPipeA(
                PCSTR::from_raw(self.pipe_name.as_ptr()),
                FILE_FLAGS_AND_ATTRIBUTES((GENERIC_READ | GENERIC_WRITE).0),
                PIPE_TYPE_BYTE | PIPE_WAIT,
                1,                    // 最大インスタンス数
                self.buffer_size,     // 出力バッファ
                self.buffer_size,     // 入力バッファ
                0,                    // デフォルトタイムアウト
                None,                 // セキュリティ属性
            )
        };
        
        match pipe {
            Ok(handle) if handle != INVALID_HANDLE_VALUE => Ok(handle),
            _ => Err("Failed to create pipe instance".to_string()),
        }
    }
    
    fn wait_for_connection(&self, pipe: HANDLE) -> Result<(), String> {
        let connected = unsafe { ConnectNamedPipe(pipe, None) };
        
        if connected == BOOL(1) || unsafe { GetLastError() } == ERROR_PIPE_CONNECTED {
            Ok(())
        } else {
            Err("Failed to connect to client".to_string())
        }
    }
}

async fn handle_client(pipe: HANDLE) -> Result<(), String> {
    // メッセージ読み取り
    let request = read_message(pipe)?;
    
    // リクエスト処理
    let response = process_request(&request)?;
    
    // レスポンス送信
    write_message(pipe, &response)?;
    
    Ok(())
}
```

### 2. クライアント側実装（EA側から接続）

```rust
use windows::Win32::Storage::FileSystem::{CreateFileA, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL};

pub struct NamedPipeClient {
    pipe_name: Vec<u8>,
}

impl NamedPipeClient {
    pub fn new(name: &str) -> Self {
        let pipe_name = format!("\\\\.\\pipe\\{}\0", name).into_bytes();
        Self { pipe_name }
    }
    
    pub fn send_request(&self, message: &str) -> Result<String, String> {
        // パイプに接続
        let pipe = self.connect_to_pipe()?;
        
        // メッセージ送信
        write_message(pipe, message.as_bytes())?;
        
        // レスポンス受信
        let response = read_message(pipe)?;
        
        // ハンドルクローズ
        unsafe { let _ = CloseHandle(pipe); }
        
        String::from_utf8(response)
            .map_err(|e| format!("UTF-8 conversion error: {}", e))
    }
    
    fn connect_to_pipe(&self) -> Result<HANDLE, String> {
        let pipe = unsafe {
            CreateFileA(
                PCSTR::from_raw(self.pipe_name.as_ptr()),
                (GENERIC_READ | GENERIC_WRITE).0,
                FILE_SHARE_NONE,
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                INVALID_HANDLE_VALUE,
            )
        };
        
        match pipe {
            Ok(handle) if handle != INVALID_HANDLE_VALUE => Ok(handle),
            _ => Err("Failed to connect to pipe".to_string()),
        }
    }
}
```

### 3. 読み書き関数の実装

```rust
fn read_message(pipe: HANDLE) -> Result<Vec<u8>, String> {
    let mut buffer = vec![0u8; 8192];
    let mut bytes_read = 0u32;
    
    let success = unsafe {
        ReadFile(
            pipe,
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
        Err("Failed to read from pipe".to_string())
    }
}

fn write_message(pipe: HANDLE, data: &[u8]) -> Result<(), String> {
    let mut bytes_written = 0u32;
    
    let success = unsafe {
        WriteFile(
            pipe,
            Some(data),
            Some(&mut bytes_written),
            None,
        )
    };
    
    if success.is_ok() && bytes_written == data.len() as u32 {
        Ok(())
    } else {
        Err("Failed to write to pipe".to_string())
    }
}
```

---

## 🚨 エラーハンドリング

### 一般的なエラーコード
```rust
use windows::Win32::Foundation::{ERROR_PIPE_CONNECTED, ERROR_BROKEN_PIPE, ERROR_PIPE_BUSY};

fn handle_pipe_error(error_code: WIN32_ERROR) -> String {
    match error_code {
        ERROR_PIPE_CONNECTED => "Pipe already connected".to_string(),
        ERROR_BROKEN_PIPE => "Pipe disconnected".to_string(),
        ERROR_PIPE_BUSY => "All pipe instances busy".to_string(),
        _ => format!("Unknown error: {:?}", error_code),
    }
}
```

### タイムアウト処理
```rust
use tokio::time::{timeout, Duration};

async fn read_with_timeout(pipe: HANDLE, timeout_ms: u64) -> Result<Vec<u8>, String> {
    match timeout(Duration::from_millis(timeout_ms), async_read(pipe)).await {
        Ok(result) => result,
        Err(_) => Err("Read timeout".to_string()),
    }
}
```

---

## 📝 ベストプラクティス

### 1. メッセージフォーマット
```rust
// JSON形式を推奨
#[derive(Serialize, Deserialize)]
struct PipeMessage {
    action: String,
    data: serde_json::Value,
}

// 改行終端プロトコル
fn format_message(msg: &PipeMessage) -> Vec<u8> {
    let json = serde_json::to_string(msg).unwrap();
    format!("{}\n", json).into_bytes()
}
```

### 2. 複数インスタンス対応
```rust
const PIPE_UNLIMITED_INSTANCES: u32 = 255;

CreateNamedPipeA(
    // ...
    PIPE_UNLIMITED_INSTANCES,  // 複数クライアント対応
    // ...
)
```

### 3. セキュリティ考慮
```rust
// ローカルマシンのみからの接続を許可
// リモート接続が必要な場合は適切なセキュリティ設定を行う
```

---

## 🔍 デバッグツール

### 1. PipeList（Sysinternals）
```bash
# 現在のNamed Pipeを一覧表示
PipeList.exe
```

### 2. プロセスモニター
```bash
# パイプ操作をモニタリング
procmon.exe /filter "Path contains pipe"
```

### 3. ログ出力
```rust
log::debug!("Creating pipe: {:?}", String::from_utf8_lossy(&self.pipe_name));
log::info!("Client connected to pipe");
log::error!("Pipe error: {:?}", error);
```

---

## ⚡ パフォーマンス最適化

1. **バッファサイズの調整**
   
   統一されたバッファサイズ設定を使用してください：
   
   📋 **統一バッファサイズ**: [`docs/common/system-constants.md`](../../common/system-constants.md)
   
   - 小容量メッセージ: 4KB
   - 標準バッファ: 8KB (Named Pipe標準)
   - MVP推奨: 32KB (メモリ効率とパフォーマンスのバランス)
   - 大容量データ転送: 64KB

2. **非同期I/O**
   - FILE_FLAG_OVERLAPPEDフラグ使用
   - OVERLAPPED構造体での非同期処理

3. **接続プーリング**
   - 複数のパイプインスタンスを事前作成
   - 接続の再利用

💡 **現在の実装との比較**: 
実際のプロジェクトでの実装分析は[Named Pipe実装分析](../analysis/named-pipe-implementation.md)を参照

---

## 📚 関連ドキュメント

### 実装分析
- **[Named Pipe実装分析](../analysis/named-pipe-implementation.md)** - 現在の実装評価とパフォーマンス分析
- **[Windows API Rust実装ガイド](./windows-api-rust.md)** - Windows API使用の基本パターン
- **[Tauri Rust実装ガイド](./tauri-rust-implementation.md)** - よくあるエラーと対処法

### 外部資料
- [Named Pipes (Win32)](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes)
- [Windows-rs Pipes Module](https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/System/Pipes/)
- [Sysinternals PipeList](https://docs.microsoft.com/en-us/sysinternals/downloads/pipelist)