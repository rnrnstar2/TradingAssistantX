# ワーカーA指示書: 不足型ファイル作成・import修正

## 🚨 **緊急ミッション**
TypeScriptエラー95件中、不足型ファイル関連エラーの完全解決

## 📋 **主要作業**

### 1. 不足型ファイル特定・作成
```bash
# エラー対象ファイル
Cannot find module '../../types/collection-common.ts'
Cannot find module '../../types/multi-source.ts' 
```

### 2. collection-common.ts 作成
```
作成先: src/types/collection-common.ts
```

**必須型定義**:
```typescript
// 基本コレクション結果型
export interface BaseCollectionResult {
  source: string;
  data: any[];
  metadata: {
    timestamp: Date;
    quality: number;
  };
}

// マルチソースコレクション結果型  
export interface MultiSourceCollectionResult {
  title: string;
  content: string;
  url: string;
  source: string;
  provider: string;
  timestamp: number;
  relevanceScore?: number;
  tags?: string[];
}

// コレクション結果作成ヘルパー
export function createCollectionResult(data: any): BaseCollectionResult;
```

### 3. 既存multi-source.ts との整合性確保
```bash
# 確認: src/types/multi-source.ts 存在確認
ls -la src/types/multi-source.ts

# 重複型定義回避・統合
```

### 4. import path修正
**修正対象**: 
- `src/collectors/rss-collector.ts` 
- 他の不足型参照ファイル

**修正例**:
```typescript
// 修正前
import { BaseCollectionResult } from '../../types/collection-common.ts';

// 修正後  
import { BaseCollectionResult } from '../types/collection-common.js';
```

## 🔧 **技術要件**

### ファイル拡張子ルール
- **import文**: `.js` 拡張子使用（ESModule対応）
- **実ファイル**: `.ts` 拡張子で作成

### 型整合性確保
- 既存`src/types/index.ts`との競合回避
- 統一インターフェース維持
- 疎結合設計原則準拠

## 📊 **修正対象エラー例**
```
src/collectors/rss-collector.ts(2,91): Cannot find module '../../types/collection-common.ts'
src/collectors/rss-collector.ts(9,8): Cannot find module '../../types/multi-source.ts'
src/rss/source-prioritizer.ts(16,59): Cannot find module '../../types/collection-common.js'
```

## ✅ **完了条件**
1. 不足型ファイルすべて作成完了
2. import path修正完了
3. TypeScriptエラー数大幅削減（不足型関連ゼロ）
4. 既存型との競合なし

## 🎯 **優先順位**
**最高優先**: collection-common.ts作成→import修正→エラー確認