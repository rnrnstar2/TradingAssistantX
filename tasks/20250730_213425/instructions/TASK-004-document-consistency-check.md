# ドキュメント整合性確認・修正指示書

## タスク概要
deep-night-analysis.md修正後、他のドキュメント（workflow.md、directory-structure.md、claude.md）との整合性を確認し、必要に応じて修正する。

## 確認対象ファイル
1. docs/workflow.md
2. docs/directory-structure.md
3. docs/claude.md
4. docs/kaito-api.md（参照のみ）

## 確認・修正項目

### 1. workflow.mdの確認

#### 確認ポイント
- 125行目：「通常のアクション実行に加え、深夜分析を実行」の記述
- Step 4の記述（103-106行目）

#### 修正内容
```markdown
# 125行目の修正案
- **23:55**: analyzeアクション（深夜分析）を実行（**※未実装**）

# Step 4セクションの削除または修正
# 削除案：Step 4セクション全体を削除（analyzeは独立アクションのため）
# または
# 修正案：「analyzeアクションの詳細」として記述を変更
```

### 2. directory-structure.mdの確認

#### 確認ポイント
- 深夜分析関連のディレクトリ構造
- analysis-endpoint.tsへの言及（削除済みファイル）
- claude-outputs/prompts/配下のファイル名

#### 修正項目
- analysis-endpoint.tsへの言及があれば削除
- プロンプトログファイル名の確認（analysis-prompt.yamlが適切か）

### 3. claude.mdの確認

#### 確認ポイント
- 深夜分析（analyzePerformance）への言及
- analysis-endpoint.tsへの言及
- 実装状況の記述

#### 修正項目
- 「実装は保留中」の記述を確認
- analysis-endpoint.tsへの言及を削除
- analyzeアクションが未実装であることを明記

### 4. KaitoAPI整合性（kaito-api.md参照）

#### 確認ポイント
- deep-night-analysis.mdでの`getTweetsByIds`記述
- 正しいエンドポイント：`/twitter/tweets`

#### 修正内容
- すべての`getTweetsByIds`を`/twitter/tweets`エンドポイントに修正
- エンドポイントURL形式：`GET /twitter/tweets?tweet_ids=id1,id2,id3...`
- tweet.fieldsパラメータへの言及を削除（エンドポイントが自動で全メトリクス返却）

## 実装要件

### 修正の優先順位
1. **高優先度**: analyzeアクションの独立性を明確にする修正
2. **中優先度**: KaitoAPIエンドポイントの正確性
3. **低優先度**: 細かい表現の統一

### 修正時の注意事項
- 各ドキュメントの役割を尊重（概要説明 vs 詳細仕様）
- 未実装機能であることは必ず明記
- 過度な重複は避ける（詳細はdeep-night-analysis.md参照、など）

### 最終確認項目
- [ ] analyzeアクションが独立したアクションとして扱われているか
- [ ] KaitoAPIエンドポイントが正しく記載されているか
- [ ] 削除済みファイルへの言及がないか
- [ ] 実装状況（未実装）が明確か

## 報告書記載事項
- 修正したファイルと行番号
- 修正内容の要約
- 残存する矛盾点（もしあれば）
- 今後の推奨事項