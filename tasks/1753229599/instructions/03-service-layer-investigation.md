# サービス層実装状況調査指示書

## 調査対象
`src/services/`ディレクトリ配下の以下のファイル：
- content-creator.ts（投稿生成）
- data-hierarchy-manager.ts（階層データ管理）
- performance-analyzer.ts（分析・評価）
- x-poster.ts（X投稿）
- その他のserviceファイル

## 調査内容

### 1. 実装状況確認
各ファイルについて以下を確認：
- ファイルの存在有無
- 実装の完成度（0-100%）
- 主要機能の実装状況
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- コンテンツ生成戦略（REQUIREMENTS.md 61-65行目）
- 階層型データ管理（3層構造）（REQUIREMENTS.md 45-50行目）
- 理想のワークフロー（REQUIREMENTS.md 131-140行目）

### 3. 詳細調査項目

#### content-creator.ts
- [ ] Claude Code SDKを中心とした投稿生成機能
- [ ] 教育重視型投稿の生成機能
- [ ] トレンド対応型投稿の生成機能
- [ ] 分析特化型投稿の生成機能
- [ ] 品質確保メカニズム

#### data-hierarchy-manager.ts
- [ ] ホットデータ（current/）の管理（1MB・7日・20ファイル上限）
- [ ] ウォームデータ（learning/）の管理（10MB・90日上限）
- [ ] コールドデータ（archives/）の管理（無制限・永続）
- [ ] 自動階層移動機能
- [ ] データ圧縮・インサイト抽出機能

#### performance-analyzer.ts
- [ ] エンゲージメント率の分析
- [ ] 投稿効果の測定
- [ ] 日次インサイト抽出
- [ ] 成長段階判定ロジック
- [ ] 学習データ更新機能

#### x-poster.ts
- [ ] X APIとの連携機能（月100件制限対応）
- [ ] 投稿タイミング戦略の実装
- [ ] 画像添付機能
- [ ] 投稿結果の保存
- [ ] エラーハンドリング

### 4. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/service-layer-implementation-status.yaml`

```yaml
service_layer_status:
  content_creator:
    exists: true/false
    completion_rate: 85  # パーセンテージ
    implemented_features:
      - 機能名: 実装状況説明
    missing_features:
      - 機能名: 理由
    claude_sdk_integration: 完全/部分的/未実装
    requirements_compliance: 準拠/一部準拠/非準拠
    
  data_hierarchy_manager:
    # 同様の構造
    data_limits_enforcement:
      current_limit: true/false  # 1MB・7日・20ファイル
      learning_limit: true/false  # 10MB・90日
      archive_unlimited: true/false
    
  performance_analyzer:
    # 同様の構造
    
  x_poster:
    # 同様の構造
    api_limit_handling: true/false  # 月100件制限対応
    
  overall_assessment:
    completion_rate: 80  # 全体の完成度
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 5. 注意事項
- Worker権限で実行すること
- プロダクションコードの編集は禁止（読み取りのみ）
- データ階層管理の制限違反を特にチェック
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