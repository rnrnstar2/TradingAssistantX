#!/bin/bash
# 役割別品質チェックスクリプト

FILE_PATH="$1"

# TypeScript/JavaScript ファイルのみチェック
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    
    # Manager: 常に品質チェック実行
    if [ "$ROLE" = "manager" ]; then
        {
            sleep 3  # ファイル保存待機
            
            ERRORS_FOUND=false
            ERROR_MSG=""
            
            if ! npm run lint --silent 2>/dev/null; then
                ERRORS_FOUND=true
                ERROR_MSG="Lintエラー"
            fi
            
            if ! npm run check-types --silent 2>/dev/null; then
                if [ "$ERRORS_FOUND" = true ]; then
                    ERROR_MSG="$ERROR_MSG & 型エラー"
                else
                    ERROR_MSG="型エラー"
                fi
                ERRORS_FOUND=true
            fi
            
            if [ "$ERRORS_FOUND" = true ]; then
                osascript -e "display notification \"$ERROR_MSG が検出されました\" with title \"⚠️ Manager品質チェック\" sound name \"Basso\""
            else
                osascript -e "display notification \"品質チェック完了 ✅\" with title \"🎯 Manager\" sound name \"Glass\""
            fi
        } &
        
    # Worker: 重要ファイルのみチェック
    elif [ "$ROLE" = "worker" ]; then
        # 重要ファイルパターン（ビジネスロジック、API、認証等）
        if [[ "$FILE_PATH" =~ (hooks|actions|auth|api|data|resource|amplify|position|client|account) ]]; then
            {
                sleep 5  # Worker は少し長めに待機
                
                # エラー時のみ通知
                if ! npm run lint --silent 2>/dev/null || ! npm run check-types --silent 2>/dev/null; then
                    osascript -e "display notification \"重要ファイルにエラーあり: $(basename $FILE_PATH)\" with title \"⚡ Worker警告\" sound name \"Basso\""
                else
                    osascript -e "display notification \"作業完了: $(basename $FILE_PATH)\" with title \"⚡ Worker\" sound name \"Ping\""
                fi
            } &
        else
            # 通常ファイルは作業完了通知のみ
            osascript -e "display notification \"作業完了: $(basename $FILE_PATH)\" with title \"⚡ Worker\" sound name \"Ping\""
        fi
    fi
fi