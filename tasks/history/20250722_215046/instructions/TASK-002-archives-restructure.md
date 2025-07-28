# TASK-002-archives-restructure

## 🎯 タスク概要
archives/ディレクトリの複雑構造を要求仕様のシンプル月別アーカイブ構造に変更

## 📋 必須読み込み
**開始前に必ず実行:**
```bash
echo "ROLE: $ROLE" && git branch --show-current
```

**必須読み込みファイル:**
1. `REQUIREMENTS.md` - 要件定義（archives/構造仕様）
2. `CLAUDE.md` - プロジェクト指示書

## 🚨 重要制約
- **REQUIREMENTS.md準拠**: 月別アーカイブ構造（例：2024-01/, 2025-07/）
- **データ保護**: 重要データの損失防止
- **出力管理**: `tasks/20250722_215046/outputs/`のみ出力許可

## 📂 現在のarchives/構造

### 現在の複雑構造
```
archives/
├── 2025-07/
│   ├── actions/ (大量のファイル)
│   ├── analysis/ (大量のファイル)
│   ├── decisions/ (大量のファイル)
│   ├── performance/ (複数ファイル)
│   └── strategies/ (複数ファイル)
├── autonomous-sessions/ (大量のファイル)
├── config-backup/ (2ファイル)
├── context/ (3ファイル)
└── core/ (2ファイル)
```

## 🎯 要求仕様（REQUIREMENTS.md）

### 目標構造
```
archives/
└── 2025-07/          # 月別アーカイブのシンプル構造
    ├── [重要データのみ整理済み状態]
```

## 🔧 実行手順

### 1. 事前分析
```bash
# 現在の構造とファイル数確認
find /Users/rnrnstar/github/TradingAssistantX/data/archives -type f | wc -l
ls -la /Users/rnrnstar/github/TradingAssistantX/data/archives/
```

### 2. データ価値評価

#### 高価値データ（保持候補）
- `2025-07/performance/account-performance-history.yaml`
- `2025-07/strategies/detailed-strategies-2025-07.yaml`
- `config-backup/` (設定のバックアップ)
- `core/system-state.yaml`

#### 低価値データ（削除候補）
- `actions/` (大量の細かいファイル)
- `analysis/` (大量の一時分析ファイル)  
- `decisions/` (大量の決定ログ)
- `autonomous-sessions/` (セッション記録)
- `context/error-log*.yaml` (エラーログ)

### 3. 構造簡素化実行

```bash
# バックアップディレクトリ作成
mkdir -p /Users/rnrnstar/github/TradingAssistantX/tasks/20250722_215046/outputs/archives-backup

# 高価値データを2025-07/直下に整理
cd /Users/rnrnstar/github/TradingAssistantX/data/archives/2025-07
cp performance/account-performance-history.yaml ./
cp strategies/detailed-strategies-2025-07.yaml ./

# config-backupを2025-07/に統合
cp ../config-backup/* ./

# system-stateを2025-07/に統合
cp ../core/system-state.yaml ./

# 複雑なサブディレクトリを削除
rm -rf actions/
rm -rf analysis/
rm -rf decisions/
rm -rf performance/
rm -rf strategies/

# ルートレベルの不要ディレクトリ削除
cd /Users/rnrnstar/github/TradingAssistantX/data/archives
rm -rf autonomous-sessions/
rm -rf config-backup/
rm -rf context/
rm -rf core/
```

### 4. 最終構造確認
```bash
# 簡素化後の構造確認
find /Users/rnrnstar/github/TradingAssistantX/data/archives -type f | sort
```

## 🎯 目標最終構造

### 期待される結果
```
archives/
└── 2025-07/
    ├── account-performance-history.yaml
    ├── detailed-strategies-2025-07.yaml
    ├── mvp-config.yaml
    ├── multi-source-config.yaml
    └── system-state.yaml
```

## 📊 品質チェック

### 必須確認事項
1. ✅ archives/2025-07/のみ存在
2. ✅ 重要データが保持されている
3. ✅ 複雑なサブディレクトリが削除されている
4. ✅ ファイル数が大幅削減（目標：5-10ファイル以下）

### 成功基準
- **Before**: 50+ファイル、複雑なディレクトリ構造
- **After**: 5-10ファイル、月別アーカイブ構造

## 💡 データ価値判断基準

### 保持すべきデータ
- アカウントパフォーマンス履歴
- 成功した戦略データ
- 重要な設定バックアップ
- システム状態情報

### 削除可能データ
- 日次の細かい実行ログ
- 一時的な分析結果
- 大量の決定ログファイル
- エラーログ（最新以外）

## 📋 報告書作成
**作成場所:** `tasks/20250722_215046/reports/REPORT-002-archives-restructure.md`

**報告書内容:**
1. 削除前後のファイル数・構造比較
2. 保持されたデータとその理由
3. 削除されたデータとその理由
4. 最終構造の確認結果
5. Worker3への引き継ぎ事項

## 🚨 注意事項
- **慎重な削除**: 重要データの判断は慎重に
- **段階的実行**: 一気に削除せず、段階的に実行
- **Worker1との独立性**: archives/以外は触れない
- **完了報告**: 構造変更完了後、報告書作成必須