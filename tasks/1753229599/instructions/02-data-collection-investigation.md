# データ収集層実装状況調査指示書

## 調査対象
`src/collectors/`ディレクトリ配下の以下のファイル：
- rss-collector.ts（RSS収集・MVP中核）
- playwright-account.ts（アカウント分析専用）
- base-collector.ts（基底クラス）
- その他のcollectorファイル

## 調査内容

### 1. 実装状況確認
各ファイルについて以下を確認：
- ファイルの存在有無
- 実装の完成度（0-100%）
- 主要機能の実装状況
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- 疎結合設計の実現状況（REQUIREMENTS.md 28-43行目）
- RSS Collector中心のMVP構成（REQUIREMENTS.md 105-123行目）
- アカウント分析の特別扱い（REQUIREMENTS.md 125-129行目）

### 3. 詳細調査項目

#### rss-collector.ts
- [ ] 主要金融メディアRSSフィードの収集機能
- [ ] Google News検索との連携（動的クエリ対応）
- [ ] 構造化データでの安定した情報品質確保
- [ ] CollectionResult型による統一インターフェース実装
- [ ] YAML設定によるソース選択・優先度制御

#### playwright-account.ts
- [ ] X API制限回避のためのPlaywright利用
- [ ] フォロワー数・エンゲージメント率の取得
- [ ] 認証対応
- [ ] 分析と収集の分離（一般情報収集には使用しない）

#### base-collector.ts
- [ ] 抽象クラスの設計
- [ ] 共通インターフェースの定義
- [ ] 疎結合設計の実現

### 4. 疎結合設計の検証
- [ ] 各Collectorが完全に独立して動作するか
- [ ] 相互依存がないか
- [ ] 新規Collector追加への影響が最小化されているか
- [ ] ActionSpecificCollectorによる動的データ収集戦略が実装されているか

### 5. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/data-collection-implementation-status.yaml`

```yaml
data_collection_status:
  rss_collector:
    exists: true/false
    completion_rate: 90  # パーセンテージ
    implemented_features:
      - 機能名: 実装状況説明
    missing_features:
      - 機能名: 理由
    decoupling_compliance: 完全/部分的/不十分
    requirements_compliance: 準拠/一部準拠/非準拠
    
  playwright_account:
    # 同様の構造
    api_consumption_prevention: true/false  # API消費を防いでいるか
    
  base_collector:
    # 同様の構造
    
  architecture_analysis:
    decoupling_level: 高/中/低
    extension_readiness: 優/良/可/不可
    issues:
      - 問題点
    
  overall_assessment:
    completion_rate: 75  # 全体の完成度
    mvp_readiness: true/false  # MVPとして動作可能か
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 6. 注意事項
- Worker権限で実行すること
- プロダクションコードの編集は禁止（読み取りのみ）
- 疎結合設計の検証を特に重視
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