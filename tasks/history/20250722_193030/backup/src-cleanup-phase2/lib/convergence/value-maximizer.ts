import {
  EducationallyEnhanced,
  PracticallyEnhanced,
  UniqueContent,
  TimelyContent,
  MarketContext
} from '../../types/convergence-types';

/**
 * 価値最大化器
 * コンテンツの教育価値、実用性、独自性、タイムリー性を最大化
 */
export class ValueMaximizer {
  
  /**
   * 教育価値の最大化
   * コンテンツに学習要素と実践的な知識を追加
   */
  maximizeEducationalValue(content: string): EducationallyEnhanced {
    // 学習ポイントの抽出と拡張
    const learningPoints = this.extractLearningPoints(content);
    const enhancedLearningPoints = this.enhanceLearningPoints(learningPoints);
    
    // 実践的なヒントの生成
    const practicalTips = this.generatePracticalTips(content);
    
    // 教育的構造の構築
    let enhancedContent = content;
    
    // 学習ポイントの明示化
    if (enhancedLearningPoints.length > 0) {
      const learningSection = `\n\n📚 学習ポイント：\n${enhancedLearningPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}`;
      enhancedContent += learningSection;
    }
    
    // 実践的ヒントの追加
    if (practicalTips.length > 0) {
      const tipsSection = `\n\n💡 実践のヒント：\n${practicalTips.map((tip, i) => `• ${tip}`).join('\n')}`;
      enhancedContent += tipsSection;
    }
    
    // 教育価値スコアの計算
    const educationalValue = this.calculateEducationalValue(
      enhancedContent,
      enhancedLearningPoints,
      practicalTips
    );
    
    return {
      content: enhancedContent,
      learningPoints: enhancedLearningPoints,
      practicalTips,
      educationalValue
    };
  }
  
  /**
   * 実用性の強化
   * 読者が実際に活用できる具体的なアドバイスを追加
   */
  enhancePracticalUtility(content: string): PracticallyEnhanced {
    // 実用的アドバイスの生成
    const actionableAdvice = this.generateActionableAdvice(content);
    
    // 現実世界の例の追加
    const realWorldExamples = this.generateRealWorldExamples(content);
    
    // 実用性を高めるための構造化
    let enhancedContent = content;
    
    // 具体的アクションの追加
    if (actionableAdvice.length > 0) {
      const actionSection = `\n\n🎯 具体的なアクション：\n${actionableAdvice.map((advice, i) => `${i + 1}. ${advice}`).join('\n')}`;
      enhancedContent += actionSection;
    }
    
    // 実例の追加
    if (realWorldExamples.length > 0) {
      const exampleSection = `\n\n📊 実際の例：\n${realWorldExamples.map((example, i) => `• ${example}`).join('\n')}`;
      enhancedContent += exampleSection;
    }
    
    // チェックリストの追加
    const checklist = this.generateChecklist(content);
    if (checklist.length > 0) {
      const checklistSection = `\n\n✅ 確認事項：\n${checklist.map(item => `☐ ${item}`).join('\n')}`;
      enhancedContent += checklistSection;
    }
    
    // 実用性スコアの計算
    const practicalityScore = this.calculatePracticalityScore(
      enhancedContent,
      actionableAdvice,
      realWorldExamples
    );
    
    return {
      content: enhancedContent,
      actionableAdvice,
      realWorldExamples,
      practicalityScore
    };
  }
  
  /**
   * 独自性の確保
   * 既存投稿との差別化と独自の視点を追加
   */
  ensureUniqueness(content: string, existingPosts: string[]): UniqueContent {
    // 独自の視点・角度の発見
    const uniqueAngles = this.discoverUniqueAngles(content, existingPosts);
    
    // 差別化要素の特定
    const differentiators = this.identifyDifferentiators(content, existingPosts);
    
    // 独自性を高めるコンテンツの再構成
    let enhancedContent = this.reconstructForUniqueness(content, uniqueAngles, differentiators);
    
    // 独自の視点の明示
    if (uniqueAngles.length > 0) {
      const angleSection = `\n\n🔍 独自の視点：\n${uniqueAngles.map((angle, i) => `${i + 1}. ${angle}`).join('\n')}`;
      enhancedContent += angleSection;
    }
    
    // 独自性スコアの計算
    const uniquenessScore = this.calculateUniquenessScore(content, existingPosts, uniqueAngles);
    
    return {
      content: enhancedContent,
      uniqueAngles,
      differentiators,
      uniquenessScore
    };
  }
  
