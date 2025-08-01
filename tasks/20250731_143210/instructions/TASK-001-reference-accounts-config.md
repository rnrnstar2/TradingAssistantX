# TASK-001: リファレンスアカウント設定ファイルの実装

## 🎯 タスク概要
リアルタイム情報を提供する有益なアカウントリストを管理するための設定ファイル（`data/config/reference-accounts.yaml`）を作成し、データ管理システムに統合する。

## 📋 実装要件

### 1. 設定ファイル作成
**ファイルパス**: `data/config/reference-accounts.yaml`

**ファイル構造**:
```yaml
# リアルタイム投資情報を提供する参考アカウントリスト
reference_accounts:
  # 市場速報・ニュース系
  market_news:
    - username: "financialjuice"
      description: "リアルタイム金融ニュース・市場速報"
      priority: "high"
      categories: ["news", "market_updates", "breaking_news"]
    - username: "marketwatch"
      description: "市場動向・経済ニュース"
      priority: "medium"
      categories: ["market_analysis", "economic_news"]
    
  # 投資分析・専門家
  investment_experts:
    - username: "jimcramer"
      description: "投資アドバイス・市場分析"
      priority: "medium"
      categories: ["investment_advice", "stock_picks"]
    
  # 経済指標・統計
  economic_data:
    - username: "stlouisfed"
      description: "経済指標・統計データ"
      priority: "medium"  
      categories: ["economic_indicators", "statistics"]

# 検索設定
search_settings:
  max_tweets_per_account: 20  # 各アカウントから取得する最大ツイート数
  priority_weights:           # 優先度による重み付け
    high: 1.5
    medium: 1.0
    low: 0.5
  categories_enabled:         # 有効なカテゴリ
    - "news"
    - "market_updates"
    - "breaking_news"
    - "market_analysis"
    - "economic_news"
    - "investment_advice"
    - "stock_picks"
    - "economic_indicators"
    - "statistics"
```

### 2. データ管理システムへの統合
**修正ファイル**: `src/shared/data-manager.ts`

**追加メソッド**:
```typescript
/**
 * リファレンスアカウント設定の読み込み
 */
async loadReferenceAccounts(): Promise<ReferenceAccountsConfig> {
  const filePath = path.join(this.dataDir, 'config', 'reference-accounts.yaml');
  try {
    const yamlContent = await fs.readFile(filePath, 'utf-8');
    return yaml.load(yamlContent) as ReferenceAccountsConfig;
  } catch (error) {
    console.warn('⚠️ reference-accounts.yaml読み込みエラー、デフォルト値使用:', error);
    return {
      reference_accounts: {
        market_news: [],
        investment_experts: [],
        economic_data: []
      },
      search_settings: {
        max_tweets_per_account: 20,
        priority_weights: { high: 1.5, medium: 1.0, low: 0.5 },
        categories_enabled: []
      }
    };
  }
}

/**
 * 優先度に基づいてアカウントをフィルタリング
 */
getReferenceAccountsByPriority(config: ReferenceAccountsConfig, minPriority: 'low' | 'medium' | 'high' = 'medium'): ReferenceAccount[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const minPriorityValue = priorityOrder[minPriority];
  
  const allAccounts = [
    ...config.reference_accounts.market_news,
    ...config.reference_accounts.investment_experts,
    ...config.reference_accounts.economic_data
  ];
  
  return allAccounts.filter(account => 
    priorityOrder[account.priority] >= minPriorityValue
  );
}
```

### 3. 型定義の追加
**修正ファイル**: `src/shared/types.ts`

**追加する型定義**:
```typescript
// リファレンスアカウント設定
export interface ReferenceAccount {
  username: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  categories: string[];
}

export interface ReferenceAccountsConfig {
  reference_accounts: {
    market_news: ReferenceAccount[];
    investment_experts: ReferenceAccount[];
    economic_data: ReferenceAccount[];
  };
  search_settings: {
    max_tweets_per_account: number;
    priority_weights: {
      high: number;
      medium: number;
      low: number;
    };
    categories_enabled: string[];
  };
}

// SystemContextに追加
export interface SystemContext {
  // 既存のフィールド...
  
  // 参考アカウントの最新ツイート（オプション）
  referenceAccountTweets?: Array<{
    username: string;
    tweets: Array<{
      id: string;
      text: string;
      created_at: string;
      public_metrics?: any;
    }>;
  }>;
}
```

## ⚠️ 実装時の注意事項

1. **YAMLフォーマット**: 正しいインデントと構造を維持すること
2. **エラーハンドリング**: ファイルが存在しない場合はデフォルト値を返す
3. **型安全性**: TypeScriptの型定義を厳密に守る
4. **既存コードへの影響**: DataManagerの既存メソッドに影響を与えないよう注意

## 🧪 テスト要件

1. YAMLファイルの読み込みテスト
2. デフォルト値へのフォールバックテスト
3. 優先度フィルタリングのテスト
4. 型定義の整合性チェック

## 📁 成果物

1. `data/config/reference-accounts.yaml` - 新規作成
2. `src/shared/data-manager.ts` - メソッド追加
3. `src/shared/types.ts` - 型定義追加

## ✅ 完了条件

- [ ] reference-accounts.yamlが正しく作成されている
- [ ] DataManagerに新しいメソッドが追加されている
- [ ] 型定義が追加されている
- [ ] エラーハンドリングが実装されている
- [ ] TypeScriptのコンパイルエラーがない