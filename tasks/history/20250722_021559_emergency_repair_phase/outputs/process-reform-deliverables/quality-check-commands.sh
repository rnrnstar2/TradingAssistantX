#!/bin/bash

# Manager品質確認コマンド集 - 独立検証システム
# 使用方法: ./quality-check-commands.sh [worker_report] [task_id]

set -e  # エラー時即座終了
set -u  # 未定義変数使用時終了

# ===== 設定・初期化 =====
SCRIPT_NAME="Manager品質確認コマンド集"
VERSION="1.0.0"
EXECUTION_TIME=$(date "+%Y%m%d_%H%M%S")
LOG_DIR="./manager_verification_logs"
WORKER_REPORT_FILE=${1:-""}
TASK_ID=${2:-"UNKNOWN"}

echo "=========================================="
echo "$SCRIPT_NAME v$VERSION"
echo "実行開始時刻: $(date)"
echo "実行Manager: $USER"
echo "対象Worker報告書: $WORKER_REPORT_FILE"
echo "対象タスクID: $TASK_ID"
echo "=========================================="

# ログディレクトリ作成
mkdir -p "$LOG_DIR"
MAIN_LOG="$LOG_DIR/manager_verification_${EXECUTION_TIME}.log"

# ログ関数定義
log_info() {
    echo "[INFO] $(date '+%H:%M:%S') $1" | tee -a "$MAIN_LOG"
}

log_error() {
    echo "[ERROR] $(date '+%H:%M:%S') $1" | tee -a "$MAIN_LOG"
}

log_success() {
    echo "[SUCCESS] $(date '+%H:%M:%S') $1" | tee -a "$MAIN_LOG"
}

