# TASK-001: 開発モード実行オプション機能実装

## 📋 実装概要

**目的**: `pnpm dev`コマンドでアクション種別とパラメータを指定可能にする機能拡張

**現在の制限**: 
- 固定で投稿（`post`）アクションのみ実行
- schedule.yamlの最初のエントリ（06:00）に固定

**改良目標**:
- コマンドライン引数によるアクション指定
- インタラクティブモード対応
- 全アクション種別（post/retweet/like/quote_tweet/wait）のテスト実行

## 🎯 MVP制約確認済み

✅ **即座の必要性**: 開発・テスト効率向上のため必要
✅ **最小実装**: 既存MainWorkflowの活用、新機能追加なし
✅ **統計機能なし**: 純粋なオプション機能のみ
✅ **過剰拡張なし**: コマンドライン引数とインタラクティブ選択のみ

## 📂 実装対象ファイル

### 主要編集ファイル
- `src/dev.ts` - 開発モード実行スクリプト（既存）

### 依存関係確認済み
- `commander` - package.jsonで確認済み
- `@inquirer/prompts` - package.jsonで確認済み

## 🔧 実装仕様詳細

### 1. コマンドライン引数オプション

#### 基本構文
```bash
# アクション指定
pnpm dev -- --action=post --topic="投資教育"
pnpm dev -- --action=retweet --query="投資基礎 lang:ja"
pnpm dev -- --action=like --target="1234567890"
pnpm dev -- --action=quote_tweet --topic="解説" --query="市場分析"
pnpm dev -- --action=wait

# スケジュールインデックス指定
pnpm dev -- --schedule-index=5

# インタラクティブモード
pnpm dev -- --interactive
```

#### 引数定義
- `--action <action>`: アクション種別 (post|retweet|like|quote_tweet|wait)
- `--topic <topic>`: 投稿・引用ツイートトピック
- `--query <query>`: 検索クエリ（retweet, quote_tweetで使用）
- `--target <target>`: 対象ツイートID（likeで使用）
- `--schedule-index <index>`: schedule.yamlのインデックス指定（数値）
- `--interactive`: インタラクティブ選択モード

### 2. インタラクティブモード実装

#### 選択画面設計
```
? どのアクションを実行しますか?
❯ post - 投稿作成
  retweet - リツイート
  like - いいね
  quote_tweet - 引用ツイート
  wait - 待機
  schedule - スケジュール選択

? トピックを入力してください: (投資教育)
? 検索クエリを入力してください: (投資基礎 lang:ja)
```

#### アクション別入力フロー
- **post**: トピック入力
- **retweet**: 検索クエリ入力、対象ツイートID（オプション）
- **like**: 対象ツイートID入力、検索クエリ（フォールバック）
- **quote_tweet**: コメントトピック、検索クエリ入力
- **wait**: 追加入力なし
- **schedule**: schedule.yamlからの選択

### 3. 実装アーキテクチャ

#### src/dev.ts 構造拡張

```typescript
import { select, input } from '@inquirer/prompts';
import { Command } from 'commander';
import { MainWorkflow } from './workflows/main-workflow';
import { ScheduleLoader } from './scheduler/schedule-loader';

interface DevOptions {
  action?: string;
  topic?: string;
  query?: string;
  target?: string;
  scheduleIndex?: number;
  interactive?: boolean;
}

interface ActionConfig {
  action: string;
  topic?: string;
  target_query?: string;
  targetTweetId?: string;
}

// 1. コマンドライン引数解析
async function parseDevOptions(): Promise<DevOptions>

// 2. インタラクティブ選択
async function selectActionInteractively(): Promise<ActionConfig>

// 3. アクション別入力処理
async function buildActionFromUserInput(action: string): Promise<ActionConfig>

// 4. スケジュール選択
async function selectFromSchedule(): Promise<ActionConfig>

// 5. メイン実行関数（拡張）
async function runDev()
```

#### 実装フロー
1. **引数解析**: CommanderでCLI引数解析
2. **モード判定**: interactive/action指定/schedule-index/デフォルト
3. **アクション構築**: 各モードに応じたActionConfig生成
4. **MainWorkflow実行**: 既存のMainWorkflow.execute()に渡す

### 4. MainWorkflowとの連携

#### 既存インターフェース活用
```typescript
// MainWorkflow.execute()の既存オプションを活用
const result = await MainWorkflow.execute({
  scheduledAction: actionConfig.action,
  scheduledTopic: actionConfig.topic,
  scheduledQuery: actionConfig.target_query
});
```

