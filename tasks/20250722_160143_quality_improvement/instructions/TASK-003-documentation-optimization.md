# TASK-003: 文書最適化

## 🎯 目的
冗長・重複・不正確な文書を簡潔で実用的な内容に最適化する

## 🚨 現在の問題

### 1. 過度に詳細な文書 ❌
- `examples/README.md`: 361行（必要は50行程度）
- 重複する説明
- 実用性より説明重視

### 2. 不正確な参照 ❌  
- 存在しないファイルパスの掲載
- 古い情報の未更新
- 実際の実装と乖離した説明

### 3. 階層構造の不一致 ❌
- 説明された構造と実際の構造の違い
- ディレクトリ変更が文書に反映されない

## 🎯 最適化方針

### A. 簡潔性重視
- 要点のみに絞った説明
- コード例は動作するもののみ
- 冗長な説明の排除

### B. 正確性確保
- 実在するファイルパスのみ記載
- 定期的な整合性チェック
- 実装変更時の文書更新

### C. 実用性優先
- 開発者がすぐに使える情報
- 段階的な学習パス
- トラブルシューティング重視

## 📋 実行手順

### Phase 1: 現状分析

#### 1.1 冗長文書の特定
```bash
# 行数の多い文書を特定
find docs examples -name "*.md" -exec wc -l {} + | sort -nr

# 重複コンテンツの確認
grep -r "パフォーマンス監視" docs/ examples/
```

#### 1.2 参照整合性チェック
```bash
# 文書内のファイル参照をチェック
grep -r "src/" docs/ examples/ | while read line; do
  path=$(echo $line | grep -o "src/[^[:space:]]*")
  if [[ ! -f "$path" ]]; then
    echo "不正参照: $line"
  fi
done
```

### Phase 2: examples/README.md最適化

#### 2.1 構造簡素化（361行 → 50行以下）
```markdown
# TradingAssistantX Examples

実際に動作するサンプルコード集

## 📁 ファイル
- `performance-monitoring-usage.ts` - パフォーマンス監視の実装例

## 🚀 実行方法
```bash
tsx examples/performance-monitoring-usage.ts
```

## 📚 学習パス
1. サンプル実行でシステムの動作を確認
2. コード内コメントで詳細な仕組みを学習
3. 実際のプロジェクトに統合

## ❓ トラブルシューティング
- インポートエラー → `pnpm install` でパッケージ再インストール
- TypeScriptエラー → `tsc --noEmit` で詳細確認
```

#### 2.2 不要セクション削除
- 冗長な機能説明（コード内コメントに移動）
- 重複する使用例
- 過度に詳細な設定説明

### Phase 3: 技術文書の最適化

#### 3.1 docs/quick-guide.md確認・改善
```bash  
# 現在の行数チェック
wc -l docs/quick-guide.md

# 不正な参照チェック
grep "scripts/" docs/quick-guide.md
```

#### 3.2 docs/technical-docs.md確認・改善
- 実装と乖離した情報の修正
- 最新のアーキテクチャ情報への更新

### Phase 4: 参照整合性確保

#### 4.1 パス参照の一括修正
```bash
# scripts/ → tools/ への参照変更
find docs -name "*.md" -exec sed -i 's/scripts\//tools\//g' {} +

# 不正なパス参照の修正
# (TASK-001, TASK-002の結果を反映)
```

#### 4.2 バージョン情報更新
- package.jsonのバージョン情報と整合
- 依存関係情報の最新化

### Phase 5: 文書品質チェック機能

#### 5.1 文書検証スクリプト作成
```bash
# tools/doc-validator.sh (新規作成)
#!/bin/bash
echo "📋 文書品質チェック開始"

# 1. 参照整合性チェック
check_file_references() {
  # 実装詳細
}

# 2. 行数チェック
check_line_limits() {
  # READMEファイルの適切な行数維持
}

# 3. リンク有効性チェック  
check_internal_links() {
  # 内部リンクの存在確認
}
```

#### 5.2 品質チェック統合
```bash
# tools/quality-check.shに文書チェック追加
echo "📋 文書品質チェック" >> tools/quality-check.sh
tools/doc-validator.sh >> tools/quality-check.sh
```

## ✅ 完了条件
1. `examples/README.md` が50行以下に簡潔化
2. すべてのファイル参照が実在するパスを指している
3. 重複・冗長な説明が削除されている
4. 文書品質チェック機能が動作している
5. 開発者が迷わず使える実用的な内容になっている

## 🧪 検証手順
```bash
# 1. 行数チェック
wc -l examples/README.md  # 50行以下確認
wc -l docs/quick-guide.md # 適切な行数確認

# 2. 参照整合性チェック  
tools/doc-validator.sh

# 3. 文書品質チェック
tools/quality-check.sh

# 4. 実用性確認
# 新規開発者の視点で文書を確認
```

## 📊 メトリクス

### Before/After比較
| 項目 | Before | After | 改善 |
|------|--------|-------|------|
| examples/README.md | 361行 | <50行 | -86% |
| 不正参照 | 3箇所 | 0箇所 | -100% |
| 重複説明 | 多数 | 0箇所 | -100% |

### 品質指標
- ✅ 簡潔性: 必要最小限の情報のみ
- ✅ 正確性: 実在する情報のみ記載
- ✅ 実用性: すぐに活用できる内容
- ✅ 保守性: 更新しやすい構造

## 🚨 重要事項
- 情報削除時は実用性を損なわないよう注意
- コード例は必ず動作確認済みのもののみ掲載
- 段階的な改善でリスクを最小化
- 文書変更時は関連チームに事前通知

## 📊 期待効果
- ✅ 開発者の学習効率大幅向上
- ✅ メンテナンス工数削減
- ✅ 新規参入障壁の低減  
- ✅ 文書品質の継続的向上