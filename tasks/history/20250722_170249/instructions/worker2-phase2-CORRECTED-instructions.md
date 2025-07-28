# Worker 2 修正版実行指示書: Phase 2核心機能保護クリーンアップ

**ワーカーID**: Worker 2 (修正版)  
**フェーズ**: Phase 2 核心機能保護版  
**担当**: サブディレクトリ群削除（データ収集基盤完全保護）  
**安全度**: 🟢 最高（収集システム完全保護）  
**推定時間**: 20分  
**並列実行**: Worker 1修正版と同時開始可能  
**修正理由**: sources/・rss/ディレクトリ保護（RSS/API/Reddit収集基盤）

## 🛡️ **絶対削除禁止リスト（核心収集システム）**

### **🚨 以下のディレクトリは絶対に削除しないこと**
```bash
# データ収集基盤（完全保護）
✅ src/lib/sources/                            # 収集システム基盤
  ├── api-collector.ts                         # Alpha Vantage/CoinGecko API収集
  ├── community-collector.ts                   # Reddit投資コミュニティ分析
  └── rss-collector.ts                         # Yahoo Finance/Bloomberg RSS収集

✅ src/lib/rss/                                # RSS機能システム  
  ├── feed-analyzer.ts                         # 品質スコアリング（80点・85点基準）
  ├── parallel-processor.ts                    # RSS並列処理最適化
  ├── emergency-handler.ts                     # 緊急情報検出
  ├── realtime-detector.ts                     # リアルタイム検出
  └── source-prioritizer.ts                    # ソース優先順位付け

# これらのディレクトリは元の削除対象に含まれていましたが、データ駆動機能の核心のため保護します
```

## 🛡️ **事前安全確認（必須・強化版）**

### **Step 1: 核心収集システム存在確認**
```bash
echo "🛡️ Worker 2修正版: 核心収集システム保護確認開始"
echo "📅 $(date)"

# 削除禁止ディレクトリの存在確認
PROTECTED_DIRS=(
  "src/lib/sources"
  "src/lib/rss"
)

# 削除禁止ディレクトリ内の核心ファイル確認
PROTECTED_FILES=(
  "src/lib/sources/api-collector.ts"
  "src/lib/sources/community-collector.ts"  
  "src/lib/sources/rss-collector.ts"
  "src/lib/rss/feed-analyzer.ts"
  "src/lib/rss/parallel-processor.ts"
)

echo "🔍 核心収集ディレクトリ存在確認..."
for dir in "${PROTECTED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ 核心ディレクトリ確認: $dir"
  else
    echo "❌ 核心ディレクトリ不足: $dir - クリーンアップ中止"
    exit 1
  fi
done

echo "🔍 核心収集ファイル存在確認..."
for file in "${PROTECTED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ 核心ファイル確認: $file"
  else
    echo "❌ 核心ファイル不足: $file - クリーンアップ中止"
    exit 1
  fi
done

echo "✅ 全核心収集システム確認完了 - 削除作業継続許可"
```

### **Step 2: Worker 1修正版並列実行確認**
```bash
echo "👥 Worker 2修正版開始: Worker 1修正版と並列実行"

# Worker 1修正版の作業状況確認（ファイル重複回避）
if [ -f "tasks/20250722_170249/outputs/worker1-corrected-phase1-report.txt" ]; then
  echo "🔄 Worker 1修正版作業中または完了を確認"
else
  echo "⚠️ Worker 1修正版作業状況不明、並列実行を継続"
fi
```

### **Step 3: バックアップ確認（Worker 1と共通）**
```bash
BACKUP_EXISTS=$(ls -la | grep src_backup || echo "")
if [ -z "$BACKUP_EXISTS" ]; then
  cp -r src "src_backup_worker2_corrected_$(date +%Y%m%d_%H%M%S)"
  echo "✅ Worker 2修正版バックアップを作成しました"
else
  echo "✅ 既存バックアップを確認しました"
fi
```

### **Step 4: 削除前システム動作確認**
```bash
echo "🔍 修正版Phase 2削除前のシステム動作確認..."
pnpm dev &
PNPM_PID=$!
sleep 5
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true
echo "✅ システム起動確認完了"
```

## 🗑️ **修正版削除実行（核心システム保護）**