  /**
   * タイムリー性の最適化
   * 市場の現在状況に最適に適応した内容に調整
   */
  optimizeTimeliness(content: string, marketContext: MarketContext): TimelyContent {
    // 現在の市場状況との関連性を強化
    let optimizedContent = this.adaptToMarketContext(content, marketContext);
    
    // 時間的関連性の追加
    const contextualRelevance = this.addContextualRelevance(content, marketContext);
    
    // 緊急性の表現調整
    optimizedContent = this.adjustUrgencyExpression(optimizedContent, marketContext);
    
    // 市場状況の文脈情報追加
    if (contextualRelevance.length > 0) {
      const contextSection = `\n\n⏰ 現在の状況：\n${contextualRelevance.join('\n• ')}`;
      optimizedContent += contextSection;
    }
    
    // タイムリー性スコアの計算
    const timelinessScore = this.calculateTimelinessScore(optimizedContent, marketContext);
    
    // 有効期限の推定
    const expirationTime = this.estimateExpirationTime(content, marketContext);
    
    return {
      content: optimizedContent,
      timelinessScore,
      expirationTime: expirationTime || undefined,
      contextualRelevance
    };
  }
  
  // プライベートヘルパーメソッド
  
  private extractLearningPoints(content: string): string[] {
    const learningPoints: string[] = [];
    
    // FXの基本概念を特定
    const fxConcepts = this.identifyFXConcepts(content);
    learningPoints.push(...fxConcepts);
    
    // 市場メカニズムの説明を抽出
    const mechanisms = this.extractMarketMechanisms(content);
    learningPoints.push(...mechanisms);
    
    // 重要な経済指標の説明を追加
    const indicators = this.extractEconomicIndicators(content);
    learningPoints.push(...indicators);
    
    return learningPoints.slice(0, 5); // 最大5つに制限
  }
  
  private enhanceLearningPoints(points: string[]): string[] {
    return points.map(point => {
      // 各ポイントに理由と背景を追加
      return this.addEducationalContext(point);
    });
  }
  
  private generatePracticalTips(content: string): string[] {
    const tips: string[] = [];
    
    // コンテンツの種類に応じたヒント生成
    if (content.includes('金利') || content.includes('金融政策')) {
      tips.push('金利発表前後は相場が大きく動く可能性があるため、ポジションサイズに注意');
      tips.push('中央銀行の発言は段階的に政策変更を示唆することが多い');
    }
    
    if (content.includes('経済指標') || content.includes('GDP') || content.includes('CPI')) {
      tips.push('経済指標発表の30分前後は流動性が低下しやすい');
      tips.push('予想値との乖離が大きいほど相場への影響も大きくなる傾向');
    }
    
    if (content.includes('テクニカル') || content.includes('チャート')) {
      tips.push('複数時間軸で確認することでより確度の高い判断が可能');
      tips.push('サポート・レジスタンス付近では反転の可能性を常に考慮');
    }
    
    // 一般的なリスク管理のヒント
    tips.push('どんな分析も100%ではないため、常に損切りラインを設定');
    
    return tips.slice(0, 4); // 最大4つに制限
  }
  
  private calculateEducationalValue(content: string, learningPoints: string[], tips: string[]): number {
    let score = 50; // ベーススコア
    
    // 学習ポイントの質と量
    score += learningPoints.length * 8;
    
    // 実践的ヒントの価値
    score += tips.length * 6;
    
    // 教育的キーワードの存在
    const educationalKeywords = ['なぜ', 'どのように', '理由', '背景', '仕組み', 'メカニズム'];
    const keywordCount = educationalKeywords.filter(keyword => content.includes(keyword)).length;
    score += keywordCount * 5;
    
    // 具体例の存在
    const exampleIndicators = ['例えば', '具体的には', '実際に', '過去の例'];
    const exampleCount = exampleIndicators.filter(indicator => content.includes(indicator)).length;
    score += exampleCount * 7;
    
    return Math.min(100, Math.max(0, score));
  }
  
