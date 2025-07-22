/**
 * 設定テンプレートとドキュメント生成システム
 */

export interface ConfigTemplate {
  name: string;
  description: string;
  category: string;
  template: any;
  documentation: string;
  examples?: { [key: string]: any };
  recommendations?: { [key: string]: string };
}

/**
 * 設定テンプレート管理クラス
 */
export class ConfigTemplateManager {
  private templates = new Map<string, ConfigTemplate>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * テンプレートを登録
   */
  registerTemplate(template: ConfigTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * テンプレートを取得
   */
  getTemplate(name: string): ConfigTemplate | null {
    return this.templates.get(name) || null;
  }

  /**
   * カテゴリ別テンプレート一覧を取得
   */
  getTemplatesByCategory(category?: string): ConfigTemplate[] {
    const allTemplates = Array.from(this.templates.values());
    if (!category) return allTemplates;
    return allTemplates.filter(t => t.category === category);
  }

  /**
   * 設定ファイルを生成
   */
  generateConfigFile(templateName: string, options: any = {}): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const config = this.mergeTemplateWithOptions(template.template, options);
    const yaml = require('js-yaml');
    
    let output = `# ${template.description}\n`;
    output += `# カテゴリ: ${template.category}\n`;
    output += `# 生成日時: ${new Date().toISOString()}\n\n`;
    
    if (template.documentation) {
      const docLines = template.documentation.split('\n');
      output += docLines.map(line => `# ${line}`).join('\n') + '\n\n';
    }

    output += yaml.dump(config, {
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false
    });

    return output;
  }

  /**
   * 設定ドキュメントを生成
   */
  generateDocumentation(templateName: string): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let doc = `# ${template.name} 設定\n\n`;
    doc += `**カテゴリ:** ${template.category}\n\n`;
    doc += `## 概要\n${template.description}\n\n`;
    
    if (template.documentation) {
      doc += `## 詳細説明\n${template.documentation}\n\n`;
    }

    // 設定項目の説明
    doc += `## 設定項目\n\n`;
    doc += this.generateConfigDocumentation(template.template);

    // 推奨値
    if (template.recommendations) {
      doc += `## 推奨設定\n\n`;
      for (const [key, recommendation] of Object.entries(template.recommendations)) {
        doc += `### ${key}\n${recommendation}\n\n`;
      }
    }

    // 例
    if (template.examples) {
      doc += `## 設定例\n\n`;
      for (const [name, example] of Object.entries(template.examples)) {
        const yaml = require('js-yaml');
        doc += `### ${name}\n\`\`\`yaml\n${yaml.dump(example)}\`\`\`\n\n`;
      }
    }

