# RSS XMLパースエラー修正指示書

## 🎯 修正対象
**ファイル**: `src/collectors/rss-collector.ts`  
**エラー**: DIAMOND OnlineのRSSフィードXMLパースエラー

## 🚨 現在のエラー内容
```
RSS collection error for DIAMOND Online: Attribute without value
Line: 1646
Column: 89
Char: >
```

## 📋 修正タスク

### 1. エラーハンドリングの改善 (lines 314-319)

**現在のコード**:
```typescript
// XMLパースエラーの場合、詳細な情報をログ出力
if (errorMessage.includes('Attribute without value') || errorMessage.includes('XML')) {
  console.warn(`⚠️ [RSS] XML format issue in ${source.name} (${source.url}). Skipping this source.`);
  console.warn(`   Error details: ${errorMessage}`);
  console.warn(`   Error count for this source: ${this.errorCounts.get(source.id)?.count || 0}`);
}
```

**修正内容**:
- XMLパースエラーの詳細な行・列情報を適切に抽出・表示
- エラーの種類別に処理を分岐
- XMLクリーンアップの試行機能追加

### 2. XMLクリーンアップ機能の実装

**追加メソッド**:
```typescript
private cleanXMLContent(xmlContent: string): string {
  // 不正な属性値を修正
  // 不正なHTMLエンティティを修正
  // 破損したタグを修正
  return cleanedXml;
}
```

### 3. リトライ機能の強化

**修正箇所**: `collectFromSource` メソッド内
- XMLパースエラーの場合、クリーンアップ後に1回リトライ
- リトライ失敗時は詳細ログを出力してスキップ

## 🔧 実装要件

1. **エラー情報の詳細化**
   - 行番号・列番号の正確な表示
   - エラー種類の分類表示
   - 問題のあるXML箇所の特定

2. **XMLクリーンアップ機能**
   - 不正な属性値の修正
   - HTMLエンティティの正規化
   - 破損タグの修復

3. **リトライロジック**
   - XMLエラー時のクリーンアップ後リトライ
   - リトライ回数制限（1回まで）
   - リトライ失敗時の詳細ログ

## ✅ テスト要件

修正後、以下を確認：
1. `pnpm dev` でDIAMOND Onlineエラーが解消されること
2. 他のRSSソースに影響がないこと
3. エラーログが改善されていること

## 🚫 注意事項

- 既存のエラーハンドリング構造を維持
- BaseCollectorの継承構造を変更しない
- YamlManagerとの連携を保持
- MVP制約に合わせた簡素な実装