REQUIREMENTS.md
この要件定義を実現したい。

あなたの役割はkaito apiの機能を実装すること。

  1. 認証システム (src/utils/twitter-api-auth.ts)

  - ✅ Login V2エンドポイント完全対応
  - ✅ TOTP（2段階認証）統合
  - ✅ WebShare プロキシ統合
  - ✅ 環境変数管理システム

  2. 投稿システム (src/services/x-poster.ts)

  - ✅ TwitterApiPoster クラス
  - ✅ create_tweet_v2 エンドポイント対応
  - ✅ 既存OAuth実装との併用可能
  - ✅ 開発/本番モード切り替え
まずはこの機能を移行して。

複数のワーカーを並列、直列を駆使しながら効率的に指揮して実現に向けて進めてください。
Worker にも REQUIREMENTS.md を読み込ませること。
指示書作成後、必ず Worker 向けプロンプトを出力して終了すること。
詳細はこれを確認。docs/roles/manager-role.md

REQUIREMENTS.md
この要件定義を実現したい。
この要件定義に向けて修正作業を進めてほしい。
現在他にも並列して修正作業が実行されている。
あなたは「src」の担当マネージャーです。
src/scripts/core-runner.tsのコード量が膨大になっている。機能をファイルに分割したい
が、MVPとして保守管理しやすいベストなファイル構成にしたい。REQUIREMENTS.mdのファイ
ル構成を変更する必要があるかも。　どのようにするのがベストだと思う？

