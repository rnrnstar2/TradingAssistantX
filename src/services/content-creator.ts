import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { 
  PostContent, 
  CollectionResult,
  ProcessedData,
  TrendData,
  MarketTopic,
  ValidationResult,
  ContentStrategy,
  IntegratedInsight,
  QualityReport,
  ContentMetadata,
  QualityMetrics
} from '../types/data-types';
import type { AccountStatusYaml } from '../types/yaml-types';
import { loadYamlSafe } from '../utils/yaml-utils';
import { handleError } from '../utils/error-handler';
import { join } from 'path';

interface ThinkingProcess {
  analysis: AnalysisStage;
  synthesis: SynthesisStage;
  application: ApplicationStage;
  validation: ValidationStage;
}

interface AnalysisStage {
  trends: string[];
  impact: number;
  urgency: number;
  sourceAlignment: number;
  insights?: string[];
  actionableAdvice?: string[];
}

interface SynthesisStage {
  coreInsights: string[];
  riskFactors: string[];
  opportunityAreas: string[];
}

interface ApplicationStage {
  content: string;
  actionableAdvice: string[];
  japanSpecific: boolean;
}

interface ValidationStage {
  scores: {
    learningValue: number;
    actionability: number;
    riskAwareness: number;
    japanAdaptation: number;
  };
  totalScore: number;
  improvements: string[];
}

/**
 * 人間のような思考プロセスを実装するクラス
 * 4段階の深い分析プロセスで教育価値の高いコンテンツを生成
 */
class HumanLikeContentProcessor {
  
  async processWithHumanThinking(data: ProcessedData): Promise<PostContent> {
    try {
      console.log('🧠 人間のような思考プロセス開始...');
      
      // Stage 1: 分析 - データを理解する
      const analysis = await this.analyzeData(data);
      console.log('✅ 分析完了:', analysis.trends.length, 'トレンド検出');
      
      // Stage 2: 統合 - パターンと洞察を見つける
      const synthesis = await this.synthesizeInsights(analysis);
      console.log('✅ 統合完了:', synthesis.coreInsights.length, '洞察抽出');
      
      // Stage 3: 応用 - 初心者に価値ある形に変換
      const application = await this.applyToBeginners(synthesis);
      console.log('✅ 応用完了: 教育コンテンツ生成');
      
      // Stage 4: 検証 - 品質と教育価値を確認
      const validation = await this.validateEducationalValue(application);
      console.log('✅ 検証完了: 総合評価', validation.totalScore, '点');
      
      // 品質が不十分な場合は改善
      if (validation.totalScore < 70) {
        console.log('⚠️ 品質不足、改善を実行...');
        const improved = await this.improveContent(application, validation);
        const revalidation = await this.validateEducationalValue(improved);
        console.log('✅ 改善完了: 改善後評価', revalidation.totalScore, '点');
        return this.formatFinalContent(improved, revalidation);
      }
      
      return this.formatFinalContent(application, validation);
      
    } catch (error) {
      console.error('❌ 人間のような思考プロセスでエラー:', error);
      throw error;
    }
  }

  async analyzeData(data: ProcessedData): Promise<AnalysisStage> {
    const rssData = data.data.filter(d => d.source === 'rss');
    
    for (const item of rssData) {
      // 投資教育価値の評価（言語に関係なく記事内容を評価）
      const educationalValue = await this.evaluateEducationalValue(item);
      if (educationalValue < 0.7) {
        continue; // 教育価値の低い記事をスキップ
      }
      
      // 日本の投資制度との関連性評価
      const relevanceScore = await this.calculateJapanInvestmentRelevance(item);
      (item as any).relevanceScore = relevanceScore;
    }
    
    // 関連性スコアでソート（高い順）
    const sortedData = rssData
      .filter(item => (item as any).relevanceScore !== undefined)
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore);
    
    if (sortedData.length === 0) {
      // フォールバック：従来のロジック
      const analysisPrompt = `
あなたは投資アナリストです。以下のデータを分析してください：

【データ】
${data.data.map(d => `- ${d.content || ''} (${d.source || 'unknown'})`).join('\n')}

【分析タスク】
1. 主要トレンドの特定
2. 異なるソース間での共通性・相違点
3. 個人投資家への潜在的影響度（1-10）
4. 緊急度評価（1-10）

客観的な分析結果を構造化して回答してください。
`;

      const analysis = await claude()
        .withModel('sonnet')
        .query(analysisPrompt)
        .asText();
        
      return this.parseAnalysisResult(analysis, data);
    }
    
    const selectedItem = sortedData[0];
    const insights = await this.extractInvestmentInsights(selectedItem);
    const actionableAdvice = await this.generateActionableAdvice(selectedItem);
    
