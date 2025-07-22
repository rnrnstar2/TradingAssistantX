# TASK-001: Content Creator実装

## 📋 タスク概要
**目的**: Claude Code SDKを活用した投稿コンテンツ生成システムの実装  
**優先度**: 🔥 最高（フェーズ３の核心機能）  
**実行順序**: 直列（最初に実装）  

## 🎯 実装要件

### 1. 基本要件
- **ファイル**: `src/services/content-creator.ts`
- **疎結合設計**: 独立したサービスとして実装
- **Claude Code SDK活用**: AI駆動のコンテンツ生成

### 2. 実装すべき機能

#### コア機能
```typescript
export class ContentCreator {
  // 投稿コンテンツ生成メインメソッド
  async createPost(data: ProcessedData): Promise<PostContent>
  
  // 教育的価値の高いコンテンツ生成
  async generateEducationalContent(topic: MarketTopic): Promise<string>
  
  // トレンド対応型コンテンツ生成
  async generateTrendContent(trend: TrendData): Promise<string>
  
  // コンテンツ品質検証
  private validateContent(content: string): ValidationResult
  
  // X投稿用フォーマット
  private formatForX(content: string): string
}
```

#### 必須実装項目
1. **Claude Code SDK統合**
   - `@instantlyeasy/claude-code-sdk-ts` の活用
   - コンテキスト圧縮を意識した実装

2. **コンテンツ戦略実装**
   - 教育重視型：初心者向け解説
   - トレンド対応型：話題性重視
   - 分析特化型：専門的解説

3. **品質保証機能**
   - 280文字制限対応
   - 読みやすさチェック
   - 教育的価値の確保

4. **データ活用**
   - RSS収集データの活用
   - アカウント状況に応じた調整
   - 過去の成功パターン活用

### 3. 型定義

```typescript
// src/types/content-types.ts に追加
export interface PostContent {
  content: string;
  strategy: ContentStrategy;
  confidence: number;
  metadata: {
    sources: string[];
    topic: string;
    educationalValue: number;
    trendRelevance: number;
  };
}

export type ContentStrategy = 
  | 'educational'
  | 'trend'
  | 'analytical';
```

### 4. MVP制約
- 🚫 複雑な統計・分析機能は実装しない
- 🚫 過度な最適化は避ける
- ✅ シンプルで効果的な実装
- ✅ 実用性を最優先

### 5. 統合要件
- `CollectionResult` を入力として受け取る
- `PostContent` を出力
- YAMLファイルからの設定読み込み対応
- エラーハンドリングの包括的実装

## 📊 成功基準
- [ ] TypeScript strict mode準拠
- [ ] Claude Code SDK正常動作
- [ ] 3つの戦略すべて実装
- [ ] 単体テスト作成
- [ ] 280文字制限対応確認

## 🔧 実装のヒント
1. `data/config/content-strategy.yaml` の設定を活用
2. `src/utils/context-compressor.ts` でコンテキスト管理
3. フォールバック戦略の実装（エラー時の代替コンテンツ）

## 📁 出力ファイル
- `src/services/content-creator.ts` - メイン実装
- `tests/services/content-creator.test.ts` - テストコード
- 本報告書完了時: `tasks/20250723_001451_phase3_core_services/reports/REPORT-001-content-creator-implementation.md`