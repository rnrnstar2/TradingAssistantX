# TASK-001: Claude Code自律判断最適化システム

## 🎯 最適化目標
固定的なワークフローからClaude Code主導の自律判断システムへ転換し、コンテキスト効率を最大化します。

## 📊 現状の問題
- 7ステップ固定ワークフローによる判断制限
- 16個のmarkdownファイルによるコンテキスト圧迫
- 時間制限・プロセスの固定化
- 過剰な情報収集による非効率性

## 🚀 実装要件

### 1. ドキュメント統合・簡素化

#### 対象ファイル削除・統合
```
削除対象:
- docs/guides/autonomous-system-workflow.md (固定ワークフロー)
- docs/guides/optimized-workflow-operations.md (固定操作)  
- docs/guides/decision-logging.md (過剰ログ)
- docs/x-system-guide.md (重複情報)

統合対象:
- docs/setup.md + docs/operations.md → docs/quick-setup.md
- docs/architecture.md + docs/reference.md → docs/technical-reference.md
```

#### 新しいドキュメント構造
```
docs/
├── ESSENTIALS.md         # 必須要件のみ（現CLAUDE.md置換）
├── quick-setup.md        # 設定・運用統合
├── technical-reference.md # 技術詳細統合
└── guides/
    ├── output-management-rules.md # 保持
    ├── deletion-safety-rules.md   # 保持
    └── yaml-driven-development.md # 保持（簡素化）
```

### 2. ESSENTIALS.md作成（CLAUDE.md置換）

#### 必要最低限の要素のみ
```markdown
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
```

### 3. 自律システム実装（autonomous-executor.ts改修）

#### 固定ワークフロー除去
```typescript
// 削除: 固定7ステップ
// 追加: Claude判断ベース実行

export class AutonomousExecutor {
  async executeClaudeAutonomous(): Promise<void> {
    console.log('🤖 [Claude自律実行] 現在状況の分析と最適アクション判断...');
    
    // 1. 最小限の状況把握
    const currentSituation = await this.getCurrentSituation();
    
    // 2. Claude自律判断
    const claudeDecision = await this.requestClaudeDecision(currentSituation);
    
    // 3. 決定実行
    await this.executeDecision(claudeDecision);
  }
  
  private async getCurrentSituation(): Promise<MinimalContext> {
    return {
      accountHealth: await this.getAccountHealthScore(),
      todayActions: await this.getTodayActionCount(),
      availableTime: this.getAvailableTime(),
      systemStatus: await this.getSystemStatus()
    };
  }
  
  private async requestClaudeDecision(situation: MinimalContext): Promise<ClaudeDecision> {
    const prompt = `
現在状況: ${JSON.stringify(situation, null, 2)}

X（Twitter）アカウントの成長のため、現在の状況を分析し最適なアクションを1つ選択してください:

選択肢:
1. original_post - 独自投稿作成
2. quote_tweet - 既存ツイートへの付加価値コメント
3. retweet - 価値あるコンテンツの拡散
4. reply - コミュニティとのエンゲージメント
5. analyze_only - 情報収集・分析のみ
6. wait - 待機（最適タイミング待ち）

最適なアクションとその理由を簡潔に返してください。
`;

    const response = await claude()
      .withModel('sonnet')
      .query(prompt)
      .asText();
      
    return this.parseClaudeDecision(response);
  }
}
```

### 4. 設定システム簡素化

#### autonomous-config.yaml改修
```yaml
# 簡素化版
claude_autonomous:
  enabled: true
  max_context_size: 30000  # 削減
  decision_mode: "autonomous"  # Claude判断重視
  
execution:
  mode: "claude_decision"  # 固定モード除去
  quality_priority: true   # 品質最優先
  
data_management:
  minimal_history: true    # 履歴最小化
  real_time_focus: true    # リアルタイム重視
```

### 5. 情報収集最適化

#### ActionSpecificCollector軽量化
```typescript
// 重い情報収集プロセスの簡素化
async collectMinimalInfo(actionType: string): Promise<EssentialInfo[]> {
  // 必要最小限の情報のみ収集
  // Claude判断に必要な核心情報に集中
  
  const essentialInfo = await this.getEssentialInfoOnly(actionType);
  return essentialInfo.slice(0, 5); // 上位5件に制限
}
```

## 📋 実装手順

### Phase 1: ドキュメント最適化
1. 不要ドキュメント削除
2. ESSENTIALS.md作成（CLAUDE.md置換）
3. 統合ドキュメント作成

### Phase 2: システム自律化
1. AutonomousExecutor改修（固定ワークフロー除去）
2. Claude判断ベース実行システム実装
3. 設定ファイル簡素化

### Phase 3: 情報収集軽量化
1. ActionSpecificCollector最適化
2. 不要な履歴・分析データ削除
3. リアルタイム判断重視システム

### Phase 4: 統合テスト
1. Claude自律判断の動作確認
2. コンテキスト効率の測定
3. 実際の運用での効果検証

## ⚠️ 制約・注意事項

### 品質維持
- 自律化により品質低下させない
- TypeScript strict mode維持
- エラーハンドリング強化

### 互換性保持
- 既存YAML設定との互換性
- 段階的移行対応
- ロールバック可能性

## ✅ 完了基準

1. **効率化達成**
   - ドキュメント数: 16個→7個以下
   - コンテキスト使用量: 30%削減
   - Claude判断による自律実行動作

2. **品質基準**
   - TypeScript strict mode準拠  
   - 既存機能の正常動作
   - エラーハンドリング強化

3. **運用基準**
   - Claude自律判断の実用性確認
   - 実際の投稿品質向上
   - システム安定性確保

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_194158_system_optimization/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-001-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- ドキュメント最適化結果
- Claude自律判断システム動作状況
- コンテキスト効率改善効果
- 実際の運用での改善点

---

**最適化品質**: Claude Codeの本来の能力を最大限引き出し、効率的で高品質なシステムを構築してください。