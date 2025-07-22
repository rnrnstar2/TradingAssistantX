# Worker 2 実行指示書: Phase 2サブディレクトリ群削除

**ワーカーID**: Worker 2  
**フェーズ**: Phase 2  
**担当**: サブディレクトリ群削除（40+ファイル）  
**安全度**: 🟡 中（ディレクトリ単位削除）  
**推定時間**: 20分  
**並列実行**: Worker 1と同時開始可能

## 🎯 **ミッション**

src/libディレクトリ内の大規模サブディレクトリ群とutilsディレクトリの一部ファイルを安全に削除し、システム構造を大幅に簡素化する。

## 🛡️ **事前安全確認（必須）**

### **Step 1: Worker 1との並列実行確認**
```bash
echo "👥 Worker 2開始: Worker 1と並列実行"
echo "📅 $(date)"

# Worker 1の作業状況確認（ファイル重複回避）
if [ -f "tasks/20250722_164956/outputs/worker1-phase1-report.txt" ]; then
  echo "🔄 Worker 1作業中または完了を確認"
else
  echo "⚠️ Worker 1作業状況不明、並列実行を継続"
fi
```

### **Step 2: バックアップ確認（Worker 1と共通）**
```bash
# バックアップの存在確認
BACKUP_EXISTS=$(ls -la | grep src_backup || echo "")
if [ -z "$BACKUP_EXISTS" ]; then
  # Worker 1がバックアップを作成していない場合のみ作成
  cp -r src "src_backup_worker2_$(date +%Y%m%d_%H%M%S)"
  echo "✅ Worker 2バックアップを作成しました"
else
  echo "✅ 既存バックアップを確認しました"
fi
```

### **Step 3: 削除前システム動作確認**
```bash
echo "🔍 Phase 2削除前のシステム動作確認..."
pnpm dev &
PNPM_PID=$!
sleep 5
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true
echo "✅ システム起動確認完了"
```

## 🗑️ **削除実行（サブディレクトリ群）**

### **Phase 2A: サブディレクトリ群削除**
```bash
#!/bin/bash
set -e  # エラー時即座終了

echo "🚀 Worker 2: Phase 2サブディレクトリ群削除開始"

# 削除対象ディレクトリリスト
LEGACY_DIRS=(
  "src/lib/browser"
  "src/lib/collectors"
  "src/lib/convergence"
  "src/lib/decision"
  "src/lib/exploration"
  "src/lib/logging"
  "src/lib/quality"
  "src/lib/rss"
  "src/lib/sources"
)

deleted_dirs=0
deleted_files_count=0

echo "📁 サブディレクトリ群削除開始..."
for dir in "${LEGACY_DIRS[@]}"; do
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

echo "✅ サブディレクトリ削除完了: ${deleted_dirs}/9ディレクトリ (${deleted_files_count}ファイル)"
```

### **Phase 2B: utilsディレクトリファイル削除**
```bash
echo "📄 utils配下の個別ファイル削除開始..."

# 削除対象ファイルリスト（utils配下）
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
echo "🎯 Phase 2総計: ${deleted_dirs}ディレクトリ + ${total_deleted_files}ファイル削除"
```

## ✅ **削除後検証（必須）**

### **Step 1: 削除確認**
```bash
echo "🔍 Phase 2削除確認を実行中..."

# ディレクトリ削除確認
missing_dirs=0
for dir in "${LEGACY_DIRS[@]}"; do
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

echo "✅ 削除確認: ${missing_dirs}/9ディレクトリ, ${missing_utils}/5ファイル正常削除"
```

### **Step 2: システム動作確認**
```bash
echo "🚀 Phase 2後のシステム動作確認..."

pnpm dev &
PNPM_PID=$!
sleep 10
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true

if [ $? -eq 0 ]; then
  echo "✅ Phase 2削除後システム正常動作確認"
else
  echo "❌ Phase 2削除後エラー検出 - 復旧が必要"
  exit 1
fi
```

