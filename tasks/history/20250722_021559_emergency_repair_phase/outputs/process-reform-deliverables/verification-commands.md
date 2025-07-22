# Worker必須検証コマンド文書 - 標準化プロトコル

## 🚨 **検証コマンドの位置づけ**
この文書は、Worker品質基準の厳格な遵守を保証するため、必須実行検証コマンドを標準化し、実測値による客観的品質評価を実現します。**全コマンドの完全実行が絶対条件**です。

## 📋 **Stage 1: 作業開始前必須検証**

### **1.1 環境状況確認コマンド群**

#### 基本環境確認
```bash
#!/bin/bash
echo "=== 作業開始前環境確認 ==="
echo "確認開始時刻: $(date)"
echo "作業者: $USER"
echo "ホスト名: $(hostname)"
echo "作業ディレクトリ: $(pwd)"

# Node.js環境確認
echo "=== Node.js環境確認 ==="
echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"
echo "pnpm版本: $(pnpm --version 2>/dev/null || echo 'pnpmなし')"

# Git状態確認
echo "=== Git状態確認 ==="
echo "現在ブランチ: $(git branch --show-current)"
echo "最新コミット: $(git log -1 --oneline)"
echo "作業ツリー状態:"
git status --porcelain
```

#### 初期エラー数測定（ベースライン確立）
```bash
#!/bin/bash
echo "=== 初期エラー数測定（ベースライン） ==="
echo "測定開始時刻: $(date)"

# TypeScriptエラー数測定
echo "=== TypeScriptビルドエラー測定 ==="
echo "実行コマンド: pnpm run build"
echo "--- ビルド実行開始 ---"

# ビルド実行・エラー数カウント
pnpm run build 2>&1 | tee initial_build_log.txt
build_exit_code=$?

# エラー数抽出・カウント
error_count=$(grep -E "(error|Error)" initial_build_log.txt | wc -l)
warning_count=$(grep -E "(warning|Warning)" initial_build_log.txt | wc -l)

echo "--- 初期状況サマリー ---"
echo "ビルド終了コード: $build_exit_code"
echo "初期エラー数: $error_count件"
echo "初期警告数: $warning_count件"
echo "測定完了時刻: $(date)"

# ベースラインファイル保存
echo "$error_count" > baseline_error_count.txt
echo "$warning_count" > baseline_warning_count.txt
echo "$(date)" > baseline_timestamp.txt

echo "ベースライン確立完了"
```

### **1.2 依存関係・設定確認**

#### 依存関係確認コマンド
```bash
#!/bin/bash
echo "=== 依存関係確認 ==="
echo "確認時刻: $(date)"

# package.json存在確認
if [ -f "package.json" ]; then
    echo "✅ package.json存在確認"
else
    echo "❌ package.json未存在 - 致命的エラー"
    exit 1
fi

# node_modules存在確認
if [ -d "node_modules" ]; then
    echo "✅ node_modules存在確認"
else
    echo "⚠️ node_modules未存在 - pnpm install実行推奨"
fi

# 依存関係整合性確認
echo "=== 依存関係整合性確認 ==="
pnpm list --depth=0 2>&1 | grep -E "(missing|UNMET|ERR)" && echo "❌ 依存関係問題あり" || echo "✅ 依存関係問題なし"

# 古い依存関係確認
echo "=== 古い依存関係確認 ==="
pnpm outdated --depth=0 2>/dev/null | head -20 || echo "依存関係更新情報取得不能"
```

## 📊 **Stage 2: 作業中継続検証**

### **2.1 進捗監視コマンド群**

