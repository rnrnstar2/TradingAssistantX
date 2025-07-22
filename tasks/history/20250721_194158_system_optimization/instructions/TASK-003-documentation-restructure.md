# TASK-003: ドキュメント構造最適化・統合実装

## 🎯 実装目標
16個のmarkdownファイルを7個以下に統合し、コンテキスト効率を最大化したドキュメント構造を構築します。

## 📊 現状分析
```
現在のファイル数: 16個
目標ファイル数: 7個以下
削減率: 60%以上
```

## 🚀 実装要件

### 1. ファイル削除・統合計画

#### 📋 **削除対象ファイル** (8個)
```bash
# 固定ワークフロー関連（固定プロセス除去）
docs/guides/autonomous-system-workflow.md
docs/guides/optimized-workflow-operations.md

# 重複・冗長情報
docs/x-system-guide.md                    # CLAUDE.mdと重複
docs/guides/decision-logging.md           # 過剰ログ記録
docs/guides/claude-notification-guide.md  # 非必須機能

# 細分化されすぎた情報
docs/setup.md                             # operations.mdに統合
docs/architecture.md                      # reference.mdに統合
docs/guides/README.md                     # メタファイル
```

#### 🔄 **統合対象ファイル** (4個→2個)
```bash
# 設定・運用統合
docs/setup.md + docs/operations.md → docs/quick-guide.md

# 技術詳細統合  
docs/architecture.md + docs/reference.md → docs/technical-docs.md
```

### 2. 新ドキュメント構造

#### 📁 **最終構成** (7個)
```
docs/
├── ESSENTIALS.md              # メイン（CLAUDE.md置換）
├── quick-guide.md             # 設定・運用統合版
├── technical-docs.md          # 技術詳細統合版
├── roles/
│   ├── manager-role.md        # 保持（簡素化）
│   └── worker-role.md         # 保持（簡素化）  
└── guides/
    ├── output-management-rules.md  # 保持（重要）
    └── deletion-safety-rules.md    # 保持（重要）
```

### 3. ESSENTIALS.md実装

#### CLAUDE.md完全置換版
```markdown
# TradingAssistantX

X（Twitter）投資教育コンテンツの価値創造システム

## ⚡ 起動確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```

## 📋 役割別
- **Manager**: `docs/roles/manager-role.md`
- **Worker**: `docs/roles/worker-role.md`

## 🎯 実行方針
**Claude主導**: 現在状況→自律判断→最適実行
**品質最優先**: 制限なし、妥協禁止  
**データ駆動**: `data/`配下YAML制御

## 📂 重要配置
- **設定**: `data/` - YAML設定
- **実行**: `pnpm dev`
- **出力**: `tasks/outputs/` のみ

## 🚫 禁止
- ルート出力
- 品質妥協  
- 固定プロセス強制

詳細: `docs/quick-guide.md`
```

### 4. quick-guide.md実装

#### setup.md + operations.md統合版
```markdown
# クイックガイド

## 🔧 セットアップ
```bash
# 環境変数設定
export ANTHROPIC_API_KEY="your_key"
export X_API_KEY="your_key"  
export ROLE="manager"  # or worker

# 実行
pnpm install
pnpm dev
```

## 🎮 運用
- **自動実行**: 96分間隔で自動投稿
- **手動実行**: `pnpm dev`で単発実行
- **状態確認**: ログで状況把握

## 🚨 トラブルシューティング  
- **API制限**: 時間待機
- **投稿失敗**: ログ確認
- **システム異常**: 再起動

## ⚙️ 設定調整
`data/autonomous-config.yaml`で動作制御

詳細: `docs/technical-docs.md`
```

### 5. technical-docs.md実装

#### architecture.md + reference.md統合版  
```markdown
# 技術ドキュメント

## 🏗️ システム構成
- **Core**: 自律実行エンジン (`src/core/`)
- **Lib**: 情報収集・分析 (`src/lib/`)
- **Data**: YAML設定管理 (`data/`)

## 🔧 主要コンポーネント
- `AutonomousExecutor`: 自律実行制御
- `ActionSpecificCollector`: 情報収集
- `DecisionEngine`: 判断エンジン

## 📋 コマンドリファレンス
```bash
pnpm dev        # 単発実行
pnpm test       # テスト実行
pnpm lint       # 品質チェック
```

## 🛠️ 開発ガイド
TypeScript strict mode必須
```

### 6. 役割ファイル簡素化

#### manager-role.md簡素化
```markdown
# Manager Role

## 🎯 責務
- セッション管理・指示書作成
- Worker統率・品質確保
- git操作・統合管理

## 🚫 制限
**実装作業完全禁止** - 調査・管理のみ

## 📋 プロセス
1. 要件分析
2. 指示書作成  
3. Worker統率
4. 品質確認

詳細手順は実際の作業で柔軟判断
```

#### worker-role.md簡素化
```markdown
# Worker Role

## 🎯 責務  
- 指示書に基づく実装
- 品質確保・テスト
- 報告書作成

## ✅ 基準
- TypeScript strict準拠
- ESLint/Prettier通過
- 機能動作確認

## 📋 プロセス
1. 指示書読解
2. 実装実行
3. 品質確認
4. 報告書作成

具体手順は指示書で提供
```

## 📋 実装手順

### Phase 1: ファイル削除
1. 削除対象8ファイルのバックアップ作成
2. 削除対象ファイルの除去実行
3. 参照エラーの確認・修正

### Phase 2: 統合ファイル作成
1. ESSENTIALS.md作成（CLAUDE.md置換）
2. quick-guide.md作成（setup+operations統合）
3. technical-docs.md作成（architecture+reference統合）

### Phase 3: 役割ファイル簡素化
1. manager-role.md簡素化
2. worker-role.md簡素化
3. 不要な詳細記述の除去

### Phase 4: 整合性確認
1. 新ドキュメント構造の動作確認
2. 参照リンクの修正
3. 全体整合性の検証

## ⚠️ 制約・注意事項

### 情報損失防止
- 重要な設定・手順情報は保持
- 参照されている情報の適切な移管
- バックアップによる復旧可能性

### 段階実行
- 一度に全削除せず段階的実行
- 各段階での動作確認
- 問題発生時の即座対応

## ✅ 完了基準

1. **効率化達成**
   - ドキュメント数: 16→7個
   - 総文字数: 50%削減
   - 新構造での正常動作

2. **品質基準**
   - 必要情報の保持確認
   - 参照エラーの完全解決
   - 実際の使用での問題なし

3. **運用基準**
   - Manager/Worker各役割での利用可能性
   - Claude Codeでの効率的情報取得
   - メンテナンス性の向上

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_194158_system_optimization/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-003-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- ファイル削除・統合の詳細結果
- 新ドキュメント構造の検証結果
- 情報損失の有無確認
- 実際使用での効率向上効果

---

**統合品質**: 必要な情報は保持しつつ、効率的で使いやすいドキュメント構造を実現してください。