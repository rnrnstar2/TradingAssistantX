# Tauri V2実装ベストプラクティスガイド

## 📋 概要

Tauri V2分析結果を基にした具体的な実装ガイドライン。現在の実装が適切であることを確認した上で、将来の拡張時に従うべきベストプラクティスを文書化。

## 🎯 MVP制約下での実装原則

### 基本方針
1. **現在の実装を維持** - 動作する実装の不要な変更を避ける
2. **最小限の改善のみ** - 今すぐ必要でない機能は実装しない
3. **段階的改善** - 一度に大きな変更を行わない
4. **依存関係の健全性** - フロントエンド・バックエンドの整合性確保

## 🔧 プラグイン管理ベストプラクティス

### 推奨プラグイン設定（Cargo.toml）
```toml
[dependencies]
# 基本プラグイン（現在実装済み）
tauri = { version = "2.5.0", features = ["devtools"] }
tauri-plugin-updater = "2.5.0"
tauri-plugin-process = "2.2.1"

# 健全性確保プラグイン（追加推奨）
tauri-plugin-dialog = "2.0.0"
tauri-plugin-fs = "2.0.0"
tauri-plugin-notification = "2.0.0"

# RC版プラグイン（注意して使用）
tauri-plugin-log = "2.0.0-rc"  # 安定版リリース後に移行
```

### プラグイン初期化パターン
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_notification::init())
```

## 🛡️ セキュリティ設定ベストプラクティス

### 開発環境CSP設定（現在）
```json
{
  "csp": "default-src 'self' http://127.0.0.1:* http://localhost:*; script-src 'self' 'unsafe-eval' 'unsafe-inline' ..."
}
```

### 本番環境CSP設定（将来）
```json
{
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: data:; connect-src 'self' https://amplify-arbitrageassistantreleases.s3.ap-northeast-1.amazonaws.com"
}
```

**実装指針**: 環境変数による条件分岐で実装。現在は開発環境設定を維持。

## 🔐 Named Pipe実装強化

### セキュリティ強化（オプション実装）

Named Pipe Squatting攻撃防止などのセキュリティ強化については以下を参照：

📋 **共通定数・実装例**: [`docs/common/tauri-constants.md`](../../common/tauri-constants.md)  
📋 **セキュリティ詳細分析**: [`docs/tauri/analysis/permissions-security.md`](../analysis/permissions-security.md)

## 🚫 実装しない項目（MVP制約）

### 現在実装を避ける機能
- **Multi-webview実装**: 現在不要、設定複雑化を避ける
- **Capabilities System導入**: セキュリティは最小限で十分
- **Raw Payload移行**: 現在のJSON通信で問題なし
- **環境別設定ファイル分離**: 現在の単一設定で運用可能
- **高度なセキュリティ機能**: 暗号化、認証等は現在不要

### 判断基準
```
今すぐ必要か？ → No → 実装延期
実装コスト vs 価値 → 低価値高コスト → 回避
現在の動作に影響するか？ → No → 変更最小限
```

## 📈 将来拡張の判断指針

### Phase 1: 依存関係整合性（実装済み）
- プラグイン依存関係の健全性確保
- ビルド成功確認
- 既存機能動作確認

### Phase 2: セキュリティ改善（必要時実装）
**条件**: 本番環境リリース時
- 環境別CSP設定実装
- セキュリティ検証実行

### Phase 3: Named Pipe強化（必要時実装）
**条件**: セキュリティ要件が厳格化した場合
- FILE_FLAG_FIRST_PIPE_INSTANCE追加
- セキュリティテスト実行

### Phase 4: 高度機能（将来検討）
**条件**: 明確な要求が発生した場合のみ
- Multi-webview実装
- Capabilities System導入
- 環境別設定分離

## ✅ 実装チェックリスト

### プラグイン追加時
- [ ] Cargo.tomlに適切なバージョンで追加
- [ ] lib.rsで初期化コード追加
- [ ] ビルドテスト実行
- [ ] 既存機能動作確認

### セキュリティ設定変更時
- [ ] 開発・本番環境の違いを考慮
- [ ] 段階的実装（急激な変更を避ける）
- [ ] セキュリティ検証実行

### Named Pipe機能変更時
- [ ] Windows API使用時の条件付きコンパイル
- [ ] エラーハンドリング確認
- [ ] セキュリティテスト実行

## ⚠️ 重要な注意事項

### MVP原則の維持
- **機能追加の判断**: 「今すぐ必要か？」を常に問う
- **実装の複雑さ**: シンプルな解決策を優先
- **既存機能への影響**: 動作する機能を破壊しない

### 技術的制約
- **プラグインバージョン**: RC版は安定版リリース後に移行
- **Windows API**: 条件付きコンパイルで他OSとの互換性維持
- **非同期処理**: MutexGuardのスコープに注意

### 運用上の注意
- **段階的実装**: 一度に大きな変更を避ける
- **テスト重視**: 各変更後に必ず動作確認
- **ドキュメント更新**: 変更時はこのガイドも更新

---

**記憶すべきこと**: 現在の実装は既に適切であり、不要な変更は価値を損なう。改善は最小限に留め、MVP原則を常に維持する。