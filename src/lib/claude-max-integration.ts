import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { chromium } from 'playwright';
import { createBrowserTools, createAnalysisTools } from './claude-tools';
import { 
  InstructionContext, 
  GeneratedPost, 
  CollectionResult
} from '../types/claude-tools';
import { PostHistory } from '../types/index';

interface LegacyGeneratedPost {
  content: string;
  analysis: string;
  timestamp: string;
  insights: string[];
}

export class ClaudeMaxIntegration {
  constructor() {
    // Claude Code SDKはCLIと自動的に連携
    // Claude MaxサブスクリプションがCLI経由で利用される
  }

  /**
   * 自律的な投稿生成（簡略版）
   */
  async generateStrategicPost(): Promise<LegacyGeneratedPost> {
    const prompt = `
      あなたはトレーディングコミュニティ向けの価値あるコンテンツを生成するAIアシスタントです。
      
      ## タスク
      1. data/scraped.yaml から最新データを読み込み（存在しない場合は一般的なトレーディング知識を使用）
      2. 投資・金融に関する教育的な投稿内容を生成（280文字以内）
      
      ## 出力フォーマット
      以下のJSON形式で出力してください：
      {
        "content": "投稿内容（280文字以内）",
        "analysis": "分析の要約",
        "timestamp": "YYYY-MM-DD HH:mm:ss",
        "insights": ["洞察1", "洞察2", "洞察3"]
      }
      
      ## 注意事項
      - 教育的で価値のあるコンテンツを作成
      - リスク管理の重要性を強調
      - 投資助言ではなく情報共有として表現
      
      価値ある投稿を生成してください。
    `;

    try {
      console.log('🔄 Claude Code SDKで分析開始...');
      
      const response = await claude()
        .withModel('opus')
        .query(prompt)
        .asText();

      console.log('✅ Claude Code SDK分析完了:', response);
        
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let generatedData;
      
      if (jsonMatch) {
        try {
          generatedData = JSON.parse(jsonMatch[0]);
        } catch {
          console.warn('JSON解析失敗、フォールバック処理実行');
          generatedData = this.createFallbackPost(response);
        }
      } else {
        generatedData = this.createFallbackPost(response);
      }
      
      const result: LegacyGeneratedPost = {
        content: generatedData.content || response.slice(0, 280),
        analysis: generatedData.analysis || response,
        timestamp: generatedData.timestamp || new Date().toISOString(),
        insights: generatedData.insights || ['教育的価値', 'リスク管理', '継続学習'],
      };

      const outputPath = path.join(process.cwd(), 'data', 'generated-post.json');
      fs.writeFileSync(outputPath, yaml.dump(result, { indent: 2 }));
      
      return result;
    } catch (error) {
      console.error('❌ Claude Code SDKエラー:', error);
      return this.fallbackToStandardAPI(prompt);
    }
  }

  /**
   * 従来の投稿生成（後方互換性のため）
   */
  async generatePost(): Promise<LegacyGeneratedPost> {
    const prompt = `
      あなたはトレーディングコミュニティ向けの価値あるコンテンツを生成するAIアシスタントです。
      収集されたデータを分析し、教育的で有益な投稿を作成します。
      
      ## タスク
      1. data/scraped.yaml から最新データを読み込み（存在しない場合は一般的なトレーディング知識を使用）
      2. トレーダーに価値のある洞察を抽出
      3. 教育的で建設的な投稿内容を生成（280文字以内）
      
      ## 出力フォーマット
      以下のJSON形式で出力してください：
      {
        "content": "投稿内容（280文字以内）",
        "analysis": "分析の要約",
        "timestamp": "YYYY-MM-DD HH:mm:ss",
        "insights": ["洞察1", "洞察2", "洞察3"]
      }
      
      ## 注意事項
      - リスク管理の重要性を強調
      - 教育的な内容を心がける
      - 投資助言ではなく情報共有として表現
      - 日本語で投稿内容を作成
      
      今日のトレーディングに役立つ教育的な投稿を生成してください。
    `;

    try {
      console.log('🔄 Claude Code SDKで分析開始...');
      
      // Claude Code SDKを使用してメッセージを送信
      const response = await claude()
        .withModel('opus')
        .query(prompt)
        .asText();

      console.log('✅ Claude Code SDK分析完了:', response);
        
        // JSONレスポンスを解析
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        let generatedData;
        
        if (jsonMatch) {
          try {
            generatedData = JSON.parse(jsonMatch[0]);
          } catch {
            console.warn('JSON解析失敗、フォールバック処理実行');
            generatedData = this.createFallbackPost(response);
          }
        } else {
          generatedData = this.createFallbackPost(response);
        }
        
        // 生成された投稿をファイルに保存
        const result: LegacyGeneratedPost = {
          content: generatedData.content || response.slice(0, 280),
          analysis: generatedData.analysis || response,
          timestamp: generatedData.timestamp || new Date().toISOString(),
          insights: generatedData.insights || ['教育的価値', 'リスク管理', '継続学習'],
        };

        // data/generated-post.yamlに保存
        const outputPath = path.join(process.cwd(), 'data', 'generated-post.json');
        fs.writeFileSync(outputPath, yaml.dump(result, { indent: 2 }));
        
        return result;
    } catch (error) {
      console.error('❌ Claude Code SDKエラー:', error);
      
      // フォールバック：標準APIを試行
      console.log('🔄 フォールバック: 標準APIを試行...');
      return this.fallbackToStandardAPI(prompt);
    }
  }

