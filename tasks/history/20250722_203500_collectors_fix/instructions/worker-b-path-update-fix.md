# ワーカーB指示書: 古いimport path一括更新

## 🚨 **緊急ミッション**
古いcollectorsパス参照の全件修正（ディレクトリ再編成対応）

## 📋 **主要作業**

### 1. 修正対象path特定
**エラーパターン**:
```bash
# 修正前（エラー）
'../collectors/base/rss-collector.js'  
'../collectors/base/rss-collector'

# 修正後（正解）
'../collectors/rss-collector.js'
```

### 2. 全ファイル一括検索・修正
```bash
# 検索コマンド例
grep -r "collectors/base/" src/

# 修正対象ファイル予想
src/core/autonomous-executor.ts
src/core/cache-manager.ts  
src/core/decision-engine.ts
src/core/decision-processor.ts
src/core/true-autonomous-workflow.ts
```

### 3. 系統的path修正

#### パターンA: RSS Collector参照
```typescript
// 修正前
import { RSSCollector } from '../collectors/base/rss-collector.js';

// 修正後
import { RSSCollector } from '../collectors/rss-collector.js';
```

#### パターンB: 相対パス調整
```typescript
// 修正前（core/配下から）
import '../collectors/base/rss-collector.js'

// 修正後  
import '../collectors/rss-collector.js'
```

### 4. 他サービス・コンポーネント参照修正
**主要修正領域**:
- `src/core/` → `src/collectors/` 参照
- `src/services/` → `src/collectors/` 参照  
- `src/scripts/` → `src/collectors/` 参照

## 🔧 **技術要件**

### ESModule import規則厳守
- **拡張子**: `.js` 必須（TypeScript設定対応）
- **相対パス**: `./` or `../` 明記
- **絶対パス**: 可能な限り相対パス使用

### 修正精度確保
```bash
# 修正後の確認コマンド
grep -r "collectors/base" src/ || echo "修正完了"
pnpm tsc --noEmit | grep "Cannot find module.*collectors"
```

## 📊 **修正対象エラー例**
```
src/core/autonomous-executor.ts(5,30): Cannot find module '../collectors/base/rss-collector.js'
src/core/cache-manager.ts(2,30): Cannot find module '../collectors/base/rss-collector.js'  
src/core/decision-engine.ts(4,30): Cannot find module '../collectors/base/rss-collector.js'
```

## ⚡ **一括修正戦略**
1. **grep検索**: 全修正対象特定
2. **sed一括置換**: パターンマッチ修正
3. **手動確認**: 複雑なケース個別対応
4. **段階的コンパイル**: 修正→確認→次ファイル

## ✅ **完了条件**  
1. `collectors/base/` 参照ゼロ
2. import path関連TypeScriptエラー消滅
3. 全collectorsファイル正常参照確認
4. コンパイルエラー大幅減少

## 🎯 **優先順位**
**最高優先**: core系ファイル→services系→その他の順序