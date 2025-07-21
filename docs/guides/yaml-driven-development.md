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