#### 30分間隔進捗確認
```bash
#!/bin/bash
echo "=== 作業進捗確認 (30分間隔実行) ==="
echo "確認実行時刻: $(date)"

# 経過時間計算（baseline_timestamp.txtから）
if [ -f "baseline_timestamp.txt" ]; then
    start_time=$(cat baseline_timestamp.txt)
    echo "作業開始時刻: $start_time"
    echo "現在時刻: $(date)"
fi

# 現在エラー数測定
echo "=== 現在エラー数測定 ==="
current_error_count=$(pnpm run build 2>&1 | grep -E "(error|Error)" | wc -l)
baseline_error_count=$(cat baseline_error_count.txt 2>/dev/null || echo "0")

echo "ベースラインエラー数: $baseline_error_count件"
echo "現在エラー数: $current_error_count件"

# 進捗計算
if [ "$baseline_error_count" -gt 0 ]; then
    reduction_count=$((baseline_error_count - current_error_count))
    reduction_rate=$((reduction_count * 100 / baseline_error_count))
    echo "エラー削減数: $reduction_count件"
    echo "エラー削減率: $reduction_rate%"
else
    echo "ベースライン不正 - 再測定必要"
fi

# Git変更状況確認
echo "=== Git変更状況 ==="
echo "変更ファイル数: $(git status --porcelain | wc -l)"
echo "追加行数: $(git diff --stat | tail -1 | awk '{print $4}' | sed 's/[^0-9]//g' || echo '0')"
echo "削除行数: $(git diff --stat | tail -1 | awk '{print $6}' | sed 's/[^0-9]//g' || echo '0')"
```

### **2.2 品質監視コマンド群**

#### エラー種別・傾向分析
```bash
#!/bin/bash
echo "=== エラー種別・傾向分析 ==="
echo "分析実行時刻: $(date)"

# 現在ビルド実行・詳細ログ取得
echo "=== 詳細ビルドログ取得 ==="
pnpm run build 2>&1 | tee current_build_detailed.log

# エラー種別分類
echo "=== エラー種別分類 ==="
echo "TypeScriptエラー数: $(grep -E "TS[0-9]+" current_build_detailed.log | wc -l)"
echo "ESLintエラー数: $(grep -E "ESLint" current_build_detailed.log | wc -l)"
echo "ビルドエラー数: $(grep -E "(Build failed|build error)" current_build_detailed.log | wc -l)"
echo "その他エラー数: $(grep -E "(error|Error)" current_build_detailed.log | grep -v -E "(TS[0-9]+|ESLint|Build)" | wc -l)"

# 新規エラー検出
echo "=== 新規エラー検出 ==="
if [ -f "initial_build_log.txt" ]; then
    echo "新規エラー検出中..."
    comm -13 <(grep -E "(error|Error)" initial_build_log.txt | sort) <(grep -E "(error|Error)" current_build_detailed.log | sort) > new_errors.txt
    new_error_count=$(wc -l < new_errors.txt)
    echo "新規エラー数: $new_error_count件"
    
    if [ "$new_error_count" -gt 0 ]; then
        echo "--- 新規エラー詳細 ---"
        head -10 new_errors.txt
        if [ "$new_error_count" -gt 10 ]; then
            echo "... (残り$((new_error_count - 10))件)"
        fi
    fi
else
    echo "⚠️ 初期ログファイル不存在 - 新規エラー検出不能"
fi
```

#### パフォーマンス監視
```bash
#!/bin/bash
echo "=== パフォーマンス監視 ==="
echo "監視実行時刻: $(date)"

# ビルド時間測定
echo "=== ビルド時間測定 ==="
echo "測定開始: $(date)"
start_time=$(date +%s)

pnpm run build > /dev/null 2>&1
build_result=$?

end_time=$(date +%s)
build_duration=$((end_time - start_time))

echo "測定完了: $(date)"
echo "ビルド時間: ${build_duration}秒"
echo "ビルド結果: $([ $build_result -eq 0 ] && echo '成功' || echo '失敗')"

# メモリ使用量確認
echo "=== メモリ使用量確認 ==="
echo "現在メモリ使用量:"
free -h 2>/dev/null || echo "メモリ情報取得不能(macOS等)"

# ディスク使用量確認
echo "=== ディスク使用量確認 ==="
echo "プロジェクトサイズ: $(du -sh . 2>/dev/null | cut -f1)"
echo "node_modules サイズ: $(du -sh node_modules 2>/dev/null | cut -f1 || echo '不明')"
echo "dist サイズ: $(du -sh dist 2>/dev/null | cut -f1 || echo '不明')"
```

## ✅ **Stage 3: 作業完了時最終検証**

### **3.1 最終品質確認コマンド群**

