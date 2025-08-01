# 指示書：directory-structure.mdとkaito-api.mdのFX特化修正

## 🎯 ミッション概要
プロジェクト構造説明書（directory-structure.md）とKaito API仕様書（kaito-api.md）をFX特化の内容に修正する。

## 📋 前提条件・制約
- **対象ファイル**: 
  - `/Users/rnrnstar/github/TradingAssistantX/docs/directory-structure.md`
  - `/Users/rnrnstar/github/TradingAssistantX/docs/kaito-api.md`
- **修正方針**: 金融・投資関連の一般的な表現をFXに特化
- **品質基準**: ドキュメントの技術的正確性を保ちつつFX特化を明確化

## 🔧 修正内容詳細

### directory-structure.md修正箇所
1. **行225**: 「成功したトピック集計（投資教育特化）」→「成功したトピック集計（FX教育特化）」

### kaito-api.md修正箇所
1. **行5**: 「TwitterAPI.io統合による投資教育コンテンツ自動投稿システム」→「TwitterAPI.io統合によるFX教育コンテンツ自動投稿システム」

## 📝 実装手順
1. 各ファイルを順次読み込む
2. 指定された修正を実施
3. 修正は少ないが、ファイル全体の文脈を確認
4. FX特化の一貫性を保証

## ✅ 完了条件
- 指定された修正が正確に実施されている
- ドキュメント全体でFX特化の方向性が一貫している
- 技術仕様の正確性が維持されている

## 📋 報告書作成
実装完了後、`tasks/20250801_150706/reports/REPORT-003-fx-structure-kaito-update.md`に以下を含む報告書を作成：
- 修正した内容の詳細
- 各ドキュメントの整合性確認結果
- 追加で発見したFX特化すべき箇所（もしあれば）