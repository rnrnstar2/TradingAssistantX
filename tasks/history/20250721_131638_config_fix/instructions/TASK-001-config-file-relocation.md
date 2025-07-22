# TASK-001 設定ファイル再配置・統一化指示書

## 🎯 **実装目標**

**config/autonomous-config.yamlをdata/ディレクトリに移動し、設定ファイル配置の一貫性を確保**

## 🚨 **解決すべき問題**

### **1. 設定ファイル配置の不整合**
```
❌ 現在の問題:
config/autonomous-config.yaml  # 単独配置で一貫性なし

✅ 統一すべき配置:
data/autonomous-config.yaml    # 他の設定ファイルと統一
data/account-config.yaml       # 既存
data/content-strategy.yaml     # 既存
data/posting-data.yaml         # 既存
```

### **2. YAML駆動開発原則違反**
- 全設定ファイルは`data/`ディレクトリ配下で統一管理すべき
- CLAUDE.mdに明記された「データ管理(data/)」原則に反している

## ✅ **実装内容**

### **Task A: ファイル移動とGit管理**

#### **A-1. ファイル移動実行**
```bash
# 1. 現在のファイル確認
ls -la config/autonomous-config.yaml

# 2. data/ディレクトリに移動
mv config/autonomous-config.yaml data/autonomous-config.yaml

# 3. 空になったconfigディレクトリ削除
rmdir config/

# 4. Git追跡更新
git add data/autonomous-config.yaml
git rm config/autonomous-config.yaml
```

#### **A-2. ファイル内容確認**
```yaml
# data/autonomous-config.yaml の現在の内容確認
execution:
  mode: "scheduled_posting"
  posting_interval_minutes: 96
  health_check_enabled: true
  maintenance_enabled: true

autonomous_system:
  max_parallel_tasks: 3
  context_sharing_enabled: true
  decision_persistence: false

claude_integration:
  sdk_enabled: true
  max_context_size: 50000

data_management:
  cleanup_interval: 3600000  # 1 hour in milliseconds
  max_history_entries: 100
```

### **Task B: 将来の参照パス準備**

#### **B-1. TypeScript型定義準備**
```typescript
// src/types/autonomous-config.ts (新規作成)
export interface AutonomousConfig {
  execution: {
    mode: 'scheduled_posting' | 'dynamic_analysis';
    posting_interval_minutes: number;
    health_check_enabled: boolean;
    maintenance_enabled: boolean;
  };
  autonomous_system: {
    max_parallel_tasks: number;
    context_sharing_enabled: boolean;
    decision_persistence: boolean;
  };
  claude_integration: {
    sdk_enabled: boolean;
    max_context_size: number;
  };
  data_management: {
    cleanup_interval: number;
    max_history_entries: number;
  };
}
```

#### **B-2. 設定ファイル読み込みユーティリティ準備**
```typescript
// src/utils/config-loader.ts (新規作成)
import { readFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { AutonomousConfig } from '../types/autonomous-config';

export function loadAutonomousConfig(): AutonomousConfig {
  const configPath = 'data/autonomous-config.yaml';
  
  if (!existsSync(configPath)) {
    throw new Error(`Autonomous config file not found: ${configPath}`);
  }
  
  const configContent = readFileSync(configPath, 'utf8');
  const config = yaml.load(configContent) as AutonomousConfig;
  
  // 設定値検証
  if (!config.execution || !config.autonomous_system) {
    throw new Error('Invalid autonomous config structure');
  }
  
  return config;
}

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousConfig = {
  execution: {
    mode: 'scheduled_posting',
    posting_interval_minutes: 96,
    health_check_enabled: true,
    maintenance_enabled: true
  },
  autonomous_system: {
    max_parallel_tasks: 3,
    context_sharing_enabled: true,
    decision_persistence: false
  },
  claude_integration: {
    sdk_enabled: true,
    max_context_size: 50000
  },
  data_management: {
    cleanup_interval: 3600000,
    max_history_entries: 100
  }
};
```

## 🔧 **技術制約**

### **ファイルシステム制約**
- 移動時のファイル内容保持必須
- Git履歴の適切な管理
- 権限・タイムスタンプの保持

### **型安全性確保**
- TypeScript strict mode対応
- 設定値の実行時検証
- デフォルト値の適切な設定

## 📋 **テスト要件**

### **動作確認項目**
1. **ファイル移動**: `data/autonomous-config.yaml`が正しく配置されているか
2. **内容保持**: 移動後もファイル内容が変更されていないか
3. **Git管理**: `git status`で適切に追跡されているか
4. **ディレクトリ**: 空の`config/`ディレクトリが削除されているか

### **確認方法**
```bash
# 1. ファイル確認
ls -la data/autonomous-config.yaml
cat data/autonomous-config.yaml

# 2. configディレクトリ確認（存在しないことを確認）
ls config/ 2>/dev/null || echo "config/ directory removed ✅"

# 3. Git状態確認
git status

# 4. ファイル内容比較（移動前後で同一であることを確認）
# 移動前の内容と比較
```

## 📁 **作業対象ファイル・ディレクトリ**

### **移動対象**
```
config/autonomous-config.yaml → data/autonomous-config.yaml
config/ (空ディレクトリ削除)
```

### **新規作成**
```
src/types/autonomous-config.ts
src/utils/config-loader.ts
```

### **Git操作**
```
git add data/autonomous-config.yaml
git rm config/autonomous-config.yaml
git add src/types/autonomous-config.ts
git add src/utils/config-loader.ts
```

## ✅ **完了基準**

1. **ファイル移動完了**: `data/autonomous-config.yaml`が正しく配置
2. **内容保持確認**: ファイル内容が変更されていない
3. **型定義作成**: TypeScript型定義が正しく作成
4. **Git管理適正**: 移動が適切にGitで管理されている
5. **ディレクトリ整理**: 不要な`config/`ディレクトリが削除

## 🚫 **実装禁止事項**

- ファイル内容の変更（移動のみ実行）
- 複雑な設定変更システムの追加
- 既存の他設定ファイルへの影響

## 📋 **報告書作成要件**

完了後、以下を含む報告書を作成：

1. **実行コマンドログ**: 全てのbashコマンドとその結果
2. **ファイル内容確認**: 移動前後のファイル内容比較
3. **Git状態確認**: git statusの結果
4. **作成ファイル一覧**: 新規作成した型定義・ユーティリティファイル

---

**重要**: この修正により、全ての設定ファイルがdata/ディレクトリに統一され、YAML駆動開発の原則に適合したシステム構成が実現されます。