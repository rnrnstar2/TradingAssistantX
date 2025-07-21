import type { PerformanceAnalysisResult } from '../types';

export class PerformanceReportGenerator {
  
  generateMarkdownReport(result: PerformanceAnalysisResult): string {
    const report = `# X アカウント パフォーマンス分析報告書

## 📊 基本指標
- **フォロワー数**: ${result.accountMetrics.followers_count.toLocaleString()}
- **フォロー数**: ${result.accountMetrics.following_count.toLocaleString()}
- **投稿総数**: ${result.accountMetrics.tweet_count.toLocaleString()}
- **平均エンゲージメント率**: ${result.engagement.averageEngagementRate?.toFixed(2) || 'N/A'}%
- **分析実行時刻**: ${result.analysisTimestamp}

## 📈 パフォーマンス分析

### 🏆 最高パフォーマンス投稿
- **内容**: "${result.engagement.bestPerformingPost?.content?.substring(0, 100) || 'データなし'}${(result.engagement.bestPerformingPost?.content?.length || 0) > 100 ? '...' : ''}"
- **いいね**: ${result.engagement.bestPerformingPost?.likes || 0}
- **リツイート**: ${result.engagement.bestPerformingPost?.retweets || 0}
- **返信**: ${result.engagement.bestPerformingPost?.replies || 0}
- **エンゲージメント率**: ${result.engagement.bestPerformingPost?.engagementRate?.toFixed(2) || 'N/A'}%

### 📊 エンゲージメント動向
- **トレンド**: ${this.getEmojiForTrend(result.engagement.engagementTrend || 'stable')} ${result.engagement.engagementTrend || 'stable'}
- **最適投稿時間**: ${result.engagement.optimalPostingTimes?.join(', ') || 'データなし'}

## 📋 最近の投稿分析 (${result.recentPosts.length}件)

${this.generatePostsTable(result.recentPosts.slice(0, 10))}

### 📊 投稿パフォーマンス統計
- **総エンゲージメント**: ${result.recentPosts.reduce((sum, post) => sum + post.likes + post.retweets + post.replies, 0)}
- **平均いいね数**: ${(result.recentPosts.reduce((sum, post) => sum + post.likes, 0) / result.recentPosts.length).toFixed(1)}
- **平均リツイート数**: ${(result.recentPosts.reduce((sum, post) => sum + post.retweets, 0) / result.recentPosts.length).toFixed(1)}
- **平均返信数**: ${(result.recentPosts.reduce((sum, post) => sum + post.replies, 0) / result.recentPosts.length).toFixed(1)}

## 👥 フォロワー分析
- **現在のフォロワー数**: ${result.followerMetrics.currentCount.toLocaleString()}
- **成長率**: ${result.followerMetrics.growthRate > 0 ? '+' : ''}${result.followerMetrics.growthRate}%
- **成長トレンド**: ${this.getEmojiForTrend(result.followerMetrics.growthTrend)} ${result.followerMetrics.growthTrend}
- **エンゲージメント品質スコア**: ${result.followerMetrics.engagementQuality}/10

## 🎯 戦略的推奨事項

${result.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## 📈 次回の改善アクション

### 🎯 短期的施策 (1-2週間)
- ${this.generateShortTermActions(result)}

### 🚀 中長期的戦略 (1-3ヶ月)
- ${this.generateLongTermStrategy(result)}

---

**📊 分析メタデータ**
- 分析実行日時: ${result.analysisTimestamp}
- 分析対象投稿数: ${result.recentPosts.length}
- 分析精度: 高精度 (Playwright使用)
- システム: Claude Code 自律実行システム

*このレポートは自動生成されており、次回の Claude Code 実行時に戦略最適化に活用されます。*
`;

    return report;
  }

