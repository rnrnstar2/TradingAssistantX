# X変更検知システム統合ガイド

## 概要
x-data-collectorとTradingAssistantXを連携させ、X（Twitter）の変更を検知して自動的にアクションを実行するシステムです。

## システム構成

### 1. x-data-collector側の変更
- **change-detector.ts**: 変更検知ロジック
- **collector.ts**: 変更検知機能の統合
- **daemon.ts**: 変更に基づく動的な実行間隔調整
- **rss-exporter.ts**: ツイートのRSS出力

### 2. TradingAssistantX側の変更
- **trigger-monitor.ts**: トリガーファイル監視
- **dev.ts**: --watchオプションで変更検知モード

## 変更検知の種類

1. **フォロワー増加**
   - 閾値: 100人増加
   - アクション: お礼投稿作成

2. **バイラルツイート**
   - 閾値: 1000インプレッション
   - アクション: 続編投稿作成

3. **エンゲージメント急上昇**
   - 閾値: 50%以上の上昇
   - アクション: 投稿戦略最適化

4. **カスタムセレクター**
   - 任意のDOMセレクター監視
   - 柔軟なアクション定義

## 実行手順

### 1. x-data-collector起動
```bash
cd x-data-collector
npm run daemon
```

### 2. TradingAssistantX変更検知モード起動
```bash
pnpm dev --watch
```

## データフロー

```
x-data-collector
    ↓ (データ収集)
change-detector.ts
    ↓ (変更検知)
data/triggers/*.yaml
    ↓ (トリガーファイル)
trigger-monitor.ts
    ↓ (監視・読み込み)
CoreRunner実行
    ↓
投稿作成・実行
```

## トリガーファイル形式

```yaml
# data/triggers/follower-milestone.yaml
trigger: follower_increase
milestone: 1500
timestamp: "2025-01-23T12:00:00Z"
action_required: create_thank_you_post
```

## カスタムセレクター追加方法

change-detector.tsのloadDetectors()メソッドに追加：

```typescript
{
  selector: '[data-testid="your-selector"]',
  threshold: 100,
  action: 'your_custom_action',
  description: 'カスタム検知の説明'
}
```

## 注意事項

1. **データ共有パス**
   - x-data-collectorとTradingAssistantXは同じdata/ディレクトリを共有
   - triggersディレクトリは自動作成される

2. **実行間隔**
   - 変更検知時: 最短5分間隔
   - 通常時: 設定された間隔（デフォルト30分）

3. **エラー処理**
   - トリガーファイル処理失敗時は削除されない
   - 手動での確認・削除が必要

## トラブルシューティング

### トリガーが処理されない
1. data/triggers/ディレクトリの権限確認
2. YAMLファイルの構文エラー確認
3. action_requiredが正しいか確認

### 変更が検知されない
1. last-collected.jsonが存在するか確認
2. 閾値設定が適切か確認
3. セレクターが正しいか確認