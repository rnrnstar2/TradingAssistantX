# TASK-005: FX特化分析機能の追加

## 🎯 タスク概要
データ分析エンドポイントにFX専門的な分析機能を追加し、独自性・エッジの効いた分析を実現する。

## 📋 実装要件

### 1. 修正対象ファイル
**ファイル**: `src/claude/endpoints/data-analysis-endpoint.ts`

### 2. FX特化分析プロンプトの追加

#### analyzeTargetQueryResultsの改善
```typescript
// FX特化プロンプトテンプレート
const FX_ANALYSIS_PROMPT = `
あなたはFX市場の専門アナリストです。以下のツイートからFX市場の重要な情報を分析してください。

【分析視点】
1. 通貨ペア別動向（USD/JPY, EUR/USD等の具体的言及）
2. テクニカル指標（サポート/レジスタンス、移動平均線等）
3. ファンダメンタルズ要因（金利政策、経済指標等）
4. 市場センチメント（リスクオン/オフ、ボラティリティ）

【独自性評価基準】
- 一般的でない逆張り的視点（10点満点）
- 他アナリストが見落としている点（10点満点）
- 具体的な予測・エントリーポイント（10点満点）
- リスク警告の価値（10点満点）

【必須抽出項目】
- mentionedCurrencyPairs: 言及された通貨ペア
- technicalLevels: 具体的な価格レベル
- contrarian_views: 逆張り的見解
- predictions: 具体的な予測（方向性、タイミング、価格）
- riskWarnings: 注意すべきリスク

クエリ: ${query}
トピック: ${topic}

[ツイート一覧]
${tweets}

【出力形式】
{
  "summary": "200文字以内のFX専門的サマリー",
  "keyPoints": [
    {
      "point": "ポイント内容",
      "importance": "critical|high|medium",
      "category": "technical|fundamental|sentiment|prediction",
      "uniquenessScore": 8.5
    }
  ],
  "mentionedPairs": ["USD/JPY", "EUR/USD"],
  "technicalLevels": {
    "USD/JPY": {
      "support": [149.50, 149.00],
      "resistance": [150.50, 151.00]
    }
  },
  "contrarianViews": ["一般的な強気相場観に対し、テクニカル的な反転サインが..."],
  "predictions": [
    {
      "pair": "USD/JPY",
      "direction": "down",
      "target": 149.00,
      "timeframe": "今週中",
      "confidence": 0.75
    }
  ],
  "marketSentiment": "risk-off turning",
  "confidence": 0.85
}
`;
```

### 3. Reference User分析の専門性強化

```typescript
// ユーザー別の専門性マッピング
const USER_EXPERTISE_MAP = {
  "stlouisfed": ["金融政策", "FED", "金利"],
  "kathylienfx": ["FXテクニカル", "通貨相関", "市場心理"],
  "ForexLive": ["リアルタイム", "ディーラー視点", "オーダーフロー"],
  // ... 他のユーザー
};

// 専門性に応じた分析視点の調整
function getAnalysisPromptForUser(username: string, tweets: any[]) {
  const expertise = USER_EXPERTISE_MAP[username] || ["FX全般"];
  // 専門性に応じたプロンプト生成
}
```

### 4. strategy.yaml連携

```typescript
// strategy.yamlからの設定読み込み
import { DataManager } from '../../shared/data-manager';

async function loadStrategyConfig() {
  const strategy = await DataManager.getInstance().loadStrategy();
  return {
    differentiationStrategies: strategy.differentiation_strategies,
    fxKeywords: strategy.fx_keywords,
    selectionWeights: strategy.selection_weights
  };
}

// 分析時に戦略設定を活用
const strategyConfig = await loadStrategyConfig();
// uniqueness_firstやcontrarian_viewsの重み付けに使用
```

### 5. 型定義の拡張

```typescript
// src/claude/types.tsに追加
export interface FXSpecificInsights {
  mentionedPairs: string[];
  technicalLevels: {
    [pair: string]: {
      support: number[];
      resistance: number[];
    };
  };
  contrarianViews: string[];
  predictions: Array<{
    pair: string;
    direction: 'up' | 'down' | 'range';
    target?: number;
    timeframe: string;
    confidence: number;
  }>;
  riskWarnings: string[];
}

// TargetQueryInsightsを拡張
export interface TargetQueryInsights extends FXSpecificInsights {
  // 既存フィールド
}
```

## 📁 関連ドキュメント
- `data/config/strategy.yaml` - 差別化戦略設定
- `data/config/reference-accounts.yaml` - 参考アカウント専門性

## ✅ 完了条件
- FX専門的な分析結果が生成される
- 独自性スコアが各ポイントに付与される
- strategy.yaml設定が反映される