  private generateActionableAdvice(content: string): string[] {
    const advice: string[] = [];
    
    // コンテンツから実行可能なアクションを抽出
    if (content.includes('上昇') || content.includes('強気')) {
      advice.push('押し目買いのタイミングを狙い、適切なエントリーポイントを設定');
      advice.push('利益確定レベルを段階的に設定し、トレンドフォローを心がける');
    }
    
    if (content.includes('下落') || content.includes('弱気')) {
      advice.push('戻り売りのチャンスを探り、レジスタンスレベルを注視');
      advice.push('ショートポジションでは急激な反発リスクに注意');
    }
    
    if (content.includes('レンジ') || content.includes('横ばい')) {
      advice.push('サポート・レジスタンスでの逆張り戦略を検討');
      advice.push('ブレイクアウトに備えてアラート設定を行う');
    }
    
    // リスク管理の具体的アドバイス
    advice.push('ポジションサイズは口座資金の2%以下に抑制');
    
    return advice.slice(0, 3); // 最大3つに制限
  }
  
  private generateRealWorldExamples(content: string): string[] {
    const examples: string[] = [];
    
    // 実際の市場事例を生成
    if (content.includes('ドル円')) {
      examples.push('2023年の日銀介入により、ドル円は150円台から一時的に145円台まで急落');
      examples.push('米雇用統計発表時には30-50pipsの変動が短時間で発生することが一般的');
    }
    
    if (content.includes('ユーロ')) {
      examples.push('ECBの金利決定では、事前の市場予想と結果の差が10bp以上の場合、大きな変動が発生');
    }
    
    if (content.includes('金利')) {
      examples.push('Fed利上げ発表後の24時間以内に主要通貨ペアで100pips以上の動きが観測されることが多い');
    }
    
    return examples.slice(0, 2); // 最大2つに制限
  }
  
  private generateChecklist(content: string): string[] {
    const checklist: string[] = [];
    
    // 取引前の確認事項
    if (this.isTradeRelated(content)) {
      checklist.push('経済指標カレンダーで重要発表をチェック');
      checklist.push('ポジションサイズと損切りレベルを事前決定');
      checklist.push('複数時間軸でトレンド方向を確認');
      checklist.push('サポート・レジスタンスレベルを把握');
    }
    
    // 情報分析の確認事項
    checklist.push('情報の発信元と信頼性を確認');
    checklist.push('市場コンセンサスとの比較を実施');
    
    return checklist.slice(0, 4); // 最大4つに制限
  }
  
  private calculatePracticalityScore(content: string, advice: string[], examples: string[]): number {
    let score = 60; // ベーススコア
    
    // 実用的アドバイスの価値
    score += advice.length * 10;
    
    // 実例の価値
    score += examples.length * 8;
    
    // 具体的な数値の存在
    const numberPattern = /\d+(\.\d+)?[%円ドルpips]/g;
    const numberMatches = content.match(numberPattern);
    score += (numberMatches?.length || 0) * 3;
    
    // アクション動詞の存在
    const actionVerbs = ['設定', '確認', '注意', '検討', '実施', '準備'];
    const actionCount = actionVerbs.filter(verb => content.includes(verb)).length;
    score += actionCount * 4;
    
    return Math.min(100, Math.max(0, score));
  }
  
  private discoverUniqueAngles(content: string, existingPosts: string[]): string[] {
    const uniqueAngles: string[] = [];
    
    // 既存投稿で言及されていない視点を発見
    const contentKeywords = this.extractKeywords(content);
    const existingKeywords = existingPosts.flatMap(post => this.extractKeywords(post));
    
    const uniqueKeywords = contentKeywords.filter(keyword => 
      !existingKeywords.includes(keyword)
    );
    
    // 独自の分析角度を生成
    if (uniqueKeywords.includes('心理')) {
      uniqueAngles.push('市場心理学的アプローチからの分析');
    }
    
    if (uniqueKeywords.includes('歴史') || uniqueKeywords.includes('過去')) {
      uniqueAngles.push('歴史的パターンとの比較による洞察');
    }
    
    if (uniqueKeywords.includes('地政学')) {
      uniqueAngles.push('地政学的リスクを考慮した多角的分析');
    }
    
    // 時間軸の独自性
    const timeFrames = ['短期', '中期', '長期'];
    const unusedTimeFrames = timeFrames.filter(tf => 
      !existingPosts.some(post => post.includes(tf))
    );
    
    if (unusedTimeFrames.length > 0) {
      uniqueAngles.push(`${unusedTimeFrames[0]}的視点からの独自分析`);
    }
    
    return uniqueAngles.slice(0, 3); // 最大3つに制限
  }
  
