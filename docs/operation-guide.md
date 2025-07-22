# TradingAssistantX 運用ガイド

## 1. 実行方法

### 開発実行（pnpm dev）
- **用途**: デバッグ、単一実行テスト、開発時の動作確認
- **実行内容**: 1回のみ実行して終了
- **ログ出力**: 詳細モードでコンソールに出力
- **実行コマンド**:
  ```bash
  pnpm dev
  ```

### 本番実行（pnpm start）
- **用途**: 1日15回の定時実行による自律運用
- **実行時間**: 朝7-8時、昼12時、夕方18-19時、夜21-23時
- **ループ制御**: 自動スケジューリングによる継続実行
- **実行コマンド**:
  ```bash
  pnpm start
  ```

## 2. データ管理

### データクレンジングの仕組み
システムは自動的にデータサイズを管理し、品質を維持します。

#### 自動クレンジング機能
- **data/current/の10ファイル制限**: 現在状態を示すファイルは最大10個まで保持
- **data/全体の10MB制限**: プロジェクト全体のデータサイズを10MB以内に維持
- **archivesへの自動移動**: 古いデータは自動的にアーカイブフォルダに移動
- **ファイルサイズ制限**: 各YAMLファイルは最大100KB

#### 動的データクレンジング（強化版）
実行毎に全ファイルを要件定義と照合し、整合性を保証：
- 要件定義にないファイルは即座に削除
- 構造保持: 要件定義の構造から逸脱したファイルは作成不可
- ハルシネーション防止機構が常時監視

### 手動クレンジング手順

#### 不要データの識別方法
1. **サイズ確認**:
   ```bash
   du -sh data/
   ```
2. **古いファイル確認**:
   ```bash
   find data/ -name "*.yaml" -mtime +7
   ```

#### 安全な削除手順
1. **バックアップ作成**（推奨）:
   ```bash
   cp -r data/ data_backup_$(date +%Y%m%d)
   ```
2. **アーカイブフォルダ確認**:
   ```bash
   ls -la data/archives/
   ```
3. **削除実行**:
   ```bash
   # 7日以上前のファイルをアーカイブに移動
   find data/current/ -name "*.yaml" -mtime +7 -exec mv {} data/archives/ \;
   ```

#### バックアップの推奨事項
- 毎週定期的なバックアップを作成
- 重要な実行ログは長期保存
- アーカイブデータの月次チェック

## 3. ログとモニタリング

### ログファイルの場所
- **実行ログ**: `data/current/execution-log.yaml`
- **アカウント状態**: `data/current/account-status.yaml`
- **投稿記録**: `data/current/today-posts.yaml`
- **戦略情報**: `data/current/active-strategy.yaml`

### ログファイル確認コマンド
```bash
# 実行ログ確認
cat data/current/execution-log.yaml

# 本日の投稿記録確認
cat data/current/today-posts.yaml

# アカウント状態確認
cat data/current/account-status.yaml
```

### エラーログの確認方法
```bash
# 最新のエラー確認
grep -i "error\|failed" data/current/execution-log.yaml

# 直近の実行結果確認
tail -20 data/current/execution-log.yaml
```

### パフォーマンス指標
- **実行時間**: 各実行ループの所要時間
- **充足度スコア**: 情報収集の品質指標（90%目標）
- **投稿成功率**: X API投稿の成功/失敗率

### 監視ポイント

#### X API レート制限
- **制限値**: 時間あたりのAPI呼び出し数
- **確認方法**: エラーログでrate limit関連メッセージを監視
- **対処**: 自動的に時間待機処理が実行される

#### データサイズ増加
- **監視コマンド**:
  ```bash
  # データディレクトリサイズ確認
  du -sh data/
  
  # 大きなファイルの特定
  find data/ -size +1M -ls
  ```

#### エラー発生頻度
- **正常範囲**: 実行10回中1回以下のエラー
- **注意レベル**: 実行10回中2-3回のエラー
- **緊急レベル**: 実行10回中5回以上のエラー

## 4. トラブルシューティング

### よくあるエラーと対処法

