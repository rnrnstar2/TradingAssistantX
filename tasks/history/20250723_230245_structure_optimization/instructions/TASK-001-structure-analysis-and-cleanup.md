# TASK-001 構造分析・不要ファイル削除

## 🎯 タスク目標
REQUIREMENTS.mdに完全準拠した完璧なディレクトリ・ファイル構造の実現

## 📋 権限・制約確認
- **Worker権限**: 実装・削除作業許可
- **出力先制限**: `tasks/outputs/`, `data/learning/`, `data/context/`のみ
- **重要**: REQUIREMENTS.md構造に存在しないファイル・ディレクトリは全て削除

## 🔍 現状分析結果

### src/ディレクトリ 構造違反ファイル（削除対象）

#### 削除対象ディレクトリ全体：
```bash
src/adapters/                    # 要件定義に存在しない
src/collectors/                  # 要件定義に存在しない  
src/interfaces/                  # 要件定義に存在しない
src/core/execution/              # 要件定義に存在しない
src/utils/maintenance/           # 要件定義に存在しない
```

#### 削除対象個別ファイル：
```bash
# core/ 不要ファイル
src/core/module-dispatcher.ts
src/core/prompt-context-manager.ts
src/core/trigger-monitor.ts

# services/ 不要ファイル  
src/services/x-auth-manager.ts
src/services/x-poster-v2.ts

# types/ 不要ファイル（要件外）
src/types/config-types.ts
src/types/data-types.ts
src/types/post-types.ts
src/types/x-api-types.ts
src/types/yaml-types.ts

# utils/ 不要ファイル
src/utils/context-compressor.ts
src/utils/context-serializer.ts
src/utils/json-processor.ts
src/utils/module-registry.ts
src/utils/twitter-api-auth.ts
src/utils/yaml-utils.ts
```

### src/ディレクトリ REQUIREMENTS.md準拠構造

#### 必要ファイル確認（修正・保持）：
```bash
# core/ - 3ファイルのみ
src/core/claude-autonomous-agent.ts  # 既存・確認要
src/core/decision-engine.ts          # 既存・確認要  
src/core/loop-manager.ts             # 既存・確認要

# services/ - 4ファイルのみ
src/services/content-creator.ts      # 既存・確認要
src/services/kaito-api-manager.ts    # 既存・確認要
src/services/x-poster.ts             # 既存・確認要
src/services/performance-analyzer.ts # 既存・確認要

# types/ - 4ファイルのみ  
src/types/claude-types.ts            # 既存・確認要
src/types/core-types.ts              # 既存・確認要
src/types/kaito-api-types.ts         # 既存・確認要
src/types/index.ts                   # 既存・確認要

# utils/ - 2ファイルのみ
src/utils/logger.ts                  # 既存・確認要
src/utils/type-guards.ts             # 既存・確認要

# scripts/ - 2ファイルのみ
src/scripts/dev.ts                   # 既存・確認要
src/scripts/main.ts                  # 既存・確認要
```

### data/ディレクトリ 構造違反（削除・再構築）

#### 削除対象ディレクトリ：
```bash
data/archives/                       # 要件定義に存在しない
data/browser-sessions/               # 要件定義に存在しない
data/current/                        # 要件定義に存在しない
```

#### 削除対象ファイル：
```bash
data/posting-data.yaml               # ルート配置不可
data/strategic-decisions.yaml        # ルート配置不可
```

#### 必要ディレクトリ・ファイル作成：
```bash
# config/ - 既存保持
data/config/api-config.yaml         # 既存・保持

# learning/ - 3ファイル必須
data/learning/decision-patterns.yaml    # 新規作成
data/learning/success-strategies.yaml   # 新規作成  
data/learning/error-lessons.yaml        # 新規作成

# context/ - 2ファイル必須
data/context/session-memory.yaml        # 新規作成
data/context/strategy-evolution.yaml    # 新規作成
```

## 🔧 実装手順

### Phase 1: 不要ファイル・ディレクトリ削除
1. **src/不要ディレクトリ削除**:
   ```bash
   rm -rf src/adapters/
   rm -rf src/collectors/
   rm -rf src/interfaces/
   rm -rf src/core/execution/
   rm -rf src/utils/maintenance/
   ```

2. **src/不要ファイル削除**:
   ```bash
   # core/
   rm src/core/module-dispatcher.ts
   rm src/core/prompt-context-manager.ts  
   rm src/core/trigger-monitor.ts
   
   # services/
   rm src/services/x-auth-manager.ts
   rm src/services/x-poster-v2.ts
   
   # types/
   rm src/types/config-types.ts
   rm src/types/data-types.ts
   rm src/types/post-types.ts
   rm src/types/x-api-types.ts
   rm src/types/yaml-types.ts
   
   # utils/
   rm src/utils/context-compressor.ts
   rm src/utils/context-serializer.ts
   rm src/utils/json-processor.ts
   rm src/utils/module-registry.ts
   rm src/utils/twitter-api-auth.ts
   rm src/utils/yaml-utils.ts
   ```

3. **data/不要構造削除**:
   ```bash
   rm -rf data/archives/
   rm -rf data/browser-sessions/  
   rm -rf data/current/
   rm data/posting-data.yaml
   rm data/strategic-decisions.yaml
   ```

### Phase 2: 必要構造作成
1. **data/learning/ディレクトリ・ファイル作成**:
   ```bash
   mkdir -p data/learning/
   # 基本的なYAMLファイル作成（空の構造）
   ```

2. **data/context/ディレクトリ・ファイル作成**:
   ```bash
   mkdir -p data/context/
   # 基本的なYAMLファイル作成（空の構造）
   ```

### Phase 3: 構造整合性確認
1. **構造検証**:
   ```bash
   # src/ディレクトリ構造確認
   find src/ -type f -name "*.ts" | sort
   
   # data/ディレクトリ構造確認  
   find data/ -type f -name "*.yaml" | sort
   ```

2. **REQUIREMENTS.md準拠確認**:
   - 定義されたファイルのみ存在することを確認
   - 不要ファイルが完全に削除されていることを確認

## 📊 成功基準
- [ ] src/ディレクトリがREQUIREMENTS.md完全準拠（13ファイルのみ）
- [ ] data/ディレクトリがREQUIREMENTS.md完全準拠（6ファイルのみ）
- [ ] 不要ファイル・ディレクトリ0個
- [ ] 新規必要ファイル作成完了

## 📋 報告要件
完了後、以下を含む報告書を作成：
- 削除したファイル・ディレクトリ一覧
- 作成したファイル・ディレクトリ一覧  
- 最終構造確認結果
- 構造整合性検証結果

**報告書出力先**: `tasks/20250723_230245_structure_optimization/reports/REPORT-001-structure-cleanup.md`