  private identifyDifferentiators(content: string, existingPosts: string[]): string[] {
    const differentiators: string[] = [];
    
    // データソースの独自性
    const dataSources = ['IMF', 'BIS', '各国統計局', '学術研究'];
    const usedSources = dataSources.filter(source => content.includes(source));
    const unusedInExisting = usedSources.filter(source => 
      !existingPosts.some(post => post.includes(source))
    );
    
    if (unusedInExisting.length > 0) {
      differentiators.push(`独自のデータソース活用: ${unusedInExisting.join(', ')}`);
    }
    
    // 分析手法の独自性
    const analysisTypes = ['ファンダメンタル', 'テクニカル', 'センチメント', 'フロー分析'];
    const unusedAnalysis = analysisTypes.filter(type => 
      content.includes(type) && !existingPosts.some(post => post.includes(type))
    );
    
    if (unusedAnalysis.length > 0) {
      differentiators.push(`独特な分析アプローチ: ${unusedAnalysis.join('×')}`);
    }
    
    return differentiators;
  }
  
  private reconstructForUniqueness(content: string, angles: string[], differentiators: string[]): string {
    let reconstructed = content;
    
    // 独自の視点を前面に
    if (angles.length > 0) {
      const angleIntro = `【独自分析】${angles[0]}により、`;
      reconstructed = angleIntro + reconstructed;
    }
    
    // 差別化要素の強調
    if (differentiators.length > 0) {
      reconstructed += `\n\n🎯 この分析の特徴: ${differentiators[0]}`;
    }
    
    return reconstructed;
  }
  
  private calculateUniquenessScore(content: string, existingPosts: string[], uniqueAngles: string[]): number {
    let score = 70; // ベーススコア
    
    // 既存投稿との重複度を計算
    const contentWords = new Set(this.extractKeywords(content));
    let totalOverlap = 0;
    
    for (const post of existingPosts) {
      const postWords = new Set(this.extractKeywords(post));
      const intersection = new Set([...contentWords].filter(w => postWords.has(w)));
      const overlapRatio = intersection.size / contentWords.size;
      totalOverlap += overlapRatio;
    }
    
    const avgOverlap = existingPosts.length > 0 ? totalOverlap / existingPosts.length : 0;
    score -= avgOverlap * 40; // 重複度に応じて減点
    
    // 独自角度の価値
    score += uniqueAngles.length * 10;
    
    return Math.min(100, Math.max(0, score));
  }
  
  private adaptToMarketContext(content: string, context: MarketContext): string {
    let adapted = content;
    
    // 現在のトレンドに応じた表現調整
    if (context.currentTrend === 'bullish') {
      adapted = adapted.replace(/上昇/g, '力強い上昇');
      adapted = adapted.replace(/買い/g, '積極的な買い');
    } else if (context.currentTrend === 'bearish') {
      adapted = adapted.replace(/下落/g, '厳しい下落');
      adapted = adapted.replace(/売り/g, '警戒すべき売り');
    }
    
    // ボラティリティに応じた表現調整
    if (context.volatility === 'high') {
      adapted = `⚠️ 高ボラティリティ環境下での重要情報：\n\n${adapted}`;
    }
    
    // 市場センチメントに応じた調整
    if (context.sentiment === 'negative') {
      adapted += '\n\n⚡ 現在のリスクオフ環境では特に注意が必要です。';
    }
    
    return adapted;
  }
  
  private addContextualRelevance(content: string, context: MarketContext): string[] {
    const relevance: string[] = [];
    
    // 主要イベントとの関連性
    if (context.majorEvents.length > 0) {
      relevance.push(`重要イベント進行中: ${context.majorEvents.slice(0, 2).join(', ')}`);
    }
    
    // 市場状況の説明
    relevance.push(`市場トレンド: ${this.translateTrend(context.currentTrend)}`);
    relevance.push(`ボラティリティ: ${this.translateVolatility(context.volatility)}`);
    
    return relevance;
  }
  