    return {
      trends: [selectedItem.title || '投資動向'],
      impact: Math.round((selectedItem as any).relevanceScore * 10),
      urgency: 7, // 高品質記事は緊急度高
      sourceAlignment: 90, // 強化されたフィルタリング
      insights,
      actionableAdvice
    };
  }

  async synthesizeInsights(analysis: AnalysisStage): Promise<SynthesisStage> {
    const synthesisPrompt = `
以下の分析結果から、投資初心者にとって最も価値ある洞察を抽出してください：

【分析結果】
- 主要トレンド: ${analysis.trends.join(', ')}
- 影響度: ${analysis.impact}
- 緊急度: ${analysis.urgency}

【統合タスク】
1. なぜこの情報が初心者投資家に重要なのか？
2. どのような行動変化を促すべきか？
3. どのリスクに注意すべきか？
4. 長期的な視点での意味は？

初心者の視点に立って、核心的な学びを3つ以内で抽出してください。
`;

    const synthesis = await claude()
      .withModel('sonnet') 
      .query(synthesisPrompt)
      .asText();
      
    return this.parseSynthesisResult(synthesis);
  }

  async applyToBeginners(synthesis: SynthesisStage): Promise<ApplicationStage> {
    const applicationPrompt = `
以下の洞察を、投資初心者向けの実践的な教育コンテンツに変換してください：

【核心的な学び】
${synthesis.coreInsights.map(insight => `- ${insight}`).join('\n')}

【変換要件】
1. 日本の投資環境（NISA/iDeCo）を活用した具体的アクション
2. 初心者でも理解できる説明（専門用語は避ける）
3. リスクと対策の明確な提示
4. 今すぐできる小さな一歩の提案

280文字の投稿形式で、実践的価値を最大化してください。
`;

    const application = await claude()
      .withModel('sonnet')
      .query(applicationPrompt)
      .asText();
      
    return this.parseApplicationResult(application);
  }

  async validateEducationalValue(application: ApplicationStage): Promise<ValidationStage> {
    const validationPrompt = `
以下の投稿内容の教育的価値を評価してください：

【投稿内容】
${application.content}

【評価基準】
1. 学習価値: 初心者が新しい知識を得られるか（1-10）
2. 実行可能性: 具体的なアクションが明確か（1-10）
3. リスク認識: 適切な注意喚起があるか（1-10）
4. 日本市場適応: 日本の制度・環境を考慮しているか（1-10）

各項目を評価し、改善提案があれば提示してください。
総合評価が7点未満の場合は修正版も提案してください。
`;

    const validation = await claude()
      .withModel('sonnet')
      .query(validationPrompt)
      .asText();
      
    return this.parseValidationResult(validation);
  }

  async improveContent(application: ApplicationStage, validation: ValidationStage): Promise<ApplicationStage> {
    const improvementPrompt = `
以下の投稿を改善してください：

【現在の投稿】
${application.content}

【問題点】
${validation.improvements.join('\n')}

【改善要求】
- 学習価値: ${validation.scores.learningValue < 7 ? '向上必要' : 'OK'}
- 実行可能性: ${validation.scores.actionability < 7 ? '向上必要' : 'OK'}
- リスク認識: ${validation.scores.riskAwareness < 7 ? '向上必要' : 'OK'}
- 日本市場適応: ${validation.scores.japanAdaptation < 7 ? '向上必要' : 'OK'}

280文字以内で改善版を作成してください。
`;

    const improved = await claude()
      .withModel('sonnet')
      .query(improvementPrompt)
      .asText();
      
    return this.parseApplicationResult(improved);
  }


  /**
   * 投資教育価値評価（0-1スケール）
   */
  private async evaluateEducationalValue(item: CollectionResult): Promise<number> {
    try {
      const evaluationPrompt = `
以下の記事の投資教育価値を0-1のスケールで評価してください。

評価基準:
- 0.8-1.0: 初心者にとって非常に有益、具体的なアクションが明確
- 0.6-0.8: 有益な情報、学習価値がある
- 0.4-0.6: 一般的な情報、やや有益
- 0.2-0.4: 限定的な価値
- 0.0-0.2: 教育価値が低い

記事タイトル: ${item.title || ''}
記事内容: ${item.content || ''}

評価結果（数値のみ）:
`;

      const evaluation = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(evaluationPrompt)
        .asText();
        
      const score = parseFloat(evaluation.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      console.warn('⚠️ 教育価値評価エラー:', error);
      return 0.5; // デフォルト値
    }
  }

  /**
   * 日本投資制度関連性評価
   */
  private async calculateJapanInvestmentRelevance(item: CollectionResult): Promise<number> {
    try {
      const relevancePrompt = `
以下の記事が日本の個人投資家（NISA、iDeCo、日本株投資など）にとってどの程度関連性があるかを0-1で評価してください。

評価ポイント:
- 日本の制度（NISA/iDeCo）に活用できるか
- 日本の個人投資家の行動に影響するか
- 具体的な投資アドバイスに繋がるか

記事タイトル: ${item.title || ''}
記事内容: ${item.content || ''}

関連性スコア（数値のみ）:
`;

      const relevance = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(relevancePrompt)
        .asText();
        
      const score = parseFloat(relevance.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      console.warn('⚠️ 関連性評価エラー:', error);
      return 0.5;
    }
  }

  /**
   * 投資洞察抽出
   */
  private async extractInvestmentInsights(item: CollectionResult): Promise<string[]> {
    try {
      const insightPrompt = `
以下の記事から投資初心者にとって重要な洞察を3つまで抽出してください。

記事タイトル: ${item.title || ''}
記事内容: ${item.content || ''}

洞察（箇条書きで）:
`;

      const insights = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(insightPrompt)
        .asText();
        
      return insights.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.\s]*/, '').trim())
        .filter(insight => insight.length > 0)
        .slice(0, 3);
    } catch (error) {
      console.warn('⚠️ 洞察抽出エラー:', error);
      return ['市場動向の理解', '長期投資の重要性', 'リスク管理の基本'];
    }
  }

  /**
   * 実践的アドバイス生成
   */
  private async generateActionableAdvice(item: CollectionResult): Promise<string[]> {
    try {
      const advicePrompt = `
以下の記事に基づいて、日本の投資初心者が今すぐ実践できる具体的なアドバイスを3つまで生成してください。NISA、iDeCo、日本株などの制度を活用した内容を含めてください。

記事タイトル: ${item.title || ''}
記事内容: ${item.content || ''}

実践的アドバイス（箇条書きで）:
`;

      const advice = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(advicePrompt)
        .asText();
        
      return advice.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.\s]*/, '').trim())
        .filter(item => item.length > 0)
        .slice(0, 3);
    } catch (error) {
      console.warn('⚠️ アドバイス生成エラー:', error);
      return ['少額から始める', 'NISA口座を開設する', '分散投資を心がける'];
    }
  }

  private parseAnalysisResult(analysis: string, data: ProcessedData): AnalysisStage {
    const trends: string[] = [];
    let impact = 5;
    let urgency = 5;
    
    // 簡易パースロジック
    const lines = analysis.split('\n');
    lines.forEach(line => {
      if (line.includes('トレンド') || line.includes('傾向')) {
        const trend = line.replace(/^.*[：:]\s*/, '').trim();
        if (trend) trends.push(trend);
      }
      if (line.includes('影響度')) {
        const match = line.match(/(\d+)/);
        if (match) impact = parseInt(match[1]);
      }
      if (line.includes('緊急度')) {
        const match = line.match(/(\d+)/);
        if (match) urgency = parseInt(match[1]);
      }
    });

    const uniqueSources = new Set(data.data.map(d => d.source)).size;
    const sourceAlignment = data.data.length > 0 ? Math.min(uniqueSources * 20, 100) : 50;

    return { trends, impact, urgency, sourceAlignment };
  }

  private parseSynthesisResult(synthesis: string): SynthesisStage {
    const coreInsights: string[] = [];
    const riskFactors: string[] = [];
    const opportunityAreas: string[] = [];
    
    const lines = synthesis.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const content = trimmed.replace(/^[-\d.]\s*/, '');
        if (content.includes('リスク') || content.includes('注意')) {
          riskFactors.push(content);
        } else if (content.includes('機会') || content.includes('チャンス')) {
          opportunityAreas.push(content);
        } else {
          coreInsights.push(content);
        }
      }
    });

    return { coreInsights, riskFactors, opportunityAreas };
  }

  private parseApplicationResult(application: string): ApplicationStage {
    const content = application.trim();
    const actionableAdvice: string[] = [];
    
    // アクション提案の抽出
    if (content.includes('NISA') || content.includes('iDeCo')) {
      actionableAdvice.push('制度活用');
    }
    if (content.includes('始め') || content.includes('検討')) {
      actionableAdvice.push('実践開始');
    }
    
    const japanSpecific = content.includes('NISA') || content.includes('iDeCo') || content.includes('円');
    
    return { content, actionableAdvice, japanSpecific };
  }

  private parseValidationResult(validation: string): ValidationStage {
    const scores = {
      learningValue: 5,
      actionability: 5,
      riskAwareness: 5,
      japanAdaptation: 5
    };
    
    const improvements: string[] = [];
    
    const lines = validation.split('\n');
    lines.forEach(line => {
      // スコア抽出
      if (line.includes('学習価値')) {
        const match = line.match(/(\d+)/);
        if (match) scores.learningValue = parseInt(match[1]);
      }
      if (line.includes('実行可能性')) {
        const match = line.match(/(\d+)/);
        if (match) scores.actionability = parseInt(match[1]);
      }
      if (line.includes('リスク認識')) {
        const match = line.match(/(\d+)/);
        if (match) scores.riskAwareness = parseInt(match[1]);
      }
      if (line.includes('日本市場適応')) {
        const match = line.match(/(\d+)/);
        if (match) scores.japanAdaptation = parseInt(match[1]);
      }
      
      // 改善提案の抽出
      if (line.includes('改善') || line.includes('追加') || line.includes('必要')) {
        improvements.push(line.trim());
      }
    });
    
    const totalScore = (scores.learningValue + scores.actionability + scores.riskAwareness + scores.japanAdaptation) / 4 * 10;
    
    return { scores, totalScore, improvements };
  }

  private formatFinalContent(application: ApplicationStage, validation: ValidationStage): PostContent {
    const metadata: ContentMetadata = {
      source: 'content-creator',
      theme: '投資教育',
      category: 'educational',
      relevanceScore: 0.8,
      urgency: 'medium' as const,
      targetAudience: ['beginner'],
      estimatedEngagement: 70
    };

    return {
      id: `generated-${Date.now()}`,
      content: application.content,
      type: 'original_post',
      metadata,
      quality: {
        overall: validation.totalScore,
        readability: validation.scores.readability,
        relevance: validation.scores.relevance,
        engagement_potential: validation.scores.engagementPotential,
        factual_accuracy: validation.scores.factualAccuracy,
        originality: validation.scores.originality,
        timeliness: validation.scores.timeliness
      },
      timestamp: Date.now()
    };
  }
}

