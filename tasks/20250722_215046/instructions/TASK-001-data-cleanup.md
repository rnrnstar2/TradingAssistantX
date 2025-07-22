# TASK-001-data-cleanup

## 🎯 タスク概要
data/ディレクトリの要求仕様外ファイル・ディレクトリのクリーンアップ

## 📋 必須読み込み
**開始前に必ず実行:**
```bash
echo "ROLE: $ROLE" && git branch --show-current
```

**必須読み込みファイル:**
1. `REQUIREMENTS.md` - 要件定義（data/構造仕様）
2. `CLAUDE.md` - プロジェクト指示書

## 🚨 重要制約
- **REQUIREMENTS.md準拠**: 要求仕様外のファイル・ディレクトリのみ削除
- **データ保護**: 重要データは`archives/`への移動検討
- **出力管理**: `tasks/20250722_215046/outputs/`のみ出力許可

## 📂 削除対象ファイル・ディレクトリ一覧

### config/ディレクトリ - 要求仕様外ファイル
❌ `learning-retention-rules.yaml` - 削除対象
❌ `source-credentials.yaml.template` - 削除対象

### learning/ディレクトリ - 要求仕様外ファイル  
❌ `content-strategy.yaml` - 削除対象
❌ `growth-targets.yaml` - 削除対象
❌ `metrics-history.yaml` - 削除対象
❌ `posting-history.yaml` - 削除対象

### ルートディレクトリ - 要求仕様外
❌ `autonomous-sessions/` - 削除対象
❌ `metrics/` - 削除対象
❌ `decision-logs.yaml` - 削除対象
❌ `posting-history.yaml` - 削除対象

## ✅ 保護対象ファイル（削除禁止）

### config/ディレクトリ - 要求仕様通り
✅ `autonomous-config.yaml` - 保護
✅ `posting-times.yaml` - 保護
✅ `rss-sources.yaml` - 保護

### current/ディレクトリ - 要求仕様通り
✅ `account-status.yaml` - 保護
✅ `active-strategy.yaml` - 保護  
✅ `today-posts.yaml` - 保護

### learning/ディレクトリ - 要求仕様通り
✅ `success-patterns.yaml` - 保護
✅ `high-engagement.yaml` - 保護
✅ `effective-topics.yaml` - 保護

### archives/ディレクトリ
✅ `archives/` 全体 - 保護（Worker2が処理）

## 🔧 実行手順

### 1. 事前確認
```bash
# 現在のdata/構造確認
find /Users/rnrnstar/github/TradingAssistantX/data -type f -name "*.yaml" | sort
```

### 2. 削除実行（段階的）
```bash
# Step1: config/不要ファイル削除
rm -f /Users/rnrnstar/github/TradingAssistantX/data/config/learning-retention-rules.yaml
rm -f /Users/rnrnstar/github/TradingAssistantX/data/config/source-credentials.yaml.template

# Step2: learning/不要ファイル削除
rm -f /Users/rnrnstar/github/TradingAssistantX/data/learning/content-strategy.yaml
rm -f /Users/rnrnstar/github/TradingAssistantX/data/learning/growth-targets.yaml
rm -f /Users/rnrnstar/github/TradingAssistantX/data/learning/metrics-history.yaml
rm -f /Users/rnrnstar/github/TradingAssistantX/data/learning/posting-history.yaml

# Step3: ルート不要ファイル・ディレクトリ削除
rm -rf /Users/rnrnstar/github/TradingAssistantX/data/autonomous-sessions/
rm -rf /Users/rnrnstar/github/TradingAssistantX/data/metrics/
rm -f /Users/rnrnstar/github/TradingAssistantX/data/decision-logs.yaml
rm -f /Users/rnrnstar/github/TradingAssistantX/data/posting-history.yaml
```

### 3. 結果確認
```bash
# 削除後の構造確認
find /Users/rnrnstar/github/TradingAssistantX/data -type f -name "*.yaml" | sort
```

## 📊 品質チェック

### 必須確認事項
1. ✅ 要求仕様通りのファイルが残存
2. ✅ 要求仕様外ファイルが全て削除
3. ✅ archives/ディレクトリは未変更（Worker2担当）

### 成功基準
- config/: 3つのみ（autonomous-config.yaml, posting-times.yaml, rss-sources.yaml）
- current/: 3つのみ（account-status.yaml, active-strategy.yaml, today-posts.yaml）  
- learning/: 3つのみ（success-patterns.yaml, high-engagement.yaml, effective-topics.yaml）
- archives/: 未変更維持

## 📋 報告書作成
**作成場所:** `tasks/20250722_215046/reports/REPORT-001-data-cleanup.md`

**報告書内容:**
1. 削除されたファイル・ディレクトリ一覧
2. 削除前後の構造比較
3. 問題・課題があれば記載
4. 次フェーズ（Worker3）への引き継ぎ事項

## 🚨 注意事項
- **慎重な削除**: 削除前に必ずファイル内容確認
- **バックアップなし**: 削除は非可逆的操作
- **Worker2との連携**: archives/は触れない
- **完了報告**: 削除完了後、報告書作成必須