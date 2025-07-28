# TASK-002: Data Optimizer実装

## 🎯 実装目標
データ最適化・クレンジングを担当する`data-optimizer.ts`を実装し、Claude Code SDK向けの最適なデータセット維持システムを構築する。

## 📋 実装仕様

### ファイル場所
- **作成ファイル**: `src/services/data-optimizer.ts`

### 核心機能
1. **動的データクレンジング**
   - 古い・低価値データの自動削除
   - 常に最適なデータセット維持
   - Claude Code SDK向けコンテキスト最適化

2. **価値評価システム**
   - データの教育的価値を定量評価
   - エンゲージメント実績による価値判定
   - 学習効果の高いデータを優先保持

3. **アーカイブ管理**
   - 古いデータの`data/archives/`への自動移動
   - 月別アーカイブの適切な管理
   - 必要最小限のcurrentデータ維持

### 実装要件

#### 1. クラス構造
```typescript
export class DataOptimizer {
  constructor() {}
  
  async optimizeDataset(): Promise<OptimizationResult>
  async cleanOldData(retentionDays: number): Promise<CleanupResult>
  async evaluateDataValue(data: any): Promise<ValueScore>
  async archiveData(targetPath: string, archivePath: string): Promise<void>
  async compressContext(): Promise<ContextResult>
}
```

#### 2. 型定義
```typescript
interface OptimizationResult {
  removedCount: number;
  archivedCount: number;
  currentDataSize: number;
  contextCompressionRatio: number;
}

interface ValueScore {
  educationalValue: number;
  engagementScore: number;
  recencyScore: number;
  totalScore: number;
}

interface ContextResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}
```

#### 3. データ評価基準
- **教育的価値**: コンテンツの学習効果
- **エンゲージメント**: 実際の反応データ
- **新鮮度**: データの作成・更新時期
- **関連性**: 現在の戦略との整合性

#### 4. 最適化戦略
- `data/current/`は常に最小限のデータのみ
- 成功パターンは長期保持
- 低パフォーマンスデータは早期削除
- Claude Code SDK向けコンテキスト圧縮

### クレンジング対象
1. **古いアカウント分析データ** (7日以上)
2. **低エンゲージメント投稿データ** (30日以上)
3. **無効化されたRSSソース情報**
4. **重複する学習データ**

### アーカイブルール
- `data/learning/` → `data/archives/YYYY-MM/learning/`
- `data/current/` → `data/archives/YYYY-MM/current/`
- 月次でアーカイブディレクトリを作成

### 品質基準
1. **TypeScript strict設定準拠**
2. **YAML読み書き安全性確保**
3. **データ整合性チェック機能**
4. **ロールバック機能実装**

### 出力管理
- **作業ファイル出力先**: `tasks/20250722_202606/outputs/`
- **最適化レポート**: 上記ディレクトリ配下のみ
- **ルートディレクトリ出力禁止**

### 実装完了後
**報告書作成**: `tasks/20250722_202606/reports/REPORT-002-data-optimizer.md`
- データ最適化アルゴリズムの詳細
- クレンジング機能の説明
- アーカイブシステムの動作確認
- 最適化効果の測定結果

## 🚫 制約事項
- データ削除時の安全性確保必須
- 重要データの誤削除防止機能必須
- 過度な最適化による機能低下防止

## ✅ 動作確認要件
1. YAMLデータの安全な読み書き
2. アーカイブ機能の正常動作
3. データ価値評価の精度
4. TypeScript strict・Lint通過

**並列実行**: この作業は他のWorkerと同時実行可能