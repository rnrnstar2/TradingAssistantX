# TASK-004: 緊急修正指示 - TypeScriptエラー121件の解決

## 🚨 **緊急度**: 最高優先

## 📋 **問題概要**
Worker1, Worker2の作業完了後、TypeScriptコンパイルで121件のエラーが発生。YamlManager削除の波及影響が適切に処理されていない。

## 🔧 **緊急修正項目**

### 1. **rss-collector.ts の残存問題**
```typescript
// ERROR: Property 'yamlManager' does not exist on type 'RSSCollector'
// Line 128: this.yamlManager.loadConfig

// 修正必要: yamlManager参照の完全除去
```

### 2. **decision-engine.ts のYAML関数不足**
```typescript
// ERROR: Cannot find name 'loadYamlSafe'
// ERROR: Cannot find name 'loadYamlArraySafe' 
// ERROR: Cannot find name 'writeYamlAsync'

// 修正必要: YAML操作の代替実装
```

### 3. **performance-analyzer.ts のyamlManager参照**
```typescript
// ERROR: Property 'yamlManager' does not exist
// 修正必要: yamlManager依存の除去
```

## ⚡ **即座修正指示**

### rss-collector.ts 修正
```typescript
// 削除対象
await this.yamlManager.loadConfig('rss-sources.yaml');

// 修正後
import * as yaml from 'js-yaml';
import { readFile } from 'fs/promises';

private async loadRssSettings(): Promise<void> {
  try {
    const yamlContent = await readFile('data/config/rss-sources.yaml', 'utf8');
    this.rssSettings = yaml.load(yamlContent) as RssYamlSettings;
  } catch (error) {
    console.error('RSS settings load error:', error);
    this.rssSettings = null;
  }
}
```

## 🔥 **制限時間**: 30分以内

YamlManagerの削除により他のコンポーネントが破綻している状況です。MVP範囲のみの緊急修正で、最低限の動作を復旧してください。

---

**Manager権限による緊急指示**: この修正完了まで他の作業は停止してください。