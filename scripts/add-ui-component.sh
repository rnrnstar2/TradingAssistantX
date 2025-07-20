#!/bin/bash

# shadcn UIコンポーネント追加スクリプト（monorepo対応）
# 使用方法: ./scripts/add-ui-component.sh <component-name>

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -eq 0 ]; then
    echo -e "${RED}エラー: コンポーネント名を指定してください${NC}"
    echo "使用方法: $0 <component-name>"
    echo "例: $0 button"
    exit 1
fi

COMPONENT_NAME=$1
PROJECT_ROOT=$(git rev-parse --show-toplevel)
ADMIN_DIR="$PROJECT_ROOT/apps/admin"
UI_PACKAGE_DIR="$PROJECT_ROOT/packages/ui"

echo -e "${YELLOW}📦 shadcn/ui コンポーネント '$COMPONENT_NAME' を追加しています...${NC}"

# 1. adminディレクトリでコンポーネントを追加
echo -e "${YELLOW}1. adminアプリでコンポーネントを追加中...${NC}"
cd "$ADMIN_DIR"
npx shadcn@latest add "$COMPONENT_NAME" -y

# 2. 作成されたファイルを確認
TEMP_DIR="$ADMIN_DIR/@workspace/ui/components"
if [ ! -d "$TEMP_DIR" ]; then
    echo -e "${RED}エラー: コンポーネントが正しく作成されませんでした${NC}"
    exit 1
fi

# 3. コンポーネントファイルをuiパッケージに移動
echo -e "${YELLOW}2. コンポーネントをuiパッケージに移動中...${NC}"
TARGET_DIR="$UI_PACKAGE_DIR/src/components/ui"
mkdir -p "$TARGET_DIR"

# すべてのコンポーネントファイルを移動
for file in "$TEMP_DIR"/*.tsx; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        mv "$file" "$TARGET_DIR/$filename"
        echo -e "${GREEN}   ✓ $filename を移動しました${NC}"
    fi
done

# 4. 一時ディレクトリを削除
echo -e "${YELLOW}3. 一時ディレクトリをクリーンアップ中...${NC}"
rm -rf "$ADMIN_DIR/@workspace"

# 5. ui/index.tsにエクスポートを追加
echo -e "${YELLOW}4. エクスポートを追加中...${NC}"
UI_INDEX="$UI_PACKAGE_DIR/src/components/ui/index.ts"

# コンポーネント名をケバブケースからパスカルケースに変換
# 例: alert-dialog → AlertDialog
EXPORT_LINE="export * from \"./$COMPONENT_NAME\""

# エクスポートが既に存在するかチェック
if grep -q "$EXPORT_LINE" "$UI_INDEX"; then
    echo -e "${YELLOW}   ⚠️  エクスポートは既に存在します${NC}"
else
    # アルファベット順に挿入
    temp_file=$(mktemp)
    echo "$EXPORT_LINE" >> "$UI_INDEX"
    sort "$UI_INDEX" > "$temp_file"
    mv "$temp_file" "$UI_INDEX"
    echo -e "${GREEN}   ✓ エクスポートを追加しました${NC}"
fi

# 6. 依存関係の確認
echo -e "${YELLOW}5. 依存関係を確認中...${NC}"
cd "$UI_PACKAGE_DIR"
npm list @radix-ui/react-$COMPONENT_NAME 2>/dev/null || echo -e "${YELLOW}   ⚠️  必要な依存関係を手動で追加してください${NC}"

echo -e "${GREEN}✅ コンポーネント '$COMPONENT_NAME' の追加が完了しました！${NC}"
echo -e "${GREEN}📍 場所: $TARGET_DIR/$COMPONENT_NAME.tsx${NC}"
echo ""
echo -e "${YELLOW}💡 使用方法:${NC}"
echo -e "   import { ComponentName } from '@workspace/ui'"