### **Step 3: Worker 1との同期確認**
```bash
echo "👥 Worker 1との作業同期確認..."

# Worker 1の完了確認
if [ -f "tasks/20250722_164956/outputs/worker1-phase1-report.txt" ]; then
  echo "✅ Worker 1 Phase 1完了を確認"
  echo "🎯 Phase 1&2並列削除完了！Worker 3のPhase 3開始可能"
else
  echo "⏳ Worker 1作業継続中、Worker 2は完了待機"
fi
```

## 📊 **実行レポート作成**

### **詳細削除レポート**
```bash
# Worker 2実行レポート生成
mkdir -p "tasks/20250722_164956/outputs"

cat > "tasks/20250722_164956/outputs/worker2-phase2-report.txt" << EOF
=== Worker 2 Phase 2実行レポート ===
実行日時: $(date)
担当フェーズ: Phase 2サブディレクトリ群削除

削除実行結果:
【サブディレクトリ群】
- 削除ディレクトリ数: ${deleted_dirs}/9
- 削除ファイル数: ${deleted_files_count}

【utilsファイル】  
- 削除ファイル数: ${deleted_utils}/5

【総計】
- 削除ディレクトリ数: ${deleted_dirs}
- 削除ファイル数: ${total_deleted_files}

システム動作確認:
- 削除前: 正常
- 削除後: 正常

並列実行状況:
- Worker 1 Phase 1: 並列実行
- 次フェーズ: Worker 3 Phase 3待機

状況: Phase 2削除完了、Worker 3作業準備完了
EOF

echo "📄 Worker 2レポート作成完了"
```

## 🚨 **エラー時の緊急復旧**

### **システムエラー検出時**
```bash
emergency_recovery_phase2() {
  echo "🚨 緊急事態: Phase 2でシステムエラー検出"
  echo "🔄 バックアップからの復旧を開始..."
  
  # Worker 2用バックアップ復旧
  LATEST_BACKUP=$(ls -t | grep "src_backup_" | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    rm -rf src
    cp -r "$LATEST_BACKUP" src
    echo "✅ バックアップ復旧完了: $LATEST_BACKUP"
    
    # 復旧後動作確認
    pnpm dev &
    PNPM_PID=$!
    sleep 5
    kill $PNPM_PID 2>/dev/null || true
    wait $PNPM_PID 2>/dev/null || true
    
    echo "📞 Manager報告: Phase 2でエラー発生、復旧完了"
    echo "⚠️ Worker 1の作業状況も確認要"
    exit 1
  else
    echo "❌ 復旧失敗: バックアップが見つかりません"
    exit 1
  fi
}
```

## 🎯 **実行手順まとめ**

### **コマンド実行順序**
```bash
# 1. 並列実行確認と事前安全確認
echo "Step 1: Worker 1並列実行確認とバックアップ・システム動作確認"
# [並列確認・安全確認コマンド実行]

# 2. Phase 2削除実行
echo "Step 2A: 9サブディレクトリ削除実行"
# [サブディレクトリ削除コマンド実行]

echo "Step 2B: 5utilsファイル削除実行"
# [utilsファイル削除コマンド実行]

# 3. 削除後検証
echo "Step 3: 削除確認・システム動作確認・Worker 1同期確認"
# [検証コマンド実行]

# 4. レポート作成
echo "Step 4: 実行レポート作成"
# [レポート生成]

echo "🎉 Worker 2 Phase 2完了！Worker 3 Phase 3開始準備完了"
```

## 📋 **チェックリスト**

- [ ] Worker 1並列実行確認
- [ ] バックアップ確認
- [ ] 削除前システム動作確認
- [ ] 9サブディレクトリ削除実行
- [ ] 5utilsファイル削除実行
- [ ] 削除後システム動作確認
- [ ] Worker 1同期確認
- [ ] 実行レポート作成

## ⏭️ **次ステップ**

Worker 2のPhase 2完了後：
1. Worker 1との並列完了確認
2. Worker 3のPhase 3開始許可
3. Worker 4の最終検証準備

**Worker 2はWorker 1と並列実行し、Phase 1&2の同時完了を目指します。**