#!/bin/bash

# TradingAssistantX 文書品質チェック
echo "📋 文書品質チェック開始"
echo "═══════════════════════"

ERRORS=0

# 1. 参照整合性チェック
echo -e "\n🔗 1. ファイル参照整合性チェック"
check_file_references() {
    echo "   ファイル参照をチェック中..."
    local found_errors=0
    
    # docs/ と examples/ 内のファイル参照をチェック
    grep -r "src/" docs/ examples/ 2>/dev/null | while read line; do
        # パスを抽出（src/で始まる部分）
        path=$(echo "$line" | grep -o 'src/[^[:space:]]*[^[:space:]\]\.)]*' | head -1)
        if [[ -n "$path" && ! -f "$path" ]]; then
            echo "   ❌ 不正参照: $line"
            found_errors=$((found_errors + 1))
        fi
    done
    
    if [[ $found_errors -eq 0 ]]; then
        echo "   ✅ ファイル参照に問題なし"
    else
        echo "   ⚠️ $found_errors件の不正参照を発見"
        ERRORS=$((ERRORS + found_errors))
    fi
}

# 2. 行数チェック
echo -e "\n📏 2. 文書行数チェック"
check_line_limits() {
    echo "   行数をチェック中..."
    
    # examples/README.mdの行数チェック（100行以下が目標）
    if [[ -f "examples/README.md" ]]; then
        lines=$(wc -l < examples/README.md)
        if [[ $lines -gt 100 ]]; then
            echo "   ❌ examples/README.md: ${lines}行 (100行以下推奨)"
            ERRORS=$((ERRORS + 1))
        else
            echo "   ✅ examples/README.md: ${lines}行 (適切)"
        fi
    fi
    
    # 他の重要なファイルもチェック
    for file in "docs/quick-guide.md" "docs/technical-docs.md"; do
        if [[ -f "$file" ]]; then
            lines=$(wc -l < "$file")
            if [[ $lines -gt 200 ]]; then
                echo "   ⚠️ $file: ${lines}行 (やや長い)"
            else
                echo "   ✅ $file: ${lines}行"
            fi
        fi
    done
}

# 3. 内部リンクチェック
echo -e "\n🔗 3. 内部リンクチェック"
check_internal_links() {
    echo "   内部リンクをチェック中..."
    local found_errors=0
    
    # Markdownファイル内の相対リンクをチェック
    find docs examples -name "*.md" -exec grep -l "\]\(" {} \; 2>/dev/null | while read file; do
        grep -o "\]([^)]*)" "$file" | while read link; do
            # ]( から ) までの部分を抽出
            path=$(echo "$link" | sed 's/\](\([^)]*\))/\1/')
            
            # 相対パスで、#で始まらない（アンカーリンクでない）場合のみチェック
            if [[ ! "$path" =~ ^https?:// && ! "$path" =~ ^# && -n "$path" ]]; then
                # ファイルの相対パスから絶対パスを構築
                dir=$(dirname "$file")
                full_path="$dir/$path"
                
                if [[ ! -f "$full_path" && ! -d "$full_path" ]]; then
                    echo "   ❌ 無効リンク in $file: $path"
                    found_errors=$((found_errors + 1))
                fi
            fi
        done
    done
    
    if [[ $found_errors -eq 0 ]]; then
        echo "   ✅ 内部リンクに問題なし"
    else
        echo "   ⚠️ $found_errors件の無効リンクを発見"
        ERRORS=$((ERRORS + found_errors))
    fi
}

# 4. 重複コンテンツチェック
echo -e "\n🔍 4. 重複コンテンツチェック"
check_duplicate_content() {
    echo "   重複する見出しをチェック中..."
    
    # 同じ見出しが複数ファイルに存在するかチェック
    find docs examples -name "*.md" -exec grep -H "^#" {} \; | \
        sed 's/^[^:]*://' | sort | uniq -c | \
        awk '$1 > 1 {print "   ⚠️ 重複見出し: " $0}'
}

# チェック実行
check_file_references
check_line_limits  
check_internal_links
check_duplicate_content

# 結果表示
echo -e "\n📊 チェック結果"
echo "─────────────────"
if [[ $ERRORS -eq 0 ]]; then
    echo "✅ すべてのチェックに合格"
    exit 0
else
    echo "❌ $ERRORS件の問題を発見"
    echo "💡 上記の問題を修正してください"
    exit 1
fi