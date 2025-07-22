# 🎯 **Worker実装指示書: Original Post専用システム簡素化**

**発行者**: Manager  
**対象**: Worker権限  
**日時**: 2025-07-21  
**優先度**: HIGH  

## 🚨 **緊急対応要求**

### **背景・目的**
- 現在6つのアクション選択肢（original_post, quote_tweet, retweet, reply, analyze_only, wait）が複雑性の原因
- パラメータ構造不整合により実行成功率0%（全てfailed）
- Xログイン制約により情報収集困難
- **ユーザー要求**: `original_post`のみに簡素化、アクション決定プロセス削除

### **現在の致命的問題**
```yaml
# daily-action-data.yamlより
error: Cannot read properties of undefined (reading 'originalContent')
error: Cannot destructure property 'quotedTweetId' of 'decision.params' as it is undefined.
```

## 📋 **実装タスク**

### **🔥 Phase 1: 緊急修正（最優先）**

#### **1.1 アクション種別の単純化**
**対象ファイル**: 
- `src/types/action-types.ts`
- `src/core/autonomous-executor.ts`

**変更内容**:
```typescript
// 変更前: 6種類のActionType
type ActionType = 'original_post' | 'quote_tweet' | 'retweet' | 'reply' | 'analyze_only' | 'wait';

// 変更後: original_postのみ
type ActionType = 'original_post';
```

#### **1.2 決定エンジンの簡素化**
**対象ファイル**: `src/core/decision-engine.ts`

**変更内容**:
- 複雑な配分計算ロジック削除
- `planExpandedActions()` → 常にoriginal_post返却
- `makeIntegratedDecisions()` → 簡素化

#### **1.3 パラメータ構造修正**
**対象ファイル**: `src/core/autonomous-executor.ts`

**修正箇所**:
```typescript
// originalContentパラメータエラー解決
// 必須: decision.params.originalContentの存在確認
// 必須: デフォルト値設定
```

### **🔧 Phase 2: 設定ファイル最適化**

#### **2.1 YAML設定調整**
**対象ファイル**:
- `data/action-collection-strategies.yaml` - original_post設定のみ保持
- `data/daily-action-data.yaml` - 構造簡素化
- `data/current-situation.yaml` - 不要設定削除

#### **2.2 日次プランナー修正**
**対象ファイル**: `src/lib/daily-action-planner.ts`

**変更内容**:
- 配分計算削除（original_post = 100%）
- 他のアクション配分ロジック削除

### **⚡ Phase 3: エラーハンドリング強化**

#### **3.1 実行成功率改善**
- originalContentパラメータ検証強化
- デフォルト値設定
- エラー時のfallback機能

#### **3.2 不要機能削除**
- quote_tweet関連コード削除
- retweet関連コード削除  
- reply関連コード削除
- analyze_only機能削除
- wait機能削除

## 🎯 **品質確認項目**

### **必須確認事項**
1. **実行成功率**: 0% → 80%以上
2. **エラー解消**: `originalContent` undefinedエラー完全解決
3. **機能動作**: original_post単体での正常動作
4. **設定整合性**: YAML設定とコード実装の一致

### **テスト実行**
```bash
# 実行確認
pnpm dev

# ログ確認
tail -f data/daily-action-data.yaml
```

## ⚠️ **注意事項**

### **削除対象機能**
- ❌ quote_tweet機能群
- ❌ retweet機能群
- ❌ reply機能群
- ❌ analyze_only機能群
- ❌ wait機能群
- ❌ 複雑な配分計算ロジック

### **保持対象機能**
- ✅ original_post機能（完全保持・強化）
- ✅ Claude統合
- ✅ コンテンツ生成
- ✅ 品質評価システム

### **実装順序**
1. **緊急**: パラメータエラー修正
2. **最優先**: アクション種別単純化
3. **高優先**: 不要機能削除
4. **中優先**: 設定ファイル最適化

## 📊 **期待効果**

### **システム安定性**
- エラー発生率: 100% → 0%
- 実行成功率: 0% → 80%+
- システム複雑度: 大幅削減

### **保守性向上**
- コードベース簡素化
- 設定管理簡素化
- デバッグ効率向上

---

**🚀 即座に実装開始してください。実行成功率0%は許容不可能です。**

**完了報告**: 各Phase完了時に進捗報告必須
**緊急連絡**: エラー継続時は即座に報告