#!/bin/bash

# 🎯 Utils完璧化実行スクリプト
# Manager指示書に基づく自動実行

set -e  # エラーで停止

echo "🎯 Utils完璧化実行開始..."
echo "==============================================="

# 作業ディレクトリを確認
if [ ! -d "src/utils" ]; then
    echo "❌ src/utils ディレクトリが見つかりません"
    exit 1
fi

echo ""
echo "📋 Phase 1: 最終安全確認"
echo "==============================================="

# 最終インポート確認
echo "🔍 削除対象ファイルのインポート最終確認..."
if rg "config-cache|config-manager|config-validator" --type ts src/ 2>/dev/null; then
    echo "⚠️  警告: 削除対象ファイルがインポートされています"
    echo "削除前にインポートを確認してください"
    echo ""
    echo "詳細確認:"
    rg "from.*config-cache|import.*config-cache" --type ts src/ || true
    rg "from.*config-manager|import.*config-manager" --type ts src/ || true  
    rg "from.*config-validator|import.*config-validator" --type ts src/ || true
else
    echo "✅ インポート確認完了: 削除対象ファイルは使用されていません"
fi

echo ""
echo "📂 現在のutils構造:"
ls -la src/utils/

echo ""
echo "📋 Phase 2: 未使用ファイル削除"
echo "==============================================="

# 削除実行
DELETED_FILES=()
DELETED_LINES=0

if [ -f "src/utils/config-cache.ts" ]; then
    lines=$(wc -l < src/utils/config-cache.ts)
    echo "🗑️  削除: config-cache.ts ($lines行)"
    rm src/utils/config-cache.ts
    DELETED_FILES+=("config-cache.ts")
    DELETED_LINES=$((DELETED_LINES + lines))
fi

if [ -f "src/utils/config-manager.ts" ]; then
    lines=$(wc -l < src/utils/config-manager.ts)
    echo "🗑️  削除: config-manager.ts ($lines行)"
    rm src/utils/config-manager.ts
    DELETED_FILES+=("config-manager.ts")
    DELETED_LINES=$((DELETED_LINES + lines))
fi

if [ -f "src/utils/config-validator.ts" ]; then
    lines=$(wc -l < src/utils/config-validator.ts)
    echo "🗑️  削除: config-validator.ts ($lines行)"
    rm src/utils/config-validator.ts
    DELETED_FILES+=("config-validator.ts")
    DELETED_LINES=$((DELETED_LINES + lines))
fi

echo ""
echo "✅ 削除完了:"
echo "   - 削除ファイル数: ${#DELETED_FILES[@]}"
echo "   - 削除行数: $DELETED_LINES行"
echo ""

echo "📂 削除後のutils構造:"
ls -la src/utils/

echo ""
echo "📋 Phase 3: 品質保証確認"
echo "==============================================="

# TypeScript型チェック
echo "🔍 TypeScript型チェック実行..."
if pnpm run typecheck; then
    echo "✅ TypeScript型チェック: 成功"
else
    echo "❌ TypeScript型チェック: 失敗"
    echo "削除による影響があります。確認が必要です。"
    exit 1
fi

# ビルドチェック  
echo ""
echo "🔨 ビルドチェック実行..."
if pnpm run build; then
    echo "✅ ビルドチェック: 成功"
else
    echo "❌ ビルドチェック: 失敗"
    echo "削除による影響があります。確認が必要です。"
    exit 1
fi

# 最終インポートエラー確認
echo ""
echo "🔍 削除ファイルへの参照最終確認..."
if rg "config-cache|config-manager|config-validator" src/ 2>/dev/null; then
    echo "❌ 削除ファイルへの参照が残っています"
    exit 1
else
    echo "✅ 削除ファイルへの参照なし: 確認完了"
fi

echo ""
echo "📋 Phase 4: 最終レポート生成"
echo "==============================================="

# レポート作成
REPORT_DIR="tasks/20250723_015453_utils_optimization/reports"
mkdir -p "$REPORT_DIR"

cat > "$REPORT_DIR/FINAL-OPTIMIZATION-REPORT.md" << EOF
# Utils最適化完了レポート

**実行日時**: $(date '+%Y-%m-%d %H:%M:%S')

## 📊 削除実績
$(for file in "${DELETED_FILES[@]}"; do
    echo "- $file: 削除完了"
done)
- **合計削除行数**: $DELETED_LINES行

## ✅ 残存ファイル構造
\`\`\`
$(ls -la src/utils/)
\`\`\`

## 🎯 品質保証結果
- TypeScript型チェック: ✅ 成功
- ビルドチェック: ✅ 成功  
- インポートエラー: ✅ なし
- 削除ファイル参照: ✅ なし

## 📚 次のステップ
1. ドキュメント更新 (REQUIREMENTS.md)
2. 新規構造ドキュメント作成
3. Git コミット実行

**Status**: ✅ Phase 1-3 完了 - ドキュメント更新待ち
EOF

echo "📄 最終レポート生成完了: $REPORT_DIR/FINAL-OPTIMIZATION-REPORT.md"

echo ""
echo "🎉 Utils最適化 Phase 1-3 完了!"
echo "==============================================="
echo "✅ 削除ファイル数: ${#DELETED_FILES[@]}"
echo "✅ 削除行数: $DELETED_LINES行"  
echo "✅ TypeScript: 正常"
echo "✅ ビルド: 正常"
echo "✅ インポート: エラーなし"
echo ""
echo "📋 次のステップ:"
echo "1. REQUIREMENTS.md更新"
echo "2. docs/architecture/utils-structure.md作成" 
echo "3. Gitコミット実行"
echo ""
echo "完璧な状態まであと3ステップです！"