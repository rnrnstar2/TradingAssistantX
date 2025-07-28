# Worker チーム 包括的作業指示書

**作成日時**: 2025-07-22 20:59:27  
**作成者**: Manager  
**対象**: Worker チーム  
**プロジェクト**: TradingAssistantX src/ディレクトリ最適化  
**緊急度**: High Priority  

## 🎯 プロジェクト概要

REQUIREMENTS.mdで定義された**疎結合設計原則**と**MVP構造**に基づき、現在の複雑化したsrc/ディレクトリを理想的な構造に最適化する大規模リファクタリング作業。

### 現状の問題
- 要件定義比で**3倍のファイル数**（38ファイル過剰）
- **疎結合設計原則からの逸脱**
- **MVP（RSS Collector中心）からの乖離**
- **core-runner.tsの複雑化**

## 📋 作業前準備

### A. 必須読み込みファイル
1. **REQUIREMENTS.md** - プロジェクト要件定義（必読）
2. **作業指示書** - 以下3つの指示書を熟読
   - `src-structure-optimization-plan.md`
   - `core-runner-simplification-guide.md`
   - `unnecessary-files-cleanup-guide.md`

### B. 権限確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
# ROLE: worker を確認
```

### C. 作業ブランチ作成
```bash
git checkout -b feature/src-optimization-$(date +%Y%m%d)
```

## 🚀 実行計画（3段階）

## Phase 1: 緊急構造整理 (High Priority)

### 1A. RSS機能の統合
**目標**: 分散したRSS機能を`collectors/rss-collector.ts`に統合

**実施手順**:
1. `src/rss/`内の全ファイル分析
   ```bash
   ls -la src/rss/
   # emergency-handler.ts, feed-analyzer.ts, parallel-processor.ts, 
   # realtime-detector.ts, source-prioritizer.ts
   ```

2. 各ファイルの機能を`collectors/rss-collector.ts`に統合
   - クラスメソッドとして実装
   - base-collector継承関係を維持
   - CollectionResult型インターフェースを保持

3. インポート文の修正
   - 他ファイルからのsrc/rss/*への参照を修正
   - collectors/rss-collector.tsへのパス変更

4. 統合後確認
   ```bash
   pnpm dev  # 動作確認
   ```

5. ディレクトリ削除
   ```bash
   rm -rf src/rss/
   ```

### 1B. 意思決定ロジックの集約
**目標**: 分散した意思決定を`core/decision-engine.ts`に統合

**実施手順**:
1. `src/decision/`内のファイル分析・統合
   - collection-strategy-selector → SystemDecisionEngineクラス
   - execution-monitor → SystemDecisionEngineクラス
   - quality-maximizer → SystemDecisionEngineクラス
   - resource-allocator → SystemDecisionEngineクラス
   - site-profiler → SystemDecisionEngineクラス

2. YAML駆動の条件分岐強化
   - 実装固定化された設定をYAML移行
   - 「簡単な分岐実装」を実現

3. 統合後確認・削除
   ```bash
   pnpm dev  # 動作確認
   rm -rf src/decision/
   ```

### 1C. 余分なスクリプト削除
**目標**: 要件違反のスクリプトファイル削除

**実施手順**:
```bash
# 削除対象確認
ls -la src/scripts/
# autonomous-runner-single.ts, autonomous-runner.ts を確認

# 他ファイルからの参照確認（ない場合は削除）
grep -r "autonomous-runner" src/

# 削除実行
rm src/scripts/autonomous-runner-single.ts
rm src/scripts/autonomous-runner.ts

