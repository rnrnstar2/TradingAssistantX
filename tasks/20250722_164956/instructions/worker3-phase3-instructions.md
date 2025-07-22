# Worker 3 実行指示書: Phase 3開発ツール・テスト関連削除

**ワーカーID**: Worker 3  
**フェーズ**: Phase 3  
**担当**: 開発ツール・未使用型定義削除  
**安全度**: 🟢 高（開発補助ツールのみ）  
**推定時間**: 10分  
**実行条件**: Worker 1&2のPhase 1&2完了後

## 🎯 **ミッション**

scripts・typesディレクトリの開発ツール・未使用型定義を削除し、システムの最終的な洗練を実現する。

## ⏳ **事前条件確認（必須）**

### **Step 1: 前フェーズ完了確認**
```bash
echo "🔍 Worker 3開始: Phase 1&2完了確認"
echo "📅 $(date)"

# Worker 1完了確認
if [ -f "tasks/20250722_164956/outputs/worker1-phase1-report.txt" ]; then
  echo "✅ Worker 1 Phase 1完了確認"
else
  echo "❌ Worker 1未完了 - Phase 3開始不可"
  exit 1
fi

# Worker 2完了確認
if [ -f "tasks/20250722_164956/outputs/worker2-phase2-report.txt" ]; then
  echo "✅ Worker 2 Phase 2完了確認"
else
  echo "❌ Worker 2未完了 - Phase 3開始不可"
  exit 1
fi

echo "🚀 Phase 1&2完了確認、Phase 3実行開始"
```

### **Step 2: バックアップ確認**
```bash
# 既存バックアップ確認
BACKUP_EXISTS=$(ls -la | grep src_backup || echo "")
if [ -z "$BACKUP_EXISTS" ]; then
  echo "⚠️ バックアップが見つかりません - 新規作成"
  cp -r src "src_backup_worker3_$(date +%Y%m%d_%H%M%S)"
else
  echo "✅ 既存バックアップを確認しました"
fi
```

### **Step 3: Phase 1&2後システム動作確認**
```bash
echo "🔍 Phase 1&2後のシステム動作確認..."
pnpm dev &
PNPM_PID=$!
sleep 8
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true

if [ $? -eq 0 ]; then
  echo "✅ Phase 1&2後システム正常動作確認"
else
  echo "❌ Phase 1&2後エラー検出 - Phase 3実行不可"
  exit 1
fi
```

## 🗑️ **削除実行（開発ツール・型定義）**

### **Phase 3A: scripts配下開発ツール削除**
```bash
#!/bin/bash
set -e  # エラー時即座終了

echo "🚀 Worker 3: Phase 3開発ツール削除開始"

# 削除対象ファイルリスト（scripts配下）
SCRIPTS_LEGACY_FILES=(
  "src/scripts/baseline-measurement.ts"
  "src/scripts/oauth1-diagnostics.ts"
  "src/scripts/oauth1-test-connection.ts"
)

deleted_scripts=0
echo "🔧 scripts配下の開発ツール削除開始..."

for file in "${SCRIPTS_LEGACY_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "🗑️  削除開発ツール: $file"
    ((deleted_scripts++))
  else
    echo "⚠️  存在しないファイル: $file"
  fi
done

echo "✅ scripts削除完了: ${deleted_scripts}/3ファイル"
```

### **Phase 3B: types配下未使用型定義削除**
```bash
echo "📝 types配下の未使用型定義削除開始..."

# 削除対象ファイルリスト（types配下）
TYPES_LEGACY_FILES=(
  "src/types/browser-optimization-types.ts"
  "src/types/claude-tools.ts"
  "src/types/collection-common.ts"
  "src/types/content-strategy.ts"
  "src/types/convergence-types.ts"
  "src/types/decision-logging-types.ts"
  "src/types/decision-types.ts"
  "src/types/exploration-types.ts"
  "src/types/multi-source.ts"
  "src/types/posting-data.ts"
  "src/types/quality-perfection-types.ts"
  "src/types/rss-collection-types.ts"
  "src/types/workflow-types.ts"
)

deleted_types=0
for file in "${TYPES_LEGACY_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "🗑️  削除型定義: $file"
    ((deleted_types++))
  else
    echo "⚠️  存在しないファイル: $file"
  fi
done

total_deleted_phase3=$((deleted_scripts + deleted_types))
echo "✅ types削除完了: ${deleted_types}/13ファイル"
echo "🎯 Phase 3総計: ${total_deleted_phase3}ファイル削除"
```

## ✅ **削除後検証（必須）**

### **Step 1: 削除確認**
```bash
echo "🔍 Phase 3削除確認を実行中..."

# scripts削除確認
missing_scripts=0
for file in "${SCRIPTS_LEGACY_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    ((missing_scripts++))
  fi
done

# types削除確認  
missing_types=0
for file in "${TYPES_LEGACY_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    ((missing_types++))
  fi
done

echo "✅ 削除確認: scripts ${missing_scripts}/3, types ${missing_types}/13ファイル正常削除"
```

