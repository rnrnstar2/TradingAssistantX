# TradingAssistantX

Claude Code SDK運用指示書

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
- ✅ **例外**: `tasks/{TIMESTAMP}/instructions/`配下の指示書作成のみWrite許可
- 🚫 **禁止**: プロダクションコード（src/）の実装・編集

### Worker権限
- ✅ **許可**: `docs/roles/worker-role.md`読み込み → 要件定義に従った実装
- ✅ **出力先**: `data/current/`, `data/learning/`, `data/archives/`, `tasks/outputs/`のみ
- 🚫 **禁止**: 要件定義にないファイル・ディレクトリ作成

## ⚠️ **要件定義逸脱防止機構**

### 実装前必須チェック
1. **構造チェック**: 作成・編集するファイルがREQUIREMENTS.mdに記載されているか
2. **ディレクトリチェック**: 適切な階層（src/, data/, tests/, docs/）に配置するか
3. **命名チェック**: 要件定義に記載された名前を使用しているか
4. **依存関係チェック**: 疎結合設計に従っているか

### 自動検証コマンド
```bash
# 構造検証（実装予定）
src/utils/integrity-checker.ts

# ファイル数・サイズ制限確認
du -sh data/current/ data/learning/
ls data/current/ | wc -l  # 20ファイル上限
```

## 🎯 **Claude自律原則**
- **状況判断**: 現在状況を分析し最適行動を自律決定
- **品質最優先**: 制限なし、妥協禁止
- **データ駆動**: `data/`配下YAML制御
- **要件遵守**: REQUIREMENTS.mdが最優先、逸脱は即座に修正

## 📂 **重要場所**
- **要件定義**: `REQUIREMENTS.md` - システム仕様（必読）
- **設定**: `data/config/` - YAML設定（読み取り専用）
- **実行**: `pnpm dev` - 単一実行、`pnpm start` - ループ実行
- **出力**: `tasks/outputs/` のみ許可

## 🚫 **絶対禁止事項**

### 構造違反
- ❌ REQUIREMENTS.mdにないファイル・ディレクトリの作成
- ❌ data/config/の設定ファイル自動追加
- ❌ ルートディレクトリへの直接ファイル作成
- ❌ src/内への無断ファイル追加

### 権限違反
- ❌ Manager権限でのプロダクションコード実装
- ❌ 権限確認なしでの作業開始
- ❌ 要件定義書未確認での実装

### データ違反
- ❌ モックデータ・テストモードの使用
- ❌ 実データ（REAL_DATA_MODE=true）以外の使用
- ❌ 階層別サイズ制限違反（current: 1MB, learning: 10MB）

## ✅ **実行時チェックリスト**

実装・編集前に必須確認：
- [ ] ROLE環境変数確認完了
- [ ] REQUIREMENTS.md読み込み完了
- [ ] 対象ファイルが要件定義に記載されている
- [ ] 出力先がdata/またはtasks/outputs/配下
- [ ] 疎結合設計原則に従っている
- [ ] モックデータを使用していない