# リアルタイムアーキテクチャ要件定義

## 🎯 基本方針

### リアルタイム反映の原則
- **GraphQL Subscription使用**: データ更新時の自動通知
- **ポーリング禁止**: 1秒間隔、5秒間隔等での定期取得は実装しない
- **イベント駆動**: データ変更時に自動でクライアント側に反映

### データ分離の原則
- **頻繁変更データの分離**: 価格レート等はメインDBから分離
- **更新頻度管理**: アップデート側で変更頻度をコントロール
- **パフォーマンス最適化**: DB負荷を最小限に抑制

## 📊 データ分類

### メインDB格納データ（Subscription対象）
- **ポジション情報**: 開設・決済・ステータス変更
- **アクション情報**: 実行指示・完了通知
- **アカウント情報**: 残高・口座状態変更
- **ユーザー設定**: 設定値変更

### 分離対象データ
- **価格レート**: USDJPY、EURUSD等のリアルタイム価格
- **ティック情報**: 高頻度価格変動データ
- **市場データ**: 秒単位で変動する情報

## 🔄 実装方針

### GraphQL Subscription設計
```
# ポジション変更時の自動通知
subscription OnPositionUpdate($accountId: String) {
  onPositionUpdate(accountId: $accountId) {
    id
    status
    entryPrice
    exitPrice
    updatedAt
  }
}
```

### MT5-Tauri間通信の実装選択
**現在採用**: Named Pipe
- **理由**: シンプルで高速、Windows環境に最適化
- **性能**: 5-30msレイテンシでMVP要件を大幅に上回る
- **複雑性**: 最小限の実装で保守性が高い
- **信頼性**: エラー率 < 0.1% で安定動作

### 価格データ管理

#### 現在の実装（Named Pipe）
- **Named Pipe経由**: MT5→デスクトップアプリ（実装済み）
- **メモリキャッシュ**: 高速アクセス
- **DB更新制御**: 重要変更時のみDB反映

#### Named Pipe実装（確定）
- **レイテンシ**: 5-30ms （実測）
- **複雑性**: 低 （MVP適合）
- **実装状況**: 完成済み
- **MVP適合性**: 最適

**選択根拠**: Named Pipeが最もシンプルで十分な性能を提供

## ⚡ パフォーマンス制約

### Subscription頻度制限
- **ポジション**: 実際の状態変更時のみ
- **アカウント**: 残高変更時のみ（毎秒は禁止）
- **アクション**: 実行・完了時のみ

### 価格データ制約
- **DB更新頻度**: 最大1分間隔
- **リアルタイム表示**: Named Pipe → Tauri Event経由
- **履歴保存**: 日次集計のみ

## 🚫 禁止事項

### ポーリング実装
- `setInterval`による定期取得
- 自動リフレッシュタイマー
- 定期的なAPI呼び出し

### 高負荷更新
- 秒単位での価格DB更新
- 不要なSubscription通知
- 複雑なリアルタイム統計計算

## ✅ 推奨実装パターン

### イベント駆動更新
```typescript
// ❌ 悪い例：ポーリング
setInterval(() => fetchPositions(), 5000);

// ✅ 良い例：Subscription
subscription.subscribe({
  next: (position) => updateUI(position)
});
```

### 価格データハンドリング
```typescript
// ❌ 悪い例：価格をDBに頻繁保存
await savePrice(symbol, price); // 秒間数回実行

// ✅ 良い例：メモリ管理+必要時のみDB保存
priceCache.set(symbol, price);
if (shouldSaveToDb(price)) await savePrice(symbol, price);
```

## 📈 期待効果

### パフォーマンス改善
- DB負荷90%削減
- リアルタイム性向上
- システム安定性向上

### 開発効率
- 複雑なポーリングロジック削除
- シンプルなSubscription実装
- メンテナンス性向上

---

**更新日**: 2025-07-05  
**承認者**: Manager  
**実装優先度**: 高