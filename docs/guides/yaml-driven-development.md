# YAML駆動開発ガイド

## 📂 配置ルール
- **場所**: `data/` ディレクトリ直下のみ
- **形式**: `.yaml` 拡張子必須
- **禁止**: `config/`, `settings/`, ルートディレクトリ

## 🔧 基本構造例
```yaml
# data/autonomous-config.yaml
version: "1.0"
autonomous:
  enabled: true
  mode: "balanced"
  
posting:
  max_per_day: 15
  quality_threshold: 0.8
  
schedule:
  prime_times:
    - "09:00"
    - "12:30"
    - "21:00"
```

## 必須事項
1. Git管理下に配置
2. 設定変更時はバックアップ作成
3. コメントで設定意図を記載