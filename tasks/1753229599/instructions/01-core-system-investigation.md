# コアシステム層実装状況調査指示書

## 調査対象
`src/core/`ディレクトリ配下の以下のファイル：
- autonomous-executor.ts（自律実行エンジン）
- decision-engine.ts（意思決定エンジン）
- loop-manager.ts（ループ管理）
- true-autonomous-workflow.ts（存在する場合）

## 調査内容

### 1. 実装状況確認
各ファイルについて以下を確認：
- ファイルの存在有無
- 実装の完成度（0-100%）
- 主要機能の実装状況
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- 自律実行フローの実装状況（REQUIREMENTS.md 92-98行目）
- 意思決定カタログの実装状況（REQUIREMENTS.md 51-98行目）
- Claude Code SDK中心の設計になっているか

### 3. 詳細調査項目

#### autonomous-executor.ts
- [ ] 1日15回の定時実行機能の実装
- [ ] 状況分析と戦略選択の自動化
- [ ] データ収集から投稿までの一連のフロー制御

#### decision-engine.ts
- [ ] 3次元判断マトリクスの実装（REQUIREMENTS.md 76-88行目）
- [ ] アカウント成長段階判定ロジック
- [ ] 戦略選択アルゴリズム

#### loop-manager.ts
- [ ] 継続的実行管理
- [ ] エラーハンドリングとリトライ機能
- [ ] 実行ログとモニタリング

### 4. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/core-system-implementation-status.yaml`

```yaml
core_system_status:
  autonomous_executor:
    exists: true/false
    completion_rate: 85  # パーセンテージ
    implemented_features:
      - 機能名: 実装状況説明
    missing_features:
      - 機能名: 理由
    requirements_compliance: 準拠/一部準拠/非準拠
    
  decision_engine:
    # 同様の構造
    
  loop_manager:
    # 同様の構造
    
  overall_assessment:
    completion_rate: 70  # 全体の完成度
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 5. 注意事項
- Worker権限で実行すること
- プロダクションコードの編集は禁止（読み取りのみ）
- 発見した問題点は具体的に記載
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