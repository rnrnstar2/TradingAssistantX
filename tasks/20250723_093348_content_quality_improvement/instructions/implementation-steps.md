# ContentCreator改良実装手順書

## 🎯 実装目標
投稿品質を「単なるニュース転載」から「価値ある投資教育コンテンツ」へ転換

## 📝 Phase 1: 即時改良（優先度: 最高）

### Step 1: プロンプトテンプレートの定義
**ファイル**: `src/services/content-creator.ts`

```typescript
// 98行目付近のgenerateEducationalContentメソッドを以下に置き換え

private readonly EDUCATIONAL_PROMPT_TEMPLATE = `
あなたは日本の個人投資家向け教育の専門家です。
以下のニュース/トピックを、投資初心者にとって価値ある教育コンテンツに変換してください。

【元のトピック】
${topic.topic}

【あなたのタスク】
このトピックから投資初心者が学べる実践的な教訓を抽出し、以下の構成で投稿を作成：

1. 冒頭（1文）: なぜこのニュースが個人投資家にとって重要なのか
2. 本文（2-3文）: 
   - このニュースから学べる投資の原則や考え方
   - 初心者が今すぐ実践できる具体的なアクション
   - 日本の制度（NISA/iDeCo）を活用する方法（該当する場合）
3. 締め（1文）: リスク管理の観点や注意点

【重要な制約】
- 280文字以内厳守
- 専門用語は使わない、または必ず簡単な説明を付ける
- 「〜かもしれません」「検討してみては」など、押し付けない表現
- 絵文字は冒頭に1つのみ（📊💡🎯から選択）
- 必ず具体的なアクションを1つ以上含める

【良い例】
💡 米国の利下げは私たちの資産にも影響します。なぜなら、円高になりやすく外国株式の評価額が変動するから。この機会に、NISA成長投資枠で米国ETFを少額から始めてみては？ただし為替リスクがあるので、全資産の10-20%程度に抑えることが大切です。

【生成する投稿】
`;

async generateEducationalContent(topic: MarketTopic): Promise<string> {
  try {
    const prompt = this.EDUCATIONAL_PROMPT_TEMPLATE.replace('${topic.topic}', topic.topic);
    
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(15000)
      .query(prompt)
      .asText();
    
    // 品質チェック
    const content = response.trim();
    if (!this.hasEducationalElements(content)) {
      console.warn('⚠️ 教育的要素が不足、再生成を試みます');
      return this.improveEducationalContent(content, topic);
    }
    
    return content;
  } catch (error) {
    console.error('❌ 教育コンテンツ生成エラー:', error);
    return this.createEducationalFallback(topic);
  }
}
```

### Step 2: 教育的要素の検証強化
**追加メソッド**: 同じファイルに追加

```typescript
private hasEducationalElements(content: string): boolean {
  const checks = {
    hasWhyExplanation: /なぜ|理由|ため/.test(content),
    hasConcreteAction: /NISA|iDeCo|ETF|投資信託|積立|始め/.test(content),
    hasRiskMention: /リスク|注意|ただし|慎重/.test(content),
    hasBeginnerFocus: /初心者|始めて|少額|基本/.test(content)
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  return passedChecks >= 3; // 4項目中3項目以上でOK
}

private async improveEducationalContent(
  content: string, 
  topic: MarketTopic
): Promise<string> {
  const improvementPrompt = `
以下の投稿を改善してください。

現在の投稿: ${content}

不足している要素:
- 初心者向けの具体的なアクション提案
- 日本の投資制度（NISA/iDeCo）への言及
- リスク管理の視点

280文字以内で、これらの要素を含めて書き直してください。
`;

  try {
    const improved = await claude()
      .withModel('sonnet')
      .withTimeout(10000)
      .query(improvementPrompt)
      .asText();
    return improved.trim();
  } catch {
    return this.createEnhancedEducationalFallback(topic);
  }
}
```

### Step 3: 日本市場コンテキストの追加
**定数定義**: ファイル上部に追加

```typescript
private readonly JAPAN_INVESTMENT_CONTEXT = {
  nisa: {
    growth: { annual_limit: 2400000, name: "成長投資枠" },
    tsumitate: { annual_limit: 1200000, name: "つみたて投資枠" },
    total_limit: 18000000
  },
  ideco: {
    tax_benefits: ["掛金が全額所得控除", "運用益が非課税", "受取時も税制優遇"],
    monthly_limit_employee: 23000
  },
  beginner_principles: [
    "長期・積立・分散投資",
    "手数料の低い商品選び",
    "リスク許容度に応じた配分"
  ],
  action_templates: {
    us_market: "NISA成長投資枠で米国株ETF（VOOなど）を検討",
    japan_market: "つみたてNISAで日経平均連動ファンドから開始",
    emerging: "リスク分散のため新興国株式は全体の10%程度に",
    bond: "iDeCoで債券ファンドを組み入れてリスク調整"
  }
};
```

### Step 4: フォールバックコンテンツの強化
**メソッド更新**: 既存のcreateEducationalFallbackを置き換え

