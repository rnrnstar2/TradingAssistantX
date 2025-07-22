# TASK-002 設定ファイル配置ルール・ドキュメント更新指示書

## 🎯 **実装目標**

**CLAUDE.mdとドキュメント全体に設定ファイル配置ルールを明記し、今後の混乱を防止**

## 🚨 **解決すべき問題**

### **1. 設定ファイル配置ルールの未明記**
- CLAUDE.mdに設定ファイル配置の明確なルールがない
- 開発者が判断に迷う状況を作り出している
- 一貫性のない配置が発生する可能性

### **2. YAML駆動開発原則の不完全な説明**
- 「全設定・データファイル」とあるが、具体的配置場所が不明確
- data/ディレクトリの役割と適用範囲の説明不足

## ✅ **実装内容**

### **Task A: CLAUDE.md更新**

#### **A-1. 設定ファイル配置ルール追加**
```markdown
## 🏗️ アーキテクチャ原則

### YAML駆動開発
本プロジェクトは**YAML駆動**のアーキテクチャを採用しています：

- **全設定・データファイル**: 人間が読みやすいYAML形式で管理
- **Claude Code SDK連携**: YAML形式での動的操作最適化
- **自己文書化**: コメント機能による構造化データ
- **実装ガイド**: `docs/guides/yaml-driven-development.md` **必読**

### 📂 **設定ファイル配置ルール（厳格遵守）**

**🚨 CRITICAL: 全ての設定・データファイルはdata/ディレクトリ配下に統一配置**

#### **配置原則**
- **✅ 配置場所**: `data/` ディレクトリ直下のみ
- **✅ ファイル形式**: `.yaml` 拡張子必須
- **🚫 禁止場所**: `config/`, `settings/`, ルートディレクトリ等

#### **設定ファイル分類**
```yaml
# システム設定
data/autonomous-config.yaml    # 自律システム設定
data/account-config.yaml       # アカウント設定

# コンテンツ戦略
data/content-strategy.yaml     # コンテンツ戦略設定
data/posting-data.yaml        # 投稿データ管理

# 履歴・分析データ（削除済みファイルの参考）
data/account-strategy.yaml    # アカウント戦略
data/growth-targets.yaml      # 成長目標
data/posting-history.yaml     # 投稿履歴
```

#### **命名規則**
- **設定ファイル**: `{機能名}-config.yaml`
- **戦略ファイル**: `{機能名}-strategy.yaml`
- **データファイル**: `{機能名}-data.yaml`
- **履歴ファイル**: `{機能名}-history.yaml`

```yaml
# 設定ファイル例
version: "1.0.0"
currentPhase: growth  # growth, engagement, authority, maintenance
objectives:
  primary: 価値創造に集中した実用的開発
```
```

#### **A-2. プロジェクト構成セクション更新**
```markdown
### データ管理 (data/)
**🚨 重要**: 全ての設定・データファイルはこのディレクトリに統一配置

- **システム設定**: autonomous-config.yaml
- **アカウント設定**: account-config.yaml, account-strategy.yaml
- **コンテンツ管理**: content-strategy.yaml, content-patterns.yaml
- **投稿データ**: posting-data.yaml, posting-history.yaml
- **成長管理**: growth-targets.yaml
- **コンテキスト**: context/ サブディレクトリ
- **履歴・メトリクス**: metrics-history/ サブディレクトリ
```

### **Task B: docs/guides/yaml-driven-development.md 新規作成**

#### **B-1. YAML駆動開発ガイド作成**
```markdown
# YAML駆動開発ガイド

## 🎯 概要

TradingAssistantXは全ての設定・データ管理をYAMLファイルで行う「YAML駆動開発」を採用しています。

## 📂 ファイル配置ルール

### **絶対ルール**
1. **全設定ファイル**: `data/` ディレクトリ直下のみ
2. **ファイル形式**: `.yaml` 拡張子必須
3. **禁止場所**: `config/`, `settings/`, ルートディレクトリ

### **配置例**
```
✅ 正しい配置:
data/autonomous-config.yaml
data/account-config.yaml
data/content-strategy.yaml

