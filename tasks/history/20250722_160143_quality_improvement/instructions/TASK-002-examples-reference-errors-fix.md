# TASK-002: Examples参照エラー修正

## 🎯 目的
examples/ディレクトリの参照エラーを修正し、実際に動作するサンプルコードに改善する

## 🚨 現在の問題

### 1. 存在しないファイルへの参照 ❌
```typescript
// examples/performance-monitoring-usage.ts:11
import { PerformanceDashboard } from '../src/scripts/performance-dashboard.js';
```
**問題**: `src/scripts/performance-dashboard.ts` が存在しない

### 2. 間違ったインポートパス ❌
```typescript  
// examples/performance-monitoring-usage.ts:10
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';
```
**問題**: 実際の場所は `src/lib/logging/performance-monitor.ts`

### 3. 過度に詳細なREADME ❌
- 361行の冗長な文書
- 重複する説明
- 実用性より説明重視

## 🎯 解決方針

### 方針A: 実在ファイルベース修正（推奨）
既存の実装に合わせてexamplesを修正

### 方針B: 新規実装作成  
参照先ファイルを新規作成（工数大）

**採用方針: A（実在ファイルベース修正）**

## 📋 実行手順

### Phase 1: 実在ファイル調査

#### 1.1 パフォーマンス関連ファイル確認
```bash
find src -name "*performance*" -type f
# 期待される結果:
# src/lib/logging/performance-monitor.ts
# src/lib/quality/performance-perfector.ts  
# src/lib/x-performance-analyzer.ts
# src/lib/performance-report-generator.ts
# src/lib/browser/performance-tuner.ts
```

#### 1.2 各ファイルの公開インターフェース確認
- `src/lib/logging/performance-monitor.ts` のexportクラス・メソッド調査
- 実際に使用可能なAPIの特定

### Phase 2: インポート修正

#### 2.1 performance-monitoring-usage.ts修正
```typescript
// 修正前
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';
import { PerformanceDashboard } from '../src/scripts/performance-dashboard.js';

// 修正後（例）
import { PerformanceMonitor } from '../src/lib/logging/performance-monitor.js';
// PerformanceDashboardが存在しない場合は削除またはモック実装
```

#### 2.2 存在しない機能の処理
```typescript
// 存在しないPerformanceDashboardの処理オプション:

// Option A: モック実装
class MockPerformanceDashboard {
  static displayDashboard() {
    console.log('ダッシュボード機能は開発中です');
    console.log('詳細は src/lib/logging/performance-monitor.ts を参照');
  }
}

// Option B: 削除
// PerformanceDashboard関連のコードを全削除

// Option C: 既存機能への置き換え  
// PerformanceMonitorの機能で代替
```

### Phase 3: コード動作確認

#### 3.1 実行可能性の確保
```bash
# 修正後の実行テスト
tsx examples/performance-monitoring-usage.ts

# エラーがないことを確認
```

#### 3.2 実用的なサンプルへの改善
```typescript
// 実際に動作し学習価値のあるサンプルに変更
async function practicalExample() {
  // 実在するクラス・メソッドのみ使用
  // 実際のワークフローに即したサンプル
  // コメントで使用方法を明確化
}
```

### Phase 4: README.md最適化

#### 4.1 簡潔化（361行 → 100行以下）
```markdown
# Examples ディレクトリ

## 📁 ファイル構成
- `performance-monitoring-usage.ts` - パフォーマンス監視の実用例

## 🚀 使用方法
```bash
tsx examples/performance-monitoring-usage.ts
```

## 📚 詳細
各サンプルファイル内のコメントを参照
```

#### 4.2 重複削除・構造改善
- 冗長な説明の削除
- 実用的な情報のみ保持
- 実際に動作するコード例のみ掲載

### Phase 5: 整合性確保

#### 5.1 TypeScript設定確認
```json
// tsconfig.jsonでexamples/が含まれているか確認
{
  "include": ["src/**/*", "examples/**/*"],
  "exclude": ["node_modules", "dist", "tests/**/*", "tasks/**/*"]
}
```

#### 5.2 ESLint設定確認  
```javascript
// eslint.config.js でexamples/の扱いを確認
// 必要に応じて設定調整
```

## ✅ 完了条件
1. すべてのインポートエラーが解消されている
2. `tsx examples/performance-monitoring-usage.ts` が正常実行される
3. README.mdが100行以下に簡潔化されている
4. 実用的で学習価値のあるサンプルコードになっている
5. TypeScript/ESLint エラーがない

## 🧪 検証手順
```bash
# 1. 実行テスト
tsx examples/performance-monitoring-usage.ts

# 2. TypeScript チェック
tsc --noEmit examples/performance-monitoring-usage.ts

# 3. ESLint チェック
npx eslint examples/

# 4. 文書チェック
wc -l examples/README.md  # 100行以下を確認
```

## 🚨 重要事項
- 実在しないファイルは参照しない
- 実際に動作するサンプルコードのみ提供
- 過度な機能実装は避け、既存機能の活用を優先
- 学習価値と実用性のバランスを重視

## 📊 期待効果
- ✅ 実際に動作するサンプル提供
- ✅ 新規開発者の学習効率向上
- ✅ メンテナンス工数の削減
- ✅ 品質・信頼性の向上