/**
 * 投稿コンテンツ生成を担当するContentCreatorクラス
 * 
 * Claude Code SDKを活用した投資教育コンテンツ作成システムの中核
 */
export class ContentCreator {
  private readonly dataPath = 'data';
  private readonly humanLikeProcessor: HumanLikeContentProcessor;
  
  private readonly EDUCATIONAL_PROMPT_TEMPLATE = `
あなたは投資教育の専門家です。提供されたRSS記事（英語・日本語問わず）の内容を理解し、日本の個人投資家向けの教育的投稿を日本語で新規作成してください。

## 分析プロセス（4段階思考）
1. **記事理解**: 記事言語に関係なく、内容の核心となる投資・経済情報を理解
2. **教育価値判定**: 日本の個人投資家にとっての学びや気づきを特定
3. **制度連携**: NISA・iDeCo・日本株などの具体的活用法を検討
4. **実践提案**: 初心者でも実行可能な具体的アクションを提示

## 出力要件
- 記事内容を理解して日本語でオリジナル投稿を作成
- 280文字以内
- 具体的な投資アドバイスまたは教育的洞察を含む
- 「投資は自己責任で」の注意書きを含む
- 適切なハッシュタグ（#投資教育 #資産運用 など）

## 記事情報
タイトル: \${topic.topic}
内容: \${topic.content}
出典: \${topic.source}

## 投稿例
❌ 悪例: "投資教育の観点から重要な情報をお届けします"
✅ 良例: "米国株の調整局面は日本の個人投資家にとって新NISA活用の好機。ドルコスト平均法で月3万円の投資信託積立なら、20年で資産形成効果を最大化できます。※投資は自己責任で #新NISA #資産形成"
`;

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
  