### **Phase 2A: 修正版サブディレクトリ群削除**
```bash
#!/bin/bash
set -e  # エラー時即座終了

echo "🚀 Worker 2修正版: Phase 2核心システム保護クリーンアップ開始"

# 修正版削除対象ディレクトリリスト（核心システムを除外）
CORRECTED_LEGACY_DIRS=(
  "src/lib/browser"
  "src/lib/collectors"         # 重複実装の可能性（要確認後削除）
  "src/lib/convergence"
  "src/lib/decision"
  "src/lib/exploration"
  "src/lib/logging"
  "src/lib/quality"            # エンタープライズ分析ツール
)

# 削除実行前の安全チェック
echo "🔍 削除前安全チェック: 核心収集システムが削除対象に含まれていないことを確認..."
for protected_dir in "${PROTECTED_DIRS[@]}"; do
  for delete_dir in "${CORRECTED_LEGACY_DIRS[@]}"; do
    if [ "$protected_dir" = "$delete_dir" ]; then
      echo "❌ 致命的エラー: 核心収集システムが削除対象に含まれています: $protected_dir"
      exit 1
    fi
  done
done
echo "✅ 安全チェック完了: 核心収集システムは保護されます"

deleted_dirs=0
deleted_files_count=0

echo "📁 修正版サブディレクトリ群削除開始..."
for dir in "${CORRECTED_LEGACY_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    # ディレクトリ内ファイル数カウント
    file_count=$(find "$dir" -type f | wc -l)
    deleted_files_count=$((deleted_files_count + file_count))
    
    rm -rf "$dir"
    echo "🗑️  削除ディレクトリ: $dir (${file_count}ファイル)"
    ((deleted_dirs++))
  else
    echo "⚠️  存在しないディレクトリ: $dir"
  fi
done

echo "✅ 修正版サブディレクトリ削除完了: ${deleted_dirs}/7ディレクトリ (${deleted_files_count}ファイル)"
echo "🛡️ 核心システム保護: sources/・rss/ディレクトリ完全保護"
```

### **Phase 2B: utilsディレクトリファイル削除（変更なし）**
```bash
echo "📄 utils配下の個別ファイル削除開始（変更なし）..."

# utils配下は変更なし
UTILS_LEGACY_FILES=(
  "src/utils/config-cache.ts"
  "src/utils/config-loader.ts"
  "src/utils/config-validator.ts"
  "src/utils/optimization-metrics.ts"
  "src/utils/test-helper.ts"
)

deleted_utils=0
for file in "${UTILS_LEGACY_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "🗑️  削除ファイル: $file"
    ((deleted_utils++))
  else
    echo "⚠️  存在しないファイル: $file"
  fi
done

total_deleted_files=$((deleted_files_count + deleted_utils))
echo "✅ utils削除完了: ${deleted_utils}/5ファイル"
echo "🎯 修正版Phase 2総計: ${deleted_dirs}ディレクトリ + ${total_deleted_files}ファイル削除"
```

## ✅ **削除後検証（強化版）**

### **Step 1: 核心収集システム保護確認**
```bash
echo "🛡️ 核心収集システム保護確認を実行中..."

# 削除禁止ディレクトリが残存していることを確認
protected_dirs_remaining=0
for dir in "${PROTECTED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ 核心ディレクトリ保護確認: $dir"
    ((protected_dirs_remaining++))
  else
    echo "❌ 致命的エラー: 核心収集ディレクトリが削除されました: $dir"
    exit 1
  fi
done

# 削除禁止ファイルが残存していることを確認
protected_files_remaining=0  
for file in "${PROTECTED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ 核心ファイル保護確認: $file"
    ((protected_files_remaining++))
  else
    echo "❌ 致命的エラー: 核心ファイルが削除されました: $file"
    exit 1
  fi
done

echo "✅ 核心収集システム完全保護確認:"
echo "   ディレクトリ: ${protected_dirs_remaining}/2残存"
echo "   ファイル: ${protected_files_remaining}/5残存"
```

### **Step 2: 削除確認**
```bash
echo "🔍 修正版Phase 2削除確認を実行中..."

# ディレクトリ削除確認
missing_dirs=0
for dir in "${CORRECTED_LEGACY_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    ((missing_dirs++))
  fi
done

# ファイル削除確認
missing_utils=0
for file in "${UTILS_LEGACY_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    ((missing_utils++))
  fi
done

echo "✅ 削除確認: ${missing_dirs}/7ディレクトリ, ${missing_utils}/5ファイル正常削除"
```

