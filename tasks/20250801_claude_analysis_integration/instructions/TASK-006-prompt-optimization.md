# TASK-006: プロンプトビルダー最適化

## 🎯 タスク概要
FX特化した高品質プロンプト生成のため、ビルダーとテンプレートを最適化する。

## 📋 実装要件

### 1. 修正対象ファイル

#### `src/claude/prompts/templates/content.template.ts`
**FX特化テンプレートの追加**

```typescript
// 既存のcontentTemplateに加えて
export const fxContentTemplate = `
{{basePrompt}}

【FX市場状況】
{{fxMarketContext}}

【独自分析視点】
{{contrarianAnalysis}}

【予測と検証】
{{predictionVerification}}

{{analysisInsights}}

以下の点を必ず含めてください：
1. 具体的な通貨ペアと価格レベル
2. 他のアナリストとは異なる独自の見解
3. リスク管理の実践的アドバイス
4. エントリー/エグジットの具体的戦略

{{customInstruction}}

読者の立場に立って、FX中級者にとって本当に価値ある情報を、
独自性とエッジを効かせて${maxLength}文字以内で投稿してください。`;

// 時間帯別FXテンプレート
export const fxTimeBasedTemplates = {
  tokyo: `東京市場の特性（USD/JPY中心、日銀政策注目）を踏まえて`,
  london: `ロンドン市場の特性（EUR/GBP活発、ボラティリティ上昇）を踏まえて`,
  newyork: `NY市場の特性（米経済指標影響大、ドルストレート注目）を踏まえて`,
  overlap: `市場オーバーラップ時間の高ボラティリティを活用して`
};
```

#### `src/claude/prompts/builders/content-builder.ts`
**FX特化ビルダー機能の追加**

```typescript
class ContentBuilder extends BaseBuilder {
  // 既存メソッドに加えて
  
  buildFXMarketContext(): string {
    const hour = new Date().getHours();
    const market = this.getActiveMarket(hour);
    
    return `
現在の${market}市場時間帯
主要通貨ペア動向: ${this.getMarketTrends()}
ボラティリティ: ${this.getVolatilityLevel()}
注目イベント: ${this.getUpcomingEvents()}
    `.trim();
  }
  
  buildContrarianAnalysis(insights: any): string {
    if (!insights?.contrarianViews || insights.contrarianViews.length === 0) {
      return '市場のコンセンサスに対する独自の視点を提供';
    }
    
    return `
【逆張り的視点】
${insights.contrarianViews.map(view => `・${view}`).join('\n')}
    `.trim();
  }
  
  buildPredictionVerification(insights: any): string {
    if (!insights?.predictions || insights.predictions.length === 0) {
      return '';
    }
    
    return `
【本日の予測】
${insights.predictions.map(p => 
  `・${p.pair}: ${p.direction === 'up' ? '上昇' : '下落'}目標 ${p.target} (${p.timeframe})`
).join('\n')}
    `.trim();
  }
  
  private getActiveMarket(hour: number): string {
    // JST基準
    if (hour >= 9 && hour < 15) return '東京';
    if (hour >= 16 && hour < 21) return 'ロンドン';
    if (hour >= 21 || hour < 2) return 'ニューヨーク';
    if (hour >= 15 && hour < 16) return '東京-ロンドン重複';
    if (hour >= 21 && hour < 24) return 'ロンドン-NY重複';
    return 'オセアニア';
  }
}
```

### 2. 選択基準の最適化

#### `src/claude/prompts/templates/selection.template.ts`

```typescript
// FX特化の選択基準
export const fxSelectionCriteria = {
  retweet: {
    uniqueness: 0.5,      // 独自性最重視
    fxRelevance: 0.3,     // FX関連性
    predictions: 0.15,    // 予測価値
    engagement: 0.05      // エンゲージメント（最小化）
  },
  like: {
    expertise: 0.7,       // FX専門性
    contrarian: 0.2,      // 逆張り視点
    relationship: 0.1     // 関係構築
  },
  follow: {
    influence: 0.5,       // 業界影響力
    uniqueInfo: 0.3,      // 独自情報源
    fxFocus: 0.2         // FX特化度
  }
};
```

### 3. パフォーマンス最適化

```typescript
// src/claude/utils/prompt-cache.ts (新規)
export class PromptCache {
  private static cache = new Map<string, any>();
  private static TTL = 5 * 60 * 1000; // 5分
  
  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  static set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

### 4. エラーハンドリングの強化

```typescript
// プロンプト生成時のフォールバック戦略
function buildPromptWithFallback(params: any): string {
  try {
    // FX特化プロンプト生成を試行
    return buildFXSpecializedPrompt(params);
  } catch (error) {
    console.warn('FX特化プロンプト生成失敗、汎用プロンプトにフォールバック');
    // 汎用プロンプトにフォールバック
    return buildGenericPrompt(params);
  }
}
```

## 📁 関連ドキュメント
- `docs/claude.md` - プロンプト設計原則
- TASK-005の成果物と連携

## ✅ 完了条件
- FX特化テンプレートが実装される
- 時間帯別の市場特性が反映される
- キャッシュによるパフォーマンス向上
- エラー時のフォールバック動作