# 動作確認
pnpm dev
```

## Phase 2: 中規模構造整理 (Medium Priority)

### 2A. エンジンシステムの整理
**目標**: `src/engines/`の統合・削除

**実施手順**:
1. **統合マッピング**:
   - autonomous-exploration-engine → `core/autonomous-executor.ts`
   - content-convergence-engine → `services/content-creator.ts`
   - context-compression-system → `utils/context-compressor.ts`
   - lightweight-decision-engine → `core/decision-engine.ts`
   - convergence/* → `services/content-creator.ts`

2. 統合実行・動作確認
   ```bash
   pnpm dev  # 各統合後に確認
   ```

3. ディレクトリ削除
   ```bash
   rm -rf src/engines/
   ```

### 2B. core-runner.tsの簡素化
**目標**: 複雑フローを理想の6ステップに簡素化

**実施手順**:
1. **新runSingle()実装**:
   ```typescript
   async runSingle(): Promise<void> {
     // Phase 1: シンプルなアカウント分析
     const accountAnalysis = await this.analyzeAccount();
     
     // Phase 2: 投稿作成・実行
     const postResult = await this.createAndPost(accountAnalysis);
     
     // Phase 3: 効果測定（新規追加）
     await this.measurePostEffectiveness(postResult);
     
     // Phase 4: データ最適化（新規追加）
     await this.optimizeDataStorage();
   }
   ```

2. **複雑処理削除**:
   - `generateBaselineContext()` + `step2_executeParallelAnalysis()` → `analyzeAccount()`に統合
   - `IntegratedContext`構築削除
   - 複数フォールバック処理を統一

3. **新機能追加**:
   - `measurePostEffectiveness()`実装
   - `optimizeDataStorage()`実装

4. 動作確認
   ```bash
   pnpm dev  # 簡素化後の動作確認
   ```

### 2C. managers/の統合・削除
**実施手順**:
1. **統合マッピング**:
   - browser/* → `utils/playwright-browser-manager.ts`
   - resource/* → `services/data-optimizer.ts`
   - daily-action-planner → `core/loop-manager.ts`
   - posting-manager → `services/x-poster.ts`

2. 統合後削除
   ```bash
   rm -rf src/managers/
   ```

## Phase 3: 最終整理 (Low Priority)

### 3A. types/ディレクトリの分散統合
**実施手順**:
1. **統合マッピング**:
   - collection-types → `collectors/base-collector.ts`
   - content-types → `services/content-creator.ts`
   - decision-types → `core/decision-engine.ts`
   - integration-types → `core/autonomous-executor.ts`
   - system-types → `core/autonomous-executor.ts`

2. 削除
   ```bash
   rm -rf src/types/
   ```

### 3B. その他余分ディレクトリ削除
**実施手順**:
```bash
# 統合後削除
rm -rf src/exploration/  # collectors/に統合済み
rm -rf src/logging/      # MVPでは不要
rm -rf src/providers/    # services/に統合済み
rm -rf src/utils/monitoring/  # MVP不要
```

### 3C. utils/ファイルの最小化
**実施手順**:
1. **保持ファイル**（要件準拠）:
   - `yaml-manager.ts` ✅
   - `context-compressor.ts` ✅
   - `playwright-browser-manager.ts` ✅（新規統合）

2. **統合・削除**:
   ```bash
   # config関連を yaml-manager.ts に統合後削除
   rm src/utils/config-cache.ts
   rm src/utils/config-manager.ts
   rm src/utils/config-validator.ts
   rm src/utils/error-handler.ts
   rm src/utils/file-size-monitor.ts
   rm src/utils/yaml-utils.ts
   ```

## 🏆 最終理想構造（確認用）

```
src/
├── core/                   # コアシステム（要件準拠）
│   ├── autonomous-executor.ts      # 自律実行エンジン（統合済み）
│   ├── decision-engine.ts         # 意思決定エンジン（統合済み）
│   └── loop-manager.ts           # ループ実行管理（統合済み）
├── collectors/             # データ収集（疎結合設計）
│   ├── rss-collector.ts          # RSS収集（統合済み）
│   ├── playwright-account.ts     # アカウント分析専用
│   └── base-collector.ts         # 基底クラス（統合済み）
├── services/               # ビジネスロジック（要件準拠）
│   ├── content-creator.ts        # 投稿コンテンツ生成（統合済み）
│   ├── data-optimizer.ts         # データ最適化（統合済み）
│   └── x-poster.ts              # X API投稿（統合済み）
├── utils/                  # ユーティリティ（最小限）
│   ├── yaml-manager.ts          # YAML読み書き（統合済み）
│   ├── context-compressor.ts    # コンテキスト圧縮（統合済み）
│   └── playwright-browser-manager.ts # Playwright管理（統合済み）
└── scripts/                # 実行スクリプト（要件準拠）
    ├── main.ts                  # ループ実行
    ├── dev.ts                   # 単一実行
    └── core-runner.ts           # 共通実行ロジック（簡素化）
```

## ⚠️ 重要な注意点・品質保証

### A. 統合作業時の注意
1. **機能保持**: 統合時に既存機能が失われないよう注意
2. **インポート修正**: 統合後のインポートパス変更を確実に
3. **型定義**: 型定義移動に伴うTypeScriptエラー解消
4. **テスト更新**: 統合に伴うテストケースの更新

### B. 各段階での確認事項
1. **動作確認**: 各統合後に`pnpm dev`で動作確認
2. **TypeScriptエラー**: `tsc --noEmit`でコンパイルエラーチェック
3. **依存関係**: 他ファイルからの参照切れがないか確認
4. **YAML設定**: data/ディレクトリのYAMLファイルとの整合性

### C. 削除前のセーフティチェック
```bash
# ファイル削除前の参照チェック例
grep -r "import.*from.*src/rss" src/  # RSS関連の参照確認
grep -r "import.*from.*src/decision" src/  # decision関連の参照確認
```

## 📊 成功指標

### 定量的指標
- ファイル数: **38ファイル削減**（要件の約10ファイルに）
- ディレクトリ数: **8ディレクトリ削除**（要件の4ディレクトリに）
- core-runner.ts: **複雑度50%削減**

### 定性的指標
- ✅ 疎結合設計原則への準拠
- ✅ MVP要件（RSS Collector中心）への回帰
- ✅ 将来拡張性の確保
- ✅ REQUIREMENTS.md完全準拠

## 🎯 完了報告

各Phaseの完了時に以下を報告:

### Phase完了時の報告形式
```
## Phase X 完了報告
- 統合済みファイル: X ファイル
- 削除済みファイル: X ファイル
- 削除済みディレクトリ: X ディレクトリ
- 動作確認: ✅ pnpm dev 成功
- TypeScriptエラー: ✅ なし
- 次Phase準備: ✅ 完了

## 問題点・注意事項
- 問題があれば記載

## 次のアクション
- Phase X+1 に進行準備完了
```

## 🏁 最終確認・提出

全Phase完了後:
1. **最終動作確認**:
   ```bash
   pnpm dev    # 単一実行
   # エラーなしを確認
   ```

2. **構造確認**:
   ```bash
   tree src/   # 理想構造との一致確認
   ```

3. **コミット準備**:
   ```bash
   git add .
   git commit -m "feat: src構造最適化完了 - REQUIREMENTS.md準拠

   - 38ファイル削減によりMVP構造に回帰
   - 疎結合設計原則準拠
   - core-runner.ts簡素化
   - 8余分ディレクトリ削除完了"
   ```

**この包括的な指示に従い、効率的かつ確実にsrc/ディレクトリ最適化を実現してください。**