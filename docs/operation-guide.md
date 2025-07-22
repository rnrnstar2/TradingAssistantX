# TradingAssistantX 運用ガイド

## 🎯 システムの理想像

**Claude Code SDK中心の完全自律システム**
- 🎯 **自律的テーマ決定**: Claudeが市場分析して最適テーマを決定
- 📊 **自律的データ収集**: 必要データを自動収集・分析（RSS中心のMVP）
- ✍️ **自律的投稿作成**: Claude Code SDKが全意思決定を担当し最適投稿を生成
- 🔄 **継続的最適化**: 実行結果から学習し品質向上

**革新的中心技術**: Claude Code SDKによる意思決定の完全委託

## ⚠️ 作業前必須確認

### 🔒 権限確認（必須実行）
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**権限確認完了まで一切の作業開始禁止**

### 📋 権限別行動指針
- **Manager権限**: `docs/roles/manager-role.md` 熟読 → 指示書作成・Worker統率のみ
- **Worker権限**: `docs/roles/worker-role.md` 熟読 → 実装作業・コード編集

### 🚨 ハルシネーション防止の3原則
1. **要件定義に記載されたディレクトリ・ファイルのみ使用可能**
2. **新規ファイル・ディレクトリの作成は原則禁止** 
3. **integrity-checker.ts が構造の逸脱を自動検出・拒否**

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

## 2. データ収集戦略（RSS中心のMVP）

### 🎯 RSS Collector中心設計
- **Phase 1 (MVP)**: RSS Collectorのみで投資教育コンテンツを収集・生成
- **将来拡張**: API、Community、Webスクレイピングなど段階的追加
- **完全疎結合**: 各Collectorは独立動作、相互依存なし

### データ収集戦略一覧
- **RSS集中収集** (`collectors/rss-collector.ts`): 安定情報収集、API制限回避
- **アカウント分析** (`collectors/playwright-account.ts`): 自己状況把握、戦略調整
- **複合データ収集** (将来拡張): 多角的情報、独自性高コンテンツ

### RSS収集の特徴
- 主要金融メディアのRSSフィードから効率収集
- **動的クエリ対応**: Google News検索と連携
- YAMLで「query」フィールド指定で自動検索URL生成
- Claude Code SDKが自律的に最適な検索条件選択

## 4. 階層型データ管理（3層構造）

**Claude Code SDK向け最適化された階層構造**：

### 📊 ホットデータ層（data/current/）
- **保持期間**: 直近7日分、最大1MB、ファイル数20個上限
- **用途**: 即座の意思決定用データ
- **自動移行**: 古いデータは自動的にlearning層へ移動

### 🧠 ウォームデータ層（data/learning/）
- **保持期間**: 90日分の分析済みインサイト、最大10MB
- **用途**: 戦略最適化・学習データ
- **自動移行**: 月次でarchives/insights/へ移動

### 🗄️ コールドデータ層（data/archives/）
- **保持期間**: 全投稿の永続保存、容量無制限
- **用途**: 完全なデータ履歴・監査証跡
- **構造**: 月別・四半期別の階層化保存

### ハルシネーション防止機構

#### 許可された出力先
```yaml
allowed_write_paths: [data/current/, data/learning/, data/archives/, tasks/outputs/]
readonly_paths: [src/, data/config/, tests/, docs/]
```

#### 検証フロー
1. 構造検証：要件定義との完全一致確認
2. ファイル数・サイズ制限チェック  
3. 命名規則：記載されたファイル名のみ使用可
4. 実行ログ記録：異常時は即座にロールバック