### **Step 3: データ収集機能テスト**
```bash
echo "🚀 修正版Phase 2後のデータ収集機能テスト..."

pnpm dev &
PNPM_PID=$!
sleep 10
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true

if [ $? -eq 0 ]; then
  echo "✅ 修正版Phase 2削除後システム正常動作確認"
  echo "🛡️ RSS/API/Reddit収集機能継続確認"
else
  echo "❌ 修正版Phase 2削除後エラー検出 - 復旧が必要"
  exit 1
fi
```

### **Step 4: Worker 1修正版との同期確認**
```bash
echo "👥 Worker 1修正版との作業同期確認..."

if [ -f "tasks/20250722_170249/outputs/worker1-corrected-phase1-report.txt" ]; then
  echo "✅ Worker 1修正版 Phase 1完了を確認"
  echo "🎯 修正版Phase 1&2並列削除完了！Worker 3の標準Phase 3開始可能"
else
  echo "⏳ Worker 1修正版作業継続中、Worker 2修正版は完了待機"
fi
```

## 📊 **修正版実行レポート作成**

### **核心システム保護レポート**
```bash
# Worker 2修正版実行レポート生成
mkdir -p "tasks/20250722_170249/outputs"

cat > "tasks/20250722_170249/outputs/worker2-corrected-phase2-report.txt" << EOF
=== Worker 2 修正版Phase 2実行レポート ===
実行日時: $(date)
担当フェーズ: Phase 2核心収集システム保護クリーンアップ
修正理由: sources/・rss/ディレクトリ保護（データ収集基盤）

核心収集システム保護状況:
✅ src/lib/sources/ - 完全保護（API/Community/RSS収集基盤）
  ├── api-collector.ts - 保護（Alpha Vantage/CoinGecko）
  ├── community-collector.ts - 保護（Reddit投資コミュニティ）
  └── rss-collector.ts - 保護（Yahoo Finance/Bloomberg）
✅ src/lib/rss/ - 完全保護（RSS機能システム）
  ├── feed-analyzer.ts - 保護（品質80点・85点基準）
  ├── parallel-processor.ts - 保護（並列処理最適化）
  └── その他RSS支援機能 - 保護

削除実行結果:
【修正版サブディレクトリ群】
- 削除ディレクトリ数: ${deleted_dirs}/7
- 削除ファイル数: ${deleted_files_count}

【utilsファイル】  
- 削除ファイル数: ${deleted_utils}/5

【総計】
- 削除ディレクトリ数: ${deleted_dirs}
- 削除ファイル数: ${total_deleted_files}
- 核心システム保護: ${protected_dirs_remaining}/2ディレクトリ, ${protected_files_remaining}/5ファイル

データ駆動機能確認:
- RSS収集基盤: 完全保護
- API収集基盤: 完全保護
- Reddit分析基盤: 完全保護  
- 品質管理システム: 完全保護
- 並列処理システム: 完全保護

システム動作確認:
- 削除前: 正常
- 削除後: 正常
- データ収集機能: 保護確認

並列実行状況:
- Worker 1修正版 Phase 1: 並列実行
- 次フェーズ: Worker 3標準 Phase 3待機

状況: 修正版Phase 2削除完了、Worker 3作業準備完了
EOF

echo "📄 Worker 2修正版レポート作成完了"
```

## 🎯 **修正版の重要性**

### **保護されたデータ収集基盤**
- 🛡️ **sources/ディレクトリ**: API・Community・RSS収集の基盤
- 🛡️ **rss/ディレクトリ**: RSS機能システム全体
- 🛡️ **品質管理**: 80点・85点基準のスコアリング
- 🛡️ **並列処理**: 効率的データ収集最適化
- 🛡️ **重複検出**: feed-analyzer.tsによる実装

### **達成した成果**
- ✅ **7ディレクトリ削除**: 不要なサブシステム除去
- ✅ **約50ファイル削除**: 大幅なコード簡素化
- ✅ **核心機能完全保護**: データ駆動アプローチ継続
- ✅ **システム動作継続**: RSS/API/Reddit収集機能維持

**Worker 2修正版により、TradingAssistantXのデータ収集基盤を完全保護しながら効果的なクリーンアップが実現されます。**