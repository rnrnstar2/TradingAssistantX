1. システム起動 (autonomous-runner.ts)

  🚀 TradingAssistantX 動的スケジューリング自動システム起動
  ⏹️  停止方法: Ctrl+C または `pnpm stop`
  ⚡ 動的間隔スケジューリング実行中（ゴールデンタイム最適化）

  2. 動的スケジューリングループ

  - 基本間隔: 60分（1時間）
  - ゴールデンタイム短縮: 7,8,9,12,18,19,20,21時 → 30分間隔
  - 夜間延長: 23-5時 → 120分間隔
  - 制限範囲: 最小30分〜最大240分

  3. 各イテレーション実行内容

  Step A: Claude自律判断システム

  // 1. 現在状況の最小限把握
  getCurrentSituation() → {
    accountHealth: number,    // アカウント健全性スコア
    todayActions: number,     // 今日の投稿数
    availableTime: number,    // 次回最適投稿時間まで
    systemStatus: string      // システム状態
  }

  // 2. Claude AI による投稿判断
  requestClaudeDecision() → {
    action: 'original_post',  // 現在は投稿のみ対応
    reasoning: string,        // 判断理由
    confidence: number        // 信頼度(0.6-0.9)
  }

  Step B: 投稿実行フロー

  // 1. オリジナルコンテンツ生成
  executeOriginalPost() → {
    // Claude AI による教育的投資コンテンツ作成
    // - 280文字以内
    // - ハッシュタグ適切使用
    // - 初心者向けわかりやすさ
  }

  // 2. 実行データ保存
  saveOriginalPostExecution() → {
    // data/daily-action-data.yaml に保存
    // originalContentパラメータ含む完全ログ
  }

  4. キャッシュ最適化システム

  - アカウント情報: 5分間キャッシュ（重複実行防止）
  - 重複リクエスト検出: EventEmitter による並列制御
  - ファイルサイズ監視: 30分間隔での自動監視

  5. エラーハンドリング

  - 投稿失敗時: フォールバックコンテンツで継続
  - システムエラー: data/context/error-log.yaml に記録
  - 実行履歴: data/context/execution-history.yaml で追跡

  6. 出力ファイル構造

  data/
  ├── daily-action-data.yaml     # 投稿実行ログ（最新100件）
  ├── context/
  │   ├── execution-history.yaml # 実行履歴（最新50件）
  │   └── error-log.yaml         # エラーログ（最新50件）
  └── posting-history.yaml       # 投稿履歴

  7. システム停止処理

  - Ctrl+C: 現在実行中処理の完了待機（最大30秒）
  - 強制終了: タイムアウト時の安全な終了

  要約: 現在は投稿専用の簡素化ワークフローで、Claude
  AIが状況判断→コンテンツ生成→自動投稿を動的間隔で繰り返し実行する仕組みです。