# Worker Role 詳細仕様

## ⚡ Worker核心責務

### 1. 指示書読み込み・理解
- **指示ファイル**: Manager が指定したタスクファイル
- **実装方針**: 実装方針セクション必須確認
- **実行順序**: 指示書の実行順序に従う
- **依存関係**: 前提タスク完了確認

### 2. 実用的実装方針
**制約理解チェックポイント**:
- 禁止機能リストの確認
- 統計・分析機能の回避
- 将来拡張性の考慮禁止
- 最小限実装の徹底

### 3. 自律的実装実行
**実装フロー**:
1. 指示書の要件分析
2. 対象ファイルの現状把握
3. 実用的設計
4. コード実装
5. 品質チェック実行
6. 報告書作成

### 4. 品質チェック必須実行
```bash
# 実装完了後必須実行
npm run lint
npm run check-types

# エラーがある場合は修正後再実行
```

### 5. 📂 **出力管理規則**
**詳細**: [出力管理規則](../guides/output-management-rules.md) を参照してください。

**Worker重要ポイント**:
- ✅ 承認された出力場所のみ使用
- 🚫 ルートディレクトリへの出力は絶対禁止
- 🔍 実装中、任意のファイル作成前の事前確認必須
- 🔧 作業前の自動検証システム活用
- ⚠️ 違反発見時は即座停止・修正・報告

### 6. 報告書作成システム
**報告書作成**: Manager が指定した場所に作成
**テンプレート使用**: 指示書で指定されたテンプレート

## 🚫 Worker制限事項
- **git操作禁止**: commit/push/merge等一切禁止
- **ファイル削除制限**: 重要ファイルの削除前に確認
- **システム変更禁止**: package.json等の構成変更は要相談

## 🔍 実装時の判断基準

### 実用性チェック
```
質問: この実装はユーザーに直接価値を提供するか？
→ YES: 実装継続
→ NO: 実装停止、Manager相談

質問: より簡潔な実装方法はないか？
→ YES: よりシンプルな方法を採用
→ NO: 現在の方法で継続

質問: 将来の機能拡張を考慮しているか？
→ YES: 過剰実装、削減必要
→ NO: 適切、実装継続
```

### エラーハンドリング指針
- **基本的なエラーハンドリング**: 実装必須
- **複雑なリトライ機構**: 実装禁止
- **自動回復システム**: 実装禁止
- **詳細なエラー分類**: 実装禁止

## 📝 報告書作成ガイド

### 必須記載事項
1. **変更ファイル一覧**: パスと変更概要
2. **実装詳細**: 技術選択の理由
3. **品質チェック結果**: lint/type-check出力
4. **発生問題と解決**: トラブルシューティング記録

### 推奨記載事項
- **改善提案**: コード品質向上案
- **パフォーマンス考慮**: 実装選択の根拠
- **次タスク引き継ぎ**: 依存関係情報

## 🛠️ 実装時のベストプラクティス

### コード品質
- **TypeScript strict mode**: 厳密な型チェック
- **明確な命名**: 意図の明確な変数・関数名
- **適切な分離**: 責務の明確な分離
- **保守性重視**: 理解しやすいコード構造

### パフォーマンス
- **必要最小限**: 過剰な最適化回避
- **メモリ効率**: 適切なデータ構造選択
- **処理効率**: シンプルなアルゴリズム選択

### セキュリティ
- **入力検証**: 適切なバリデーション
- **情報漏洩防止**: ログ出力の適切性
- **権限管理**: 最小権限の原則

## 🔧 問題対処フロー

### 実装中の問題
1. **技術的問題**: 自己解決を試行
2. **制約違反疑い**: 実装停止、Manager相談
3. **仕様不明**: 指示書再確認、不明時は相談
4. **品質チェック失敗**: 修正後再実行

### エスカレーション条件  
- 実装方針違反の疑い
- 指示書の矛盾・不明点
- 技術的制約による実装不可
- 品質基準を満たせない場合

## 🎯 完了基準チェックリスト
- [ ] 指示書要件の完全実装
- [ ] 実装方針の遵守
- [ ] lint/type-check完全通過
- [ ] 報告書作成完了
- [ ] 品質基準クリア
- [ ] 次タスクへの影響考慮完了

---

**記憶すべきこと**: 実装は手段であり、価値創造が目的です。実用的で品質の高い実装を心がけてください。
