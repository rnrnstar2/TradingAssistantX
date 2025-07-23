#!/bin/bash
# TypeScript Quality Gate
# 実行: bash tools/quality-gates/typescript-gate.sh

echo "=== TypeScript Quality Gate ==="
echo "実行時刻: $(date)"

# エラー数カウント
ERROR_COUNT=$(npx tsc --noEmit 2>&1 | wc -l | tr -d ' ')

echo "TypeScriptエラー数: $ERROR_COUNT"

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ PASS: TypeScriptエラーなし"
    exit 0
elif [ "$ERROR_COUNT" -le 100 ]; then
    echo "⚠️ WARNING: エラー数減少傾向 ($ERROR_COUNT ≤ 100)"
    exit 1
else
    echo "❌ FAIL: エラー数が多すぎます ($ERROR_COUNT > 100)"
    exit 2
fi