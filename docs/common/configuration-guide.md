# 設定ファイルガイド

## 📁 設定ファイル構造

```
x/
├── config/                     # 設定ファイル
│   ├── templates.json         # 投稿テンプレート
│   ├── targets.json          # 収集対象設定
│   ├── claude-instructions.json  # Claude指示設定
│   └── posting-schedule.json    # 投稿スケジュール
└── data/                      # データファイル
    ├── account-strategy.json   # 成長戦略
    ├── performance-insights.json # パフォーマンス分析
    ├── growth-targets.json     # 成長目標
    ├── posting-history.json    # 投稿履歴
    └── generated-post.json     # 生成投稿
```

## 🔧 主要設定ファイル

### account-strategy.json
```json
{
  "version": "1.0.0",
  "currentPhase": "growth",
  "objectives": {
    "primary": "トレーディング教育コンテンツで信頼性のあるアカウントを構築"
  },
  "contentStrategy": {
    "themes": ["リスク管理", "市場分析", "投資心理", "基礎知識"],
    "postingFrequency": 15,
    "optimalTimes": ["06:00", "07:30", "09:00", ...]
  }
}
```

### templates.json
```json
{
  "templates": [
    {
      "type": "educational",
      "format": "【{topic}】\n{content}\n\n#トレーディング #投資教育"
    }
  ]
}
```

### targets.json
```json
{
  "targets": [
    {
      "name": "サイト名",
      "url": "https://example.com",
      "selector": "CSS セレクタ",
      "limit": 10
    }
  ]
}
```

## 🌍 環境変数

### 必須環境変数
```bash
# API認証
ANTHROPIC_API_KEY="your_anthropic_key"
X_API_KEY="your_x_api_key"
X_API_SECRET="your_x_api_secret"

# 実行モード
NODE_ENV="production"
X_TEST_MODE="false"
```

### オプション環境変数
```bash
# デバッグ
DEBUG="collector:*"

# タイムゾーン
TZ="Asia/Tokyo"
```

## 🔄 設定の更新

### 設定ファイルの更新
```bash
# 設定確認
pnpm run verify:config

# 設定検証
pnpm run validate:config

# 設定適用
pnpm run apply:config
```

---

**注意**: 設定変更後は必ずシステムの再起動が必要です。