# ===== Stage 1: 即座確認事項（30分以内実行必須） =====
stage1_immediate_verification() {
    log_info "=== Stage 1: 即座確認事項実行開始 ==="
    
    # 1.1 報告書提出確認
    log_info "1.1 報告書提出確認プロトコル実行"
    
    if [ -z "$WORKER_REPORT_FILE" ]; then
        log_error "Worker報告書ファイルが指定されていません"
        return 1
    fi
    
    if [ ! -f "$WORKER_REPORT_FILE" ]; then
        log_error "Worker報告書ファイルが存在しません: $WORKER_REPORT_FILE"
        return 1
    fi
    
    # 報告書提出時刻記録
    file_timestamp=$(stat -c %Y "$WORKER_REPORT_FILE" 2>/dev/null || stat -f %m "$WORKER_REPORT_FILE")
    file_datetime=$(date -d "@$file_timestamp" 2>/dev/null || date -r "$file_timestamp")
    log_info "報告書提出時刻: $file_datetime"
    
    # 報告書完成度確認
    log_info "報告書完成度確認実行中..."
    
    required_sections=("実測データセクション" "検証実行セクション" "品質保証宣言")
    missing_sections=()
    
    for section in "${required_sections[@]}"; do
        if ! grep -q "$section" "$WORKER_REPORT_FILE"; then
            missing_sections+=("$section")
        fi
    done
    
    if [ ${#missing_sections[@]} -eq 0 ]; then
        log_success "報告書必須セクション完全記載確認"
    else
        log_error "報告書必須セクション不備: ${missing_sections[*]}"
        return 1
    fi
    
    # 1.2 実測値照合確認
    log_info "1.2 実測値照合確認プロトコル実行"
    
    log_info "Manager独立検証実行開始"
    echo "=== Manager独立検証実行 ===" | tee -a "$MAIN_LOG"
    echo "実行時刻: $(date)" | tee -a "$MAIN_LOG"
    echo "検証者: $USER" | tee -a "$MAIN_LOG"
    echo "=== ビルドエラー数測定 ===" | tee -a "$MAIN_LOG"
    
    # Manager独立エラー数測定
    build_log_file="$LOG_DIR/manager_build_${EXECUTION_TIME}.log"
    pnpm run build 2>&1 | tee "$build_log_file"
    build_exit_code=$?
    
    manager_error_count=$(grep -E "(error|Error)" "$build_log_file" | wc -l | xargs)
    log_info "Manager独立測定エラー数: $manager_error_count件"
    
    # Worker報告値抽出・照合
    if worker_error_count=$(grep -E "修正後エラー数.*件" "$WORKER_REPORT_FILE" | grep -oE "[0-9]+" | head -1); then
        log_info "Worker報告エラー数: $worker_error_count件"
        
        # 照合結果評価
        if [ "$manager_error_count" -eq "$worker_error_count" ]; then
            log_success "実測値照合: 完全一致 (優秀評価)"
        elif [ $((manager_error_count - worker_error_count)) -le 1 ] && [ $((manager_error_count - worker_error_count)) -ge -1 ]; then
            log_info "実測値照合: ±1件以内 (合格評価) - 差異: $((manager_error_count - worker_error_count))件"
        else
            log_error "実測値照合: 大幅乖離 (要精査) - Manager:$manager_error_count vs Worker:$worker_error_count"
            return 1
        fi
    else
        log_error "Worker報告書からエラー数を抽出できません"
        return 1
    fi
    
    # 1.3 ビルド検証独立実行
    log_info "1.3 ビルド検証独立実行"
    
    echo "=== Manager独立ビルド検証 ===" | tee -a "$MAIN_LOG"
    echo "検証開始時刻: $(date)" | tee -a "$MAIN_LOG"
    echo "現在のgit状況:" | tee -a "$MAIN_LOG"
    git status --porcelain | tee -a "$MAIN_LOG"
    
    echo "=== ビルド実行 ===" | tee -a "$MAIN_LOG"
    final_build_log="$LOG_DIR/manager_final_build_${EXECUTION_TIME}.log"
    pnpm run build 2>&1 | tee "$final_build_log"
    final_build_exit_code=$?
    
    echo "ビルド結果: $final_build_exit_code" | tee -a "$MAIN_LOG"
    echo "検証完了時刻: $(date)" | tee -a "$MAIN_LOG"
    
    # Worker報告ビルド結果と照合
    if grep -q "ビルド検証.*成功" "$WORKER_REPORT_FILE"; then
        worker_build_result="成功"
    elif grep -q "ビルド検証.*失敗" "$WORKER_REPORT_FILE"; then
        worker_build_result="失敗"
    else
        worker_build_result="不明"
    fi
    
    manager_build_result=$([ $final_build_exit_code -eq 0 ] && echo "成功" || echo "失敗")
    
    log_info "Worker報告ビルド結果: $worker_build_result"
    log_info "Manager検証ビルド結果: $manager_build_result"
    
    if [ "$worker_build_result" = "$manager_build_result" ]; then
        log_success "ビルド結果照合: 一致"
    else
        log_error "ビルド結果照合: 不一致 - 要詳細調査"
        return 1
    fi
    
    log_success "Stage 1: 即座確認事項 完了"
    return 0
}

# ===== Stage 2: 品質評価事項（60分以内実行推奨） =====
stage2_quality_evaluation() {
    log_info "=== Stage 2: 品質評価事項実行開始 ==="
    
    # 2.1 エラー数推移の妥当性確認
    log_info "2.1 エラー数推移の妥当性確認"
    
    # ベースライン推定（履歴から）
    if [ -f "baseline_error_count.txt" ]; then
        baseline_errors=$(cat baseline_error_count.txt)
    else
        # Git履歴からの推定
        log_info "ベースラインファイル未存在 - Git履歴から推定"
        baseline_errors="推定不能"
    fi
    
    current_errors=$(grep -E "(error|Error)" "$LOG_DIR/manager_build_${EXECUTION_TIME}.log" | wc -l | xargs)
    
    if [ "$baseline_errors" != "推定不能" ] && [ "$baseline_errors" -gt 0 ]; then
        reduction_count=$((baseline_errors - current_errors))
        reduction_rate=$((reduction_count * 100 / baseline_errors))
        
        log_info "推定ベースライン: $baseline_errors件"
        log_info "現在エラー数: $current_errors件"
        log_info "推定削減数: $reduction_count件"
        log_info "推定削減率: $reduction_rate%"
        
        if [ "$reduction_rate" -ge 50 ]; then
            log_success "エラー削減妥当性: 高効果 ($reduction_rate%削減)"
        elif [ "$reduction_rate" -ge 20 ]; then
            log_info "エラー削減妥当性: 中効果 ($reduction_rate%削減)"
        elif [ "$reduction_rate" -ge 0 ]; then
            log_info "エラー削減妥当性: 低効果 ($reduction_rate%削減)"
        else
            log_error "エラー削減妥当性: 悪化 ($reduction_rate%増加)"
        fi
    else
        log_info "ベースライン不明 - 削減妥当性評価不能"
    fi
    
    # 2.2 修正範囲の適切性確認
    log_info "2.2 修正範囲の適切性確認"
    
    echo "=== 修正範囲確認 ===" | tee -a "$MAIN_LOG"
    
    # Git差分確認
    if git diff --name-only HEAD~1 >/dev/null 2>&1; then
        changed_files=$(git diff --name-only HEAD~1 | wc -l | xargs)
        log_info "修正ファイル数: $changed_files個"
        
        echo "修正されたファイル:" | tee -a "$MAIN_LOG"
        git diff --name-only HEAD~1 | tee -a "$MAIN_LOG"
        
        echo "修正統計:" | tee -a "$MAIN_LOG"
        git diff --stat HEAD~1 | tee -a "$MAIN_LOG"
        
        # 修正適切性判定
        if [ "$changed_files" -le 5 ]; then
            log_success "修正範囲: 最小限・適切 ($changed_files個ファイル)"
        elif [ "$changed_files" -le 15 ]; then
            log_info "修正範囲: 中程度 ($changed_files個ファイル)"
        else
            log_error "修正範囲: 広範囲 ($changed_files個ファイル) - 影響評価必須"
        fi
    else
        log_info "Git履歴なし - 修正範囲評価不能"
    fi
    
    # 2.3 システム全体への影響確認
    log_info "2.3 システム全体への影響確認"
    
    # 新規エラー発生確認
    if [ -f "initial_build_log.txt" ]; then
        log_info "新規エラー検出実行中..."
        new_errors_file="$LOG_DIR/new_errors_${EXECUTION_TIME}.txt"
        comm -13 <(grep -E "(error|Error)" initial_build_log.txt | sort) <(grep -E "(error|Error)" "$LOG_DIR/manager_build_${EXECUTION_TIME}.log" | sort) > "$new_errors_file"
        new_error_count=$(wc -l < "$new_errors_file" | xargs)
        
        log_info "新規エラー発生数: $new_error_count件"
        
        if [ "$new_error_count" -eq 0 ]; then
            log_success "新規エラー発生: なし"
        elif [ "$new_error_count" -le 2 ]; then
            log_info "新規エラー発生: 軽微 ($new_error_count件)"
        else
            log_error "新規エラー発生: 重大 ($new_error_count件) - 対処必須"
        fi
    else
        log_info "初期ログ未存在 - 新規エラー検出不能"
    fi
    
    # 基本機能への影響確認
    log_info "基本機能への影響確認実行"
    
    # TypeScript型チェック
    if command -v tsc &> /dev/null; then
        log_info "TypeScript型チェック実行"
        ts_check_log="$LOG_DIR/ts_check_${EXECUTION_TIME}.log"
        tsc --noEmit --project . 2>&1 | tee "$ts_check_log"
        ts_exit_code=$?
        ts_error_count=$(grep -E "(error|Error)" "$ts_check_log" | wc -l | xargs)
        
        if [ $ts_exit_code -eq 0 ]; then
            log_success "TypeScript型チェック: 成功"
        else
            log_error "TypeScript型チェック: 失敗 ($ts_error_count件のエラー)"
        fi
    else
        log_info "TypeScript未検出 - 型チェックスキップ"
    fi
    
    # 基本起動確認（可能な場合）
    if grep -q "\"start\"" package.json 2>/dev/null; then
        log_info "start script検出 - 基本起動確認実行"
        startup_log="$LOG_DIR/startup_test_${EXECUTION_TIME}.log"
        
        timeout 30s pnpm run start > "$startup_log" 2>&1 &
        start_pid=$!
        sleep 10
        
        if ps -p $start_pid > /dev/null 2>&1; then
            log_success "基本起動確認: 成功"
            kill $start_pid 2>/dev/null
            wait $start_pid 2>/dev/null || true
        else
            log_error "基本起動確認: 失敗 - ログ確認必要"
        fi
    else
        log_info "start script未検出 - 起動確認スキップ"
    fi
    
    log_success "Stage 2: 品質評価事項 完了"
    return 0
}

# ===== Stage 3: 失格判定事項（必要時即座実行） =====
stage3_failure_judgment() {
    log_info "=== Stage 3: 失格判定事項確認開始 ==="
    
    failure_detected=false
    failure_reasons=()
    
    # 3.1 報告書未提出による失格
    log_info "3.1 報告書未提出確認"
    
    if [ -z "$WORKER_REPORT_FILE" ] || [ ! -f "$WORKER_REPORT_FILE" ]; then
        failure_detected=true
        failure_reasons+=("報告書未提出")
        log_error "失格事由検出: 報告書未提出"
    else
        log_success "報告書提出確認: 正常"
    fi
    
    # 3.2 虚偽報告による失格
    log_info "3.2 虚偽報告確認"
    
    # エラー数不一致確認（±2件以上で失格）
    if [ -n "$manager_error_count" ] && [ -n "$worker_error_count" ]; then
        error_diff=$((manager_error_count - worker_error_count))
        if [ ${error_diff#-} -ge 2 ]; then  # 絶対値が2以上
            failure_detected=true
            failure_reasons+=("エラー数虚偽報告: Manager${manager_error_count}件 vs Worker${worker_error_count}件")
            log_error "失格事由検出: エラー数虚偽報告 (差異: ${error_diff}件)"
        fi
    fi
    
    # ビルド結果不一致確認
    if [ -n "$manager_build_result" ] && [ -n "$worker_build_result" ] && [ "$manager_build_result" != "$worker_build_result" ]; then
        failure_detected=true
        failure_reasons+=("ビルド結果虚偽報告: Manager${manager_build_result} vs Worker${worker_build_result}")
        log_error "失格事由検出: ビルド結果虚偽報告"
    fi
    
    # 3.3 品質基準無視による失格
    log_info "3.3 品質基準無視確認"
    
    # 必須セクション未記載確認
    if [ ${#missing_sections[@]} -gt 0 ]; then
        failure_detected=true
        failure_reasons+=("必須セクション未記載: ${missing_sections[*]}")
        log_error "失格事由検出: 必須セクション未記載"
    fi
    
    # 失格判定結果
    if [ "$failure_detected" = true ]; then
        log_error "=== 失格判定: 適用 ==="
        log_error "失格理由数: ${#failure_reasons[@]}件"
        for reason in "${failure_reasons[@]}"; do
            log_error "- $reason"
        done
        
        # 失格通告作成
        failure_notice_file="$LOG_DIR/failure_notice_${EXECUTION_TIME}.txt"
        cat > "$failure_notice_file" << EOF
=== WORKER失格通告 ===
失格判定時刻: $(date)
対象Worker報告書: $WORKER_REPORT_FILE
対象タスクID: $TASK_ID
判定Manager: $USER

失格理由:
$(printf '%s\n' "${failure_reasons[@]}")

証拠データ:
- Manager独立測定エラー数: $manager_error_count件
- Worker報告エラー数: $worker_error_count件
- Manager独立ビルド結果: $manager_build_result
- Worker報告ビルド結果: $worker_build_result

再作業指示: 全項目を実測値で再検証し、正確な報告書を再提出すること
============================
EOF
        
        log_error "失格通告作成完了: $failure_notice_file"
        return 1
    else
        log_success "失格判定: 該当なし - Worker作業品質合格"
        return 0
    fi
}

# ===== Stage 4: 最終判定・記録作成 =====
stage4_final_judgment() {
    log_info "=== Stage 4: 最終判定・記録作成 ==="
    
    # 総合判定実行
    overall_score=0
    evaluation_items=()
    
    # 報告書品質評価
    if [ ${#missing_sections[@]} -eq 0 ]; then
        overall_score=$((overall_score + 20))
        evaluation_items+=("報告書品質: 優秀 (+20点)")
    else
        evaluation_items+=("報告書品質: 不良 (+0点)")
    fi
    
    # 実測値正確性評価
    if [ -n "$manager_error_count" ] && [ -n "$worker_error_count" ]; then
        error_diff=${error_diff:-$((manager_error_count - worker_error_count))}
        if [ "$error_diff" -eq 0 ]; then
            overall_score=$((overall_score + 30))
            evaluation_items+=("実測値正確性: 完璧 (+30点)")
        elif [ ${error_diff#-} -le 1 ]; then
            overall_score=$((overall_score + 20))
            evaluation_items+=("実測値正確性: 良好 (+20点)")
        else
            evaluation_items+=("実測値正確性: 不良 (+0点)")
        fi
    fi
    
    # ビルド結果正確性評価
    if [ "$manager_build_result" = "$worker_build_result" ]; then
        overall_score=$((overall_score + 20))
        evaluation_items+=("ビルド結果正確性: 正確 (+20点)")
    else
        evaluation_items+=("ビルド結果正確性: 不正確 (+0点)")
    fi
    
    # システム影響評価
    if [ "${new_error_count:-0}" -eq 0 ]; then
        overall_score=$((overall_score + 20))
        evaluation_items+=("システム影響: 良好 (+20点)")
    elif [ "${new_error_count:-0}" -le 2 ]; then
        overall_score=$((overall_score + 10))
        evaluation_items+=("システム影響: 軽微 (+10点)")
    else
        evaluation_items+=("システム影響: 重大 (+0点)")
    fi
    
    # 作業効率評価
    if [ "${changed_files:-0}" -le 5 ]; then
        overall_score=$((overall_score + 10))
        evaluation_items+=("作業効率: 効率的 (+10点)")
    else
        evaluation_items+=("作業効率: 普通 (+0点)")
    fi
    
    # 最終判定
    if [ "$overall_score" -ge 80 ]; then
        final_grade="A (優秀)"
        next_action="次段階進行許可"
    elif [ "$overall_score" -ge 60 ]; then
        final_grade="B (良好)"
        next_action="次段階進行許可"
    elif [ "$overall_score" -ge 40 ]; then
        final_grade="C (合格)"
        next_action="条件付き進行許可"
    else
        final_grade="D (不合格)"
        next_action="追加作業必須"
    fi
    
    log_info "=== 最終評価結果 ==="
    log_info "総合スコア: $overall_score/100点"
    log_info "最終評価: $final_grade"
    log_info "次段階指示: $next_action"
    
    for item in "${evaluation_items[@]}"; do
        log_info "- $item"
    done
    
    # Manager監視実行記録作成
    monitoring_record="$LOG_DIR/manager_monitoring_record_${EXECUTION_TIME}.md"
    cat > "$monitoring_record" << EOF
# Manager監視実行記録

## 基本情報
- Worker ID: $(basename "$WORKER_REPORT_FILE" .md)
- 作業タスク: $TASK_ID
- 監視開始時刻: $(head -1 "$MAIN_LOG" | grep -oE '[0-9]{2}:[0-9]{2}:[0-9]{2}' || echo '記録なし')
- 監視完了時刻: $(date '+%H:%M:%S')
- 監視Manager: $USER

## 即座確認結果
- 報告書提出: ✅ ($(date -r "$file_timestamp" 2>/dev/null || echo '時刻不明'))
- 実測値照合: $([ "$error_diff" -eq 0 ] && echo "✅" || echo "⚠️") (Worker:${worker_error_count}件 vs Manager:${manager_error_count}件)
- ビルド検証: $([ "$manager_build_result" = "$worker_build_result" ] && echo "✅" || echo "❌") (Worker:${worker_build_result} vs Manager:${manager_build_result})

## 品質評価結果
- エラー削減妥当性: $([ "${reduction_rate:-0}" -ge 20 ] && echo "✅" || echo "⚠️") (${reduction_rate:-不明}%)
- 修正範囲適切性: $([ "${changed_files:-0}" -le 10 ] && echo "✅" || echo "⚠️") (${changed_files:-不明}個ファイル)
- システム影響評価: $([ "${new_error_count:-0}" -le 2 ] && echo "✅" || echo "⚠️") (新規エラー${new_error_count:-不明}件)

## 最終判定
- 総合判定: $final_grade ($overall_score/100点)
- 失格理由: $([ "$failure_detected" = true ] && echo "${failure_reasons[*]}" || echo "なし")
- 次段階進行: $next_action
EOF
    
    log_success "Manager監視記録作成完了: $monitoring_record"
    log_success "Stage 4: 最終判定・記録作成 完了"
    
    return 0
}

# ===== メイン実行フロー =====
main() {
    log_info "Manager品質確認システム実行開始"
    
    # Stage 1: 即座確認事項
    if ! stage1_immediate_verification; then
        log_error "Stage 1 失敗 - 即座対応必要"
        exit 1
    fi
    
    # Stage 2: 品質評価事項
    if ! stage2_quality_evaluation; then
        log_error "Stage 2 失敗 - 品質問題あり"
        exit 1
    fi
    
    # Stage 3: 失格判定事項
    if ! stage3_failure_judgment; then
        log_error "Stage 3: 失格判定適用 - Worker再作業必須"
        exit 2  # 失格を表す特別な終了コード
    fi
    
    # Stage 4: 最終判定・記録作成
    if ! stage4_final_judgment; then
        log_error "Stage 4 失敗 - システムエラー"
        exit 1
    fi
    
    log_success "=== Manager品質確認システム完全実行完了 ==="
    log_info "実行時間: $(date)"
    log_info "ログディレクトリ: $LOG_DIR"
    log_info "メインログ: $MAIN_LOG"
    
    return 0
}

# ===== 使用方法表示 =====
show_usage() {
    cat << EOF
使用方法: $0 [WORKER_REPORT_FILE] [TASK_ID]

引数:
  WORKER_REPORT_FILE  Worker提出報告書ファイルパス (必須)
  TASK_ID            対象タスクID (オプション, 記録用)

例:
  $0 REPORT-001-worker1.md TASK-001
  $0 reports/REPORT-002-worker2.md TASK-002

出力:
  - ログディレクトリ: ./manager_verification_logs/
  - メインログ: manager_verification_YYYYMMDD_HHMMSS.log
  - 監視記録: manager_monitoring_record_YYYYMMDD_HHMMSS.md

終了コード:
  0: 正常完了 (Worker作業合格)
  1: システムエラーまたは品質問題
  2: Worker失格判定
EOF
}

# ===== 引数チェック・実行 =====
if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# メイン実行
main "$@"