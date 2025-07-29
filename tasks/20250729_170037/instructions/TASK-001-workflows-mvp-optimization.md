# TASK-001: src/workflows MVP最適化実装

## 📋 **タスク概要**

src/workflowsディレクトリのMVP完璧性実現のため、重複コード排除とシンプル設計への最適化を実装する。

### 実装判断根拠
**REQUIREMENTS.md MVP原則**: 「シンプル実装 > 複雑な設計」「確実な動作 > 高度な機能」

## 🎯 **実装目標**

### 最優先目標
1. **重複コード完全排除**: main-workflow.tsとaction-executor.tsの重複ロジック統合
2. **MVPシンプル設計**: 不要な抽象化を排除し、確実な動作を実現
3. **責任の明確化**: 1ファイル1責任の原則でメンテナンス性向上

### 成功基準
- [ ] action-executor.tsの削除完了
- [ ] main-workflow.tsの単一責任化
- [ ] 型定義の統一化
- [ ] 既存機能の動作保証

## 📂 **現在の問題分析**

### 重複コード問題（Critical）
```
main-workflow.ts (line 272-529):
  ├─ executeAction() - switch文でアクション分岐
  ├─ executePostAction() - 投稿実行
  ├─ executeRetweetAction() - リツイート実行
  ├─ executeLikeAction() - いいね実行
  └─ executeQuoteTweetAction() - 引用ツイート実行

action-executor.ts (line 55-235):
  ├─ executeAction() - 同一のswitch文
  ├─ executePost() - 同一の投稿実行ロジック
  ├─ executeRetweet() - 同一のリツイート実行ロジック
  ├─ executeLike() - 同一のいいね実行ロジック
  └─ executeWait() - 待機ロジック
```

**問題**: ActionExecutorクラスは作成されたが、main-workflow.tsで全く使用されていない

### MVPの簡素性原則違反
- **過剰な抽象化**: 使用されないクラスの存在
- **YAGNI原則違反**: 不要な複雑性の導入
- **保守コスト増大**: 同一ロジックの多重管理

## 🛠️ **実装仕様**

### アプローチ: シンプル統合パターン

**戦略**: action-executor.tsを削除し、main-workflow.tsに統合してMVPの簡素性を実現

### 修正対象ファイル

#### 1. action-executor.ts - 🗑️ **完全削除**
```
❌ 削除理由:
- MainWorkflowで全く使用されていない
- 重複ロジックによる保守コスト増大
- MVPの簡素性原則違反
```

#### 2. main-workflow.ts - 🔧 **最適化**
```typescript
// 実装要件:
✅ 現在のアクション実行ロジックを保持（動作保証）
✅ 型定義の統一と整理
✅ エラーハンドリングの保持
✅ コメント・ドキュメンテーションの改善
```

#### 3. constants.ts - 🔧 **型定義強化**
```typescript
// 追加要件:
+ アクション実行結果の型定義
+ ワークフロー関連の共通型定義
+ エラーハンドリング型の統一
```

## 📝 **詳細実装指示**

### Step 1: action-executor.tsの削除前準備

1. **依存関係確認**:
```bash
# action-executor.tsのimport使用箇所確認
grep -r "action-executor" src/ --include="*.ts"
grep -r "ActionExecutor" src/ --include="*.ts"
```

2. **使用されていないことの最終確認**:
- main-workflow.tsでActionExecutorクラスのインスタンス化がないか確認
- 他のファイルでの使用がないか確認

### Step 2: main-workflow.tsの最適化

#### 型定義の統一化
```typescript
// constants.tsに移動する型定義
interface WorkflowOptions {
  scheduledAction?: string;
  scheduledTopic?: string;
  scheduledQuery?: string;
}

interface WorkflowResult {
  success: boolean;
  executionId: string;
  decision: any;
  actionResult?: any;
  error?: string;
  executionTime: number;
}

interface ActionResult {
  success: boolean;
  action: ActionType;
  timestamp: string;
  executionTime?: number;
  result?: any;
  error?: string;
}
```

