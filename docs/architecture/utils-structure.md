# Utils Architecture

## 📁 現在の構造

```
src/utils/
├── context-compressor.ts     # コンテキスト圧縮
├── error-handler.ts          # エラーハンドリング  
├── file-size-monitor.ts      # ファイルサイズ監視
├── monitoring/
│   └── health-check.ts       # ヘルスチェック
├── yaml-manager.ts           # YAML管理（高度）
└── yaml-utils.ts             # YAML基本操作
```

## 🔧 各ファイルの役割

- **yaml-utils.ts**: 設定ファイル基本操作（loadYamlSafe等）
- **yaml-manager.ts**: 高度YAML操作・監視機能
- **context-compressor.ts**: Claude Code SDK用コンテキスト最適化
- **error-handler.ts**: 統一エラーハンドリング
- **file-size-monitor.ts**: ファイルサイズ監視・制限
- **monitoring/health-check.ts**: システムヘルスチェック

## ✅ 最適化完了

- ❌ 削除: config-cache.ts (194行)
- ❌ 削除: config-manager.ts (363行)  
- ❌ 削除: config-validator.ts (483行)
- ✅ 保持: 実使用中の6ファイル
- 📊 結果: 67%のデッドコード削除、メンテナンス性向上