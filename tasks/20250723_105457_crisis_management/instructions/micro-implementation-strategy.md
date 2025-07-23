# 最小単位実装戦略（第3世代）

**策定日時**: 2025-07-23 10:54:57  
**背景**: Worker実装連続失敗による抜本的戦略変更  
**原則**: 1ファイル = 1実装 = 10分以内 = 確実な成果  

## 🎯 最小単位実装の定義

### マイクロ実装原則
1. **1ファイル制限**: 同時に1ファイルのみ変更
2. **10分制限**: 1実装セッション最大10分
3. **即座検証**: 変更後3分以内のコンパイル確認
4. **確実成果**: エラー数の確実な減少

### 失敗防止機構
- **複数ファイル変更の絶対禁止**
- **新機能追加の絶対禁止**
- **複雑なリファクタリングの絶対禁止**
- **投稿品質改善の一時停止**（基盤修正優先）

## 📊 優先度付けされた実装順序

### Phase 1: 基盤型定義修正（最優先）

#### Target 1: `src/types/data-types.ts` - 不足型定義追加
**エラー対象**: 
- `MultiSourceCollectionResult` (11箇所で参照)
- `RssYamlSettings` (3箇所で参照)  
- `RSSSource` (8箇所で参照)

**期待効果**: TypeScriptエラー22件の解決
**制限時間**: 10分
**成功基準**: エラー171行 → 149行以下

#### Target 2: `src/collectors/rss-collector.ts` - 基本型エラー修正
**エラー対象**: any型とunknown型の適切な型付け
**期待効果**: TypeScriptエラー8件の解決
**制限時間**: 10分
**成功基準**: エラー149行 → 141行以下

#### Target 3: `src/collectors/playwright-account.ts` - null安全性修正
**エラー対象**: null チェックの追加
**期待効果**: TypeScriptエラー5件の解決
**制限時間**: 10分
**成功基準**: エラー141行 → 136行以下

### Phase 2: 個別ファイル修正（第二優先）

#### Target 4: `src/core/autonomous-executor.ts`
#### Target 5: `src/services/content-creator.ts`
#### Target 6: `src/scripts/core-runner.ts`

**各ターゲット**: 10分 × 1ファイル × 確実な改善

## 🔧 実装プロセス設計

### Step 1: 事前分析（Manager実行）
```bash
# 現在のエラー数確認
npx tsc --noEmit 2>&1 | wc -l

# 対象ファイルのエラー特定
npx tsc --noEmit 2>&1 | grep "src/types/data-types.ts" | head -5
```

### Step 2: 実装実行（Worker実行）
**制限時間**: 10分厳守
**対象**: 1ファイルのみ
**方法**: 最小限の型定義追加

### Step 3: 即座検証（Manager実行）
```bash
# エラー数の変化確認
npx tsc --noEmit 2>&1 | wc -l

# 新しいエラーの有無確認
npx tsc --noEmit 2>&1 | head -10
```

### Step 4: 成果評価（Manager判定）
- エラー数が減少したか？
- 新しいエラーが発生していないか？
- 次のターゲットに進むべきか？

## 📋 第1ターゲット詳細仕様

### Target 1: `src/types/data-types.ts` 型定義追加

#### 追加すべき型定義
```typescript
// 1. MultiSourceCollectionResult
export interface MultiSourceCollectionResult {
  id: string;
  content: any;
  source: string;
  timestamp: number;
  metadata: any;
}

// 2. RssYamlSettings  
export interface RssYamlSettings {
  sources: Record<string, any[]>;
  [key: string]: any;
}

// 3. RSSSource
export interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  [key: string]: any;
}
```

#### 実装制約
- **ファイル制限**: `src/types/data-types.ts` のみ
- **時間制限**: 10分以内
- **変更制限**: 型定義の追加のみ、既存コードの変更禁止
- **検証**: 追加後に `npx tsc --noEmit` でエラー数確認

## 🚨 Manager監視ポイント

### リアルタイム監視
```bash
# 5分ごとのファイル変更監視
watch -n 300 'git status --porcelain'

# 作業中のエラー数監視  
watch -n 180 'npx tsc --noEmit 2>&1 | wc -l'
```

### 介入ポイント
- **10分経過**: 作業停止、現状確認
- **エラー増加**: 即座停止、原因分析
- **複数ファイル変更**: 即座停止、方針確認

### 成功判定基準
- エラー数の確実な減少（171 → 149以下）
- 新規エラーの発生なし
- 対象ファイルのコンパイル成功

## ⚡ 緊急実行プロトコル

### 即座開始条件
1. Manager監視システム起動
2. 第1ターゲット仕様確定
3. Worker権限への明確指示
4. 10分タイマー開始

### 失敗時対応
- **5分経過で進捗なし**: 戦略見直し
- **10分経過で未完了**: 作業停止、問題分析
- **エラー増加**: 即座ロールバック

---

**この最小単位戦略により、確実で検証可能な改善を1つずつ積み重ね、システムの安定化を実現します。**