#### 完全最終検証
```bash
#!/bin/bash
echo "=== 最終品質確認検証 ==="
echo "検証開始時刻: $(date)"

# 最終ビルド実行
echo "=== 最終ビルド実行 ==="
echo "最終ビルド開始: $(date)"
pnpm run build 2>&1 | tee final_build_log.txt
final_build_result=$?
echo "最終ビルド完了: $(date)"
echo "最終ビルド結果: $([ $final_build_result -eq 0 ] && echo '✅ 成功' || echo '❌ 失敗')"

# 最終エラー数測定
echo "=== 最終エラー数測定 ==="
final_error_count=$(grep -E "(error|Error)" final_build_log.txt | wc -l)
final_warning_count=$(grep -E "(warning|Warning)" final_build_log.txt | wc -l)
baseline_error_count=$(cat baseline_error_count.txt 2>/dev/null || echo "0")

echo "ベースラインエラー数: $baseline_error_count件"
echo "最終エラー数: $final_error_count件"
echo "最終警告数: $final_warning_count件"

# 削減実績計算
if [ "$baseline_error_count" -ge "$final_error_count" ] && [ "$baseline_error_count" -gt 0 ]; then
    reduction_count=$((baseline_error_count - final_error_count))
    reduction_rate=$((reduction_count * 100 / baseline_error_count))
    echo "✅ エラー削減数: $reduction_count件"
    echo "✅ エラー削減率: $reduction_rate%"
elif [ "$baseline_error_count" -lt "$final_error_count" ]; then
    increase_count=$((final_error_count - baseline_error_count))
    echo "❌ エラー増加数: $increase_count件 - 原因調査必要"
else
    echo "⚠️ エラー数変化なし - 作業内容確認必要"
fi
```

#### システム基本動作確認
```bash
#!/bin/bash
echo "=== システム基本動作確認 ==="
echo "確認開始時刻: $(date)"

# TypeScript型チェック
echo "=== TypeScript型チェック ==="
if command -v tsc &> /dev/null; then
    echo "TypeScript型チェック実行中..."
    tsc --noEmit --project . 2>&1 | tee typescript_check.log
    ts_check_result=$?
    ts_error_count=$(grep -E "(error|Error)" typescript_check.log | wc -l)
    echo "型チェック結果: $([ $ts_check_result -eq 0 ] && echo '✅ 成功' || echo '❌ 失敗')"
    echo "型エラー数: $ts_error_count件"
else
    echo "⚠️ TypeScript未インストール - 型チェックスキップ"
fi

# ESLint チェック（存在する場合）
echo "=== ESLint チェック ==="
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
    echo "ESLint設定発見 - チェック実行中..."
    pnpm run lint 2>&1 | tee eslint_check.log || echo "lint scriptが未定義"
    eslint_error_count=$(grep -E "(error|Error)" eslint_check.log | wc -l)
    echo "ESLintエラー数: $eslint_error_count件"
else
    echo "ESLint設定未発見 - チェックスキップ"
fi

# 基本起動確認（該当する場合）
echo "=== 基本起動確認 ==="
if grep -q "\"start\"" package.json; then
    echo "start scriptが存在 - 起動確認実行"
    timeout 30s pnpm run start > startup_test.log 2>&1 &
    start_pid=$!
    sleep 10
    
    if ps -p $start_pid > /dev/null 2>&1; then
        echo "✅ 基本起動成功 - プロセス正常動作中"
        kill $start_pid 2>/dev/null
        wait $start_pid 2>/dev/null
    else
        echo "❌ 基本起動失敗 - ログ確認必要"
        echo "起動ログ（最後の10行）:"
        tail -10 startup_test.log 2>/dev/null || echo "ログ取得失敗"
    fi
else
    echo "start script未定義 - 起動確認スキップ"
fi
```

### **3.2 影響評価コマンド群**

