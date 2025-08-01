# TASK-001: Claude選択機能フォロー対応実装

## 🎯 **実装目標**
Claude AI選択エンドポイント(`selectOptimalTweet`)にフォロー選択タイプを追加し、戦略的フォロー対象評価機能を実装する。

## 📋 **MVP制約確認**
- ✅ **必要最小限**: フォロー選択機能のみ追加（過剰な統計・分析機能は禁止）
- ✅ **シンプル性重視**: 既存のselection-endpointを拡張、新規ファイル作成は最小限
- ✅ **実用性最優先**: 投資教育アカウントに適した専門性・相互関係評価

## 📁 **対象ファイル**
- **主要修正**: `src/claude/endpoints/selection-endpoint.ts`
- **関連参照**: `src/claude/prompts/builders/selection-builder.ts`
- **関連参照**: `src/claude/prompts/templates/selection.template.ts`

## 🔍 **実装要件**

### 1. **selection-endpoint.ts修正**

#### **TweetSelectionParams拡張**
```typescript
// 既存: 'like' | 'retweet' | 'quote_tweet'
// 追加: 'follow'
selectionType: 'like' | 'retweet' | 'quote_tweet' | 'follow'
```

#### **フォロー選択基準の追加**
```typescript
// フォロー用の評価基準（投資教育アカウント特化）
interface FollowCriteria {
  expertise_weight: 0.4,      // 投資教育分野専門性
  mutual_potential: 0.3,      // 相互フォロー・関係構築可能性
  influence_level: 0.2,       // 影響力（フォロワー数・エンゲージメント）
  content_affinity: 0.1       // コンテンツ親和性
}
```

#### **validateSelectionParams修正**
```typescript
// フォロー選択タイプのバリデーション追加
if (!['like', 'retweet', 'quote_tweet', 'follow'].includes(params.selectionType)) {
  errors.push('selectionTypeは like, retweet, quote_tweet, follow のいずれかである必要があります');
}
```

### 2. **selection-builder.ts修正**

#### **フォロー選択プロンプト対応**
- 既存の`buildPrompt`メソッドでフォロー選択タイプに対応
- フォロー特有の評価観点を追加：
  - **専門性評価**: 投資・資産形成分野での知識・権威性
  - **相互関係構築**: フォローバック・継続的関係の可能性
  - **影響力評価**: フォロワー数・エンゲージメント率
  - **コンテンツ親和性**: 投資教育アカウントとの価値観一致

### 3. **selection.template.ts修正**

#### **フォロー選択用テンプレート追加**
```typescript
// フォロー選択専用の評価基準とプロンプトテンプレート
const FOLLOW_SELECTION_TEMPLATE = `
投資教育アカウントとして戦略的にフォローする対象を選択してください。

評価基準:
1. 専門性（40%）: 投資・資産形成分野での知識・権威性
2. 相互関係構築可能性（30%）: フォローバック・継続関係の見込み
3. 影響力（20%）: フォロワー数・エンゲージメント率
4. コンテンツ親和性（10%）: 投資教育との価値観一致度

出力形式: JSON
{
  "tweetId": "選択したツイートID",
  "score": 数値（0-10）,
  "reasoning": "選択理由（専門性・相互関係・影響力の観点）",
  "expectedImpact": "high/medium/low"
}
`;
```

## 🧪 **必須実装内容**

### **Core機能実装**
1. **selectOptimalTweet関数でのfollowタイプ対応**
2. **フォロー専用評価ロジックの追加**
3. **フォロー選択プロンプトの構築**
4. **既存機能への影響を最小限に抑制**

### **品質要件**
- ✅ **TypeScript Strict**: 型安全性確保
- ✅ **エラーハンドリング**: フォロー選択エラー時のフォールバック
- ✅ **既存機能保持**: like/retweet/quote_tweet選択に影響なし

## 📖 **必須参照ドキュメント**
**Worker実装前に必ず読み込み必須**:
- `docs/claude.md` - Claude SDK仕様・エンドポイント設計
- `docs/workflow.md` - フォローアクション実行フロー
- `docs/directory-structure.md` - ファイル構造・役割

## 🚫 **実装禁止事項**
- ❌ **新規ファイル作成**: 既存ファイル拡張のみ
- ❌ **統計・分析機能**: フォロー履歴分析・レポート機能
- ❌ **複雑な重複防止**: 高機能な重複チェックシステム
- ❌ **過剰なUI**: ダッシュボード・可視化機能

## 📋 **完了条件**
1. ✅ `selectOptimalTweet({ selectionType: 'follow' })`が動作
2. ✅ フォロー専用評価基準での選択実行
3. ✅ 既存のlike/retweet/quote_tweet機能が正常動作
4. ✅ TypeScript型チェック・lintエラーなし

## 📁 **報告書作成**
実装完了後、以下のパスに報告書を作成してください：
**報告書**: `tasks/20250731_012458/reports/REPORT-001-claude-follow-selection.md`

### **報告書必須内容**
- 実装した機能の詳細
- 修正したファイルとその内容
- テスト実行結果
- 既存機能への影響確認結果