### 自動データクレンジング機能
- **current/**: 20ファイル・1MB上限で自動管理
- **learning/**: 90日・10MB上限で月次アーカイブ移行
- **archives/**: 永続保存、月別・四半期別階層化
- **要件定義外ファイル**: integrity-checker.tsが自動削除

## 5. ログ・モニタリング・トラブルシューティング

### 主要ログファイル
- **実行ログ**: `data/current/execution-log.yaml`
- **アカウント状態**: `data/current/account-status.yaml`
- **投稿記録**: `data/current/today-posts.yaml`
- **戦略情報**: `data/current/active-strategy.yaml`

### 基本確認コマンド
```bash
# エラー確認
grep -i "error\|failed" data/current/execution-log.yaml

# 実行状況確認
tail -20 data/current/execution-log.yaml

# データサイズ確認
du -sh data/ && find data/ -size +1M -ls

# システムヘルスチェック
ps aux | grep -E "(node|pnpm)" | grep -v grep
```

### 主要な監視指標
- **実行成功率**: 90%以上を維持
- **API制限**: レート制限エラーの頻度監視
- **データサイズ**: current(1MB)、learning(10MB)の制限内維持

### よくあるエラーと対処法

#### API制限エラー
**症状**: `Rate limit exceeded`  
**対処**: 自動時間待機処理 + 手動確認 `grep "rate.limit" data/current/execution-log.yaml`

#### 投稿失敗
**症状**: X API投稿失敗  
**対処**: ログ確認 → 認証確認 → `pnpm dev`

#### システム異常
**症状**: 実行途中停止  
**対処**: プロセス確認 → 強制停止 `pkill -f "node.*main"` → `pnpm start`

#### データ破損
**症状**: YAML読み込みエラー  
**対処**: YAML検証 + アーカイブからの復元

### 緊急時対応
```bash
# 緊急停止
pkill -f "pnpm.*start" && pkill -f "node.*main"

# 緊急バックアップ
cp -r data/current data/emergency_backup_$(date +%Y%m%d_%H%M)

# 復旧
pnpm dev  # テスト実行で確認後
pnpm start  # 本格運用再開
```

## 6. 定期メンテナンス

### 日次タスク
```bash
# エラー・成功率確認
grep -c "success\|completed" data/current/execution-log.yaml
grep -c "error\|failed" data/current/execution-log.yaml

# データサイズチェック
du -sh data/ | awk '{print "Data size: " $1}'
```

### 週次タスク
```bash
# アーカイブ整理
find data/current/ -name "*.yaml" -mtime +7 -exec mv {} data/archives/ \;
mkdir -p data/archives/$(date +%Y-%m)
mv data/archives/*.yaml data/archives/$(date +%Y-%m)/ 2>/dev/null || true
```

### 月次タスク
```bash
# バックアップ作成
tar -czf backup_$(date +%Y%m).tar.gz data/
mv backup_*.tar.gz ~/trading_assistant_backups/
```

## 3. 🧠 Claude Code SDK 意思決定システム

### 自律実行フロー
```
[1] 現在状況分析 (account-status.yaml・active-strategy.yaml読み込み)
[2] アカウント成長段階判定 + 戦略選択
[3] データ収集実行 (選択されたCollector起動)
[4] コンテンツ生成 (選択された戦略でcontent-creator実行)
[5] 品質確認・投稿実行 (x-poster.ts)
[6] 結果記録・学習データ更新 (data/learning/)
```

### 3次元判断マトリクス
**優先順位**: 外部環境 > エンゲージメント状態 > 成長段階

```
[外部環境] 緊急対応 → 分析特化型 + 機会的投稿
[通常環境] → [エンゲージメント判断]
  ├── 低エンゲージメント → 集中特化段階強制 + トレンド対応強化
  ├── 安定エンゲージメント → 成長段階適用
  │   ├── 集中特化段階 → RSS集中 + 教育重視 + 定時投稿
  │   ├── 段階的拡張段階 → 複合収集 + バランス型 + 最適化投稿
  │   └── 多様化展開段階 → 戦略的収集 + 分析特化 + 機会的投稿
  └── 高エンゲージメント → 現在戦略維持 + 質的向上集中
```

### アカウント成長段階別戦略

#### 🌱 集中特化段階（0-1000フォロワー）
- **対象**: エンゲージメント低・テーマ分散時
- **戦略**: 投資基礎教育特化
- **実行**: RSS集中収集 + 教育重視型 + 定時投稿

#### 📈 段階的拡張段階（1000-5000フォロワー） 
- **対象**: 安定エンゲージメント時
- **戦略**: 核テーマ60% + 関連テーマ40%
- **実行**: 複合データ収集 + バランス型 + 最適化投稿

#### 🚀 多様化展開段階（5000+フォロワー）
- **対象**: 高エンゲージメント・複数実績時
- **戦略**: 動的戦略適用
- **実行**: 戦略的収集 + 分析特化型 + 機会的投稿

### フロー確認コマンド
```bash
# アカウント状態・戦略確認
cat data/current/account-status.yaml
cat data/current/active-strategy.yaml

# 戦略選択理由確認
grep "strategy_reason" data/current/execution-log.yaml | tail -5

# 学習データ更新確認
cat data/learning/post-insights.yaml | tail -5
grep "engagement_rate" data/learning/engagement-patterns.yaml | tail -10
```

### 意思決定品質KPI
- **戦略一貫性**: ブランドテーマとの適合度
- **実行成功率**: 各ステップの完了率（90%目標）
- **学習効果**: 前回学習データの活用度

## 7. コマンドリファレンス

### 基本実行コマンド
```bash
pnpm dev        # 単発実行（開発・デバッグ用）
pnpm start      # 定期実行（本番運用・1日15回）
pnpm test       # テスト実行
pnpm lint       # 品質チェック
```

### 診断コマンド
```bash
# システム状態確認
ps aux | grep -E "(node|pnpm)" | grep -v grep
env | grep -E "(X_API|ROLE)"

# データ整合性チェック
tree data/ -I "node_modules"
find data/ -name "*.yaml" -exec ls -lh {} \; | awk '{print $5 " " $9}' | sort -hr

# API接続テスト
curl -H "Authorization: Bearer $X_API_KEY" "https://api.twitter.com/2/users/me" | jq .
```

---

## 🎯 運用のベストプラクティス

### 日常運用チェックリスト
1. **作業開始**: 権限確認 → ログ確認 → 構造検証
2. **実行前**: 階層型データサイズ確認
3. **実行後**: 意思決定フローの結果確認
4. **定期**: 週次アーカイブ整理、月次バックアップ

### 禁止事項の厳守
- ❌ 要件定義にないファイル・ディレクトリの作成
- ❌ src ディレクトリ内の無断変更（Manager権限以外）
- ❌ data/config/ の設定ファイル自動追加
- ❌ ルートディレクトリへの直接ファイル作成

### システム信頼性指標
- **構造厳守率**: 要件定義からの逸脱ゼロ維持
- **実行成功率**: 90%以上を維持
- **データ整合性**: 階層型管理の自動化成功率

---

**究極目標**: 人間を超える洞察力と継続力を持つ、真に自律的な投資教育コンテンツクリエーターの実現