# Task: MVP用RSS Collector以外のCollector削除

## 概要
REQUIREMENTS.mdのMVP方針に従い、RSS Collector以外のすべてのcollectorを削除し、最小構成を実現します。

## MVP方針の確認
REQUIREMENTS.mdより：
> **Phase 1 (MVP)**: RSS Collectorのみで投資教育コンテンツを収集・生成
> **将来拡張**: API、Community、Webスクレイピングなど多様なデータソースを段階的に追加

## 削除対象ファイル

### 1. collectors/base/配下（RSS以外）
- `src/collectors/base/api-collector.ts` - 将来拡張用
- `src/collectors/base/community-collector.ts` - 将来拡張用

### 2. collectors/specialized/配下（全削除）
- `src/collectors/specialized/fx-api-collector.ts`
- `src/collectors/specialized/playwright-account-collector.ts`
- `src/collectors/specialized/realtime-info-collector.ts`

### 3. collectors/integrated/配下（全削除）
- `src/collectors/integrated/multi-source-collector.ts`
- `src/collectors/integrated/enhanced-info-collector.ts`
- `src/collectors/integrated/adaptive-collector.ts`
- `src/collectors/integrated/action-specific-collector.ts`

### 4. collectors/engines/配下（全削除）
- `src/collectors/engines/rss-parallel-collection-engine.ts`

## 削除後の構造
```
src/collectors/
└── base/
    └── rss-collector.ts  # これだけ残す
```

## 実装手順

### Step 1: バックアップ作成
```bash
mkdir -p tasks/20250722_193030/backup/mvp-collectors-removal
cp -r src/collectors tasks/20250722_193030/backup/mvp-collectors-removal/
```

### Step 2: ファイル削除
```bash
# base配下の非RSS collector削除
rm -f src/collectors/base/api-collector.ts
rm -f src/collectors/base/community-collector.ts

# specialized配下を完全削除
rm -rf src/collectors/specialized/

# integrated配下を完全削除
rm -rf src/collectors/integrated/

# engines配下を完全削除
rm -rf src/collectors/engines/
```

### Step 3: import参照の確認
削除後、RSS Collectorを参照している他のファイルを確認：
```bash
grep -r "from.*collectors" src/ --include="*.ts" | grep -v "rss-collector"
```

### Step 4: 削除確認レポートの作成
- 削除したファイルのリスト
- 削除前後のファイル数比較
- RSS Collectorの独立動作確認

## 影響分析

### 依存関係の確認
以下のファイルが削除対象のcollectorを使用している可能性：
- decision-engine.ts
- autonomous-executor.ts
- その他のcore/配下のファイル

これらのファイルでは、RSS Collectorのみを使用するよう修正が必要。

## 品質基準
- RSS Collectorが単独で正常に動作すること
- ビルドエラーが発生しないこと
- システム全体がRSS Collectorのみで動作可能なこと

## 出力
- バックアップ: `tasks/20250722_193030/backup/mvp-collectors-removal/`
- 削除確認レポート: `tasks/20250722_193030/outputs/collectors-removal-report.md`

## 注意事項
- 将来の拡張時には、バックアップから必要なcollectorを復元可能
- RSS Collectorの実装が十分でない場合は、機能追加ではなく既存の改善を優先
- REQUIREMENTS.mdの方針を厳守し、MVPの簡潔性を維持

## 将来の復元方法
```bash
# 特定のcollectorを復元する場合
cp tasks/20250722_193030/backup/mvp-collectors-removal/collectors/base/api-collector.ts src/collectors/base/
```