  generateJsonSummary(result: PerformanceAnalysisResult): any {
    return {
      timestamp: result.analysisTimestamp,
      summary: {
        followers: result.accountMetrics.followers_count,
        averageEngagement: result.engagement.averageEngagementRate || 0,
        trend: result.engagement.engagementTrend,
        postsAnalyzed: result.recentPosts.length,
        topPerformance: result.engagement.bestPerformingPost?.engagementRate || 0
      },
      metrics: {
        account: result.accountMetrics,
        engagement: result.engagement,
        follower: result.followerMetrics
      },
      recommendations: result.recommendations,
      nextActions: {
        shortTerm: this.generateShortTermActions(result).split('\n').filter(a => a.trim()),
        longTerm: this.generateLongTermStrategy(result).split('\n').filter(a => a.trim())
      }
    };
  }

  private generatePostsTable(posts: any[]): string {
    if (posts.length === 0) return '投稿データがありません。';

    let table = `| # | 投稿内容 | いいね | RT | 返信 | エンゲージメント率 |\n`;
    table += `|---|----------|--------|----|----|------------------|\n`;
    
    posts.forEach((post, index) => {
      const content = post.content.substring(0, 30) + (post.content.length > 30 ? '...' : '');
      table += `| ${index + 1} | ${content} | ${post.likes} | ${post.retweets} | ${post.replies} | ${post.engagementRate.toFixed(1)}% |\n`;
    });

    return table;
  }

  private getEmojiForTrend(trend: string): string {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  }

  private generateShortTermActions(result: PerformanceAnalysisResult): string {
    const actions = [];
    
    if ((result.engagement.averageEngagementRate || 0) < 2) {
      actions.push('エンゲージメント向上のため、質問形式の投稿を増やす');
    }
    
    if ((result.engagement.optimalPostingTimes?.length || 0) > 0) {
      actions.push(`最適時間帯（${result.engagement.optimalPostingTimes?.join(', ') || 'データなし'}）での投稿を強化`);
    }
    
    if (result.recentPosts.length < 7) {
      actions.push('投稿頻度を週7回以上に増加');
    }
    
    if ((result.engagement.bestPerformingPost?.engagementRate || 0) > (result.engagement.averageEngagementRate || 0) * 1.5) {
      actions.push('高パフォーマンス投稿のパターンを分析し、類似コンテンツを作成');
    }

    return actions.join('\n- ');
  }

  private generateLongTermStrategy(result: PerformanceAnalysisResult): string {
    const strategies = [];
    
    if (result.followerMetrics.growthTrend === 'decreasing') {
      strategies.push('フォロワー減少対策：価値提供型コンテンツへの戦略転換');
    }
    
    if (result.engagement.engagementTrend === 'decreasing') {
      strategies.push('エンゲージメント回復戦略：双方向コミュニケーションの強化');
    }
    
    strategies.push('定期的な競合分析による差別化戦略の構築');
    strategies.push('コンテンツカテゴリ別パフォーマンス分析と最適化');
    strategies.push('Claude Code による継続的な分析・改善サイクルの確立');

    return strategies.join('\n- ');
  }

  async saveReport(result: PerformanceAnalysisResult, format: 'markdown' | 'json' = 'markdown'): Promise<string> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'markdown' ? 'md' : 'json';
    const fileName = `performance-${timestamp}.${extension}`;
    const filePath = path.join(process.cwd(), 'data', 'performance-reports', fileName);
    
    let content: string;
    if (format === 'markdown') {
      content = this.generateMarkdownReport(result);
    } else {
      content = JSON.stringify(this.generateJsonSummary(result), null, 2);
    }
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    
    return filePath;
  }

  async loadLatestReport(): Promise<any | null> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    try {
      const reportsDir = path.join(process.cwd(), 'data', 'performance-reports');
      const files = await fs.readdir(reportsDir);
      
      const jsonFiles = files
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (jsonFiles.length === 0) return null;
      
      const latestFile = path.join(reportsDir, jsonFiles[0]);
      const content = await fs.readFile(latestFile, 'utf-8');
      
      return JSON.parse(content);
    } catch (error) {
      console.warn('最新レポートの読み込みに失敗:', error);
      return null;
    }
  }
}