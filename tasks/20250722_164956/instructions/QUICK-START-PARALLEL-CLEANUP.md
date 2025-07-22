# 🚀 TradingAssistantX 並列クリーンアップ実行ガイド

**目標**: 118 → 30ファイル（75%削減）  
**方法**: 4名ワーカー並列実行  
**期間**: 約45分で完了  

## ⚡ **即座実行方法**

### **Step 1: 4つのターミナルを準備**
```bash
# ターミナル1 - Worker 1 (Phase 1)
ROLE=worker claude --dangerously-skip-permissions
# → tasks/20250722_164956/instructions/worker1-phase1-instructions.md を実行

# ターミナル2 - Worker 2 (Phase 2) ※並列実行可能
ROLE=worker claude --dangerously-skip-permissions  
# → tasks/20250722_164956/instructions/worker2-phase2-instructions.md を実行

# ターミナル3 - Worker 3 (Phase 3) ※Worker1&2完了後
ROLE=worker claude --dangerously-skip-permissions
# → tasks/20250722_164956/instructions/worker3-phase3-instructions.md を実行

# ターミナル4 - Worker 4 (最終検証) ※Worker3完了後  
ROLE=worker claude --dangerously-skip-permissions
# → tasks/20250722_164956/instructions/worker4-verification-instructions.md を実行
```

### **Step 2: 実行順序**
1. **Worker 1 & 2 同時開始** (15-20分)
2. **Worker 3 開始** (Worker 1&2完了後10分)
3. **Worker 4 開始** (Worker 3完了後15分)

## 📊 **作成済み指示書**

| ワーカー | 担当 | ファイル |
|---------|------|----------|
| Worker 1 | Phase 1高優先度レガシー削除(28ファイル) | `worker1-phase1-instructions.md` |
| Worker 2 | Phase 2サブディレクトリ群削除(40+ファイル) | `worker2-phase2-instructions.md` |
| Worker 3 | Phase 3開発ツール削除(16ファイル) | `worker3-phase3-instructions.md` |
| Worker 4 | 最終検証・レポート作成 | `worker4-verification-instructions.md` |
| Manager | 総合統率・監視 | `parallel-coordinator-instructions.md` |

## 🎯 **期待成果**

- ✅ **75%ファイル削除**: 118 → 30ファイル
- ✅ **保守性大幅向上**: レガシー除去完了
- ✅ **Claude SDK中心化**: 洗練されたシステム
- ✅ **即座運用可能**: `pnpm dev` / `pnpm start`

## 🚨 **安全対策**

- ✅ 自動バックアップ作成
- ✅ 段階的実行・検証
- ✅ エラー時自動復旧
- ✅ 核心機能完全保護

**Manager権限による安全な並列クリーンアップ準備完了！**