  private async fallbackToStandardAPI(prompt: string): Promise<LegacyGeneratedPost> {
    // 標準のAnthropic APIをフォールバックとして使用
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const result: LegacyGeneratedPost = {
        content: content.text.slice(0, 280),
        analysis: content.text,
        timestamp: new Date().toISOString(),
        insights: ['教育的価値', 'リスク管理', '継続学習'],
      };

      const outputPath = path.join(process.cwd(), 'data', 'generated-post.json');
      fs.writeFileSync(outputPath, yaml.dump(result, { indent: 2 }));
      
      return result;
    }
    
    throw new Error('All API methods failed');
  }

  private createFallbackPost(text: string): Partial<LegacyGeneratedPost> {
    return {
      content: text.slice(0, 280),
      analysis: '分析結果の要約',
      timestamp: new Date().toISOString(),
      insights: ['教育的価値', 'リスク管理', '継続学習'],
    };
  }

  private loadPostHistory(): PostHistory[] {
    try {
      const historyPath = path.join(process.cwd(), 'data', 'posting-history.yaml');
      if (fs.existsSync(historyPath)) {
        const rawData = fs.readFileSync(historyPath, 'utf8');
        return yaml.load(rawData) as PostHistory[];
      }
      return [];
    } catch (error) {
      console.warn('Failed to load post history:', error);
      return [];
    }
  }
}

// 新しいツールシステムとの統合
export async function executeAutonomousCollection(
  instruction: InstructionContext
): Promise<GeneratedPost> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    createBrowserTools(page);
    createAnalysisTools();
    
    const systemPrompt = generateSystemPrompt(instruction);
    
    const response = await claude()
      .withModel('opus')
      .query(`${systemPrompt}\n\n${instruction.goal}`)
      .asText();
    
    const result = JSON.parse(response) as CollectionResult;
    
    // 結果を投稿形式に変換
    if (!result) {
      throw new Error('Failed to get result from Claude');
    }
    return transformToPost(result);
  } finally {
    await browser.close();
  }
}

function generateSystemPrompt(instruction: InstructionContext): string {
  return `
    あなたは${instruction.autonomyLevel}レベルの自律性を持つ情報収集アシスタントです。
    
    ## 目標
    ${instruction.goal}
    
    ## 関心のあるトピック
    ${instruction.preferences.topics.join(', ')}
    
    ## 避けるべきトピック
    ${instruction.preferences.avoidTopics.join(', ')}
    
    ## 品質基準
    ${instruction.preferences.quality}
    
    ## 制約事項
    ${instruction.constraints ? instruction.constraints.join('\n- ') : '特になし'}
    
    利用可能なツール：
    - browser: ブラウザ操作（ナビゲーション、コンテンツ取得、スクリーンショット等）
    - analyze: コンテンツ分析（関連性評価、洞察抽出、品質判定等）
    
    指示された目標に従って、適切なツールを使用して情報を収集・分析し、
    CollectionResult形式で結果を返してください。
  `;
}

function transformToPost(result: CollectionResult): GeneratedPost {
  return {
    title: generateTitle(result.content),
    content: result.content,
    hashtags: extractHashtags(result.content),
    metadata: {
      quality: result.quality,
      sources: result.sources,
      timestamp: result.timestamp
    }
  };
}

function extractHashtags(content: string): string[] {
  const hashtags = content.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
  return hashtags.slice(0, 5);
}

function generateTitle(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) {
    return '生成されたコンテンツ';
  }
  
  const firstSentence = sentences[0].trim();
  if (firstSentence.length <= 50) {
    return firstSentence;
  }
  
  return firstSentence.substring(0, 47) + '...';
}

// CLI実行用
async function main() {
  const integration = new ClaudeMaxIntegration();
  
  try {
    const result = await integration.generatePost();
    console.log('✅ 投稿生成完了:', result.content);
  } catch (error) {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  }
}

// 直接実行の場合
if (require.main === module) {
  main();
}