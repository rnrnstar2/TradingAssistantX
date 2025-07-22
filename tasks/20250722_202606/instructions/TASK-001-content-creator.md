# TASK-001: Content Creator実装

## 🎯 実装目標
投稿コンテンツ生成を担当する`content-creator.ts`を実装し、自律的な投資教育コンテンツ作成システムを構築する。

## 📋 実装仕様

### ファイル場所
- **作成ファイル**: `src/services/content-creator.ts`

### 核心機能
1. **価値創造型コンテンツ生成**
   - 単なる情報転送ではなく、教育的価値の高いコンテンツ創造
   - 投資初心者にも理解しやすい解説付きコンテンツ
   - Claude独自の視点と洞察を組み込む

2. **データ統合システム**
   - `data/current/`のYAMLデータを活用
   - RSS収集データと蓄積された学習データを統合
   - アカウント状態に応じた戦略的コンテンツ生成

3. **教育的価値最大化**
   - 投資概念の分かりやすい説明
   - 具体例を用いた解説
   - フォロワーの投資リテラシー向上に貢献

### 実装要件

#### 1. クラス構造
```typescript
export class ContentCreator {
  constructor() {}
  
  async generateContent(
    collectedData: CollectionResult[],
    accountStatus: AccountStatus,
    strategy: ContentStrategy
  ): Promise<GeneratedContent>
  
  async createEducationalPost(rawData: any): Promise<PostContent>
  async addEducationalValue(content: string): Promise<string>
  async optimizeForPlatform(content: PostContent): Promise<PostContent>
}
```

#### 2. 型定義
```typescript
interface GeneratedContent {
  content: string;
  hashtags: string[];
  educationalValue: number;
  targetAudience: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
}

interface PostContent {
  text: string;
  hashtags: string[];
  length: number;
  readabilityScore: number;
}
```

#### 3. 教育的価値の組み込み
- **概念説明**: 専門用語の分かりやすい解説
- **実例提示**: 具体的な投資例や市場事例
- **学習ポイント**: 投稿から学べる要点の明確化
- **行動指針**: フォロワーが実践できるアドバイス

#### 4. データ活用戦略
- `data/learning/success-patterns.yaml`から成功パターンを学習
- `data/learning/effective-topics.yaml`から効果的なトピックを選択
- `data/current/active-strategy.yaml`に基づいた戦略的コンテンツ生成

### 品質基準
1. **TypeScript strict設定準拠**
2. **エラーハンドリング完備**
3. **教育的価値の定量的評価機能**
4. **コンテンツ品質の自動評価システム**

### 出力管理
- **作業ファイル出力先**: `tasks/20250722_202606/outputs/`
- **一時ファイル**: 上記ディレクトリ配下のみ
- **ルートディレクトリ出力禁止**

### 実装完了後
**報告書作成**: `tasks/20250722_202606/reports/REPORT-001-content-creator.md`
- 実装内容の詳細
- 教育的価値創造機能の説明
- 品質評価結果
- 動作確認結果

## 🚫 制約事項
- モックデータ使用禁止（REAL_DATA_MODE=true必須）
- 統計・分析機能の過剰実装禁止
- シンプルさを維持した実装

## ✅ 動作確認要件
1. YAMLデータの正常読み込み
2. 教育的価値の定量化機能
3. TypeScript strict通過
4. Lint通過

**並列実行**: この作業は他のWorkerと同時実行可能