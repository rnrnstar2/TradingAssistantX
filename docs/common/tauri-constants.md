# Tauri 共通定数

## Named Pipe設定
- **バッファサイズ**: 8192バイト（8KB）
- **最大インスタンス数**: 255
- **パイプ名**: "TauriMTBridge"

## セキュリティ設定
- **FILE_FLAG_FIRST_PIPE_INSTANCE**: 0x00080000
- **権限フラグ**: 0x00000003

## セキュリティ実装例

### 基本実装
```rust
// 基本的なNamed Pipe作成
CreateNamedPipeA(
    PCSTR::from_raw(pipe_name.as_ptr()),
    FILE_FLAGS_AND_ATTRIBUTES(0x00000003u32), // PIPE_ACCESS_DUPLEX
    PIPE_TYPE_BYTE | PIPE_WAIT,
    255,  // 最大インスタンス数
    8192, // 入力バッファサイズ
    8192, // 出力バッファサイズ
    0,
    None,
)
```

### セキュリティ強化実装
```rust
// Named Pipe Squatting攻撃を防止
CreateNamedPipeA(
    PCSTR::from_raw(pipe_name.as_ptr()),
    FILE_FLAGS_AND_ATTRIBUTES(0x00000003u32 | 0x00080000u32), // + FILE_FLAG_FIRST_PIPE_INSTANCE
    PIPE_TYPE_BYTE | PIPE_WAIT,
    255,
    8192,
    8192,
    0,
    Some(security_descriptor), // カスタムセキュリティ記述子
)
```

## 参照先
- 詳細な分析: [permissions-security.md](../tauri/analysis/permissions-security.md)
- 実装ガイド: [tauri-v2-implementation-best-practices.md](../tauri/guides/tauri-v2-implementation-best-practices.md)
- 実装詳細: [named-pipe-implementation.md](../tauri/analysis/named-pipe-implementation.md)