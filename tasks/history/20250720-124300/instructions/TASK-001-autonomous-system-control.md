# TASK-001: 自動システム運用制御改善

## 🎯 タスク概要
自動投稿システム(`pnpm dev`)の運用制御機能を改善し、ユーザーが簡単に停止・再開できるようにする。

## 📋 現状分析
- `autonomous-runner.ts`が無限ループ(`while(true)`)で動作中
- 停止方法が分かりにくい（Ctrl+C必要）
- 運用状況の確認が困難
- 現在29回のイテレーションが正常完了

## 🔧 実装要求

### 1. 停止コマンドの追加
以下のコマンドを`package.json`に追加：

```json
{
  "scripts": {
    "dev": "tsx watch src/scripts/autonomous-runner.ts",
    "stop": "pkill -f 'tsx watch src/scripts/autonomous-runner.ts'",
    "status": "ps aux | grep 'autonomous-runner' | grep -v grep || echo 'システムは停止中'"
  }
}
```

### 2. 起動確認メッセージの改善
`src/scripts/autonomous-runner.ts`の起動メッセージを以下に変更：

```typescript
console.log('🚀 TradingAssistantX 自動投稿システム起動');
console.log(`📅 開始時刻: ${new Date().toISOString()}`);
console.log('⏹️  停止方法: Ctrl+C または `pnpm stop`');
console.log('📊 状態確認: `pnpm status`');
console.log('🔄 自動投稿システム実行中...\n');
```

### 3. 実行状況の表示改善
各イテレーションで以下の情報を表示：

```typescript
console.log(`\n🔄 [${new Date().toLocaleTimeString('ja-JP')}] イテレーション ${iterationCount}`);
// 実行結果
console.log(`✅ [${new Date().toLocaleTimeString('ja-JP')}] 完了 (次回: ${waitMinutes}分後)`);
```

## 🚫 MVP制約
- 複雑な管理画面や統計機能は追加しない
- シンプルなコマンドラインインターフェースのみ
- プロセス管理システムは導入しない
- ログファイルの詳細管理機能は追加しない

## 📋 実装手順
1. `package.json`のscriptsセクションに停止・状態確認コマンドを追加
2. `autonomous-runner.ts`の起動メッセージを改善
3. 実行時の表示を日本時間対応に改善
4. 簡単な動作確認を実施

## ⚡ 品質要求
- TypeScript strictモードで警告なし
- 実装後に`pnpm run lint`と`pnpm run typecheck`を実行
- 既存の動作に影響を与えない
- コマンドの実行可能性を確認

## 📂 出力管理規則
- 一時ファイルは作成しない
- 既存ファイルの編集のみ
- ルートディレクトリには出力しない

## 🎯 完了条件
- `pnpm stop`でシステムが停止される
- `pnpm status`で実行状況が確認できる
- 起動時に適切な案内メッセージが表示される
- 実行中の時刻表示が日本時間になる

## 📋 報告書パス
実装完了後、以下に報告書を作成：
`tasks/20250720-124300/reports/REPORT-001-autonomous-system-control.md`