#### API制限エラー
**症状**: `Rate limit exceeded` エラー
**対処法**:
1. 自動的に時間待機処理が実行される
2. 手動確認: `grep "rate.limit" data/current/execution-log.yaml`
3. 必要に応じて投稿間隔の調整

#### 投稿失敗
**症状**: X APIへの投稿が失敗
**対処法**:
1. **ログ確認**:
   ```bash
   grep -i "post.*failed\|x.*error" data/current/execution-log.yaml
   ```
2. **認証確認**:
   ```bash
   echo "X_API_KEY: ${X_API_KEY:0:10}..."
   ```
3. **再実行**: `pnpm dev`

#### システム異常
**症状**: 実行が途中で停止
**対処法**:
1. **プロセス確認**:
   ```bash
   ps aux | grep node
   ```
2. **再起動**:
   ```bash
   pkill -f "node.*main"
   pnpm start
   ```
3. **ログ分析**:
   ```bash
   tail -50 data/current/execution-log.yaml
   ```

#### データ破損
**症状**: YAMLファイルの読み込みエラー
**対処法**:
1. **YAML検証**:
   ```bash
   # YAML構文チェック（要Python）
   python -c "import yaml; yaml.safe_load(open('data/current/account-status.yaml'))"
   ```
2. **バックアップからの復元**:
   ```bash
   cp data/archives/backup_yyyymmdd/* data/current/
   ```

### 緊急時の対応

#### システム停止手順
1. **実行中プロセスの停止**:
   ```bash
   pkill -f "pnpm.*start"
   pkill -f "node.*main"
   ```
2. **現在状態のバックアップ**:
   ```bash
   cp -r data/current data/emergency_backup_$(date +%Y%m%d_%H%M)
   ```
3. **ログの保存**:
   ```bash
   cp data/current/execution-log.yaml emergency_log_$(date +%Y%m%d_%H%M).yaml
   ```

#### データのロールバック
1. **問題のある実行を特定**:
   ```bash
   grep -n "timestamp" data/current/execution-log.yaml | tail -10
   ```
2. **直前の正常状態に復元**:
   ```bash
   # アーカイブから復元
   cp data/archives/last_known_good/* data/current/
   ```

#### 復旧手順
1. **整合性チェック**:
   ```bash
   # 必要に応じてintegrity-checkerを実行
   pnpm run check-integrity
   ```
2. **段階的再開**:
   ```bash
   # 単一実行でテスト
   pnpm dev
   
   # 正常確認後、本格運用再開
   pnpm start
   ```

## 5. 定期メンテナンス

### 日次タスク

#### ログ確認チェックリスト
- [ ] 実行ログのエラー有無確認
- [ ] 投稿成功率の確認
- [ ] API制限の発生有無

**実行コマンド**:
```bash
# 日次チェックスクリプト
grep -c "success\|completed" data/current/execution-log.yaml
grep -c "error\|failed" data/current/execution-log.yaml
```

#### データサイズチェック
- [ ] data/ディレクトリサイズ確認
- [ ] 10MB制限以内の維持確認

**実行コマンド**:
```bash
du -sh data/ | awk '{print "Data size: " $1}'
find data/ -size +100k -name "*.yaml" | wc -l
```

### 週次タスク

#### アーカイブ整理
- [ ] 古いデータのアーカイブ移動
- [ ] アーカイブフォルダの整理

**実行手順**:
```bash
# 1週間前のデータをアーカイブに移動
find data/current/ -name "*.yaml" -mtime +7 -exec mv {} data/archives/ \;

# アーカイブの月別整理
mkdir -p data/archives/$(date +%Y-%m)
mv data/archives/*.yaml data/archives/$(date +%Y-%m)/ 2>/dev/null || true
```

#### パフォーマンス分析
- [ ] 実行時間の推移確認
- [ ] エンゲージメント率の分析
- [ ] 投稿品質の評価

### 月次タスク

#### 全体バックアップ
```bash
# 月次バックアップ作成
tar -czf backup_$(date +%Y%m).tar.gz data/
mv backup_*.tar.gz ~/trading_assistant_backups/
```

#### 設定見直し
- [ ] posting-times.yamlの最適化
- [ ] rss-sources.yamlの更新
- [ ] brand-strategy.yamlの調整

