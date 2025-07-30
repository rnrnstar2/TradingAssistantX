# TASK-001: ワークフロー安定性分析・修正タスク

## 🎯 タスク概要

pnpm startワークフローの安定性を確保し、DUPLICATE_CONTENTエラーと構造不整合を解決する

## 📋 実装対象と優先度

### 🔥 高優先度: 即座解決必須
1. **DUPLICATE_CONTENTエラー解決**
   - Claudeコンテンツ生成の多様性向上
   - 時刻・日付・ランダム要素の追加
   - 過去投稿チェック機能の実装

2. **スケジュール外実行問題解決**
   - 23:40実行がschedule.yamlにない原因調査
   - TimeScheduler動作ログ確認
   - スケジュール精度の改善

### 📈 中優先度: 構造改善
3. **データ構造統合**
   - src/data/ディレクトリをdata/に統合
   - REQUIREMENTS.md・docs/directory-structure.mdに完全準拠
   - DataManagerのパス修正

## 🚀 具体的実装内容

### Phase 1: 緊急修正（DUPLICATE_CONTENT解決）
```typescript
// src/claude/endpoints/content-endpoint.ts 修正
export async function generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
  // 現在時刻・日付情報をコンテンツに組み込み
  const now = new Date();
  const timeInfo = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const dateInfo = now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  
  // ランダム要素を追加（絵文字、言い回し、視点の多様化）
  const variations = [
    '🌱【投資教育】', '💡【資産運用】', '📊【市場解説】', '🚀【投資戦略】'
  ];
  const randomHeader = variations[Math.floor(Math.random() * variations.length)];
  
  // 過去投稿内容との重複チェック機能実装
  const recentPosts = await loadRecentPosts(); // 過去24時間の投稿取得
  
  // プロンプト改善: より多様なコンテンツ生成指示
  const prompt = `
${randomHeader}${timeInfo}

${request.topic}について、以下の条件で投資教育コンテンツを生成:
- 現在時刻: ${timeInfo}、日付: ${dateInfo}
- 過去の投稿と異なる視点・表現を使用
- 280文字以内
- 初心者向けで具体的なアドバイス
- 時事性のある内容

避けるべき表現: ${recentPosts.map(p => p.content.substring(0, 50)).join(', ')}
`;

  // Claude呼び出し + エラーハンドリング強化
  try {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(30000)
      .query(prompt)
      .asText();
    
    return {
      content: response.trim(),
      timestamp: now.toISOString(),
      topic: request.topic,
      contentType: request.contentType
    };
  } catch (error) {
    console.error('Claude SDK呼び出しエラー:', error);
    throw new Error(`コンテンツ生成に失敗: ${error.message}`);
  }
}
```

### Phase 2: スケジュール修正
```typescript
// src/scheduler/time-scheduler.ts デバッグ強化
export class TimeScheduler {
  private async checkSchedule(): Promise<void> {
    const currentTime = new Date().toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // デバッグログ追加
    console.log(`⏰ 時刻チェック: ${currentTime}`);
    
    const scheduleItems = ScheduleLoader.getTodaySchedule(this.scheduleConfig);
    const matchingItem = scheduleItems.find(item => item.time === currentTime);
    
    if (matchingItem) {
      console.log(`✅ スケジュール実行: ${currentTime} - ${matchingItem.action}`);
      await this.executeWorkflow(matchingItem);
    } else {
      console.log(`⭕ スケジュール外: ${currentTime} (次回実行待機)`);
    }
  }
}
```

### Phase 3: データ構造統合
```bash
# src/data/ → data/ 統合
mv src/data/current/* data/current/
mv src/data/learning/* data/learning/
rmdir src/data/current src/data/learning src/data
```

```typescript
// src/shared/data-manager.ts パス修正
export class DataManager {
  private static readonly DATA_ROOT = path.join(process.cwd(), 'data'); // src/data → data
  private static readonly CURRENT_DIR = path.join(this.DATA_ROOT, 'current');
  private static readonly LEARNING_DIR = path.join(this.DATA_ROOT, 'learning');
  private static readonly HISTORY_DIR = path.join(this.DATA_ROOT, 'history');
}
```

## 🔧 テスト・検証手順

### 1. DUPLICATE_CONTENT修正検証
```bash
# 複数回実行して異なるコンテンツが生成される
pnpm dev  # 1回目
pnpm dev  # 2回目 → 異なるコンテンツを確認
pnpm dev  # 3回目 → さらに異なるコンテンツを確認
```

### 2. スケジュール精度検証
```bash
# 現在時刻をschedule.yamlに追加してテスト実行
echo "  - time: \"$(date +%H:%M)\"" >> data/config/schedule.yaml
echo "    action: \"post\"" >> data/config/schedule.yaml  
echo "    topic: \"テスト投稿\"" >> data/config/schedule.yaml

# 1分以内にpnpm startで実行確認
pnpm start
```

### 3. データ構造検証
```bash
# src/data/が完全に削除され、data/に統合されたか確認
ls -la src/data/  # → "No such file or directory"
ls -la data/current/ data/learning/  # → 正常にファイル存在確認
```

## 📊 成功基準

### 必須達成項目 ✅
- [ ] DUPLICATE_CONTENTエラー発生率 < 10%（現在約50%）
- [ ] スケジュール精度100%（指定時刻±30秒以内実行）
- [ ] データ構造完全統合（src/data/削除、data/統合）

### 品質基準 ✅
- [ ] TypeScript strict通過
- [ ] 連続10回pnpm dev実行でエラー0回
- [ ] pnpm start 24時間安定動作

## ⚠️ 制約・注意事項

### MVP制約遵守
- 🚫 新機能追加禁止: 既存機能の安定化のみ
- 🚫 統計・分析機能追加禁止: エラー解決に専念
- ✅ シンプル修正: 最小限の変更で最大効果

### 実装制約
- Claude SDK実装: 必ずエラーハンドリング強化
- 本番API使用: テスト以外でのモック使用禁止
- ファイル操作: 必ずバックアップ後に実行

## 📁 出力先・報告書

### 実装ファイル
- `src/claude/endpoints/content-endpoint.ts` - コンテンツ生成改善
- `src/scheduler/time-scheduler.ts` - スケジュール精度改善  
- `src/shared/data-manager.ts` - データパス修正

### 報告書作成先
- `tasks/20250729_234043_pnpm_start_workflow_stabilization/reports/REPORT-001-workflow-stability-analysis.md`

### 検証ログ出力先
- `tasks/20250729_234043_pnpm_start_workflow_stabilization/outputs/verification-logs/`
  - `duplicate-content-test.log`
  - `schedule-accuracy-test.log`
  - `data-structure-verification.log`

## 🎯 完了条件

1. **エラー解決確認**: 連続5回pnpm dev実行でDUPLICATE_CONTENTエラー0回
2. **スケジュール動作確認**: 指定時刻に正確実行ログ確認
3. **構造統合確認**: src/data/完全削除、data/統合動作確認
4. **品質確認**: TypeScript strict + lint通過
5. **報告書作成**: 実装内容・検証結果・改善効果の詳細報告

**重要**: 完了まで他のタスクは実行しない。安定化が最優先課題。