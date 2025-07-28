# Worker 1 実行指示書: Phase 1高優先度レガシー削除

**ワーカーID**: Worker 1  
**フェーズ**: Phase 1  
**担当**: 高優先度レガシーファイル削除（28ファイル）  
**安全度**: 🟢 高（明確な削除候補のみ）  
**推定時間**: 15分  

## 🎯 **ミッション**

src/libディレクトリ内の明確なレガシーファイル28個を安全に削除し、システムの簡素化を実現する。

## 🛡️ **事前安全確認（必須）**

### **Step 1: バックアップ確認**
```bash
# バックアップの存在確認
ls -la | grep src_backup

# バックアップがない場合は作成
if [ ! -d "src_backup_$(date +%Y%m%d_%H%M%S)" ]; then
  cp -r src "src_backup_$(date +%Y%m%d_%H%M%S)"
  echo "✅ バックアップを作成しました"
fi
```

### **Step 2: 現在システム動作確認**
```bash
# 削除前の動作確認（必須）
echo "🔍 削除前のシステム動作確認..."
pnpm dev &
PNPM_PID=$!
sleep 5
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true
echo "✅ システム起動確認完了"
```

## 🗑️ **削除実行（28ファイル）**

### **高優先度レガシーファイル削除**
```bash
#!/bin/bash
set -e  # エラー時即座終了

echo "🚀 Worker 1: Phase 1高優先度レガシー削除開始"
echo "📅 $(date)"

# 削除対象ファイルリスト
LEGACY_FILES=(
  "src/lib/autonomous-exploration-engine.ts"
  "src/lib/async-execution-manager.ts"
  "src/lib/claude-controlled-collector.ts"
  "src/lib/claude-error-fixer.ts"
  "src/lib/claude-optimized-provider.ts"
  "src/lib/claude-tools.ts"
  "src/lib/content-convergence-engine.ts"
  "src/lib/context-compression-system.ts"
  "src/lib/data-communication-system.ts"
  "src/lib/decision-logger.ts"
  "src/lib/execution-orchestrator.ts"
  "src/lib/expanded-action-executor.ts"
  "src/lib/fx-api-collector.ts"
  "src/lib/fx-structured-site-collector.ts"
  "src/lib/growth-system-manager.ts"
  "src/lib/information-evaluator.ts"
  "src/lib/intelligent-resource-manager.ts"
  "src/lib/long-running-task-manager.ts"
  "src/lib/memory-optimizer.ts"
  "src/lib/minimal-decision-engine.ts"
  "src/lib/minimal-logger.ts"
  "src/lib/multi-source-collector.ts"
  "src/lib/parallel-execution-manager.ts"
  "src/lib/playwright-account-collector.ts"
  "src/lib/posting-manager.ts"
  "src/lib/quality-perfection-system.ts"
  "src/lib/realtime-info-collector.ts"
  "src/lib/rss-parallel-collection-engine.ts"
  "src/lib/x-performance-analyzer.ts"
)

# 削除実行
deleted_count=0
for file in "${LEGACY_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "🗑️  削除: $file"
    ((deleted_count++))
  else
    echo "⚠️  存在しないファイル: $file"
  fi
done

echo "✅ Phase 1完了: ${deleted_count}/28ファイル削除"
```

## ✅ **削除後検証（必須）**

### **Step 1: ファイル削除確認**
```bash
echo "🔍 削除確認を実行中..."

# 削除されたファイルが存在しないことを確認
NOT_FOUND_COUNT=0
for file in "${LEGACY_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    ((NOT_FOUND_COUNT++))
  fi
done

echo "✅ 削除確認: ${NOT_FOUND_COUNT}/28ファイル正常削除"
```

### **Step 2: システム動作確認**
```bash
echo "🚀 Phase 1後のシステム動作確認..."

# システム起動テスト
pnpm dev &
PNPM_PID=$!
sleep 10
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true

if [ $? -eq 0 ]; then
  echo "✅ Phase 1削除後システム正常動作確認"
else
  echo "❌ Phase 1削除後エラー検出 - 復旧が必要"
  exit 1
fi
```

## 📊 **実行レポート作成**

### **削除結果ログ**
```bash
# 実行レポート生成
cat > "tasks/20250722_164956/outputs/worker1-phase1-report.txt" << EOF
=== Worker 1 Phase 1実行レポート ===
実行日時: $(date)
担当フェーズ: Phase 1高優先度レガシー削除
削除対象: 28ファイル

削除実行結果:
- 削除成功: ${deleted_count}ファイル
- 削除失敗: $((28 - deleted_count))ファイル

システム動作確認:
- 削除前: 正常
- 削除後: 正常

次のフェーズ: Worker 2のPhase 2完了を待機
状況: Phase 1削除完了、Worker 2の作業継続中
EOF

echo "📄 Worker 1レポート作成完了"
```

## 🚨 **エラー時の緊急復旧**

### **システムエラー検出時**
```bash
# エラー検出時の自動復旧
emergency_recovery() {
  echo "🚨 緊急事態: システムエラー検出"
  echo "🔄 バックアップからの復旧を開始..."
  
  # 最新のバックアップを探して復旧
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
    
    echo "📞 Manager報告: Phase 1でエラー発生、復旧完了"
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
# 1. 事前安全確認
echo "Step 1: バックアップ確認とシステム動作確認"
# [上記コマンド実行]

# 2. Phase 1削除実行
echo "Step 2: 28ファイル削除実行"
# [削除コマンド実行]

# 3. 削除後検証
echo "Step 3: 削除確認とシステム動作確認"
# [検証コマンド実行]

# 4. レポート作成
echo "Step 4: 実行レポート作成"
# [レポート生成]

echo "🎉 Worker 1 Phase 1完了！Worker 2の作業継続を確認してください"
```

## 📋 **チェックリスト**

- [ ] バックアップ作成確認
- [ ] 削除前システム動作確認  
- [ ] 28ファイル削除実行
- [ ] 削除後システム動作確認
- [ ] 実行レポート作成
- [ ] Worker 2への連携確認

## ⏭️ **次ステップ**

Worker 1のPhase 1完了後：
1. Worker 2のPhase 2完了を待機
2. Worker 3のPhase 3開始の準備
3. Worker 4の最終検証準備

**Worker 1は独立してPhase 1を実行し、他のワーカーと並列で作業を進めます。**