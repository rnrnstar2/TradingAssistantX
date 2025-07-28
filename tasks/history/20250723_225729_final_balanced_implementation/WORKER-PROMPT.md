# 🚀 Worker実行プロンプト - KaitoTwitterAPI統合バランス調整版MVP実装

## 📋 実行指示

あなたはTradingAssistantXのKaitoTwitterAPI統合実装を担当するWorkerです。以下の要件に従って、バランス調整版データ管理システムでMVP実装を完了してください。

## 🎯 実装目標

**KaitoTwitterAPI完全統合 + Claude Code SDK学習データ連携によるハイブリッド高知能X投稿システム**

- ✅ **リアルタイムデータ**: KaitoTwitterAPIからの即座取得・分析
- ✅ **学習データ**: Claude Code SDK継続性のためのローカル蓄積・共有  
- ✅ **メモリ内高速処理**: API+学習データの統合分析
- ✅ **200 QPS性能活用**: 高速リアルタイム処理の実現

## 📁 実装対象システム

### バランス調整版データ構造（REQUIREMENTS.md準拠）
```
data/
├── config/      # システム設定
│   └── api-config.yaml           # KaitoTwitterAPI認証情報
├── learning/    # Claude Code SDK学習データ（セッション間共有）
│   ├── decision-patterns.yaml    # 過去の判断パターンと結果
│   ├── success-strategies.yaml   # 成功した戦略の記録
│   └── error-lessons.yaml        # エラーからの教訓
└── context/     # 実行コンテキスト（継続性のため）
    ├── session-memory.yaml       # セッション間引き継ぎデータ
    └── strategy-evolution.yaml   # 戦略進化の記録
```

## 🔧 主要実装タスク

### Phase 1: KaitoTwitterAPI基盤実装
1. **src/services/kaito-api-manager.ts** - API統合マネージャー作成
2. **data/config/api-config.yaml** - 認証設定ファイル作成
3. **API認証・基本データ取得機能** - アカウント状況、投稿履歴、エンゲージメント取得

### Phase 2: 学習統合Claude Code SDK
1. **src/core/claude-autonomous-agent.ts** - 学習データ統合エージェント作成
2. **src/utils/learning-data-manager.ts** - 学習データ管理システム作成
3. **学習データファイル初期化** - decision-patterns, success-strategies, error-lessons

### Phase 3: X投稿系統移行
1. **src/services/x-poster.ts修正** - 既存XPosterのKaitoAPI対応
2. **拡張アクション実装** - リツイート・いいね・返信機能のKaitoAPI対応

### Phase 4: 統合実行システム
1. **src/core/loop-manager.ts** - 学習データ+API統合実行フロー
2. **エンドツーエンド動作確認** - 全機能の統合テスト

## 📊 実装仕様書

詳細な実装仕様は以下を参照してください：
**📋 仕様書**: `tasks/20250723_225729_final_balanced_implementation/instructions/TASK-001-kaito-api-balanced-mvp.md`

## ⚠️ 重要な実装原則

### ハイブリッドデータ管理
- **API取得データ**: アカウント・投稿・エンゲージメント・フォロワー（リアルタイム）
- **ローカル学習データ**: Claude判断履歴・成功パターン・エラー教訓（蓄積・共有）
- **メモリ内処理**: API+学習データの統合分析による高速判断

### Claude Code SDK統合
```typescript
// 学習統合型プロンプト例
const enhancedPrompt = `
現在の状況（KaitoTwitterAPI取得）: ${liveData}

過去の学習データ（ローカル蓄積）:
- 成功パターン: 朝9時投稿で高エンゲージメント（3.2%）
- 失敗教訓: 専門用語多用時はエンゲージメント低下

この知識を活用して次のアクションを決定してください：
{
  "action": "create_post",
  "reasoning": "朝の時間帯で投資基礎教育が効果的",
  "learning_applied": ["朝9時効果", "専門用語回避"]
}
`;
```

### MVP設計原則遵守
- **シンプルな実装**: 要件定義外の複雑機能は実装禁止
- **基本エラーハンドリング**: try-catch + コンソールログのみ
- **最小限設定**: api-config.yamlとlearning dataのみ

## 🎯 成功指標

### 必須達成目標
- [ ] KaitoTwitterAPI認証・データ取得成功率: 99%以上
- [ ] Claude Code SDK学習データ統合動作確認
- [ ] 投稿・RT・いいね・返信の全アクション実行確認
- [ ] 学習データ蓄積・活用サイクル動作確認
- [ ] システム継続実行（1日3-5回投稿）達成

### パフォーマンス目標
- [ ] API応答時間: 平均700ms以下
- [ ] 学習データ処理: 100ms以下
- [ ] エンゲージメント率: 3.0%以上維持
- [ ] システム稼働率: 95%以上

## 🚨 実装完了後の必須作業

1. **動作確認**: 全機能のエンドツーエンドテスト
2. **報告書作成**: `tasks/20250723_225729_final_balanced_implementation/reports/REPORT-001-kaito-api-balanced-implementation.md`
3. **実行ログ記録**: tasks/outputs/配下への詳細ログ出力

## 🎖️ 実装の価値

この実装により、以下の革新的価値を実現します：

### 技術的革新
- **業界最先端**: API中心+学習データ統合のハイブリッド設計
- **Claude Code SDK活用**: セッション間知識共有による賢い判断
- **200 QPS性能**: KaitoTwitterAPIの最大活用

### ビジネス価値
- **継続的成長**: 学習データ活用による戦略自動進化
- **高品質投稿**: 成功パターン学習による最適コンテンツ生成
- **運用効率**: 最小限の設定・保守で最大の効果

---

## 🚀 開始コマンド

実装開始前に以下を実行してください：

```bash
# 権限確認
echo "ROLE: $ROLE" && git branch --show-current

# 要件定義確認
cat REQUIREMENTS.md | head -20

# 実装開始
pnpm dev  # 開発モードでの動作確認
```

**目標**: API取得リアルタイムデータ + Claude Code SDK学習データの最適バランスによる、賢く継続的に成長するX投稿システムの完成

**期限**: 4週間以内での実装完了

頑張ってください！🎯