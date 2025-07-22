# ワーカーA指示書: RSS Collector最適化・移動

## 🎯 **ミッション**
現在のrss-collector.tsを疎結合設計準拠で最適化し、適切な位置に移動

## 📋 **作業内容**

### 1. 現状分析
```bash
# 現在のファイル確認
cat src/collectors/base/rss-collector.ts
```

### 2. 疎結合設計最適化
**必須要素**:
- CollectionResult統一インターフェース準拠
- データソース独立性確保
- 設定駆動制御（YAML設定対応）
- エラーハンドリング強化

### 3. 移動・配置
```
移動元: src/collectors/base/rss-collector.ts
移動先: src/collectors/rss-collector.ts
```

## 🔧 **技術要件**

### 疎結合設計原則
```typescript
// 統一インターフェース準拠
interface CollectionResult {
  source: string;
  data: any[];
  metadata: {
    timestamp: Date;
    quality: number;
  };
}

// 設定駆動制御
interface RSSConfig {
  sources: string[];
  priority: number;
  timeout: number;
}
```

### 実データ収集強制
- **禁止**: モックデータ・テストモード
- **必須**: 実RSS収集のみ
- **エラー処理**: モックではなくエラーハンドリング

## 📊 **品質基準**
1. ✅ 疎結合設計完全準拠
2. ✅ CollectionResult型統一
3. ✅ YAML設定駆動
4. ✅ 実データ収集動作確認
5. ✅ エラーハンドリング完備

## 🚫 **制約**
- モックデータ使用禁止
- テストモード削除
- 実データ収集のみ許可

## ✅ **完了条件**
- src/collectors/rss-collector.ts として配置
- 疎結合設計準拠
- 実データ収集動作確認完了