#### メインクラスの構造最適化
```typescript
export class MainWorkflow {
  // 既存の機能を保持
  static async execute(options?: WorkflowOptions): Promise<WorkflowResult>
  
  // アクション実行メソッド群（既存ロジック保持）
  private static async executeAction(decision: any): Promise<any>
  private static async executePostAction(decision: any): Promise<any>
  private static async executeRetweetAction(decision: any): Promise<any>
  private static async executeLikeAction(decision: any): Promise<any>
  private static async executeQuoteTweetAction(decision: any): Promise<any>
  
  // ユーティリティメソッド
  private static async collectKaitoData(): Promise<any>
  private static buildSystemContext(profile: any, currentStatus: any): SystemContext
  private static async saveResults(decision: any, actionResult: any): Promise<void>
  private static async initializeKaitoClient(): Promise<void>
}
```

### Step 3: constants.tsの強化

#### 追加する型定義
```typescript
// ワークフロー実行関連型
export interface WorkflowOptions {
  scheduledAction?: string;
  scheduledTopic?: string;
  scheduledQuery?: string;
}

export interface WorkflowResult {
  success: boolean;
  executionId: string;
  decision: any;
  actionResult?: any;
  error?: string;
  executionTime: number;
}

export interface ActionResult {
  success: boolean;
  action: ActionType;
  timestamp: string;
  executionTime?: number;
  result?: any;
  error?: string;
}

// システムコンテキスト型
export interface SystemContext {
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
    accountHealth?: any;
  };
  system: {
    health: {
      all_systems_operational: boolean;
      api_status: 'healthy' | 'degraded' | 'error';
      rate_limits_ok: boolean;
    };
    executionCount: { today: number; total: number };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
}
```

## ⚠️ **重要な制約**

### 既存機能の完全保持
```
🚫 機能変更禁止: 既存のワークフロー実行ロジックは一切変更しない
✅ 構造最適化のみ: ファイル構造とコード重複のみを修正
✅ 動作保証: dev実行・スケジュール実行の両方で同一動作
```

### MVPの簡素性優先
```
🚫 新機能追加禁止: 新しい機能やメソッドは追加しない
✅ シンプル化重視: 複雑な設計パターンは使用しない
✅ 単一責任: 1クラス1責任の原則を厳守
```

### 型安全性の保持
```
✅ TypeScript strict mode対応
✅ 既存の型チェックを破綻させない
✅ import/export文の整合性保持
```

## 🔍 **品質保証要件**

### 実装後テスト
1. **基本動作確認**:
```bash
# dev実行確認
pnpm dev

# main実行確認（短時間）
timeout 30s pnpm start
```

2. **TypeScript型チェック**:
```bash
pnpm run type-check
```

3. **ESLint確認**:
```bash
pnpm cpp lint
```

### エラーハンドリング確認
- try-catch文の保持
- エラーログ出力の保持
- プロセス終了処理の保持

## 📋 **実装手順**

### Phase 1: 準備・確認
1. 現在のaction-executor.ts使用箇所の最終確認
2. main-workflow.tsの既存機能動作確認
3. バックアップの作成（必要に応じて）

### Phase 2: 削除・統合
1. action-executor.tsの削除
2. main-workflow.tsからaction-executor.tsへのimportを削除
3. 型定義のconstants.tsへの移動

### Phase 3: 品質確認
1. TypeScript型チェック通過確認
2. ESLint通過確認
3. 基本動作テスト実行

## 📤 **成果物**

### 修正後のファイル構成
```
src/workflows/
├── main-workflow.ts      # 統合されたメインワークフロー（最適化済み）
├── constants.ts          # 強化された定数・型定義
└── [action-executor.ts]  # 🗑️ 削除済み
```

### 期待される効果
- **保守性向上**: 単一ファイルでの責任管理
- **理解容易性**: 重複排除による分かりやすいコード
- **MVPの完璧性**: REQUIREMENTS.mdの原則完全遵守

## 📋 **実装完了報告書作成要件**

実装完了後、以下の報告書を作成してください：
**📋 報告書**: `tasks/20250729_170037/reports/REPORT-001-workflows-mvp-optimization.md`

### 報告書必須内容
1. **実装概要**: 実施した変更内容の要約
2. **削除ファイル確認**: action-executor.ts削除の確認
3. **動作テスト結果**: pnpm dev / pnpm start実行結果
4. **型チェック結果**: TypeScript型チェック通過確認
5. **コード品質確認**: ESLint通過確認
6. **最終評価**: MVPの完璧性達成度の自己評価

---

**🎯 Remember**: シンプル実装 > 複雑な設計。MVPの完璧性はシンプルさから生まれます。