  constructor() {
    this.humanLikeProcessor = new HumanLikeContentProcessor();
    console.log('✅ ContentCreator初期化完了: 人間のような思考プロセス有効');
  }

  /**
   * 投稿コンテンツ生成メインメソッド（人間のような思考プロセス統合版）
   * 
   * @param data - 処理済みデータ
   * @returns 生成された投稿コンテンツ
   */
  async createPost(data: ProcessedData): Promise<PostContent> {
    try {
      console.log('🚀 高度なコンテンツ生成プロセス開始');
      
      // データ品質チェック
      if (!data || !data.data || data.data.length === 0) {
        console.warn('⚠️ データ不足のため従来のフォールバックを使用');
        return this.createFallbackContent();
      }
      
      // 戦略決定
      const strategy = await this.determineContentStrategy(data);
      console.log('📋 選択された戦略:', strategy);
      
      // 新しい人間のような思考プロセスを使用（教育戦略の場合）
      if (strategy === 'educational' && data.data.length >= 2) {
        try {
          console.log('🧠 人間のような思考プロセスを適用中...');
          const result = await this.humanLikeProcessor.processWithHumanThinking(data);
          
          // 最終フォーマット適用
          result.content = this.formatForX(result.content);
          
          console.log('✅ 高度思考プロセス完了:', result.confidence, '点');
          return result;
          
        } catch (humanProcessError) {
          console.warn('⚠️ 人間のような思考プロセスでエラー、従来ロジックにフォールバック');
          console.error(humanProcessError);
          // フォールバック処理へ続行
        }
      }
      
      // 従来のロジック（フォールバック）
      console.log('🔄 従来のコンテンツ生成ロジックを使用');
      let content: string;
      const sources = data.data.map(d => d.source);
      
      switch (strategy) {
        case 'educational':
          const topic = this.extractMarketTopic(data);
          content = await this.generateEducationalContent(topic);
          break;
          
        case 'trend':
          const trend = this.extractTrendData(data);
          content = await this.generateTrendContent(trend);
          break;
          
        case 'analytical':
          content = await this.generateAnalyticalContent(data);
          break;
          
        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }
      
      // コンテンツ検証
      const validation = this.validateContent(content);
      if (!validation.isValid) {
        console.warn('⚠️ [ContentCreator] コンテンツ検証失敗:', validation.issues);
        content = await this.improveContent(content, validation);
      }
      
      // X投稿用フォーマット
      const formattedContent = this.formatForX(content);
      
      // メタデータ計算
      const metadata = {
        source: 'content-creator',
        theme: strategy === 'educational' ? '投資教育' : strategy === 'trend' ? 'トレンド分析' : '市場分析',
        category: strategy,
        relevanceScore: 0.8,
        urgency: 'medium' as const,
        targetAudience: ['beginner', 'intermediate'],
        estimatedEngagement: 50,
        sources,
        topic: this.extractTopicName(data),
        educationalValue: this.calculateEducationalValue(content),
        trendRelevance: this.calculateTrendRelevance(content, data)
      };
      
      return {
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: formattedContent,
        platform: 'x',
        type: 'original_post' as const,
        quality: {
          readability: 80,
          engagement_prediction: this.calculateConfidence(data, validation),
          educational_value: this.calculateEducationalValue(content),
          market_relevance: 70,
          trend_alignment: this.calculateTrendRelevance(content, data),
          risk_score: 0.2,
          overall_score: this.calculateConfidence(data, validation),
          confidence: this.calculateConfidence(data, validation) / 100
        },
        timestamp: Date.now(),
        strategy,
        confidence: this.calculateConfidence(data, validation),
        metadata
      };
      
    } catch (error) {
      console.error('❌ [ContentCreator] 致命的エラー:', error);
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return this.createFallbackContent();
    }
  }

