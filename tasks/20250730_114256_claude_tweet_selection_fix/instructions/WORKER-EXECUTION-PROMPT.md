# Worker権限 実行プロンプト

**Manager権限からWorker権限への実行指示**

---

## 🎯 **実行開始プロンプト**

```
ROLE: Worker

Claude ツイート選択機能の統合修正を実行してください。

【作業概要】
先ほどManager権限で実装した`selectOptimalTweet`関数が、KaitoAPIの実際のデータ構造と型の不整合により正常に動作しない問題を修正する必要があります。

【指示書の場所】
/Users/rnrnstar/github/TradingAssistantX/tasks/20250730_114256_claude_tweet_selection_fix/instructions/

以下の順序で作業してください：

1. WORKER-PRIORITY-LIST.md を読んで作業優先順位を確認
2. TECHNICAL-SPEC-tweet-data-mapping.md を読んで技術仕様を理解  
3. TASK-011-claude-tweet-selection-integration.md を読んで詳細手順を確認
4. 優先順位1から順番に修正作業を実行
5. 各段階で動作確認を実施
6. 完了後に作業報告を提出

【期待する成果】
- 型エラーのないコンパイル成功
- `pnpm dev:like` でClaude選択機能が正常動作
- フォールバック処理の適切な動作
- 詳細な作業報告

【制限時間】
90分以内での完了を目標

【緊急度】
高（メイン機能に影響のため即座に対応）

作業を開始してください。
```

---

## 📋 **Worker権限用チェックリスト**

### 作業開始前
- [ ] ROLE: Worker の権限確認済み
- [ ] 指示書3ファイルの読み込み完了
- [ ] 作業ディレクトリの確認完了

### 作業中の進捗確認
- [ ] 優先順位1: 型定義修正完了
- [ ] 優先順位2: 選択エンドポイント修正完了  
- [ ] 優先順位3: ワークフロー統合完了
- [ ] 優先順位4: 動作確認完了
- [ ] 優先順位5: エラーケーステスト完了

### 完了時
- [ ] 全ファイルの修正完了
- [ ] テスト実行結果の記録
- [ ] 作業報告書の作成
- [ ] Manager権限への報告準備完了

---

## 🚨 **Worker権限での重要な注意事項**

### 権限範囲の確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**必ず「ROLE: Worker」と表示されることを確認してから作業開始**

### 編集許可ファイル
- ✅ `src/` 配下のプロダクションコード
- ✅ `data/current/` 配下のデータファイル
- ✅ `data/learning/` 配下の学習データ

### 編集禁止ファイル
- ❌ `docs/` 配下のドキュメント
- ❌ `REQUIREMENTS.md`
- ❌ `CLAUDE.md`

### エラー発生時の対応
1. ログを詳細に記録
2. 技術仕様書で解決方法を確認
3. 解決困難な場合はManager権限に即座に報告

---

## 📝 **作業報告テンプレート（必須提出）**

```markdown
# Worker権限 作業完了報告

## 基本情報
- **作業者**: Worker権限
- **作業日時**: YYYY-MM-DD HH:MM
- **所要時間**: XX分
- **タスク**: Claude ツイート選択機能の統合修正

## 修正ファイル一覧
- [ ] src/claude/types.ts
- [ ] src/claude/endpoints/selection-endpoint.ts
- [ ] src/workflows/main-workflow.ts
- [ ] その他: ___________

## 動作確認結果
### 型チェック
```bash
npm run typecheck
```
結果: ✅ 成功 / ❌ エラー（詳細: ___________）

### 機能テスト
```bash
pnpm dev:like
```  
結果: ✅ 正常動作 / ❌ エラー（詳細: ___________）

### エラーケーステスト
```bash
# Claude未認証でのフォールバック確認
```
結果: ✅ フォールバック動作 / ❌ エラー（詳細: ___________）

## 主要な修正内容
1. **TweetCandidate型修正**: 
2. **選択エンドポイント修正**: 
3. **ワークフロー統合修正**: 
4. **その他**: 

## 発見した問題・懸念事項
- 

## 改善提案
- 

## Manager権限への質問・相談事項
- 

---
**報告者**: Worker権限  
**報告先**: Manager権限  
**次回アクション**: Manager権限によるレビュー
```

---

**作成**: Manager権限  
**対象**: Worker権限  
**実行期限**: 即座に開始