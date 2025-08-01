# TASK-002: Claude分析機能の型定義拡張

## 🎯 タスク概要
データ分析エンドポイントで使用する型定義を`src/claude/types.ts`に追加する。

## 📋 実装要件

### 1. 追加する型定義

#### 分析結果の型
```typescript
// Target Query分析結果
export interface TargetQueryInsights {
  summary: string;                    // 200文字以内の要約
  keyPoints: Array<{
    point: string;                   // ポイント内容
    importance: 'critical' | 'high' | 'medium';
    category: 'trend' | 'news' | 'analysis' | 'warning';
  }>;
  marketSentiment?: 'bullish' | 'bearish' | 'neutral';
  mentionedPairs?: string[];         // 言及された通貨ペア
  confidence: number;                // 0-1の信頼度
  analyzedAt: string;               // ISO timestamp
  dataPoints: number;               // 分析したツイート数
}

// Reference User分析結果
export interface ReferenceUserInsights {
  username: string;
  summary: string;                   // 150文字以内の要約
  expertise: string[];               // 専門分野（例：["FX", "金融政策", "テクニカル分析"]）
  latestViews: Array<{
    topic: string;
    stance: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  reliability: number;               // 0-1の信頼性スコア
  analyzedAt: string;
  tweetCount: number;
}

// 統合分析結果
export interface CombinedAnalysisInsights {
  targetQueryInsights?: TargetQueryInsights;
  referenceUserInsights: ReferenceUserInsights[];
  overallTheme: string;              // 全体的なテーマ
  actionableInsights: string[];      // 投稿に活用すべきポイント
}
```

#### パラメータの型
```typescript
// データ分析パラメータ
export interface DataAnalysisParams {
  targetQuery?: {
    query: string;
    tweets: TweetData[];
    topic: string;
  };
  referenceUsers?: Array<{
    username: string;
    tweets: TweetData[];
  }>;
  context?: SystemContext;
}

// エンドポイント個別パラメータ
export interface AnalyzeTargetQueryParams {
  tweets: TweetData[];
  query: string;
  topic: string;
  context?: SystemContext;
}

export interface AnalyzeReferenceUserParams {
  tweets: TweetData[];
  username: string;
  context?: SystemContext;
}
```

### 2. 既存型との整合性
- `TweetData`型を再利用（既存定義がある場合）
- `SystemContext`型との互換性を保つ
- エクスポートを`index.ts`に追加

### 3. JSDocコメント
- 各フィールドの用途を明確に記載
- 使用例をコメントで提供

## 📁 関連ドキュメント
- `docs/claude.md` - Claude SDK仕様
- 既存の`src/claude/types.ts`を参照

## ✅ 完了条件
- TypeScript strict modeでエラーなし
- 既存の型定義を壊さない
- エクスポートが正しく設定される