# TASK-002: 履歴データクリーンアップ

## 🎯 実装目的

実際のアカウント状態（フォロー数5、フォロワー数5、投稿数0）に合わせて、テスト投稿履歴等をクリーンな状態にリセットする。

## 📋 MVP制約確認済み

- ✅ 今すぐ必要: 新しいテスト投稿開始前のクリーンアップ
- ✅ 最小限実装: 既存データの削除・リセットのみ
- ✅ 統計・分析機能なし: 単純なデータクリア作業
- ✅ 複雑エラーハンドリングなし: 基本的なファイル操作のみ

## 🔨 実装タスク

### 1. 投稿履歴クリーンアップ

**対象ファイル**: `data/posting-history.yaml`
- **現状**: 5件のテスト投稿履歴あり
- **対応**: 空配列 `[]` にリセット

### 2. パフォーマンス履歴クリーンアップ

**対象ファイル**: `data/performance-insights.yaml`
- **対応**: 初期状態にリセット

### 3. その他データファイル確認

以下ファイルの確認とクリーンアップ：
- `data/collection-results.yaml`
- `data/quality-assessments.yaml` 
- `data/strategic-decisions.yaml`

**基本方針**: 履歴データは削除、設定データは保持

### 4. SimpleXClient の履歴クリア機能実装

`src/lib/x-client.ts` の `clearHistory()` メソッドを使用して、プログラマティックにクリア機能を提供

## 🔨 実装詳細

### 1. 履歴ファイルリセット

```yaml
# data/posting-history.yaml を以下に変更
[]
```

### 2. パフォーマンスデータリセット

```yaml
# data/performance-insights.yaml の履歴部分をクリア
version: "1.0.0"
lastUpdated: [現在のタイムスタンプ]
insights: []
```

### 3. クリーンアップスクリプト作成（オプション）

`tasks/20250721_113658/outputs/` に以下のスクリプトを作成：

```typescript
// TASK-002-cleanup-script-output.ts
import { SimpleXClient } from '../../src/lib/x-client';
import { writeFileSync } from 'fs';

// クリーンアップ実行
const client = new SimpleXClient('dummy');
client.clearHistory();

console.log('履歴クリーンアップ完了');
```

## ✅ 実装要件

### 技術要件
- 既存の設定データ（account-strategy.yaml等）は保持
- 履歴・分析データのみクリア
- ファイル構造は維持

### 品質要件
- クリーンアップ後の動作確認
- 設定ファイルの整合性確認

## 📁 出力管理規則

**🚨 ROOT DIRECTORY POLLUTION PREVENTION 必須**

- **禁止**: ルートディレクトリへの一時ファイル出力
- **承認場所**: `tasks/20250721_113658/outputs/` のみ使用
- **命名規則**: `TASK-002-{name}-output.{ext}` 形式

## 🚫 実装禁止事項

- 複雑なバックアップ機能
- 履歴分析・統計機能
- 詳細なログ出力
- 自動復元機能

## 📋 完了条件

1. ✅ posting-history.yaml が空配列になっている
2. ✅ 他の履歴ファイルがクリーンアップされている
3. ✅ 設定ファイルは保持されている
4. ✅ SimpleXClient.clearHistory() が正常動作する
5. ✅ 動作確認完了

## 💡 実装のヒント

- 既存の `clearHistory()` メソッドを活用
- YAMLファイルの直接編集は慎重に
- バックアップは不要（Git履歴があるため）

## 🎯 期待される効果

- クリーンな状態から新しいテスト投稿開始
- 実際のアカウント状態との整合性確保
- 履歴データの混乱防止

---

**Remember**: シンプルなクリーンアップ作業です。複雑にせず、確実にデータをリセットしてください。