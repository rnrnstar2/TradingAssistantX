# TradingAssistantX Essentials

## 🎯 目標
X（Twitter）での価値創造による成長

## ⚡ 起動時チェック
```bash
echo "ROLE: $ROLE" && git branch --show-current
```

## 📋 権限
- Manager: `docs/roles/manager-role.md`
- Worker: `docs/roles/worker-role.md`

## 🔄 実行原則
**Claude主導**: 現在状況を分析し、最適なアクションを自律判断  
**品質重視**: 制限なく高品質な実装  
**データ駆動**: `data/`配下YAML設定による制御  

## 📁 重要場所
- 設定: `data/` - 全YAML設定
- 実行: `src/scripts/autonomous-runner-single.ts`
- 出力: `tasks/outputs/` のみ許可

## 🚫 禁止事項
- ルートディレクトリへの出力
- 品質妥協
- 固定プロセス強制