# TASK-001: プロンプトテンプレート管理 - BaseBuilder実装

## 🎯 実装目標
プロンプトテンプレート管理システムの基盤となるBaseBuilderクラスを実装する。これはすべてのプロンプトビルダーが継承する抽象クラスで、共通ロジックを一元管理する。

## 📋 実装対象ファイル

### 1. src/claude/prompts/builders/base-builder.ts
**目的**: すべてのプロンプトビルダーの基底クラス

```typescript
import { SystemContext, AccountInfo, LearningData } from '../../../shared/types';

// 時間帯コンテキストの型定義
export interface TimeContext {
  dayOfWeek: string;
  timeContext: string;
  hour: number;
}

// アカウント状況の型定義
export interface AccountStatus {
  followerCount: number;
  postsToday: number;
  engagementRate: number;
  lastPostHours: number;
}

export abstract class BaseBuilder {
  // 時間帯取得
  protected getTimeContext(): TimeContext {
    const now = new Date();
    return {
      dayOfWeek: this.getDayOfWeek(now),
      timeContext: this.getTimeOfDay(now),
      hour: now.getHours()
    };
  }

  // 曜日取得（日〜土）
  private getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  // 時間帯取得
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour >= 5 && hour < 7) return '早朝';
    if (hour >= 7 && hour < 10) return '朝';
    if (hour >= 10 && hour < 12) return '午前中';
    if (hour >= 12 && hour < 14) return '昼';
    if (hour >= 14 && hour < 17) return '午後';
    if (hour >= 17 && hour < 19) return '夕方';
    return '夜';
  }

  // アカウント状況フォーマット
  protected formatAccountStatus(account: AccountInfo): AccountStatus {
    return {
      followerCount: account.followers_count,
      postsToday: account.statuses_count,
      engagementRate: this.calculateEngagementRate(account),
      lastPostHours: this.getHoursSinceLastPost(account)
    };
  }

  // エンゲージメント率計算
  private calculateEngagementRate(account: AccountInfo): number {
    // 最近の投稿のエンゲージメント率を計算
    // TODO: 実際の計算ロジックは学習データから取得
    return 2.5; // デフォルト値
  }

  // 前回投稿からの経過時間計算
  private getHoursSinceLastPost(account: AccountInfo): number {
    // TODO: 実際の最終投稿時刻から計算
    return 4; // デフォルト値
  }

  // 共通変数の注入
  protected injectCommonVariables(template: string, context: SystemContext): string {
    const timeContext = this.getTimeContext();
    const accountStatus = this.formatAccountStatus(context.account);
    
    return template
      .replace(/\${dayOfWeek}/g, timeContext.dayOfWeek)
      .replace(/\${timeContext}/g, timeContext.timeContext)
      .replace(/\${hour}/g, timeContext.hour.toString())
      .replace(/\${context\.account\.followerCount}/g, accountStatus.followerCount.toString())
      .replace(/\${context\.account\.postsToday}/g, accountStatus.postsToday.toString())
      .replace(/\${context\.account\.engagementRate}/g, accountStatus.engagementRate.toString())
      .replace(/\${lastPostHours}/g, accountStatus.lastPostHours.toString());
  }

  // 学習データ変数の注入
  protected injectLearningVariables(template: string, learningData: LearningData): string {
    if (!learningData) return template;

    const recentTopics = learningData.recentTopics?.join(', ') || '';
    const avgEngagement = learningData.avgEngagement || 0;
    const totalPatterns = learningData.totalPatterns || 0;

    return template
      .replace(/\${context\.learningData\.recentTopics}/g, recentTopics)
      .replace(/\${context\.learningData\.avgEngagement}/g, avgEngagement.toString())
      .replace(/\${context\.learningData\.totalPatterns}/g, totalPatterns.toString());
  }

  // 市場状況変数の注入
  protected injectMarketVariables(template: string, market: any): string {
    if (!market) return template;

    const sentiment = market.sentiment || 'neutral';
    const volatility = market.volatility || 'medium';
    const trendingTopics = market.trendingTopics?.join(', ') || '';

    return template
      .replace(/\${context\.market\.sentiment}/g, sentiment)
      .replace(/\${context\.market\.volatility}/g, volatility)
      .replace(/\${context\.market\.trendingTopics}/g, trendingTopics);
  }

  // 抽象メソッド：各ビルダーで実装必須
  abstract buildPrompt(params: any): string;
}
```

## 📌 実装要件

### 必須要件
1. **TypeScript厳格モード**: すべての型を明示的に定義
2. **DRY原則**: 共通ロジックはBaseBuilderに集約
3. **変数置換の網羅性**: すべてのプロンプト変数に対応
4. **エラーハンドリング**: 欠損データに対する適切なデフォルト値
5. **拡張性**: 新しい変数や機能の追加が容易

### 品質基準
- TypeScript strict モードでエラーゼロ
- ESLint警告ゼロ
- 単体テスト可能な設計
- 適切なコメントとドキュメント

## 🚫 制約事項
- 過剰な抽象化は避ける
- MVPに必要な機能のみ実装
- 統計機能や分析機能は含まない
- 既存のエンドポイント設計を変更しない

## 📁 ディレクトリ作成
```bash
mkdir -p src/claude/prompts/builders
```

## ✅ 完了条件
1. base-builder.tsが正しく実装されている
2. TypeScript strict モードでコンパイルエラーがない
3. 共通変数の注入メソッドが正しく動作する
4. 抽象クラスとして他のビルダーから継承可能

## 📄 報告書作成
実装完了後、以下の報告書を作成してください：
`tasks/20250730_125723_prompt_template_management/reports/REPORT-001-base-builder-implementation.md`

報告書には以下を含めてください：
- 実装内容の概要
- 追加・変更したファイル一覧
- TypeScript/ESLintチェック結果
- 今後の課題や改善点