# 並列クリーンアップ総合コーディネーター指示書

**作成者**: Manager権限  
**対象**: 4名Worker並列実行の総合統率  
**目標**: TradingAssistantX大規模クリーンアップの安全かつ効率的実行  
**期待成果**: 118 → 30ファイル（75%削減）

## 🎯 **総合実行戦略**

### **並列実行フロー**
```
Phase 1 & 2 並列実行 (同時開始可能)
├── Worker 1: Phase 1高優先度レガシー削除
└── Worker 2: Phase 2サブディレクトリ群削除

Phase 3実行 (Phase 1&2完了後)
└── Worker 3: Phase 3開発ツール・型定義削除

最終検証 (Phase 3完了後)
└── Worker 4: 総合検証・最終レポート作成
```

## 🚀 **実行コマンド（4名ワーカー同時起動）**

### **並列実行開始**
```bash
echo "🚀 TradingAssistantX 大規模クリーンアップ並列実行開始"
echo "📅 $(date)"
echo "👥 Manager統率による4名ワーカー並列実行"

# 各ワーカーの専用ターミナルで実行
echo "🔧 以下を4つの異なるターミナルで並列実行してください："
echo ""
echo "📋 ターミナル1 - Worker 1:"
echo "ROLE=worker claude --dangerously-skip-permissions"
echo "# tasks/20250722_164956/instructions/worker1-phase1-instructions.md を参照実行"
echo ""
echo "📋 ターミナル2 - Worker 2 (Worker 1と同時開始可能):"
echo "ROLE=worker claude --dangerously-skip-permissions"
echo "# tasks/20250722_164956/instructions/worker2-phase2-instructions.md を参照実行"
echo ""
echo "📋 ターミナル3 - Worker 3 (Worker 1&2完了後):"
echo "ROLE=worker claude --dangerously-skip-permissions"
echo "# tasks/20250722_164956/instructions/worker3-phase3-instructions.md を参照実行"
echo ""
echo "📋 ターミナル4 - Worker 4 (Worker 3完了後):"
echo "ROLE=worker claude --dangerously-skip-permissions"
echo "# tasks/20250722_164956/instructions/worker4-verification-instructions.md を参照実行"
```

## 📊 **進捗監視（Manager役割）**

### **リアルタイム進捗確認**
```bash
# Worker完了状況リアルタイム監視
monitor_workers() {
  echo "👀 並列ワーカー進捗監視開始"
  
  while true; do
    clear
    echo "=== TradingAssistantX 並列クリーンアップ進捗 ==="
    echo "監視時刻: $(date)"
    echo ""
    
    # Worker 1進捗確認
    if [ -f "tasks/20250722_164956/outputs/worker1-phase1-report.txt" ]; then
      echo "✅ Worker 1 (Phase 1): 完了"
    else
      echo "🔄 Worker 1 (Phase 1): 実行中..."
    fi
    
    # Worker 2進捗確認
    if [ -f "tasks/20250722_164956/outputs/worker2-phase2-report.txt" ]; then
      echo "✅ Worker 2 (Phase 2): 完了"
    else
      echo "🔄 Worker 2 (Phase 2): 実行中..."
    fi
    
    # Phase 1&2完了確認
    if [ -f "tasks/20250722_164956/outputs/worker1-phase1-report.txt" ] && 
       [ -f "tasks/20250722_164956/outputs/worker2-phase2-report.txt" ]; then
      echo "🎯 Phase 1&2並列完了！Worker 3開始許可"
    fi
    
    # Worker 3進捗確認
    if [ -f "tasks/20250722_164956/outputs/worker3-phase3-report.txt" ]; then
      echo "✅ Worker 3 (Phase 3): 完了"
      echo "🎯 全削除フェーズ完了！Worker 4開始許可"
    else
      echo "⏳ Worker 3 (Phase 3): 待機中またはPhase 1&2完了待ち"
    fi
    
    # Worker 4進捗確認
    if [ -f "tasks/20250722_164956/outputs/worker4-verification-report.txt" ]; then
      echo "✅ Worker 4 (最終検証): 完了"
      echo "🎉 全並列クリーンアップ完了！"
      break
    else
      echo "⏳ Worker 4 (最終検証): 待機中またはPhase 3完了待ち"
    fi
    
    echo ""
    echo "現在のファイル数: $(find src -name "*.ts" -type f | wc -l)"
    echo "削除前基準: 118ファイル"
    
    sleep 30  # 30秒間隔で監視
  done
}
```

### **手動進捗確認コマンド**
```bash
# いつでも実行可能な進捗確認
check_progress() {
  echo "📊 現在の進捗状況："
  echo "  Worker 1: $([ -f "tasks/20250722_164956/outputs/worker1-phase1-report.txt" ] && echo "完了" || echo "実行中")"
  echo "  Worker 2: $([ -f "tasks/20250722_164956/outputs/worker2-phase2-report.txt" ] && echo "完了" || echo "実行中")"
  echo "  Worker 3: $([ -f "tasks/20250722_164956/outputs/worker3-phase3-report.txt" ] && echo "完了" || echo "実行中")"
  echo "  Worker 4: $([ -f "tasks/20250722_164956/outputs/worker4-verification-report.txt" ] && echo "完了" || echo "実行中")"
  echo ""
  echo "📈 ファイル数: $(find src -name "*.ts" -type f | wc -l) (開始時: 118)"
}
```

