# 【第3世代】重要型定義緊急修正指示書

**タスクID**: TASK-001-critical-type-definitions  
**発行日時**: 2025-07-23 10:54:57  
**緊急度**: 最高  
**制限時間**: 10分厳守  
**対象**: 1ファイルのみ (`src/types/data-types.ts`)  

## 🚨 Manager権限による厳格監視

**現在状況**: TypeScriptエラー151行（改善傾向：171→151）  
**目標**: 型定義不足エラーの大幅解決（151→120行以下）  
**Manager監視**: 作業中のリアルタイム確認実施  

## 🎯 今回の超限定ミッション

### 絶対遵守事項
1. **1ファイル制限**: `src/types/data-types.ts` のみ変更許可
2. **10分制限**: 開始から完了まで10分以内
3. **型定義のみ**: 既存コードの変更は一切禁止
4. **即座検証**: 3分ごとのコンパイル確認

### 対象エラー（最優先）
```
src/collectors/rss-collector.ts(25,38): Cannot find name 'MultiSourceCollectionResult'
src/collectors/rss-collector.ts(26,24): Cannot find name 'RssYamlSettings'  
src/collectors/rss-collector.ts(144,58): Cannot find name 'RSSSource'
```

**期待効果**: 約20-30個のTypeScriptエラー解決

## 📋 具体的実装内容

### Step 1: ファイル位置確認（30秒）
```bash
ls -la src/types/data-types.ts
```

### Step 2: 型定義追加（5分）
**ファイル**: `src/types/data-types.ts`  
**追加位置**: ファイル末尾（export文の前）

#### 2.1 MultiSourceCollectionResult型（2分）
```typescript
// RSS Collector専用の複数ソース結果型
export interface MultiSourceCollectionResult {
  id: string;
  content: any;
  source: string;
  timestamp: number;
  metadata: {
    sourceType: string;
    processingTime: number;
    count: number;
    [key: string]: any;
  };
  status: 'success' | 'failure' | 'timeout';
  errors?: string[];
}
```

#### 2.2 RssYamlSettings型（2分）
```typescript
// RSS設定ファイルの型定義
export interface RssYamlSettings {
  sources: {
    [category: string]: RSSSource[];
  };
  global?: {
    timeout?: number;
    retries?: number;
    [key: string]: any;
  };
  [key: string]: any;
}
```

#### 2.3 RSSSource型（1分）
```typescript
// RSS個別ソースの型定義
export interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  timeout?: number;
  retries?: number;
  lastChecked?: number;
  errorCount?: number;
  maxRetries?: number;
  filters?: any[];
  metadata?: Record<string, any>;
}
```

### Step 3: コンパイル確認（2分）
```bash
npx tsc --noEmit 2>&1 | wc -l
```

### Step 4: エラー詳細確認（2分）
```bash
npx tsc --noEmit 2>&1 | head -10
```

## ⏰ タイムライン（厳格遵守）

```
00:00-00:30  ファイル確認・作業開始
00:30-03:00  MultiSourceCollectionResult追加
03:00-03:30  コンパイル確認①
03:30-05:30  RssYamlSettings追加  
05:30-06:00  コンパイル確認②
06:00-07:00  RSSSource追加
07:00-07:30  コンパイル確認③
07:30-10:00  最終確認・報告書作成
```

## 🔒 品質保証プロセス

### 強制チェックポイント
#### 3分時点: 中間確認
```bash
npx tsc --noEmit 2>&1 | wc -l
# 期待値: 151行 → 140行以下
```

#### 7分時点: 最終確認
```bash
npx tsc --noEmit 2>&1 | wc -l  
# 期待値: 140行 → 120行以下
```

#### 10分時点: 完了確認
```bash
npx tsc --noEmit 2>&1 | head -5
# 主要型定義エラーの消失確認
```

### Manager監視ポイント
- **3分経過**: 進捗状況確認
- **5分経過**: 中間結果評価
- **7分経過**: 最終結果確認
- **10分経過**: 作業強制終了

## 📊 成功の定義

### 技術的成功基準
- [ ] TypeScriptエラー: 151行 → 120行以下
- [ ] 対象型定義エラー: 完全解決
- [ ] 新規エラー: 発生なし
- [ ] コンパイル時間: 増加なし

### プロセス成功基準
- [ ] 制限時間内完了: 10分以内
- [ ] 対象ファイルのみ変更: 他ファイル未変更
- [ ] 品質ゲート: 全通過
- [ ] Manager承認: 取得

## 📝 報告書必須項目

### 修正前状況
```bash
$ npx tsc --noEmit 2>&1 | wc -l
151

$ npx tsc --noEmit 2>&1 | head -3
[エラーメッセージ貼り付け]
```

### 修正後状況
```bash
$ npx tsc --noEmit 2>&1 | wc -l
[実際の数値]

$ npx tsc --noEmit 2>&1 | head -3  
[実際のエラー状況]
```

### 追加した型定義
```typescript
[実際に追加したコード]
```

## 🚫 絶対禁止事項

- ❌ **複数ファイル変更**: `src/types/data-types.ts` 以外への変更
- ❌ **既存コード修正**: 型定義以外の変更
- ❌ **複雑な実装**: インターフェース以外の追加
- ❌ **時間超過**: 10分を1秒でも超える作業継続

## 🚀 即座開始プロトコル

### Manager権限による開始承認
- [x] 指示書レビュー完了
- [x] 監視システム準備完了
- [x] Worker権限への明確指示
- [x] 10分タイマー開始準備

### Worker権限への最終指示
**今すぐ開始してください。10分後に強制終了します。**

---

**この第3世代指示書により、確実で検証可能な型定義修正を実現し、TypeScriptエラーの大幅解決を達成します。**