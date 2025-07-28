# TASK-002: 包括的統合テスト指示書

## 🎯 **ミッション**
TwitterAPI.io統合システム全体の統合テスト実行・品質保証完了

## 📋 **前提条件**
- TASK-001完了（本番環境セットアップ完了）
- 環境変数設定済み
- TwitterAPI.io APIキー設定済み

## ✅ **実行項目**

### 🧪 **PHASE-1: kaito-api統合テスト**

#### 既存テスト実行確認
```bash
# コアクライアント統合テスト
pnpm test tests/kaito-api/core/client-integration.test.ts

# エンドポイント統合テスト
pnpm test tests/kaito-api/endpoints/endpoints-integration.test.ts

# 型安全性テスト
pnpm test tests/kaito-api/types/type-safety.test.ts
```

#### 実API統合テスト
```bash
# 実API接続テスト（環境変数要設定）
TWITTER_API_KEY=xxx pnpm test tests/kaito-api/real-api/real-integration.test.ts
```

### 🔗 **PHASE-2: システム全体統合テスト**

#### main-workflows統合確認
- **対象**: `src/main-workflows/`配下の全ワークフロー
- **確認項目**:
  - [ ] kaito-apiとの連携動作
  - [ ] データマネージャとの連携
  - [ ] Claude SDKとの連携
  - [ ] スケジューラとの連携

#### エンドツーエンドテスト
```bash
# 全体システム動作確認
REAL_DATA_MODE=true TEST_MODE=false pnpm dev
```

### 📊 **PHASE-3: パフォーマンステスト**

#### QPS制御テスト
- **テスト内容**: 200 QPS制限遵守確認
- **測定項目**: 
  - [ ] リクエスト間隔（≥5ms）
  - [ ] 応答時間（≤700ms）
  - [ ] エラー率（≤5%）

#### 負荷テスト
```bash
# 連続実行テスト（30分間隔×5回）
for i in {1..5}; do
  echo "実行回数: $i"
  REAL_DATA_MODE=true pnpm dev
  sleep 1800  # 30分待機
done
```

### 🔄 **PHASE-4: 自動化スケジューラテスト**

#### スケジューラ動作確認
```bash
# ループ実行テスト
REAL_DATA_MODE=true pnpm start
```

#### 監視項目
- [ ] 30分間隔実行遵守
- [ ] 失敗時の自動リトライ
- [ ] ログ記録正常性
- [ ] データ蓄積継続性

## 🛠 **テスト環境準備**

### 📁 **テストデータ準備**
```bash
# テスト用設定作成
mkdir -p src/data/config/test/
cp src/data/config/mvp-config.yaml src/data/config/test/integration-test-config.yaml
```

### 📝 **テスト実行ログ設定**
```bash
# テストログディレクトリ作成
mkdir -p tasks/20250727_222138_production_readiness/outputs/test-logs/
```

## 📊 **品質評価指標**

### ✅ **機能テスト**
- [ ] **投稿機能**: Twitter投稿成功率 ≥95%
- [ ] **データ取得**: ユーザー情報・トレンド取得成功率 ≥95%
- [ ] **認証機能**: API認証成功率 100%
- [ ] **エラーハンドリング**: 適切なエラー処理動作確認

### ⚡ **パフォーマンステスト**
- [ ] **応答時間**: ≤700ms
- [ ] **QPS遵守**: 200 QPS制限内
- [ ] **メモリ使用量**: 安定使用量維持
- [ ] **CPU使用率**: 正常範囲内

### 🔄 **信頼性テスト**
- [ ] **継続実行**: 24時間連続動作確認
- [ ] **障害復旧**: API障害時の自動復旧確認
- [ ] **データ整合性**: 学習データ蓄積・読み込み確認
- [ ] **ログ記録**: 適切なログ出力・保存確認

## 🚨 **テスト失敗時対応**

### ❌ **kaito-api テスト失敗時**
1. **型エラー確認**: TypeScriptコンパイル確認
2. **API設定確認**: 環境変数・APIキー確認
3. **ネットワーク確認**: TwitterAPI.io接続確認

### ❌ **統合テスト失敗時**
1. **依存関係確認**: モジュール間連携確認
2. **設定ファイル確認**: YAML設定の整合性確認
3. **権限確認**: ファイルアクセス権限確認

### ❌ **パフォーマンステスト失敗時**
1. **QPS調整**: リクエスト間隔調整
2. **タイムアウト設定**: 応答時間制限調整
3. **リソース確認**: メモリ・CPU使用量確認

## 📁 **出力ファイル**

### 📊 **テスト結果報告**
- **ファイル**: `tasks/20250727_222138_production_readiness/outputs/integration-test-report.md`
- **内容**: 各PHASEの実行結果・合否判定・改善点

### 📈 **パフォーマンスレポート**
- **ファイル**: `tasks/20250727_222138_production_readiness/outputs/performance-report.yaml`
- **内容**: 応答時間・QPS・成功率等の数値データ

### 🔍 **品質評価レポート**
- **ファイル**: `tasks/20250727_222138_production_readiness/outputs/quality-assessment.md`
- **内容**: 品質指標達成状況・総合評価

## 🎯 **完了条件**
全4PHASEのテスト実行完了・品質指標達成・総合評価レポート作成が完了時点で完了とする

---
**Manager指示**: Worker権限で上記PHASE-1〜4を順次実行し、各段階の詳細な実行結果・数値データを含むレポートを作成すること