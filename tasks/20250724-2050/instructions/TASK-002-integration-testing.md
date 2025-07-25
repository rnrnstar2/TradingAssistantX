# Worker指示書: 統合テストと品質チェック完了

## 🎯 実装目的
TypeScript設定修正後の全システム動作確認と品質チェックを実行し、DataManager拡張の完全な動作を保証する。

## 📋 実装要件

### 1. 動作確認テスト

#### ステップ1: TypeScript型チェック
```bash
# 型チェック実行
npx tsc --noEmit --skipLibCheck

# 成功条件: エラー0件
```

#### ステップ2: 開発用実行テスト
```bash
# 1回実行テスト
npm run dev

# 確認ポイント:
# - ✅ DataManager初期化成功
# - ✅ current/実行ディレクトリ作成
# - ✅ Claude出力保存成功
# - ✅ Kaito応答保存成功
# - ✅ 実行サマリー作成成功
# - ✅ エラーなく完了
```

#### ステップ3: データ構造確認
実行後に以下のファイル/ディレクトリが正しく作成されていることを確認：

```
src/data/
├── current/
│   ├── execution-YYYYMMDD-HHMM/
│   │   ├── claude-outputs/
│   │   │   └── *.yaml
│   │   ├── kaito-responses/
│   │   │   └── *.yaml
│   │   ├── posts/
│   │   │   └── post-*.yaml
│   │   └── execution-summary.yaml
│   └── active-session.yaml
├── history/
└── 既存ディレクトリ...
```

### 2. 品質チェック実行

#### コードスタイル確認
```bash
# ESLintが利用可能な場合
npm run lint 2>/dev/null || echo "ESLint not configured - OK for MVP"
```

#### パフォーマンステスト
```bash
# 実行時間測定（3回実行）
echo "パフォーマンステスト開始"
for i in {1..3}; do
  echo "実行 $i:"
  time npm run dev
done
```

### 3. エラーハンドリング確認

#### 異常系テスト実行
各種エラーケースでの適切な処理を確認：

1. **ディスク容量不足シミュレーション**（オプション）
2. **権限エラーシミュレーション**（オプション）
3. **不正なYAMLファイル作成テスト**（オプション）

### 4. アーカイブ機能テスト

```bash
# 複数回実行でアーカイブ動作確認
npm run dev
sleep 2
npm run dev
sleep 2
npm run dev

# 確認: history/ディレクトリに正しくアーカイブされているか
```

### 5. 統合確認レポート作成

実行結果を以下の形式で報告書に記録：

```markdown
# DataManager拡張統合テスト結果

## ✅ 成功項目
- [ ] TypeScript型チェック: 0エラー
- [ ] 開発用実行: 正常完了
- [ ] データ構造作成: 適切
- [ ] アーカイブ機能: 正常動作
- [ ] エラーハンドリング: 適切

## ⚠️ 警告項目
- なし / [警告内容]

## ❌ 失敗項目
- なし / [失敗内容と原因]

## 📊 パフォーマンス
- 平均実行時間: XXXms
- メモリ使用量: 正常範囲内
- ディスク使用量: 制限内

## 🔧 推奨改善点
- [改善点があれば記載]

## 📋 次のアクション
- [必要な対応があれば記載]
```

### 6. Git状態確認

```bash
# 変更ファイル確認
git status

# 重要: dataディレクトリの不要ファイルがcommit対象になっていないか確認
# current/, history/内の実行データはcommitしない
```

## ✅ 完了条件

1. 全テストケースが正常に完了している
2. 型チェックが0エラーで通過している
3. データ構造が仕様通りに作成されている
4. アーカイブ機能が正常に動作している
5. 統合確認レポートが作成されている

## 🚫 禁止事項

- テスト用データを本番環境に反映
- 実行データ（current/history/内容）をGitコミット
- テスト専用以外の機能修正

## 📝 報告必須項目

1. **各テストの実行結果**（成功/失敗/部分成功）
2. **パフォーマンス数値**（実行時間、リソース使用量）
3. **発見された問題**（あれば詳細と解決策）
4. **改善提案**（あれば）

## 💡 テストのヒント

- 各テストは独立して実行可能にする
- エラー発生時は詳細ログを取得
- 実行前後のディスク使用量を記録
- メモリリークがないか監視

MVP版としての最小限の品質を保証することが目標。