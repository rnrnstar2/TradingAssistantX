# TASK-003: YAML/JSONパーサー問題修正

## 🎯 実装目的
ParallelManagerのexecuteDataCleanup()メソッドで発生するYAML/JSONパース問題を修正し、システムの完全動作を達成する。

## 🚨 問題詳細
### エラー内容
```
SyntaxError: Unexpected token '#', "# 戦略的判断の履歴"... is not valid JSON
at JSON.parse (<anonymous>)
at ParallelManager.executeDataCleanup (/Users/rnrnstar/github/TradingAssistantX/src/core/parallel-manager.ts:128:29)
```

### 問題の根本原因
- **ファイル**: `src/core/parallel-manager.ts`
- **メソッド**: `executeDataCleanup()`
- **問題**: 128行目で全ファイルを`JSON.parse()`で解析している
- **実態**: `strategic-decisions.yaml`はYAMLファイルのため、JSON解析が失敗

## 🔧 修正対象ファイル
`src/core/parallel-manager.ts` - executeDataCleanupメソッド

## 📋 具体的修正内容

### 1. import文追加
```typescript
// ファイル先頭に追加
import * as yaml from 'js-yaml';
```

### 2. パーサー選択ロジック実装
現在の問題コード（128行目）:
```typescript
const parsed = JSON.parse(data);
```

修正後（ファイル拡張子に応じたパーサー選択）:
```typescript
// ファイル拡張子に応じてパーサーを選択
const parsed = target.endsWith('.yaml') || target.endsWith('.yml') 
  ? yaml.load(data) 
  : JSON.parse(data);
```

### 3. cleanupTargets確認
対象ファイルとその形式:
- `'context/execution-history.json'` - JSON形式
- `'strategic-decisions.yaml'` - YAML形式  
- `'communication/claude-to-claude.json'` - JSON形式

## 🛡️ MVP制約遵守事項
- **最小限修正**: パーサー選択ロジックのみ修正
- **機能拡張禁止**: 新機能追加は行わない
- **シンプル実装**: 複雑な条件分岐は避ける

## ✅ 実装要件
1. **TypeScript strict mode 遵守**
2. **既存のimport構造維持**
3. **エラーハンドリング保持**
4. **配列チェック処理の維持**

## 🧪 テスト手順
修正完了後、以下で動作確認：
```bash
pnpm run dev
```

確認ポイント:
- [ ] `SyntaxError: Unexpected token '#'` エラー解消
- [ ] データクリーンアップ処理正常実行
- [ ] X投稿テスト（TEST MODE）継続動作
- [ ] システム全体の安定動作

## 📁 出力管理規則
- **出力先**: `tasks/20250721_005158/reports/REPORT-003-yaml-json-parser-fix.md`
- **命名規則**: `REPORT-003-yaml-json-parser-fix.md`
- **Root Directory Pollution Prevention**: ルートディレクトリへの出力は絶対禁止

## 📊 完了条件
- [ ] js-yamlインポート追加
- [ ] ファイル拡張子ベースのパーサー選択実装
- [ ] pnpm run dev でのエラー解消確認
- [ ] X投稿（TEST MODE）正常動作確認
- [ ] TypeScript型チェック通過
- [ ] 報告書作成完了

## 💡 実装参考
システム内の他ファイルでのyaml使用例:
- `src/utils/yaml-utils.ts` 
- `src/core/decision-engine.ts`
- `src/lib/posting-manager.ts`

---
**記憶すべきこと**: この修正により、X投稿テストシステムが完全に動作可能になります。