# TASK-001: 本番環境セットアップ指示書

## 🎯 **ミッション**
TwitterAPI.io統合完成を受けて、本番環境での実運用開始準備を実行

## 📋 **背景状況**
- **TwitterAPI.io統合**: 95%完成 (kaito-api: 100%完成)
- **型安全性**: TypeScript strict完全対応済み
- **テスト**: 42テストファイル実装済み
- **品質保証**: 包括的テスト・実API動作確認完了

## ✅ **実行項目**

### 🔧 **STEP-1: 環境変数設定**

#### 必須環境変数設定
```bash
# .env.local作成
echo "# TwitterAPI.io Production Configuration" > .env.local
echo "TWITTER_API_KEY=your_api_key_here" >> .env.local
echo "TWITTER_API_BASE_URL=https://api.twitterapi.io" >> .env.local
echo "REAL_DATA_MODE=true" >> .env.local
echo "ENVIRONMENT=production" >> .env.local
```

#### 設定ファイル作成
- **対象**: `src/data/config/production-config.yaml`
- **内容**: 本番環境用設定（30分間隔、QPS制御、コスト管理）

### 🧪 **STEP-2: 本番API接続テスト**

#### 実API接続確認
```bash
# 統合テスト実行
pnpm test tests/kaito-api/real-api/real-integration.test.ts

# 認証テスト
pnpm test tests/kaito-api/core/client-integration.test.ts
```

#### 動作確認項目
- [ ] API Key認証成功
- [ ] QPS制御動作確認（200 QPS制限）
- [ ] コスト追跡動作確認（$0.15/1k tweets）
- [ ] エラーハンドリング動作確認

### 📊 **STEP-3: 本番運用監視準備**

#### ログ監視設定
- **対象**: `src/data/current/production-logs.yaml`
- **内容**: API応答時間、エラー率、コスト追跡

#### パフォーマンス監視
- **対象**: `src/data/current/performance-metrics.yaml`
- **内容**: QPS使用率、応答時間、成功率追跡

### 🚀 **STEP-4: 本番実行テスト**

#### 単発実行テスト
```bash
# TEST_MODE=falseで本番実行
REAL_DATA_MODE=true pnpm dev
```

#### 実行確認項目
- [ ] TwitterAPI.io実投稿成功
- [ ] データ保存確認（学習データ蓄積）
- [ ] エラー処理正常動作
- [ ] コスト計算正確性

## 🎯 **成功基準**

### ✅ **必須達成項目**
1. **環境変数設定完了**: `.env.local`作成・設定確認
2. **実API接続成功**: 認証・投稿・データ取得確認
3. **監視体制準備**: ログ・メトリクス設定完了
4. **本番実行成功**: 実際の投稿・データ蓄積確認

### 📊 **品質指標**
- **API応答時間**: 700ms以下維持
- **成功率**: 95%以上
- **QPS遵守**: 200 QPS制限内
- **コスト効率**: $0.15/1k tweets以下

## ⚠️ **注意事項**

### 🔒 **セキュリティ**
- API Keyの.gitignore確認必須
- 本番環境でのデバッグログ制限
- 機密情報の漏洩防止

### 💰 **コスト管理**
- API使用量の定期確認
- 異常なコスト増加時の緊急停止準備
- 月次コスト上限設定

### 🚨 **エラー対応**
- TwitterAPI.io障害時の代替手段
- API制限到達時の待機処理
- 予期しないエラーの適切なログ記録

## 📁 **出力先**
- **設定ファイル**: `src/data/config/`
- **ログファイル**: `src/data/current/`
- **実行レポート**: `tasks/20250727_222138_production_readiness/outputs/`

## 🎯 **完了条件**
本番環境でのTwitterAPI.io連携による実投稿成功・データ蓄積確認が完了時点で完了とする

---
**Manager指示**: Worker権限で上記STEP-1〜4を順次実行し、各段階の実行結果をreportsディレクトリに報告すること