```typescript
private createEnhancedEducationalFallback(topic: MarketTopic): string {
  const templates = [
    `📊 ${topic.topic}から学ぶ投資の基本。市場の動きには必ず理由があります。まずはつみたてNISAで少額から始め、経済ニュースと投資の関係を実感してみましょう。ただし、投資は自己責任。余裕資金で行うことが大切です。`,
    
    `💡 今日の注目は${topic.topic}。これが私たちの資産にどう影響するか考えてみましょう。初心者の方は、NISA口座で低コストのインデックスファンドから始めるのがおすすめ。焦らず、長期的な視点を持つことが成功の鍵です。`,
    
    `🎯 ${topic.topic}について。投資で大切なのは、ニュースに振り回されないこと。まずは月1万円の積立投資から始めて、市場の動きに慣れていきましょう。iDeCoなら節税効果も期待できます。リスクを理解した上で、一歩踏み出してみては？`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}
```

## 📝 Phase 2: データ活用強化（優先度: 高）

### Step 5: 複数データ統合分析
**新規メソッド追加**:

```typescript
private async analyzeMultipleDataSources(data: ProcessedData): Promise<IntegratedInsight> {
  // データソースごとにグループ化
  const groupedData = this.groupDataBySources(data);
  
  // 共通テーマの抽出
  const commonThemes = this.extractCommonThemes(groupedData);
  
  // 時系列での重要度変化を分析
  const trendAnalysis = this.analyzeTrendProgression(data);
  
  // 統合的な洞察を生成
  const integratedPrompt = `
以下の複数の情報源からの投資テーマを分析し、初心者投資家にとって最も重要な学びを1つ抽出してください：

共通テーマ: ${commonThemes.join(', ')}
トレンド: ${trendAnalysis.direction} (強度: ${trendAnalysis.strength})

初心者が理解すべき核心的なメッセージを1文で表現してください。
`;

  const insight = await claude()
    .withModel('sonnet')
    .query(integratedPrompt)
    .asText();
    
  return {
    coreMessage: insight,
    themes: commonThemes,
    confidence: this.calculateInsightConfidence(data)
  };
}
```

## 📝 Phase 3: 品質保証プロセス（優先度: 中）

### Step 6: 投稿品質の自動評価
**新規メソッド**:

```typescript
private async evaluatePostQuality(content: string): Promise<QualityReport> {
  const evaluation = {
    educational_value: 0,
    actionability: 0,
    clarity: 0,
    engagement_potential: 0
  };
  
  // 教育的価値
  if (/なぜ|理由|つまり|要するに/.test(content)) evaluation.educational_value += 25;
  if (/例えば|たとえば|具体的に/.test(content)) evaluation.educational_value += 25;
  
  // 実行可能性
  if (/NISA|iDeCo/.test(content)) evaluation.actionability += 30;
  if (/始め|検討|試し/.test(content)) evaluation.actionability += 20;
  
  // 明確性
  const sentenceLength = content.split(/[。！？]/).filter(s => s).map(s => s.length);
  if (Math.max(...sentenceLength) < 40) evaluation.clarity += 30;
  
  // エンゲージメント
  if (/でしょうか|ませんか|どう思いますか/.test(content)) evaluation.engagement_potential += 20;
  
  const totalScore = Object.values(evaluation).reduce((a, b) => a + b, 0) / 4;
  
  return {
    score: totalScore,
    details: evaluation,
    passed: totalScore >= 60,
    suggestions: this.generateImprovementSuggestions(evaluation)
  };
}
```

## 🔍 テスト手順

### 1. 単体テスト用のサンプルトピック
```typescript
const testTopics = [
  {
    topic: "日銀が金融政策を維持、円安継続の見通し",
    relevance: 0.9,
    sources: ["nikkei", "bloomberg"]
  },
  {
    topic: "米国株が最高値更新、ハイテク株が牽引",
    relevance: 0.8,
    sources: ["reuters", "wsj"]
  }
];
```

### 2. 品質チェック項目
- [ ] 280文字以内に収まっているか
- [ ] 初心者向けの説明があるか
- [ ] 具体的なアクションが含まれているか
- [ ] 日本の投資制度への言及があるか
- [ ] リスクへの言及があるか

## 🚀 デプロイ前チェックリスト
1. [ ] ローカル環境でのテスト完了
2. [ ] 生成される投稿の品質確認（10件以上）
3. [ ] エラーハンドリングの動作確認
4. [ ] パフォーマンスへの影響確認
5. [ ] 既存機能への影響がないことを確認

## 📊 期待される改善効果
- **Before**: "📈 US and Japan agree on trade deal to reduce tariffs to 15%"
- **After**: "💡 日米貿易協定で関税引き下げ。これは私たちの投資にも影響します。米国株の配当が増える可能性があるため、NISA成長投資枠で米国高配当ETFを少額から検討してみては？ただし為替リスクには注意。長期保有でリスクを軽減しましょう。"