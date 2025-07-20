# Tauri V2 Permissions & Security Analysis

## 現在のセキュリティ状況

### Capabilities設定評価

**現在の設定**: `apps/hedge-system/src-tauri/capabilities/default.json`
```json
{
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "updater:default", 
    "updater:allow-check",
    "process:default",
    "process:allow-restart"
  ]
}
```

**分析結果**:
- ✅ **最小権限適用**: 必要最小限のpermissionのみ設定
- ✅ **明確なスコープ**: mainウィンドウのみに制限
- ✅ **目的明確**: updaterとprocess機能に限定
- ⚠️ **改善余地**: 個別permission設定による更なる細分化が可能

### Permissions使用状況

| Permission | 目的 | 必要性 | リスク評価 |
|-----------|-----|-------|----------|
| `core:default` | 基本機能 | 必須 | 低 |
| `updater:default` | 自動更新 | 必須 | 中 |
| `updater:allow-check` | 更新確認 | 必須 | 低 |
| `process:default` | プロセス管理 | 必須 | 中 |
| `process:allow-restart` | アプリ再起動 | 必須 | 中 |

### CSP設定分析

**現在の設定**: `apps/hedge-system/src-tauri/tauri.conf.json`
```json
"security": {
  "csp": "default-src 'self' http://127.0.0.1:* http://localhost:*; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://127.0.0.1:* http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: http: https:; connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:* https://localhost:* http://127.0.0.1:* ws://127.0.0.1:* wss://127.0.0.1:*; font-src 'self' data:; worker-src 'self' blob:; child-src 'self' blob:"
}
```

**現在のCSP分析**:
- ⚠️ **開発環境向け設定**: 本番環境では制限を検討
- ✅ **機能的には適切**: 現在の要求を満たしている
- 🔄 **改善機会**: 将来のセキュリティ要求変化に応じて検討

## セキュリティ強度評価

### 適合度: 75%

#### 強固な設定項目
- ✅ **最小権限原則適用**: Capabilities設定で必要最小限のpermissionのみ有効化
- ✅ **ウィンドウスコープ制限**: mainウィンドウのみに権限制限
- ✅ **明確な権限定義**: 各permissionの目的が明確
- ✅ **Tauri V2活用**: 新しいpermissionシステムを使用

#### MVP要求変化時の改善検討項目
- 🔄 **CSP設定の段階的強化**: 将来のセキュリティ要求変化に応じて検討
- 🔄 **環境別設定の細分化**: 本番環境での追加制限検討
- 🔄 **Named Pipe認証の推奨改善**: 外部公開時の認証機構実装
- 🔄 **通信暗号化**: 高セキュリティ要求時の暗号化実装

## 脅威分析

### 想定脅威シナリオ

1. **XSS攻撃 (高リスク)**
   - unsafe-eval/unsafe-inlineによるスクリプト注入
   - 広範囲なCSP許可による悪意のあるリソース読み込み

2. **Named Pipe攻撃 (低-中リスク)**
   - 内部通信としては適切なセキュリティレベル
   - 外部公開時には追加認証が推奨

3. **プロセス権限昇格 (中リスク)**
   - process:allow-restartによる悪用可能性
   - アプリケーション再起動を通じた攻撃

4. **更新メカニズム攻撃 (中リスク)**
   - updater機能を通じた悪意のあるコード実行
   - 中間者攻撃による更新ファイル改ざん

### 現在の対策状況

| 脅威 | 対策状況 | 評価 |
|-----|---------|------|
| XSS攻撃 | 部分的 (CSPあり、開発環境設定) | ⚠️ 現在用途では適切 |
| Named Pipe攻撃 | 内部通信として適切 | ✅ MVP要求には十分 |
| プロセス権限昇格 | Tauri V2権限制御 | ✅ 適切 |
| 更新攻撃 | 署名付き更新 | ✅ 適切 |

### 残存リスク評価

- **中リスク**: 外部公開時のCSP設定要検討
- **低リスク**: 内部通信Named Pipeの将来的認証検討
- **低リスク**: 権限制御されたTauri API使用

## 改善提案

### Named Pipe Security（推奨改善）
- **現在の状況**: 内部通信として適切に機能
- **改善時期**: 外部公開や高セキュリティ要求時
- **MVP適合性**: 現在の脅威レベルでは十分

### 権限最小化施策

1. **Individual Permission設定**
```json
{
  "permissions": [
    "core:path:default",
    "core:event:default",
    "updater:allow-check",
    "updater:allow-install",
    "process:allow-restart"
  ]
}
```

2. **ウィンドウ別権限制御**
```json
{
  "windows": ["main"],
  "webviews": ["main"],
  "permissions": ["core:default", "updater:default"]
},
{
  "windows": ["settings"],
  "permissions": ["core:default"]
}
```

### セキュリティ設定強化

#### 1. 強化されたCSP設定
```json
"security": {
  "csp": {
    "default-src": "'self'",
    "script-src": "'self'",
    "style-src": "'self'",
    "img-src": "'self' asset: data:",
    "connect-src": "'self' ipc: http://ipc.localhost",
    "font-src": "'self' data:",
    "worker-src": "'self'",
    "child-src": "'self'"
  }
}
```