#### 包括的影響評価
```bash
#!/bin/bash
echo "=== 包括的システム影響評価 ==="
echo "評価開始時刻: $(date)"

# 変更ファイル影響分析
echo "=== 変更ファイル影響分析 ==="
echo "変更されたファイル:"
git diff --name-only HEAD~1 2>/dev/null | tee changed_files.txt || echo "Git履歴なし"

if [ -s "changed_files.txt" ]; then
    changed_file_count=$(wc -l < changed_files.txt)
    echo "変更ファイル数: $changed_file_count個"
    
    # ファイル種別分析
    echo "TypeScriptファイル: $(grep -E "\.ts$|\.tsx$" changed_files.txt | wc -l)個"
    echo "JavaScriptファイル: $(grep -E "\.js$|\.jsx$" changed_files.txt | wc -l)個"
    echo "設定ファイル: $(grep -E "\.(json|yaml|yml|toml)$" changed_files.txt | wc -l)個"
    echo "その他ファイル: $(grep -v -E "\.(ts|tsx|js|jsx|json|yaml|yml|toml)$" changed_files.txt | wc -l)個"
    
    # 重要ファイル変更確認
    echo "=== 重要ファイル変更確認 ==="
    if grep -q "package\.json\|tsconfig\.json\|\.eslintrc\|vite\.config" changed_files.txt; then
        echo "⚠️ 重要設定ファイルが変更されています - 影響評価必須"
        grep -E "(package\.json|tsconfig\.json|\.eslintrc|vite\.config)" changed_files.txt
    else
        echo "✅ 重要設定ファイルの変更なし"
    fi
else
    echo "変更ファイルなし or Git未初期化"
fi

# 依存関係変更影響確認
echo "=== 依存関係変更影響確認 ==="
if git diff HEAD~1 package.json >/dev/null 2>&1; then
    echo "⚠️ package.json変更検出 - 依存関係確認実行"
    echo "依存関係差分:"
    git diff HEAD~1 package.json | grep -E "^\+|\-" | grep -v -E "^\+\+\+|^\-\-\-"
    echo "新規依存関係チェック中..."
    pnpm install --frozen-lockfile 2>/dev/null || echo "依存関係更新が必要かもしれません"
else
    echo "✅ package.json変更なし - 依存関係への影響なし"
fi

# パフォーマンス影響評価
echo "=== パフォーマンス影響評価 ==="
if [ -f "baseline_timestamp.txt" ]; then
    # ビルド時間比較
    echo "ビルド時間影響評価中..."
    current_build_time=$(time pnpm run build >/dev/null 2>&1 | grep real || echo "測定失敗")
    echo "現在のビルド時間: $current_build_time"
    
    # バンドルサイズ確認
    if [ -d "dist" ]; then
        bundle_size=$(du -sh dist | cut -f1)
        echo "現在のバンドルサイズ: $bundle_size"
    else
        echo "dist ディレクトリなし - サイズ測定不能"
    fi
else
    echo "ベースライン未設定 - パフォーマンス比較不能"
fi
```

## 🚫 **検証コマンド実行禁止事項**

### **絶対禁止事項**
- コマンド実行のスキップ・省略
- エラー出力の意図的隠蔽・削除
- 実行ログの改ざん・編集
- 失敗結果の無視・看過

### **品質違反事項**
- 推測・概算による数値報告
- 部分的実行での完了宣言
- タイムスタンプ記録の省略
- 環境情報記録の省略

## 📋 **検証実行記録テンプレート**

### **必須記録項目**
```bash
# 検証実行記録作成
cat > verification_execution_record.md << 'EOF'
# 検証実行記録

## 基本情報
- 実行者: $(whoami)
- 実行開始時刻: $(date)
- 作業ディレクトリ: $(pwd)
- Git コミット: $(git log -1 --oneline)

## Stage 1: 開始前検証
- 環境確認: [✅/❌]
- ベースライン測定: [✅/❌]
- 依存関係確認: [✅/❌]

## Stage 2: 作業中検証
- 進捗確認実行回数: [回数]
- 品質監視実行回数: [回数]
- 問題検出件数: [件数]

## Stage 3: 完了時検証
- 最終ビルド: [成功/失敗]
- エラー削減: [削減数]件
- システム動作: [正常/異常]
- 影響評価: [実施済み/未実施]

## 実行コマンドログ
[全実行コマンドとその結果を時系列で記録]

EOF
```

---

**🔥 VERIFICATION MISSION**: 実測値に基づく客観的品質評価と、システム全体への影響を正確に把握する包括的検証体制。

**検証保証**: 全工程での完全な検証実行と、推測・概算を排除した事実に基づく品質確認の実現。