  private adjustUrgencyExpression(content: string, context: MarketContext): string {
    // 時間枠に応じた緊急性の表現
    if (context.timeframe === 'intraday') {
      return content.replace(/注意/g, '【緊急注意】');
    } else if (context.timeframe === 'daily') {
      return content.replace(/重要/g, '【本日重要】');
    }
    
    return content;
  }
  
  private calculateTimelinessScore(content: string, context: MarketContext): number {
    let score = 80; // ベーススコア
    
    // トレンドとの整合性
    const trendKeywords = {
      'bullish': ['上昇', '買い', '強い', 'ポジティブ'],
      'bearish': ['下落', '売り', '弱い', 'ネガティブ'],
      'sideways': ['レンジ', '横ばい', '方向感なし']
    };
    
    const relevantKeywords = trendKeywords[context.currentTrend];
    const matchCount = relevantKeywords.filter(keyword => content.includes(keyword)).length;
    score += matchCount * 5;
    
    // 時間枠の適切性
    if (context.timeframe === 'intraday' && content.includes('短期')) {
      score += 10;
    } else if (context.timeframe === 'weekly' && content.includes('中長期')) {
      score += 10;
    }
    
    // 重要イベントとの関連性
    score += context.majorEvents.length * 5;
    
    return Math.min(100, Math.max(0, score));
  }
  
  private estimateExpirationTime(content: string, context: MarketContext): number | null {
    const now = Date.now();
    
    // 時間枠に応じた有効期限
    if (context.timeframe === 'intraday') {
      return now + 4 * 60 * 60 * 1000; // 4時間後
    } else if (context.timeframe === 'daily') {
      return now + 24 * 60 * 60 * 1000; // 24時間後
    } else if (context.timeframe === 'weekly') {
      return now + 7 * 24 * 60 * 60 * 1000; // 1週間後
    }
    
    // 特定のイベント関連の場合
    if (content.includes('発表') || content.includes('会合')) {
      return now + 2 * 60 * 60 * 1000; // 2時間後
    }
    
    return null; // 期限なし
  }
  
  // 追加のヘルパーメソッド
  
  private identifyFXConcepts(content: string): string[] {
    const concepts = [];
    
    if (content.includes('スプレッド')) {
      concepts.push('スプレッドは取引コストの基本要素');
    }
    if (content.includes('レバレッジ')) {
      concepts.push('レバレッジは利益と損失の両方を拡大');
    }
    if (content.includes('スワップ')) {
      concepts.push('スワップポイントは金利差による日々の損益');
    }
    
    return concepts;
  }
  
  private extractMarketMechanisms(content: string): string[] {
    const mechanisms = [];
    
    if (content.includes('流動性')) {
      mechanisms.push('流動性が高いほど価格の安定性が向上');
    }
    if (content.includes('介入')) {
      mechanisms.push('中央銀行介入は一時的だが強力な価格影響');
    }
    
    return mechanisms;
  }
  
  private extractEconomicIndicators(content: string): string[] {
    const indicators = [];
    
    if (content.includes('GDP')) {
      indicators.push('GDPは四半期ごとの経済成長率を示す最重要指標');
    }
    if (content.includes('CPI')) {
      indicators.push('CPIはインフレ圧力を測定し金融政策に直結');
    }
    
    return indicators;
  }
  
  private addEducationalContext(point: string): string {
    // 教育的文脈を追加
    return `${point}。これを理解することで、より確実な判断が可能になります。`;
  }
  
  private isTradeRelated(content: string): boolean {
    const tradeKeywords = ['エントリー', 'エグジット', 'ポジション', '買い', '売り', '損切り'];
    return tradeKeywords.some(keyword => content.includes(keyword));
  }
  
  private extractKeywords(content: string): string[] {
    // 基本的なキーワード抽出
    const words = content.match(/[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}/g) || [];
    return words.filter(word => word.length > 2);
  }
  
  private translateTrend(trend: string): string {
    const translations = {
      'bullish': '強気（上昇トレンド）',
      'bearish': '弱気（下降トレンド）',
      'sideways': 'レンジ（横ばい）'
    };
    return translations[trend as keyof typeof translations] || trend;
  }
  
  private translateVolatility(volatility: string): string {
    const translations = {
      'high': '高（激しい値動き）',
      'medium': '中程度',
      'low': '低（安定した値動き）'
    };
    return translations[volatility as keyof typeof translations] || volatility;
  }
}