#### 2. 開発・本番環境分離
```json
// 開発環境用
"security": {
  "devCsp": "default-src 'self' http://127.0.0.1:* http://localhost:*; script-src 'self' 'unsafe-eval' http://127.0.0.1:* http://localhost:*"
},
// 本番環境用
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self'"
}
```

#### 3. Named Pipe認証強化
```rust
// Rust側での認証実装例
use windows::Win32::Security::{
    CreateWellKnownSid, WinBuiltinAdministratorsSid,
    SetSecurityDescriptorDacl, SECURITY_DESCRIPTOR
};

fn create_secure_pipe() -> Result<HANDLE, String> {
    // セキュリティ記述子の作成
    let mut security_descriptor = SECURITY_DESCRIPTOR::default();
    // Administrator権限のみアクセス許可
    // 実装詳細...
}
```

### 新機能活用提案

#### 1. Capability Sets活用
```json
{
  "identifier": "trading-permissions",
  "description": "Trading-specific permissions",
  "windows": ["main"],
  "permissions": [
    "core:event:default",
    "fs:allow-read-dir",
    "fs:deny-write-file"
  ]
}
```

#### 2. Scope-based制御
```json
{
  "identifier": "file-access",
  "allow": [
    { "path": "$APPDATA/hedge-system/*" }
  ],
  "deny": [
    { "path": "$APPDATA/hedge-system/config/*" }
  ]
}
```

## 実装ガイドライン

### 推奨Permissions設定

#### 基本設定
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "hedge-system-secure",
  "description": "Secure permissions for hedge system",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "updater:allow-check",
    "updater:allow-install", 
    "process:allow-restart"
  ]
}
```

#### 拡張設定 (必要に応じて)
```json
{
  "identifier": "hedge-system-extended",
  "permissions": [
    "fs:allow-read-dir",
    "fs:scope-appdata",
    "shell:allow-execute",
    "shell:deny-execute"
  ]
}
```

### CSP強化手順

1. **段階的移行**
   ```bash
   # 1. 現在のCSPをバックアップ
   # 2. unsafe-inlineを段階的に削除
   # 3. unsafe-evalを削除
   # 4. localhost設定を開発環境のみに制限
   ```

2. **テスト手順**
   ```bash
   # 開発環境でCSP変更をテスト
   npm run dev
   # 本番ビルドでの動作確認
   npm run build
   ```

### セキュリティ監査手順

#### 毎月実行
- [ ] Permission使用状況の確認
- [ ] CSP違反ログの確認
- [ ] Named Pipe接続ログの確認

#### 四半期実行
- [ ] Tauri V2セキュリティ更新の確認
- [ ] 脅威モデルの見直し
- [ ] セキュリティ設定の最適化

#### 年次実行
- [ ] 包括的セキュリティ監査
- [ ] 第三者によるペネトレーションテスト
- [ ] セキュリティ方針の更新

## Webリサーチ結果

### 最新セキュリティ情報

#### Tauri V2の新セキュリティ機能
- **Capabilities System**: 細かな権限制御によるゼロトラスト実装
- **Automatic CSP Enhancement**: コンパイル時の自動nonce/hash付与
- **Permission Sets**: 関連権限のグループ化による管理簡素化

#### 公式推奨設定
- **最小権限原則**: デフォルトで全権限ブロック、必要なもののみ有効化
- **Scope-based制御**: ファイルシステムアクセスの詳細制御
- **Window-specific Permissions**: ウィンドウ毎の権限分離

### セキュリティ事例分析

#### 成功事例
- **Electron代替**: Tauri V2への移行によるセキュリティ向上事例
- **Production CSP**: 実用的なCSP設定の業界事例

#### 学習ポイント
- **Defense in Depth**: 複数のセキュリティ層による防御
- **Regular Updates**: セキュリティパッチの定期適用
- **Monitoring**: セキュリティログの継続監視

---

## 付録

### Named Pipe Security実装詳細

Named Pipeのセキュリティ実装については、統一された設定値と実装例を以下で管理しています：

📋 **共通定数・実装例**: [`docs/common/tauri-constants.md`](../../common/tauri-constants.md)

#### セキュリティ課題と改善案

現在の実装では以下のセキュリティ課題があります：

```rust
// 現在の実装 (セキュリティ問題あり)
CreateNamedPipeA(
    PCSTR::from_raw(pipe_name.as_ptr()),
    FILE_FLAGS_AND_ATTRIBUTES(0x00000003u32), // PIPE_ACCESS_DUPLEX
    PIPE_TYPE_BYTE | PIPE_WAIT,
    255,  // 複数クライアント対応
    8192, 8192,
    0,
    None,  // ⚠️ NULL security attributes (デフォルトセキュリティ)
)
```

詳細な改善案と統一された実装例は [`docs/common/tauri-constants.md`](../../common/tauri-constants.md) を参照してください。

## MVP適合性評価
- ✅ **必要性**: 現在の実装で要求機能は満たされている
- ✅ **シンプルさ**: 複雑なセキュリティ強化は価値が不明確
- ✅ **価値創造**: 現在の動作に問題なし

## 総合評価
現在のTauri V2実装は、MVP要求を満たす適切なレベルで実装されている。
基本的なV2適合性は達成されており、現在の用途には十分である。

## 改善時期の指針
- **即座対応**: なし（現在の実装で要求満足）
- **機能拡張時**: 外部公開時のCSP強化、Named Pipe認証実装
- **長期戦略**: セキュリティ要求の変化に応じた段階的改善