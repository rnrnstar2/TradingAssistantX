# TASK-003-data-validation

## 🎯 タスク概要
Worker1, Worker2完了後のdata/構造の最終検証と整合性確認

## 📋 必須読み込み
**開始前に必ず実行:**
```bash
echo "ROLE: $ROLE" && git branch --show-current
```

**必須読み込みファイル:**
1. `REQUIREMENTS.md` - 要件定義（data/構造仕様）
2. `CLAUDE.md` - プロジェクト指示書
3. `tasks/20250722_215046/reports/REPORT-001-data-cleanup.md` - Worker1報告書
4. `tasks/20250722_215046/reports/REPORT-002-archives-restructure.md` - Worker2報告書

## 🚨 重要制約
- **REQUIREMENTS.md準拠**: 完全な構造適合確認
- **データ整合性**: YAML形式・内容の検証
- **出力管理**: `tasks/20250722_215046/outputs/`のみ出力許可

## ⚠️ 実行前提条件
**Worker1, Worker2の完了確認必須**
- Worker1の報告書が存在するか確認
- Worker2の報告書が存在するか確認
- 両方の報告書で作業完了が確認できる場合のみ本作業を実行

## 🎯 検証対象：要求仕様準拠

### REQUIREMENTS.md期待構造
```
data/
├── config/                 # システム設定
│   ├── autonomous-config.yaml    # 自律実行設定
│   ├── posting-times.yaml       # 投稿時間設定
│   └── rss-sources.yaml         # RSSフィード設定
├── current/                # 現在の状態（常に最新・最小限）
│   ├── account-status.yaml      # アカウント状態
│   ├── active-strategy.yaml     # アクティブな戦略
│   └── today-posts.yaml         # 本日の投稿記録
├── learning/               # 学習データ（定期的にクレンジング）
│   ├── success-patterns.yaml    # 成功パターン
│   ├── high-engagement.yaml     # 高エンゲージメント投稿
│   └── effective-topics.yaml    # 効果的なトピック
└── archives/               # アーカイブ（古いデータは自動移動）
    └── 2025-07/                # 月別アーカイブ
```

## 🔧 検証手順

### 1. 構造検証
```bash
# 完全な構造確認
find /Users/rnrnstar/github/TradingAssistantX/data -name "*.yaml" | sort > /Users/rnrnstar/github/TradingAssistantX/tasks/20250722_215046/outputs/final-structure.txt

# ディレクトリ構造確認
tree /Users/rnrnstar/github/TradingAssistantX/data || ls -la /Users/rnrnstar/github/TradingAssistantX/data
```

### 2. ファイル数検証

#### config/ - 期待：3ファイル
```bash
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/config/*.yaml | wc -l
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/config/
```

#### current/ - 期待：3ファイル  
```bash
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/current/*.yaml | wc -l
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/current/
```

#### learning/ - 期待：3ファイル
```bash
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/learning/*.yaml | wc -l
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/learning/
```

#### archives/ - 期待：月別アーカイブ構造
```bash
ls -la /Users/rnrnstar/github/TradingAssistantX/data/archives/
ls -1 /Users/rnrnstar/github/TradingAssistantX/data/archives/2025-07/ | wc -l
```

### 3. YAML形式検証

#### 必須ファイルのYAML構文確認
```bash
# config/ファイルの構文確認
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/config/autonomous-config.yaml', 'r'))" && echo "autonomous-config.yaml: OK"
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/config/posting-times.yaml', 'r'))" && echo "posting-times.yaml: OK"
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/config/rss-sources.yaml', 'r'))" && echo "rss-sources.yaml: OK"

# current/ファイルの構文確認
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/current/account-status.yaml', 'r'))" && echo "account-status.yaml: OK"
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/current/active-strategy.yaml', 'r'))" && echo "active-strategy.yaml: OK"
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/current/today-posts.yaml', 'r'))" && echo "today-posts.yaml: OK"

# learning/ファイルの構文確認
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/learning/success-patterns.yaml', 'r'))" && echo "success-patterns.yaml: OK"
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/learning/high-engagement.yaml', 'r'))" && echo "high-engagement.yaml: OK"
python3 -c "import yaml; yaml.safe_load(open('/Users/rnrnstar/github/TradingAssistantX/data/learning/effective-topics.yaml', 'r'))" && echo "effective-topics.yaml: OK"
```

### 4. データ内容確認（サンプル）

#### 重要ファイルの内容確認
```bash
# システム設定の内容確認
head -10 /Users/rnrnstar/github/TradingAssistantX/data/config/autonomous-config.yaml
head -10 /Users/rnrnstar/github/TradingAssistantX/data/config/posting-times.yaml

# 現在状態の内容確認
head -10 /Users/rnrnstar/github/TradingAssistantX/data/current/account-status.yaml
head -10 /Users/rnrnstar/github/TradingAssistantX/data/current/active-strategy.yaml
```

## 📊 品質チェックリスト

### ✅ 構造適合性
- [ ] config/ - 3ファイルのみ（autonomous-config.yaml, posting-times.yaml, rss-sources.yaml）
- [ ] current/ - 3ファイルのみ（account-status.yaml, active-strategy.yaml, today-posts.yaml）
- [ ] learning/ - 3ファイルのみ（success-patterns.yaml, high-engagement.yaml, effective-topics.yaml）
- [ ] archives/ - 月別アーカイブ構造（例：2025-07/）

### ✅ データ品質
- [ ] 全YAMLファイルが構文エラーなし
- [ ] ファイル内容が空でない
- [ ] 必要なキーが存在する

### ✅ 不要要素の除去
- [ ] 要求仕様外ファイルが存在しない
- [ ] 要求仕様外ディレクトリが存在しない
- [ ] archives/が複雑構造でない

## 🔧 問題発見時の対応

### データ不整合発見時
1. **軽微な問題**: 即座に修正実行
2. **重大な問題**: Worker1, Worker2への指摘・再作業要請

### 修正例
```bash
# 空のYAMLファイル修正
echo "{}" > [対象ファイル]

# 不完全な削除の完了
rm -f [削除すべきファイル]
```

## 📋 最終検証レポート作成

**作成場所:** `tasks/20250722_215046/reports/REPORT-003-data-validation.md`

### レポート構成
1. **検証結果サマリー**
   - ✅/❌ 各項目の合格/不合格
   - 発見された問題とその対応

2. **最終構造**
   - data/ディレクトリの完全な構造
   - ファイル数確認結果

3. **品質確認**
   - YAML構文チェック結果
   - データ内容確認結果

4. **REQUIREMENTS.md適合性**
   - 要求仕様との完全一致確認
   - 残存課題（あれば）

5. **次フェーズへの推奨事項**
   - 継続監視が必要な項目
   - 将来の改善提案

## 🎯 成功基準

### 完全成功の条件
- ✅ REQUIREMENTS.md構造と100%一致
- ✅ 全YAMLファイルが有効
- ✅ 不要ファイル・ディレクトリが0個
- ✅ archives/が月別アーカイブ構造

### 作業完了の証明
- Worker1, Worker2の報告書内容と整合
- 最終検証レポートの作成
- すべてのチェック項目が合格

## 🚨 注意事項
- **Worker依存**: Worker1, Worker2完了が前提
- **完全検証**: 妥協なき品質確認
- **報告書必須**: 詳細な検証結果記録
- **次フェーズ準備**: srcディレクトリ実装への準備