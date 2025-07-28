# TASK-001: main.ts MVP簡素化実装

## 🎯 実装目標
src/scripts/main.tsの過剰実装機能を削除し、MVP原則に従った簡素なループ実行スクリプトに変更

## 📋 現状分析
main.tsには以下の過剰実装が存在：
1. **複雑なスケジューリング機能**: PostingScheduleインターフェース、時間計算ロジック
2. **YAML設定読み込み**: posting-times.yamlへの依存
3. **時間待機ロジック**: 精密な時間管理機能

## 🚫 MVP制約遵守（過剰実装防止）
以下は「あったら良い」機能のため削除：
- 複雑な投稿スケジューリング
- YAML設定ベースの時間管理
- 精密な待機時間計算
- カスタマイズ可能な実行間隔

## ✅ MVP適合の簡素実装

### 新しいmain.ts仕様
```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from '../core/execution/core-runner.js';

async function main(): Promise<void> {
  console.log('🚀 [MAIN] シンプル定期実行システム開始');
  
  const coreRunner = new CoreRunner({ enableLogging: true });
  
  // MVP: 単純な1時間間隔ループ
  while (true) {
    console.log('🚀 6段階自律実行フロー開始');
    
    const result = await coreRunner.runAutonomousFlow();
    
    console.log(result.success ? '✅ 実行完了' : `❌ エラー: ${result.error}`);
    
    // シンプルな1時間待機
    console.log('⏱️ 1時間待機...');
    await new Promise(resolve => setTimeout(resolve, 3600000));
  }
}

main().catch(console.error);
```

## 🔧 実装手順

### 1. ファイル読み込み
```
src/scripts/main.ts
```

### 2. 削除対象
- PostingScheduleインターフェース（8-16行目）
- loadPostingSchedule関数（60-64行目）
- getNextExecutionTime関数（66-87行目）
- waitUntil関数（89-94行目）
- yaml, fs, pathのimport文（4-6行目）

### 3. main関数の置き換え
既存のmain関数（18-57行目）を上記の簡素版に完全置き換え

### 4. 検証要件
- TypeScript strict mode通過
- import文の整合性確認
- 動作確認：`pnpm start`でエラーなし

## 📝 出力管理
- **レポート出力先**: `tasks/20250723_191140_script_layer_cleanup/reports/REPORT-001-main-ts-simplification.md`
- **修正ファイル**: `src/scripts/main.ts`のみ

## ⚠️ 制約・注意事項
1. **機能削除のみ**: 新機能追加は一切禁止
2. **依存関係**: posting-times.yamlへの依存完全除去
3. **エラーハンドリング**: 基本的なtry-catch維持
4. **MVP原則**: 「今すぐ必要」な機能のみ保持

## 🎯 完了基準
- [x] 複雑なスケジューリング機能の完全削除
- [x] シンプルな1時間間隔ループの実装
- [x] TypeScript strict mode通過
- [x] pnpm startでの動作確認
- [x] レポート作成完了