    return doc;
  }

  /**
   * 最適化された設定を提案
   */
  suggestOptimizedConfig(templateName: string, currentUsage: any): any {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const optimized = { ...template.template };

    // 使用状況に基づく最適化ロジック
    if (templateName === 'autonomous' && currentUsage) {
      if (currentUsage.averageResponseTime > 5000) {
        optimized.claude_autonomous.max_context_size = Math.min(
          optimized.claude_autonomous.max_context_size,
          20000
        );
      }

      if (currentUsage.errorRate > 0.1) {
        optimized.data_management.minimal_history = true;
        optimized.data_management.real_time_focus = true;
      }
    }

    if (templateName === 'account' && currentUsage) {
      const followers = currentUsage.followers_count || 0;
      
      // フォロワー数に基づく成長目標の調整
      if (followers < 100) {
        optimized.growth_targets.followers.daily = Math.max(2, Math.min(5, followers * 0.1));
      } else if (followers < 1000) {
        optimized.growth_targets.followers.daily = Math.max(5, Math.min(10, followers * 0.05));
      } else {
        optimized.growth_targets.followers.daily = Math.max(10, Math.min(20, followers * 0.02));
      }
    }

    return optimized;
  }

  // プライベートメソッド
  private initializeDefaultTemplates(): void {
    // Autonomous設定テンプレート
    this.registerTemplate({
      name: 'autonomous',
      description: 'Claude自律実行システムの設定',
      category: 'core',
      template: {
        claude_autonomous: {
          enabled: true,
          max_context_size: 30000,
          decision_mode: 'autonomous'
        },
        execution: {
          mode: 'claude_decision',
          quality_priority: true
        },
        data_management: {
          minimal_history: true,
          real_time_focus: true
        }
      },
      documentation: `Claude自律実行システムの動作を制御します。
パフォーマンスと品質のバランスを調整し、リアルタイム応答を重視した設定です。`,
      recommendations: {
        'claude_autonomous.max_context_size': '応答時間を重視する場合は20000-30000、詳細分析が必要な場合は50000-80000に設定',
        'execution.mode': 'claude_decisionは最も柔軟性が高く、scheduled_postingは予測可能性が高い',
        'data_management.minimal_history': 'パフォーマンス重視ならtrue、履歴分析重視ならfalse'
      },
      examples: {
        '高パフォーマンス設定': {
          claude_autonomous: { enabled: true, max_context_size: 20000, decision_mode: 'autonomous' },
          execution: { mode: 'claude_decision', quality_priority: true },
          data_management: { minimal_history: true, real_time_focus: true }
        },
        '詳細分析設定': {
          claude_autonomous: { enabled: true, max_context_size: 50000, decision_mode: 'guided' },
          execution: { mode: 'scheduled_posting', quality_priority: true },
          data_management: { minimal_history: false, real_time_focus: false }
        }
      }
    });

    // Account設定テンプレート
    this.registerTemplate({
      name: 'account',
      description: 'アカウント情報と成長目標の設定',
      category: 'account',
      template: {
        version: '1.0.0',
        account: {
          username: '',
          user_id: '',
          display_name: '',
          verified: false
        },
        current_metrics: {
          followers_count: 0,
          following_count: 0,
          tweet_count: 0,
          listed_count: 0
        },
        growth_targets: {
          followers: {
            current: 0,
            daily: 2,
            weekly: 14,
            monthly: 60,
            quarterly: 180
          },
          engagement: {
            likesPerPost: 5,
            retweetsPerPost: 1,
            repliesPerPost: 1,
            engagementRate: 3
          },
          reach: {
            viewsPerPost: 50,
            impressionsPerDay: 750
          }
        }
      },
      documentation: `アカウントの基本情報と成長目標を管理します。
現在のメトリクスと目標設定の整合性を保つことが重要です。`,
      recommendations: {
        'growth_targets.followers.daily': '現在のフォロワー数の1-5%を目安に設定（スパム回避のため）',
        'growth_targets.engagement.engagementRate': '業界平均2-3%を参考に、徐々に向上を目指す',
        'growth_targets.reach.viewsPerPost': 'フォロワー数×10-20倍を目安に設定'
      }
    });

    // Multi-source設定テンプレート
    this.registerTemplate({
      name: 'multi-source',
      description: '多様な情報源からのデータ収集設定',
      category: 'data',
      template: {
        version: '1.0.0',
        rss: {
          sources: {
            yahoo_finance: {
              base_url: 'https://finance.yahoo.com/rss/',
              feeds: [
                { path: 'topstories', category: 'general' },
                { path: 'crypto', category: 'cryptocurrency' }
              ],
              refresh_interval: 300,
              timeout: 10000
            }
          }
        },
        apis: {
          alpha_vantage: {
            base_url: 'https://www.alphavantage.co',
            endpoints: {
              stock_quote: '/query?function=GLOBAL_QUOTE'
            },
            rate_limit: 5,
            timeout: 15000
          }
        },
        rateLimiting: {
          global: {
            max_concurrent: 10,
            backoff_strategy: 'exponential',
            max_retries: 3
          }
        },
        caching: {
          enabled: true,
          ttl: {
            rss: 300,
            api: 180
          },
          max_size: 100
        }
      },
      documentation: `外部データソースからの情報収集を効率的に管理します。
レート制限とキャッシュ戦略により、安定した情報取得を実現します。`,
      recommendations: {
        'rateLimiting.global.max_concurrent': 'APIプロバイダーの制限に応じて5-20の範囲で調整',
        'caching.ttl': '情報の鮮度要求に応じて調整（ニュース: 300s、価格: 60s）',
        'rss.sources.refresh_interval': '情報更新頻度とサーバー負荷のバランスを考慮'
      }
    });
  }

  private mergeTemplateWithOptions(template: any, options: any): any {
    if (typeof template !== 'object' || template === null) {
      return options !== undefined ? options : template;
    }

    if (Array.isArray(template)) {
      return options !== undefined ? options : template;
    }

    const result = { ...template };
    for (const key in options) {
      if (options[key] !== undefined) {
        if (typeof template[key] === 'object' && typeof options[key] === 'object') {
          result[key] = this.mergeTemplateWithOptions(template[key], options[key]);
        } else {
          result[key] = options[key];
        }
      }
    }

    return result;
  }

  private generateConfigDocumentation(config: any, prefix = ''): string {
    let doc = '';
    
    for (const [key, value] of Object.entries(config)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        doc += `### ${fullKey}\n**型:** Object\n\n`;
        doc += this.generateConfigDocumentation(value, fullKey);
      } else {
        const type = Array.isArray(value) ? 'Array' : typeof value;
        doc += `### ${fullKey}\n**型:** ${type}\n**デフォルト値:** \`${JSON.stringify(value)}\`\n\n`;
      }
    }

    return doc;
  }
}

// デフォルトインスタンスをエクスポート
export const defaultTemplateManager = new ConfigTemplateManager();