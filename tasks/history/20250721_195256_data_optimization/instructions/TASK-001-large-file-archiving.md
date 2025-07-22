# TASK-001: 大容量ファイル分割・アーカイブシステム実装

## 🎯 **実装目標**

Claude Code自律システムのコンテキスト圧迫を解決するため、大容量データファイルを効率的に分割・アーカイブし、最低限の現在データのみを残す

## 📋 **実装対象**

### **大容量問題ファイル**
1. **expanded-action-decisions.yaml** (860行) 🚨 **CRITICAL**
2. **account-analysis-data.yaml** (217行) ⚠️ **WARNING** 
3. **action-collection-strategies.yaml** (224行) ⚠️ **WARNING**

### **履歴データ混在ファイル**
4. **account-config.yaml** (97行) - performance_history 11エントリ分離
5. **metrics-history.yaml** (113行) - 重複タイムスタンプ整理

## ✅ **実装戦略**

### **Phase 1: アーカイブ構造準備**
```bash
# 新しいアーカイブ構造を作成
data/
├── archives/           # 新規作成
│   ├── decisions/      # expanded-action-decisions アーカイブ
│   ├── analysis/       # account-analysis-data アーカイブ  
│   ├── strategies/     # action-collection-strategies アーカイブ
│   └── performance/    # performance-history アーカイブ
└── current/           # 現在データのみ（Claude読み取り最適化）
```

### **Phase 2: 大容量ファイル分割実行**

#### **expanded-action-decisions.yaml 分割戦略**
```yaml
# 元ファイル（860行）を以下に分割:

# 1. data/current/current-decisions.yaml (30行以内)
- 最新3エントリのみ保持
- 直近24時間の決定データ
- Claude Code即座参照用

# 2. data/archives/decisions/2025-07-decisions.yaml
- 7月全履歴データ保持
- 月次アーカイブファイル
- 分析・振り返り用

# 3. data/templates/decision-patterns.yaml (新規)
- 決定パターンテンプレート
- 再利用可能なロジック定義
```

#### **account-analysis-data.yaml 分割戦略**
```yaml
# 元ファイル（217行）を以下に分割:

# 1. data/current/current-analysis.yaml (20行以内)
- 最新の分析結果のみ
- health_score, performance_trend等の現在値
- Claude Code意思決定用

# 2. data/archives/analysis/2025-07-analysis.yaml  
- 詳細履歴データ保持
- 月次分析トレンド記録
```

### **Phase 3: 履歴データ分離実行**

#### **account-config.yaml 最適化**
```yaml
# 現在のperformance_history 11エントリを分離:
# → data/archives/performance/account-performance-history.yaml

# account-config.yamlに残すもの（30行以内）:
account:
  username: rnrnstar
  user_id: ''
current_metrics:
  followers_count: 5
  health_score: 80
growth_targets:
  daily: 2
  weekly: 14
current_analysis:
  last_analysis: '最新のみ'
  health_score: 80
```

## 🔧 **実装手順**

### **Step 1: アーカイブディレクトリ作成**
```bash
mkdir -p data/archives/{decisions,analysis,strategies,performance}
mkdir -p data/current
mkdir -p data/templates
```

### **Step 2: 大容量ファイル分割処理**

1. **expanded-action-decisions.yaml 処理**
   ```bash
   # 元ファイルバックアップ
   cp data/expanded-action-decisions.yaml data/archives/decisions/expanded-action-decisions-backup.yaml
   
   # 最新3エントリ抽出→current-decisions.yaml作成
   # 残りデータ→月次アーカイブファイル作成
   # 元ファイル削除または空ファイル化
   ```

2. **account-analysis-data.yaml 処理**
   ```bash
   # 最新分析データのみ抽出
   # 履歴データを月次アーカイブに移動
   # 軽量化ファイル作成
   ```

3. **action-collection-strategies.yaml 処理**
   ```bash
   # アクティブ戦略のみ残す
   # 過去戦略をアーカイブに移動
   ```

### **Step 3: account-config.yaml 軽量化**
```bash
# performance_history分離
# current_metrics最新データのみ保持
# growth_targets基本設定のみ保持
```

### **Step 4: 整合性確認・検証**
```bash
# 元データの完全性確認
# 新しいファイル構造の動作確認  
# src/コードでの読み込みパス確認
```

## 🚨 **制約・注意事項**

### **出力管理規則**
- **承認された出力場所**: `tasks/20250721_195256_data_optimization/reports/`
- **報告書ファイル名**: `REPORT-001-large-file-archiving.md`
- **禁止**: ルートディレクトリへの一時ファイル作成

### **データ安全性**
- **バックアップ必須**: 分割前に全ファイルバックアップ
- **段階的実装**: 1ファイルずつ慎重に処理
- **動作確認**: 各段階での整合性確認

### **Claude Code最適化目標**
- **コンテキスト削減**: 860行→30行以内（▲96%削減）
- **読み込み効率**: 最低限データでの高速判断
- **履歴保持**: アーカイブによる完全履歴保持

## ✅ **完了基準**

1. **大容量ファイル分割**: 3ファイルが軽量化（各30行以内）
2. **アーカイブ完了**: 履歴データが適切にアーカイブ配置
3. **構造整合性**: 新構造でのシステム正常動作確認
4. **コンテキスト効率**: Claude読み取りデータが大幅軽量化
5. **完全性保証**: 元データの情報損失ゼロ

## 📊 **期待効果**

### **Claude Code効率向上**
- **メモリ使用**: 大幅削減（2,044行→推定300行以内）
- **判断速度**: 最低限情報での高速意思決定
- **コンテキスト最適化**: 関連データのみの集中読み込み

### **システム安定性**
- **ファイル読み込み**: 高速化
- **メンテナンス性**: アーカイブによる履歴管理改善
- **拡張性**: 新しいデータ追加時の構造対応

## 🎯 **実装優先度**

**最高**: expanded-action-decisions.yaml（860行→30行）
**高**: account-config.yaml performance_history分離
**中**: その他大容量ファイル処理

**成功指標**: Claude Code読み取り時のコンテキスト使用量80%以上削減

---

**重要**: この最適化により、Claude Code自律システムの判断精度・速度が大幅向上し、真の意味での効率的自動運用が実現されます。