❌ 間違った配置:
config/autonomous-config.yaml
settings/account.yaml
autonomous-config.yaml (ルート)
```

## 🔧 実装パターン

### **TypeScript統合**
```typescript
// 型定義
export interface SystemConfig {
  version: string;
  mode: string;
  // ...
}

// 読み込みユーティリティ
import { readFileSync } from 'fs';
import yaml from 'js-yaml';

export function loadConfig<T>(filename: string): T {
  const path = `data/${filename}`;
  const content = readFileSync(path, 'utf8');
  return yaml.load(content) as T;
}

// 使用例
const config = loadConfig<SystemConfig>('autonomous-config.yaml');
```

### **ファイル命名規則**
- **設定**: `{機能}-config.yaml`
- **戦略**: `{機能}-strategy.yaml`
- **データ**: `{機能}-data.yaml`
- **履歴**: `{機能}-history.yaml`

## 🚨 注意事項

1. **新規設定ファイル作成時**: 必ずdata/ディレクトリに配置
2. **既存ファイル参考**: 他の設定ファイルの構造を参考にする
3. **Git管理**: 設定ファイルは必ずGit管理下に置く
4. **バックアップ**: 重要な設定変更前はバックアップを作成

## 🔄 移行手順

既存のconfig/ディレクトリの設定ファイルを発見した場合：
1. data/ディレクトリに移動
2. 参照箇所のパス修正
3. Git操作で適切に管理
4. 空になったconfigディレクトリ削除
```

### **Task C: 関連ドキュメント更新**

#### **C-1. docs/guides/README.md 更新**
設定ファイル配置ルールへの参照を追加

#### **C-2. docs/common/naming-conventions.md 更新**
YAML設定ファイルの命名規則を追加

## 🔧 **技術制約**

### **ドキュメント品質基準**
- Markdown形式の適切な使用
- 明確で具体的な例示
- 実用的なコードサンプル
- エラーを防ぐ具体的なルール

### **情報の一貫性**
- 全ドキュメント間での用語統一
- 矛盾のない説明
- 最新情報の反映

## 📋 **テスト要件**

### **ドキュメント確認項目**
1. **CLAUDE.md**: 設定ファイル配置ルールが明記されているか
2. **yaml-driven-development.md**: 実用的なガイドになっているか
3. **命名規則**: 具体的で分かりやすいか
4. **一貫性**: 他ドキュメントとの矛盾がないか

### **確認方法**
```bash
# 1. ドキュメント確認
cat CLAUDE.md | grep -A 20 "設定ファイル配置ルール"
cat docs/guides/yaml-driven-development.md

# 2. リンク確認
grep -r "yaml-driven-development" docs/

# 3. 用語統一確認
grep -r "data/" docs/ | grep -i config
```

## 📁 **更新対象ファイル**

### **既存ファイル更新**
```
CLAUDE.md                               # 設定ルール明記
docs/guides/README.md                   # ガイドリンク追加
docs/common/naming-conventions.md       # 命名規則追加
```

### **新規ファイル作成**
```
docs/guides/yaml-driven-development.md  # YAML駆動開発ガイド
```

## ✅ **完了基準**

1. **CLAUDE.md更新**: 設定ファイル配置ルールが明確に記載
2. **新ガイド作成**: yaml-driven-development.mdが実用的内容で作成
3. **関連ドキュメント更新**: README.md、naming-conventions.md更新
4. **一貫性確保**: 全ドキュメント間で用語・ルールが統一
5. **実用性確認**: 開発者が迷わない明確なガイドライン

## 🚫 **実装禁止事項**

- 複雑すぎるルールの作成
- 実用性を損なう過度な制限
- 既存の有効なパターンとの矛盾

## 📋 **報告書作成要件**

完了後、以下を含む報告書を作成：

1. **更新内容一覧**: 各ファイルで追加・修正した内容
2. **新規作成ファイル**: yaml-driven-development.mdの内容サマリー
3. **一貫性チェック**: ドキュメント間の矛盾がないことの確認
4. **実用性評価**: 開発者が実際に使えるガイドになっているかの評価

---

**重要**: この更新により、設定ファイル配置に関する混乱が完全に解消され、一貫性のある開発環境が確立されます。