**重要**: MainWorkflow.execute()の仕様は変更しない。既存のscheduledAction形式で渡す。

### 5. エラーハンドリング

#### 必須エラー処理
- 無効なアクション名の検証
- 必須パラメータの存在確認
- schedule.yamlの範囲外インデックス
- MainWorkflow実行エラーの適切なログ出力

#### エラーメッセージ例
```typescript
const VALID_ACTIONS = ['post', 'retweet', 'like', 'quote_tweet', 'wait'];

if (action && !VALID_ACTIONS.includes(action)) {
  throw new Error(`無効なアクション: ${action}. 利用可能: ${VALID_ACTIONS.join(', ')}`);
}
```

## 🧪 テスト要件

### 手動テスト項目
1. **コマンドライン引数**: 各オプションの正常動作確認
2. **インタラクティブモード**: 全選択パターンの動作確認
3. **既存機能**: デフォルト実行（引数なし）の動作継続確認
4. **エラーハンドリング**: 無効入力時の適切なエラー表示

### テスト用コマンド例
```bash
# 基本機能テスト
pnpm dev -- --action=post --topic="テスト投稿"
pnpm dev -- --action=wait
pnpm dev -- --interactive

# エラーケーステスト
pnpm dev -- --action=invalid
pnpm dev -- --schedule-index=999
```

## 🚫 実装制約

### MVP制約遵守
- ✅ **最小実装**: 既存機能の拡張のみ
- ✅ **新機能追加なし**: MainWorkflowの仕様変更禁止
- ✅ **統計機能なし**: 実行回数・成功率等の追跡機能は実装しない
- ✅ **UI拡張なし**: コマンドライン以外のUI実装禁止

### 技術制約
- **TypeScript Strict**: 厳密な型チェック必須
- **既存依存関係活用**: 新パッケージ追加禁止
- **後方互換性**: 既存の`pnpm dev`実行が正常動作すること
- **エラー処理**: 全ての異常系に対する適切なエラーハンドリング

### 出力制約
- **設定ファイル作成禁止**: 新たな設定ファイルは作成しない
- **data/ディレクトリ変更禁止**: データ保存形式は変更しない
- **ログフォーマット維持**: 既存のログ出力形式を維持

## 📋 完了条件

### 機能要件
- [x] コマンドライン引数での全アクション実行可能
- [x] インタラクティブモードでの全アクション選択可能
- [x] 既存のデフォルト実行が正常動作
- [x] 適切なエラーハンドリング実装

### 品質要件
- [x] TypeScript strict モードでエラーなし
- [x] 既存テストが全て通過
- [x] 手動テストで全機能動作確認
- [x] エラーケースでの適切なメッセージ表示

### 文書要件
- [x] 実装後のREADME更新（使用方法説明）
- [x] コード内コメント（重要な処理部分）
- [x] package.jsonスクリプト説明コメント

## 💡 実装のコツ

### CommanderJS設定
```typescript
const program = new Command();
program
  .name('dev')
  .description('開発モード実行')
  .option('--action <action>', 'アクション指定')
  .option('--topic <topic>', '投稿トピック')
  .option('--query <query>', '検索クエリ')
  .option('--target <target>', '対象ID')
  .option('--schedule-index <index>', 'スケジュールインデックス', parseInt)
  .option('--interactive', 'インタラクティブモード');
```

### Inquirer活用
```typescript
const actionType = await select({
  message: 'アクションを選択:',
  choices: [
    { name: 'post - 投稿作成', value: 'post' },
    { name: 'retweet - リツイート', value: 'retweet' },
    // ...
  ]
});
```

### デフォルト値設定
```typescript
const topic = await input({ 
  message: 'トピック:',
  default: '投資教育'
});
```

## ⚡ 実装優先順位

1. **最高優先度**: コマンドライン引数での基本アクション指定
2. **高優先度**: エラーハンドリング実装
3. **中優先度**: インタラクティブモード実装
4. **低優先度**: UX改善（デフォルト値、ヘルプメッセージ等）

---

**📋 報告書作成指示**: 実装完了後、以下パスに報告書を作成
- 📋 報告書: `tasks/20250730_000150_dev_mode_enhancement/reports/REPORT-001-dev-mode-options.md`

**🔍 最終確認**: 実装完了前に必ずMVP制約適合性とTypeScript strict適合性を確認すること