  /**
   * 教育的価値の高いコンテンツ生成
   * 
   * @param topic - 市場トピック
   * @returns 教育的コンテンツ
   */
  async generateEducationalContent(topic: MarketTopic): Promise<string> {
    try {
      const prompt = this.EDUCATIONAL_PROMPT_TEMPLATE.replace('\${topic.topic}', topic.topic);
      
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

  /**
   * トレンド対応型コンテンツ生成
   * 
   * @param trend - トレンドデータ
   * @returns トレンドコンテンツ
   */
  async generateTrendContent(trend: TrendData): Promise<string> {
    try {
      const prompt = `
あなたは投資市場のトレンド分析専門家です。以下の最新トレンドについて、タイムリーで注目を集める投稿を作成してください。

トレンド: ${trend.trend}
勢い: ${trend.momentum > 0.7 ? '強い' : trend.momentum > 0.4 ? '中程度' : '弱い'}

要件:
- 280文字以内
- 話題性とタイムリーさを重視
- 市場への影響を簡潔に説明
- エンゲージメントを促す要素を含める
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      console.error('❌ [ContentCreator] トレンドコンテンツ生成エラー:', error);
      return this.createTrendFallback(trend);
    }
  }

  /**
   * 分析特化型コンテンツ生成
   * 
   * @param data - 処理済みデータ
   * @returns 分析コンテンツ
   */
  async generateAnalyticalContent(data: ProcessedData): Promise<string> {
    try {
      const keyInsights = this.extractKeyInsights(data);
      const prompt = `
あなたは投資市場の専門アナリストです。以下のデータから深い洞察を提供する分析投稿を作成してください。

主要な洞察:
${keyInsights.map(insight => `- ${insight}`).join('\n')}

要件:
- 280文字以内
- データに基づいた客観的な分析
- 専門的だが理解しやすい説明
- 投資判断に役立つ視点を提供
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      console.error('❌ [ContentCreator] 分析コンテンツ生成エラー:', error);
      return this.createAnalyticalFallback(data);
    }
  }

  /**
   * 複数データソースの統合分析
   * 
   * @param data - 処理済みデータ
   * @returns 統合された洞察
   */
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

  /**
   * データソースごとのグループ化
   */
  private groupDataBySources(data: ProcessedData): Record<string, CollectionResult[]> {
    return data.data.reduce((groups, item) => {
      const source = item.source;
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(item);
      return groups;
    }, {} as Record<string, CollectionResult[]>);
  }

  /**
   * 共通テーマの抽出
   */
  private extractCommonThemes(groupedData: Record<string, CollectionResult[]>): string[] {
    const allTags = Object.values(groupedData)
      .flat()
      .filter(item => item.metadata?.tags)
      .flatMap(item => item.metadata.tags as string[]);
    
    const tagCounts = allTags.reduce((counts, tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.entries(tagCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  /**
   * トレンド進行の分析
   */
  private analyzeTrendProgression(data: ProcessedData): { direction: string; strength: number } {
    const sortedData = data.data.sort((a, b) => a.timestamp - b.timestamp);
    const recentData = sortedData.slice(-Math.min(5, sortedData.length));
    
    const recentness = recentData.length / data.data.length;
    const direction = recentness > 0.6 ? '上昇傾向' : recentness > 0.4 ? '安定' : '下降傾向';
    
    return {
      direction,
      strength: recentness
    };
  }

  /**
   * 洞察の信頼度計算
   */
  private calculateInsightConfidence(data: ProcessedData): number {
    let confidence = 50;
    
    // データ数による信頼度向上
    if (data.data.length > 5) confidence += 20;
    if (data.data.length > 10) confidence += 10;
    
    // データ品質による調整
    confidence += data.dataQuality * 20;
    
    // ソースの多様性による調整
    const uniqueSources = new Set(data.data.map(d => d.source)).size;
    confidence += Math.min(uniqueSources * 5, 20);
    
    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * コンテンツ品質検証
   * 
   * @param content - 検証対象コンテンツ
   * @returns 検証結果
   */
  private validateContent(content: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // 文字数チェック
    if (content.length > 280) {
      issues.push(`文字数超過: ${content.length}文字`);
      suggestions.push('コンテンツを短縮してください');
    }
    
    if (content.length < 50) {
      issues.push('コンテンツが短すぎます');
      suggestions.push('より詳細な情報を追加してください');
    }
    
    // 読みやすさチェック
    const sentences = content.split(/[。！？]/g).filter(s => s.trim());
    const avgSentenceLength = content.length / sentences.length;
    
    if (avgSentenceLength > 50) {
      issues.push('文が長すぎます');
      suggestions.push('短い文に分割してください');
    }
    
    // 教育的要素チェック
    const educationalKeywords = ['基本', '重要', 'ポイント', '理解', '学習'];
    const hasEducationalElement = educationalKeywords.some(keyword => content.includes(keyword));
    
    if (!hasEducationalElement) {
      suggestions.push('教育的要素を追加してください');
    }
    
    // 専門用語の過度な使用チェック
    const technicalTerms = ['ボラティリティ', 'レバレッジ', 'ヘッジ', 'アービトラージ'];
    const technicalTermCount = technicalTerms.filter(term => content.includes(term)).length;
    
    if (technicalTermCount > 2) {
      issues.push('専門用語が多すぎます');
      suggestions.push('初心者にも分かりやすい表現を使用してください');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * 教育的要素の存在確認
   * 
   * @param content - 検証対象コンテンツ
   * @returns 教育的要素の存在有無
   */
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

  /**
   * 教育的コンテンツの改善
   * 
   * @param content - 改善対象コンテンツ
   * @param topic - 市場トピック
   * @returns 改善されたコンテンツ
   */
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

  /**
   * 投稿品質の自動評価
   * 
   * @param content - 評価対象コンテンツ
   * @returns 品質評価レポート
   */
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

  /**
   * 改善提案の生成
   * 
   * @param evaluation - 評価詳細
   * @returns 改善提案リスト
   */
  private generateImprovementSuggestions(evaluation: QualityReport['details']): string[] {
    const suggestions: string[] = [];
    
    if (evaluation.educational_value < 30) {
      suggestions.push('「なぜ」「理由」など説明的な表現を追加してください');
      suggestions.push('具体例や比喩を使って分かりやすさを向上させてください');
    }
    
    if (evaluation.actionability < 30) {
      suggestions.push('NISA、iDeCoなど具体的な投資制度に言及してください');
      suggestions.push('読者が今すぐ実践できるアクションを追加してください');
    }
    
    if (evaluation.clarity < 30) {
      suggestions.push('文章をより短く、分かりやすく分割してください');
      suggestions.push('専門用語には簡単な説明を併記してください');
    }
    
    if (evaluation.engagement_potential < 20) {
      suggestions.push('読者に問いかける表現を追加してください');
      suggestions.push('親近感のある絵文字を適度に使用してください');
    }
    
    return suggestions;
  }

  /**
   * X投稿用フォーマット
   * 
   * @param content - フォーマット対象コンテンツ
   * @returns フォーマット済みコンテンツ
   */
  private formatForX(content: string): string {
    let formatted = content.trim();
    
    // 280文字制限対応
    if (formatted.length > 280) {
      formatted = formatted.substring(0, 277) + '...';
    }
    
    // ハッシュタグ追加（文字数に余裕がある場合）
    const remainingChars = 280 - formatted.length;
    if (remainingChars > 20) {
      const hashtags = ['#投資教育', '#資産運用'];
      const hashtagsStr = ' ' + hashtags.join(' ');
      
      if (formatted.length + hashtagsStr.length <= 280) {
        formatted += hashtagsStr;
      }
    }
    
    // エンゲージメント要素の追加
    if (!formatted.includes('📊') && !formatted.includes('💡') && !formatted.includes('🎯')) {
      if (formatted.includes('分析')) {
        formatted = '📊 ' + formatted;
      } else if (formatted.includes('ポイント') || formatted.includes('重要')) {
        formatted = '💡 ' + formatted;
      } else {
        formatted = '🎯 ' + formatted;
      }
    }
    
    return formatted;
  }

  /**
   * コンテンツ戦略の決定
   */
  private async determineContentStrategy(data: ProcessedData): Promise<ContentStrategy> {
    try {
      // アカウント状態を読み込み
      const accountStatusPath = join(process.cwd(), this.dataPath, 'current', 'account-status.yaml');
      const accountStatus = loadYamlSafe<AccountStatusYaml>(accountStatusPath);
      const followerCount = accountStatus?.followers || 500;
      
      // 成長段階に基づく戦略選択
      if (followerCount < 1000) {
        // 初期段階：教育重視
        return 'educational';
      }
      
      // データの特性分析
      const hasTrendingTopic = this.hasTrendingTopic(data);
      const hasComplexData = this.hasComplexData(data);
      
      if (hasTrendingTopic && data.data.some(d => 
        d.timestamp > Date.now() - 6 * 60 * 60 * 1000 // 6時間以内
      )) {
        return 'trend';
      }
      
      if (hasComplexData || data.data.length > 5) {
        return 'analytical';
      }
      
      // デフォルトは教育重視
      return 'educational';
      
    } catch (error) {
      console.warn('⚠️ [ContentCreator] 戦略決定エラー、教育戦略を使用');
      return 'educational';
    }
  }

  /**
   * コンテンツ改善
   */
  private async improveContent(content: string, validation: ValidationResult): Promise<string> {
    let improved = content;
    
    // 文字数超過の場合
    if (content.length > 280) {
      improved = await this.condensContent(content);
    }
    
    // 教育的要素の追加
    if (validation.suggestions.includes('教育的要素を追加してください')) {
      improved = this.addEducationalElement(improved);
    }
    
    return improved;
  }

  /**
   * コンテンツ圧縮
   */
  private async condensContent(content: string): Promise<string> {
    try {
      const prompt = `
以下のコンテンツを280文字以内に要約してください。重要な情報は保持し、読みやすさを維持してください。

元のコンテンツ:
${content}
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      // フォールバック：単純な切り詰め
      return content.substring(0, 277) + '...';
    }
  }

  // ヘルパーメソッド
  private extractMarketTopic(data: ProcessedData): MarketTopic {
    const topicCounts = new Map<string, number>();
    
    data.data.forEach(item => {
      if (item.metadata?.tags) {
        (item.metadata.tags as string[]).forEach(tag => {
          topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    const topTopic = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      topic: topTopic ? topTopic[0] : '投資基礎',
      relevance: topTopic ? topTopic[1] / data.data.length : 0.5,
      sources: data.data.map(d => d.source),
      timestamp: Date.now()
    };
  }

  private extractTrendData(data: ProcessedData): TrendData {
    const recentData = data.data.filter(d => 
      d.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );
    
    const trend = recentData.length > 0 ? 
      recentData[0].content.substring(0, 50) : 
      '市場動向';
    
    return {
      trend,
      momentum: recentData.length / data.data.length,
      sources: recentData.map(d => d.source),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
  }

  private extractKeyInsights(data: ProcessedData): string[] {
    return data.data
      .filter(d => d.metadata && typeof d.metadata.importance === 'string' && d.metadata.importance === 'high')
      .map(d => d.content)
      .slice(0, 3);
  }

  private extractTopicName(data: ProcessedData): string {
    const topics = data.data
      .filter(d => d.metadata?.category)
      .map(d => d.metadata.category as string);
    
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '投資';
  }

  private calculateEducationalValue(content: string): number {
    let score = 50;
    
    const educationalKeywords = ['基本', '学習', '理解', '重要', 'ポイント', '初心者'];
    const foundKeywords = educationalKeywords.filter(keyword => content.includes(keyword));
    score += foundKeywords.length * 10;
    
    if (content.includes('例：') || content.includes('たとえば')) {
      score += 15;
    }
    
    if (content.includes('？')) {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateTrendRelevance(content: string, data: ProcessedData): number {
    const recentDataRatio = data.data.filter(d => 
      d.timestamp > Date.now() - 24 * 60 * 60 * 1000
    ).length / data.data.length;
    
    let score = recentDataRatio * 50;
    
    const trendKeywords = ['最新', '速報', '今日', '本日', '発表'];
    const foundKeywords = trendKeywords.filter(keyword => content.includes(keyword));
    score += foundKeywords.length * 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateConfidence(data: ProcessedData, validation: ValidationResult): number {
    let confidence = 70;
    
    if (data.dataQuality > 0.8) confidence += 10;
    if (validation.isValid) confidence += 10;
    if (data.data.length > 3) confidence += 10;
    
    return Math.min(100, confidence);
  }

  private hasTrendingTopic(data: ProcessedData): boolean {
    return data.data.some(d => 
      d.metadata && typeof d.metadata.importance === 'string' && d.metadata.importance === 'high' &&
      d.timestamp > Date.now() - 6 * 60 * 60 * 1000
    );
  }

  private hasComplexData(data: ProcessedData): boolean {
    const categories = new Set(data.data.map(d => d.metadata?.category).filter(Boolean));
    return categories.size > 3;
  }

  private addEducationalElement(content: string): string {
    if (!content.includes('ポイント') && content.length < 250) {
      return content + '\n💡 学習ポイント：継続的な学習が成功の鍵です。';
    }
    return content;
  }

  // フォールバックコンテンツ
  private createFallbackContent(): PostContent {
    return {
      id: `fallback-${Date.now()}`,
      content: '📊 投資の基本原則：リスク管理から始めましょう。小さく始めて、学びながら成長することが大切です。 #投資教育 #資産運用',
      platform: 'x',
      type: 'original_post',
      hashtags: ['投資教育', '資産運用'],
      metadata: {
        source: 'content-creator',
        theme: '投資教育',
        category: 'educational',
        relevanceScore: 0.8,
        urgency: 'medium' as const,
        targetAudience: ['beginner'],
        estimatedEngagement: 30
      },
      quality: {
        readability: 80,
        engagement_prediction: 60,
        educational_value: 70,
        market_relevance: 70,
        trend_alignment: 60,
        risk_score: 0.1,
        overall_score: 60,
        confidence: 0.8
      },
      timestamp: Date.now()
    };
  }

  private createEducationalFallback(topic: MarketTopic): string {
    return `📚 ${topic.topic}について学びましょう。投資の基本を理解することで、より良い判断ができるようになります。少しずつ知識を積み重ねていきましょう！`;
  }

  /**
   * 強化された教育的フォールバックコンテンツ生成
   * 
   * @param topic - 市場トピック
   * @returns 強化されたフォールバックコンテンツ
   */
  private createEnhancedEducationalFallback(topic: MarketTopic): string {
    const templates = [
      `📊 ${topic.topic}から学ぶ投資の基本。市場の動きには必ず理由があります。まずはつみたてNISAで少額から始め、経済ニュースと投資の関係を実感してみましょう。ただし、投資は自己責任。余裕資金で行うことが大切です。`,
      
      `💡 今日の注目は${topic.topic}。これが私たちの資産にどう影響するか考えてみましょう。初心者の方は、NISA口座で低コストのインデックスファンドから始めるのがおすすめ。焦らず、長期的な視点を持つことが成功の鍵です。`,
      
      `🎯 ${topic.topic}について。投資で大切なのは、ニュースに振り回されないこと。まずは月1万円の積立投資から始めて、市場の動きに慣れていきましょう。iDeCoなら節税効果も期待できます。リスクを理解した上で、一歩踏み出してみては？`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private createTrendFallback(trend: TrendData): string {
    return `🔥 注目のトレンド：${trend.trend}。市場の動きを理解し、冷静な判断を心がけましょう。`;
  }

  private createAnalyticalFallback(data: ProcessedData): string {
    return `📊 市場分析：複数の要因が絡み合う現在の相場。データに基づいた冷静な判断が重要です。`;
  }
}