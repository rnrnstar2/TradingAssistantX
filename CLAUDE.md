# TradingAssistantX

Claude Code SDK運用指示書

## 📚 **開発方針：ドキュメント駆動開発**

このプロジェクトは**ドキュメント駆動開発**を採用しています。

### ドキュメント最優先原則
- **ドキュメントファースト**: 実装前に必ずドキュメントを作成・更新
- **仕様書が真実**: ドキュメントと実装が異なる場合、ドキュメントを正とする
- **変更は文書から**: コード変更前に必ず関連ドキュメントを更新
- **整合性維持**: 実装とドキュメントの完全な一致を常に保証

### 主要ドキュメント階層
1. **REQUIREMENTS.md** - システム要件定義（最上位）
2. **docs/ディレクトリ** - 各種仕様書・設計書
   - `directory-structure.md` - プロジェクト構造詳細
   - `claude.md` - Claude SDK仕様・エンドポイント設計
   - `kaito-api.md` - KaitoAPI認証・エンドポイント仕様
   - `workflow.md` - ワークフロー実行詳細
3. **CLAUDE.md** - 運用指示書（このファイル）

## 🚨 **必須：作業開始前チェック**

### 1. 権限確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**権限確認完了まで作業開始禁止**

### 2. 要件定義書確認
```bash
# REQUIREMENTS.mdの最新確認
cat REQUIREMENTS.md | head -20
```
**REQUIREMENTS.md未読での作業禁止**

### 3. 構造整合性確認
```bash
# ディレクトリ構造がREQUIREMENTS.mdと一致するか確認
ls -la src/ data/
```

## 📋 **権限別行動原則**

### Manager権限
- ✅ **許可**: `docs/roles/manager-role.md`読み込み → 指示書作成・Worker統率
- ✅ **ドキュメント編集許可**: 
  - `REQUIREMENTS.md` - 要件定義書の修正・改善
  - `*.md` - 全ドキュメントファイルの編集
  - `docs/` - ドキュメントディレクトリ配下の全ファイル
  - `tasks/{TIMESTAMP}/instructions/` - 指示書作成
- 🚫 **禁止**: プロダクションコード（src/）の実装・編集

### Worker権限
- ✅ **許可**: `docs/roles/worker-role.md`読み込み → ドキュメントに従った実装
- ✅ **出力先**: `data/current/`, `data/learning/`, `data/archives/`, `tasks/outputs/`のみ
- 🚫 **禁止**: `docs/directory-structure.md`にないファイル・ディレクトリ作成

## ⚠️ **要件定義逸脱防止機構**

### 実装前必須チェック
1. **構造チェック**: 作成・編集するファイルが`docs/directory-structure.md`に記載されているか
2. **ディレクトリチェック**: 適切な階層（src/, data/, tests/, docs/）に配置するか
3. **命名チェック**: ドキュメントに記載された名前を使用しているか
4. **依存関係チェック**: 疎結合設計に従っているか

### 自動検証コマンド
```bash
# ファイル数・サイズ制限確認
du -sh data/current/ data/learning/
ls data/current/ | wc -l  # 20ファイル上限
```

## 🎯 **Claude自律原則**
- **ドキュメント駆動**: ドキュメントを基準とした開発・実装
- **状況判断**: 現在状況を分析し最適行動を自律決定
- **品質最優先**: 制限なし、妥協禁止
- **データ駆動**: `data/`配下YAML制御
- **要件遵守**: REQUIREMENTS.mdが最優先、逸脱は即座に修正

## 📂 **重要場所**
- **要件定義**: `REQUIREMENTS.md` - システム仕様（必読）
- **技術仕様書**: 
  - `docs/claude.md` - Claude SDK実装時に参照
  - `docs/kaito-api.md` - KaitoAPI実装時に参照
  - `docs/workflow.md` - ワークフロー実装時に参照
- **設定**: `data/config/` - YAML設定（読み取り専用）
- **実行**: `pnpm dev` - 単一実行、`pnpm start` - ループ実行
- **出力**: `tasks/outputs/` のみ許可

## 🚫 **絶対禁止事項**

### 構造違反
- ❌ `docs/directory-structure.md`にないファイル・ディレクトリの作成
- ❌ data/config/の設定ファイル自動追加
- ❌ ルートディレクトリへの直接ファイル作成
- ❌ src/内への無断ファイル追加

### 権限違反
- ❌ Manager権限でのプロダクションコード（src/）実装・編集
- ❌ 権限確認なしでの作業開始
- ❌ ドキュメント未確認での実装
- ❌ Manager権限でのWorker専用ディレクトリ編集

### データ違反
- ❌ モックデータ・テストモードの使用（本番実行時）
- ❌ テスト以外でのモックAPI使用
- ❌ 階層別サイズ制限違反（current: 1MB, learning: 10MB）

## ✅ **実行時チェックリスト**

実装・編集前に必須確認：
- [ ] ROLE環境変数確認完了
- [ ] REQUIREMENTS.md読み込み完了
- [ ] 対象ファイルが`docs/directory-structure.md`に記載されている、またはドキュメント系ファイル（Manager権限時）
- [ ] 出力先がdata/またはtasks/outputs/配下、またはドキュメント系（Manager権限時）
- [ ] 疎結合設計原則に従っている
- [ ] モックデータを使用していない

### Manager権限時の追加チェック
- [ ] ドキュメント編集対象確認（REQUIREMENTS.md、*.md、docs/配下）
- [ ] プロダクションコード（src/）への変更は禁止
- [ ] Worker専用ディレクトリへの変更は禁止