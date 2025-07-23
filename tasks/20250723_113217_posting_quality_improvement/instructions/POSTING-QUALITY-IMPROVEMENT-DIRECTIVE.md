# 投稿品質改善指示書

## 🚨 **Manager権限による緊急品質改善指令**

### 📊 **現状の問題**
```yaml
現在の投稿品質:
  - 英語タイトル混入: ❌ "Asia's 'peak polarization' is yet to come"
  - 内容の薄さ: ❌ "投資教育の観点から重要な情報をお届けします"（定型文）
  - 自律的思考不足: ❌ Claude Code SDKによる深い分析なし
  - 投資教育価値不足: ❌ 具体的アドバイス・洞察なし
```

### 🎯 **改善目標**
- ✅ Claude Code SDKが自律的に考えた高品質投稿
- ✅ 投資教育に特化した日本語コンテンツ
- ✅ RSS記事の深い分析・要約・教育価値抽出
- ✅ 日本の投資制度を活用した具体的提案

## 📋 **Worker権限向け実装指示**

### 🚀 **高優先度タスク（即座実行）**

#### **TASK-001: ContentCreator プロンプト完全刷新**
- **対象ファイル**: `src/services/content-creator.ts`
- **対象行**: 374-402 (EDUCATIONAL_PROMPT_TEMPLATE)
- **実装内容**:
```typescript
const EDUCATIONAL_PROMPT_TEMPLATE = `
あなたは投資教育の専門家です。提供されたRSS記事を分析し、日本の個人投資家向けの教育的投稿を作成してください。

## 分析プロセス（4段階思考）
1. **記事分析**: 内容の核心となる投資・経済情報を抽出
2. **教育価値判定**: 日本の個人投資家にとっての学びや気づきを特定
3. **制度連携**: NISA・iDeCo・日本株などの具体的活用法を検討
4. **実践提案**: 初心者でも実行可能な具体的アクションを提示

## 出力要件
- 日本語での投稿（英語禁止）
- 280文字以内
- 具体的な投資アドバイスまたは教育的洞察を含む
- 「投資は自己責任で」の注意書きを含む
- 適切なハッシュタグ（#投資教育 #資産運用 など）

## 記事情報
タイトル: {title}
内容: {content}
出典: {source}

## 投稿例
❌ 悪例: "投資教育の観点から重要な情報をお届けします"
✅ 良例: "米国株の調整局面は日本の個人投資家にとって新NISA活用の好機。ドルコスト平均法で月3万円の投資信託積立なら、20年で資産形成効果を最大化できます。※投資は自己責任で #新NISA #資産形成"
`;
```

#### **TASK-002: RSS記事フィルタリング最適化**
- **対象ファイル**: `data/config/rss-sources.yaml`
- **対象行**: 34-38 (Nikkei Asia設定)
- **実装内容**:
```yaml
# 英語ソースを一時的に無効化
nikkei_asia:
  url: "https://asia.nikkei.com/rss/feed/nar"
  category: "economy"
  enabled: false  # 英語記事品質問題により無効化
  priority: 3
  tags: ["asia", "economy", "business"]
```

#### **TASK-003: 記事分析メソッド強化**
- **対象ファイル**: `src/services/content-creator.ts`
- **対象行**: 100-122 (analyzeDataメソッド)
- **実装内容**:
```typescript
private async analyzeData(data: CollectionResult[]): Promise<AnalysisResult> {
  const rssData = data.filter(d => d.source === 'rss');
  
  for (const item of rssData) {
    // 英語記事の翻訳処理
    if (this.detectLanguage(item.title) === 'english') {
      item.title = await this.translateToJapanese(item.title);
      item.content = await this.translateToJapanese(item.content);
    }
    
    // 投資教育価値の評価
    const educationalValue = await this.evaluateEducationalValue(item);
    if (educationalValue < 0.7) {
      continue; // 教育価値の低い記事をスキップ
    }
    
    // 日本の投資制度との関連性評価
    const relevanceScore = await this.calculateJapanInvestmentRelevance(item);
    item.relevanceScore = relevanceScore;
  }
  
  return {
    selectedData: rssData.sort((a, b) => b.relevanceScore - a.relevanceScore)[0],
    insights: await this.extractInvestmentInsights(rssData[0]),
    actionableAdvice: await this.generateActionableAdvice(rssData[0])
  };
}
```

### 🔧 **中優先度タスク（24時間以内）**

#### **TASK-004: 言語検出・翻訳機能追加**
- **対象ファイル**: `src/services/content-creator.ts`
- **実装内容**: 英語記事の自動翻訳機能
- **メソッド**: `detectLanguage()`, `translateToJapanese()`

#### **TASK-005: 投資教育価値評価システム**
- **対象ファイル**: `src/services/content-creator.ts`
- **実装内容**: RSS記事の教育的価値を0-1で評価
- **メソッド**: `evaluateEducationalValue()`, `calculateJapanInvestmentRelevance()`

#### **TASK-006: 実践的アドバイス生成**
- **対象ファイル**: `src/services/content-creator.ts`
- **実装内容**: 日本の投資制度に特化した具体的アドバイス生成
- **メソッド**: `extractInvestmentInsights()`, `generateActionableAdvice()`

## ⚠️ **実装時の注意事項**

### **構造遵守**
- ✅ REQUIREMENTS.mdに記載された構造のみ使用
- ✅ 疎結合設計原則の厳守
- ✅ YAML設定ファイルによる制御

### **品質要件**
- ✅ TypeScript型安全性の確保
- ✅ エラーハンドリングの実装
- ✅ 投稿前の品質チェック機能

### **テスト要件**
- ✅ 改善後の投稿品質検証
- ✅ 英語記事の翻訳精度確認
- ✅ 教育価値評価の妥当性検証

## 📊 **期待される改善結果**

### **改善前**
```
📈 Asia's 'peak polarization' is yet to come, says Taiwan's Audrey Tang

投資教育の観点から重要な情報をお届けします。

※投資は自己責任で行いましょう

#投資教育 #資産運用
```

### **改善後（期待値）**
```
📊 台湾デジタル担当大臣の発言から学ぶアジア経済の分極化リスク

地政学的緊張が高まる中、日本の投資家は分散投資の重要性を再認識すべきです。新NISA枠を活用し、アジア株式ETFと米国株式を6:4の比率で保有することで、地域リスクを軽減できます。

※投資は自己責任で

#新NISA #分散投資 #地政学リスク
```

## ✅ **完了確認項目**

- [ ] EDUCATIONAL_PROMPT_TEMPLATE刷新完了
- [ ] 英語RSS源の無効化完了
- [ ] analyzeDataメソッド強化完了
- [ ] 言語検出・翻訳機能実装完了
- [ ] 教育価値評価システム実装完了
- [ ] 実践的アドバイス生成機能実装完了
- [ ] 投稿品質テスト実行完了
- [ ] Claude Code SDK自律的思考の確認完了

## 🚨 **緊急性レベル: 最高**

この品質問題は**システムの根幹**に関わります。Claude Code SDKの自律的意思決定能力が適切に機能していない状態であり、要件定義の核心である「自律的投稿作成」が実現されていません。

**即座の実装開始を指示します。**

---
**Manager権限発令者**: Claude Code Manager
**発令日時**: 2025-07-23 11:32:17 JST
**権限レベル**: 最高優先度実行指令