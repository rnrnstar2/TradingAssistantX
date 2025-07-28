# TASK-002: 依存関係分析

## 目的
utils/ディレクトリから削除予定のファイルに依存している箇所を特定し、移行計画を立案する

## 背景
REQUIREMENTS.mdのMVP原則に基づき、以下のファイルを削除する必要があります：
- src/utils/error-handler.ts
- src/utils/yaml-manager.ts  
- src/utils/yaml-utils.ts
- src/utils/monitoring/health-check.ts
- src/utils/monitoring/resource-monitor.ts

## 作業内容

### 1. 依存関係の調査
以下のツールを使用して、削除予定ファイルをインポートしている箇所を特定してください：

```bash
# Grepツールを使用して依存関係を検索
# error-handler.tsの依存
grep -r "from.*error-handler" src/ --include="*.ts" --include="*.tsx"
grep -r "import.*error-handler" src/ --include="*.ts" --include="*.tsx"

# yaml-manager.tsの依存
grep -r "from.*yaml-manager" src/ --include="*.ts" --include="*.tsx"
grep -r "import.*yaml-manager" src/ --include="*.ts" --include="*.tsx"

# yaml-utils.tsの依存
grep -r "from.*yaml-utils" src/ --include="*.ts" --include="*.tsx"
grep -r "import.*yaml-utils" src/ --include="*.ts" --include="*.tsx"

# health-check.tsの依存
grep -r "from.*health-check" src/ --include="*.ts" --include="*.tsx"
grep -r "import.*health-check" src/ --include="*.ts" --include="*.tsx"

# resource-monitor.tsの依存
grep -r "from.*resource-monitor" src/ --include="*.ts" --include="*.tsx"
grep -r "import.*resource-monitor" src/ --include="*.ts" --include="*.tsx"
```

### 2. 分析結果の整理
発見した依存関係を以下の形式でまとめてください：

```yaml
dependencies:
  error-handler:
    files:
      - path: "src/example/file.ts"
        line: 5
        usage: "handleError関数を使用"
    total_count: X
    
  yaml-manager:
    files:
      - path: "src/example/other.ts"
        line: 10
        usage: "YamlManager.load()を使用"
    total_count: Y
    
  # ... 他のファイルも同様に
```

### 3. 移行計画の立案
各依存関係に対して、以下の移行方法を提案してください：

- **error-handler.ts** → 標準のtry-catchに置き換え
- **yaml-manager.ts/yaml-utils.ts** → js-yaml直接使用に置き換え
- **health-check.ts/resource-monitor.ts** → 機能削除（MVP不要機能）

### 4. 報告書作成
分析結果を `tasks/20250723_170500_utils_cleanup/reports/REPORT-002-dependency-analysis.md` に保存してください。

## 期待される成果物
- 依存関係の完全なリスト
- 各ファイルの移行方法の提案
- 作業優先順位の提案

## 注意事項
- REQUIREMENTS.mdのMVP原則を厳守すること
- 不要な複雑性を避け、シンプルな解決策を選択すること
- 疎結合設計の原則を維持すること