## 6. コマンドリファレンス

### 基本コマンド

#### 実行コマンド
```bash
pnpm dev        # 単発実行（開発・デバッグ用）
pnpm start      # 定期実行（本番運用）
pnpm test       # テスト実行
pnpm lint       # 品質チェック
```

#### パッケージ管理
```bash
pnpm install    # 依存関係インストール
pnpm update     # パッケージ更新
```

### 診断コマンド

#### システム状態確認
```bash
# プロセス確認
ps aux | grep -E "(node|pnpm)" | grep -v grep

# Node.jsバージョン確認
node --version
pnpm --version

# 環境変数確認
env | grep -E "(X_API|ROLE)"
```

#### データ整合性チェック
```bash
# ディレクトリ構造確認
tree data/ -I "node_modules"

# YAMLファイル構文チェック
for file in data/current/*.yaml; do
  echo "Checking $file"
  python -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null || echo "ERROR in $file"
done

# ファイルサイズ確認
find data/ -name "*.yaml" -exec ls -lh {} \; | awk '{print $5 " " $9}' | sort -hr
```

#### API接続テスト
```bash
# X API接続確認（curlを使用）
curl -H "Authorization: Bearer $X_API_KEY" \
     -H "Content-Type: application/json" \
     "https://api.twitter.com/2/users/me" | jq .

# RSS フィード接続確認
curl -I "https://feeds.bloomberg.com/markets/news.rss" | grep "200 OK"
```

### ログ分析コマンド

#### 実行履歴分析
```bash
# 過去24時間の実行回数
grep "timestamp" data/current/execution-log.yaml | tail -24 | wc -l

# 成功率計算
success=$(grep -c "success\|completed" data/current/execution-log.yaml)
total=$(grep -c "timestamp" data/current/execution-log.yaml)
echo "Success rate: $(( success * 100 / total ))%"

# エラー頻度分析
grep -i "error" data/current/execution-log.yaml | \
  awk '{print $1}' | sort | uniq -c | sort -nr
```

#### パフォーマンス監視
```bash
# 実行時間の推移
grep "execution_time" data/current/execution-log.yaml | \
  tail -10 | awk '{print $2}' | \
  awk '{sum+=$1; n++} END {print "Average: " sum/n "s"}'

# データサイズ推移
ls -la data/current/*.yaml | awk '{total+=$5} END {print "Total size: " total/1024 "KB"}'
```

### 緊急時コマンド

#### 強制停止・復旧
```bash
# 全プロセス強制停止
pkill -9 -f "node.*trading"

# 緊急バックアップ
cp -r data/ emergency_backup_$(date +%Y%m%d_%H%M%S)

# 最小構成での再起動
rm -f data/current/active-strategy.yaml
pnpm dev --minimal
```

#### ヘルスチェック
```bash
# システム全体ヘルスチェック
echo "=== TradingAssistantX Health Check ==="
echo "1. Process status:"
ps aux | grep -E "(node|pnpm)" | grep -v grep || echo "No processes running"

echo "2. Data integrity:"
[ -d "data/current" ] && echo "✓ data/current exists" || echo "✗ data/current missing"
[ -f "data/current/execution-log.yaml" ] && echo "✓ execution log exists" || echo "✗ execution log missing"

echo "3. Disk usage:"
du -sh data/ | awk '{print "Data directory: " $1}'

echo "4. Environment:"
[ -n "$X_API_KEY" ] && echo "✓ X_API_KEY set" || echo "✗ X_API_KEY missing"
[ -n "$ROLE" ] && echo "✓ ROLE set to $ROLE" || echo "✗ ROLE missing"
```

---

## 運用のベストプラクティス

### 日常運用の流れ
1. 朝一番でログ確認
2. エラーがあれば即座に対処
3. データサイズを定期チェック
4. 週末にアーカイブ整理

### トラブル予防
- 定期的なバックアップ
- ログの継続監視
- API制限の事前把握
- データクレンジングの自動化

### 品質向上のポイント
- 投稿パフォーマンスの分析
- エンゲージメント率の追跡
- コンテンツ戦略の定期見直し
- システムの継続的改善