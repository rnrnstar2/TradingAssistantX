REQUIREMENTS.md
この要件定義を実現したい。

あなたの役割は以下の事項
docs/deep-night-analysis.mdこの実装を完璧にしてほしい。
MVPとして余計な実装をしないことを一番に考えて進めてほしい。

docs/directory-structure.md, docs/workflow.md, docs/kaito-api.md, docs/claude.md
これらのドキュメントの中で関連ファイルは必ず参照すること。

複数のワーカーを並列、直列を駆使しながら効率的に指揮して実現に向けて進めてください。
Worker にも 関連するドキュメントを読み込ませること。
指示書作成後、必ず Worker 向けプロンプトを出力して終了すること。
詳細はこれを確認。docs/roles/manager-role.md

```
docs/directory-structure.mdこのディレクトリ構造は完璧だと思う。だけどもっと改善点がありそう。
今回はconfigについて考えてほしい。
REQUIREMENTS.md, docs/README.md　の該当するドキュメントも全てチェックしてから考えること。
あなた自身でしっかり考えて、最適な構造を提案してほしい。
mvpとして最適なものを選択してね。
```


```
REQUIREMENTS.md
この要件定義を実現したい。

あなたの役割は pnpm devのワークフローを完璧にすること。
docs/directory-structure.md, docs/workflow.md, docs/kaito-api.md
これらのドキュメントを必要な際は必ず参照すること。
```

```
scriptsディレクトリを作成してそこに１つファイルを作成してほしい。
内容は私の投稿全てを取得して、data/currentディレクトリにpost.yamlを作成すること。
https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets
has_next_pageなどのレスポンスを見て全て取得できるようにすること。
20250801-1616などの日付と時間も正確に。
今までのデータをクリーンアップするので、一から作成していきたい。
MVPとして余計な実装をしないことを考えて進めてほしい。

docs/directory-structure.md, docs/workflow.md, docs/kaito-api.md, docs/claude.md
これらのドキュメントの中で関連ファイルは必ず参照すること。
現在の実装もチェックして、完璧なディレクトリとファイルを作成すること。
```