### **Step 2: TypeScript型エラーチェック**
```bash
echo "📝 TypeScript型エラーチェック実行..."

# TypeScript型チェック（tsxを使用）
tsx --check src/scripts/autonomous-runner-single.ts > /dev/null 2>&1
TS_CHECK_RESULT=$?

if [ $TS_CHECK_RESULT -eq 0 ]; then
  echo "✅ TypeScript型チェック正常"
else
  echo "⚠️ TypeScript型エラー検出 - 削除影響をチェック中..."
  # 型エラーの詳細出力
  tsx --check src/scripts/autonomous-runner-single.ts || true
  echo "📝 型エラー詳細を確認し、必要に応じて修正対応要"
fi
```

### **Step 3: システム動作確認**
```bash
echo "🚀 Phase 3後のシステム動作確認..."

pnpm dev &
PNPM_PID=$!
sleep 10
kill $PNPM_PID 2>/dev/null || true
wait $PNPM_PID 2>/dev/null || true

if [ $? -eq 0 ]; then
  echo "✅ Phase 3削除後システム正常動作確認"
  PHASE3_SUCCESS=true
else
  echo "❌ Phase 3削除後エラー検出"
  PHASE3_SUCCESS=false
fi
```

## 📊 **実行レポート作成**

### **Phase 3完了レポート**
```bash
# Worker 3実行レポート生成
mkdir -p "tasks/20250722_164956/outputs"

cat > "tasks/20250722_164956/outputs/worker3-phase3-report.txt" << EOF
=== Worker 3 Phase 3実行レポート ===
実行日時: $(date)
担当フェーズ: Phase 3開発ツール・テスト関連削除

前提条件確認:
- Worker 1 Phase 1: 完了確認
- Worker 2 Phase 2: 完了確認  
- Phase 1&2後システム: 正常動作確認

削除実行結果:
【scripts開発ツール】
- 削除ファイル数: ${deleted_scripts}/3

【types未使用型定義】
- 削除ファイル数: ${deleted_types}/13

【Phase 3総計】
- 削除ファイル数: ${total_deleted_phase3}/16

システム検証結果:
- TypeScript型チェック: $([ $TS_CHECK_RESULT -eq 0 ] && echo "正常" || echo "要確認")
- システム動作確認: $([ "$PHASE3_SUCCESS" = true ] && echo "正常" || echo "エラー")

次ステップ: Worker 4最終検証準備完了
状況: Phase 3削除完了、全削除フェーズ終了
EOF

echo "📄 Worker 3レポート作成完了"
```

## 🚨 **エラー時の緊急復旧**

### **型エラーまたはシステムエラー時**
```bash
emergency_recovery_phase3() {
  echo "🚨 緊急事態: Phase 3で型エラーまたはシステムエラー検出"
  echo "🔄 バックアップからの復旧を開始..."
  
  # 最新のバックアップ復旧
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
    
    echo "📞 Manager報告: Phase 3でエラー発生、復旧完了"
    echo "⚠️ Phase 1&2の作業状況も確認要"
    exit 1
  else
    echo "❌ 復旧失敗: バックアップが見つかりません"
    exit 1
  fi
}

# エラー時の自動復旧設定
if [ "$PHASE3_SUCCESS" != true ] || [ $TS_CHECK_RESULT -ne 0 ]; then
  echo "⚠️ Phase 3でエラー検出、復旧プロセス開始"
  emergency_recovery_phase3
fi
```

## 🎯 **実行手順まとめ**

### **コマンド実行順序**
```bash
# 1. 前フェーズ完了確認
echo "Step 1: Worker 1&2完了確認・バックアップ・システム動作確認"
# [前提条件確認コマンド実行]

# 2. Phase 3削除実行
echo "Step 2A: 3scripts開発ツール削除"
# [scripts削除コマンド実行]

echo "Step 2B: 13types未使用型定義削除"  
# [types削除コマンド実行]

# 3. 削除後検証
echo "Step 3: 削除確認・TypeScript型チェック・システム動作確認"
# [検証コマンド実行]

# 4. レポート作成
echo "Step 4: 実行レポート作成"
# [レポート生成]

echo "🎉 Worker 3 Phase 3完了！Worker 4最終検証開始準備完了"
```

## 📋 **チェックリスト**

- [ ] Worker 1&2完了確認
- [ ] バックアップ確認
- [ ] Phase 1&2後システム動作確認
- [ ] 3scripts開発ツール削除
- [ ] 13types未使用型定義削除
- [ ] TypeScript型エラーチェック
- [ ] システム動作確認
- [ ] 実行レポート作成

## ⏭️ **次ステップ**

Worker 3のPhase 3完了後：
1. **全削除フェーズ終了**: Phase 1, 2, 3すべて完了
2. **Worker 4開始許可**: 最終検証・テスト・総合レポート作成
3. **クリーンアップ完了準備**: 118 → 30ファイルの変革達成

**Worker 3の完了により、全削除フェーズが終了し、Worker 4の最終検証フェーズに移行します。**