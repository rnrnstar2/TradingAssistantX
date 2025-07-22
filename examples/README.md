# TradingAssistantX Examples

実際に動作するサンプルコードとガイド

## 📁 ファイル構成

- `performance-monitoring-usage.ts` - パフォーマンス関連機能の使用例

## 🚀 実行方法

```bash
# サンプルコード実行
tsx examples/performance-monitoring-usage.ts
```

## 📊 含まれる使用例

### 1. システムパフォーマンス最適化
`PerformancePerfector`を使用したシステム最適化の実例

### 2. Xアカウント分析
`XPerformanceAnalyzer`を使用したアカウント分析のデモ

### 3. システムリソース監視
メモリ・CPU使用量のリアルタイム監視

### 4. 利用可能なスクリプト紹介
実行可能な主要スクリプトとファイルの案内

## 🔧 実際のシステム実行

```bash
# メインシステム実行
pnpm run dev

# OAuth1認証テスト
tsx src/scripts/oauth1-test-connection.ts

# OAuth1セットアップ
tsx src/scripts/oauth1-setup-helper.ts
```

## 📚 参照ファイル

- `src/lib/quality/performance-perfector.ts` - パフォーマンス最適化
- `src/lib/x-performance-analyzer.ts` - X分析機能
- `src/lib/browser/performance-tuner.ts` - ブラウザ最適化

## 💡 注意事項

- X API認証が必要な機能は環境変数設定が必要
- 実行前に `pnpm install` で依存関係を確認
- エラーが発生した場合は `pnpm run dev` でシステム正常性を確認