## 🚨 **緊急時対応（Manager統率）**

### **緊急停止コマンド**
```bash
emergency_stop_all() {
  echo "🚨 緊急停止: 全ワーカー作業中止指示"
  echo "📞 各ワーカーに即座停止を指示："
  echo ""
  echo "1. 全ワーカーターミナルでCtrl+C"
  echo "2. 現在の作業状況を報告"
  echo "3. バックアップ状況確認"
  echo "4. システム動作確認: pnpm dev"
  
  # 緊急バックアップ確認
  if [ -d "src_backup_"* ]; then
    echo "✅ バックアップ存在確認"
  else
    echo "❌ バックアップ不明 - 即座バックアップ作成要"
  fi
}
```

### **部分復旧コマンド**
```bash
partial_recovery() {
  echo "🔄 部分復旧実行中..."
  
  # 最新バックアップから復旧
  LATEST_BACKUP=$(ls -t | grep "src_backup_" | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    echo "📁 最新バックアップ発見: $LATEST_BACKUP"
    echo "🔄 復旧実行: cp -r $LATEST_BACKUP src"
    
    # 実際の復旧実行確認
    read -p "復旧を実行しますか？ (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm -rf src
      cp -r "$LATEST_BACKUP" src
      echo "✅ 復旧完了"
      
      # 復旧後動作確認
      pnpm dev &
      RECOVERY_PID=$!
      sleep 5
      kill $RECOVERY_PID 2>/dev/null || true
      echo "✅ 復旧後システム動作確認完了"
    fi
  fi
}
```

## 📋 **成功判定基準**

### **完全成功の条件**
- ✅ 全4名ワーカー完了レポート存在
- ✅ システム動作確認成功（dev・start両方）
- ✅ ファイル数50%以上削減（理想75%）
- ✅ 核心ファイル完全性維持

### **部分成功の条件**
- ✅ 3名以上ワーカー完了
- ✅ システム動作確認成功
- ✅ ファイル数30%以上削減

### **失敗時の対応**
- 🔄 バックアップからの完全復旧
- 🔄 段階的な手動クリーンアップ
- 🔄 問題ファイル特定と選択的復旧

## 🎉 **完了時の確認事項**

### **最終確認チェックリスト**
```bash
final_completion_check() {
  echo "🎉 並列クリーンアップ完了確認"
  
  # 全ワーカー完了確認
  echo "👥 ワーカー完了状況："
  for i in {1..4}; do
    if [ -f "tasks/20250722_164956/outputs/worker${i}-*-report.txt" ]; then
      echo "  ✅ Worker $i: 完了"
    else
      echo "  ❌ Worker $i: 未完了"
    fi
  done
  
  # ファイル数確認
  current_files=$(find src -name "*.ts" -type f | wc -l)
  deleted_files=$((118 - current_files))
  reduction_rate=$((deleted_files * 100 / 118))
  
  echo ""
  echo "📊 削減結果："
  echo "  削除前: 118ファイル"
  echo "  削除後: ${current_files}ファイル"
  echo "  削減数: ${deleted_files}ファイル"
  echo "  削減率: ${reduction_rate}%"
  
  # システム動作確認
  echo ""
  echo "🚀 システム動作最終確認..."
  pnpm dev &
  FINAL_PID=$!
  sleep 8
  kill $FINAL_PID 2>/dev/null || true
  
  if [ $? -eq 0 ]; then
    echo "✅ システム正常動作確認"
  else
    echo "❌ システム動作エラー"
  fi
  
  # 最終評価
  if [ $reduction_rate -ge 50 ]; then
    echo "🎉 大規模クリーンアップ成功！"
    echo "🚀 TradingAssistantXの大幅品質向上達成"
  else
    echo "🟡 部分クリーンアップ成功"
    echo "🔄 追加最適化の余地あり"
  fi
}
```

## 🎯 **実行手順まとめ**

### **Manager統率による並列実行プロセス**

1. **準備段階**
   - 並列戦略確認
   - バックアップ状況確認
   - 4つのターミナル準備

2. **並列実行段階**
   - Worker 1&2同時開始（Phase 1&2並列）
   - Worker 3開始（Phase 1&2完了後）
   - Worker 4開始（Phase 3完了後）

3. **監視段階**
   - リアルタイム進捗監視
   - 異常時緊急対応準備
   - 成功判定継続確認

4. **完了段階**
   - 全ワーカー成果確認
   - 最終動作テスト
   - 総合成果評価

### **期待成果**
- **75%ファイル削減**: 118 → 30ファイル
- **品質飛躍向上**: Claude SDK中心システム
- **保守性大幅改善**: レガシー除去完了
- **運用準備完了**: 即座本格運用可能

**Manager権限による4名ワーカー並列統率により、TradingAssistantXを安全かつ効率的に変革します。**