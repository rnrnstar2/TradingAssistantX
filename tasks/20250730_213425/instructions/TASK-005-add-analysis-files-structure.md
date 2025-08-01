# 深夜分析ファイル構造追加指示書

## タスク概要
directory-structure.mdに深夜分析（analyzeアクション）実装に必要なファイル構造を追加する。

## 修正対象ファイル
- docs/directory-structure.md

## 修正項目

### 1. src/claude/endpoints/配下への追加

#### 現状（38-40行目）
```
│   ├── endpoints/                     # 役割別エンドポイント (3ファイル)
│   │   ├── content-endpoint.ts        # コンテンツ生成: プロンプト+変数+GeneratedContent返却
│   │   └── selection-endpoint.ts      # 🆕 最適ツイート選択: プロンプト+変数+SelectedTweet返却
```

#### 修正後
```
│   ├── endpoints/                     # 役割別エンドポイント (3ファイル)
│   │   ├── content-endpoint.ts        # コンテンツ生成: プロンプト+変数+GeneratedContent返却
│   │   ├── selection-endpoint.ts      # 最適ツイート選択: プロンプト+変数+SelectedTweet返却
│   │   └── analysis-endpoint.ts       # 📊 深夜分析: プロンプト+変数+AnalysisResult返却（**※未実装**）
```

### 2. src/claude/prompts/templates/配下への追加

#### 現状（42-44行目）
```
│   │   ├── templates/                 # プロンプトテンプレート
│   │   │   ├── content.template.ts    # コンテンツ生成テンプレート
│   │   │   └── selection.template.ts  # 🆕 ツイート選択テンプレート
```

#### 修正後
```
│   │   ├── templates/                 # プロンプトテンプレート
│   │   │   ├── content.template.ts    # コンテンツ生成テンプレート
│   │   │   ├── selection.template.ts  # ツイート選択テンプレート
│   │   │   └── analysis.template.ts   # 📊 深夜分析テンプレート（**※未実装**）
```

### 3. src/claude/prompts/builders/配下への追加

#### 現状（45-48行目）
```
│   │   ├── builders/                  # プロンプトビルダー
│   │   │   ├── base-builder.ts        # 共通ビルダー（時間帯・曜日等）
│   │   │   ├── content-builder.ts     # コンテンツ用ビルダー
│   │   │   └── selection-builder.ts   # 🆕 ツイート選択用ビルダー
```

#### 修正後
```
│   │   ├── builders/                  # プロンプトビルダー
│   │   │   ├── base-builder.ts        # 共通ビルダー（時間帯・曜日等）
│   │   │   ├── content-builder.ts     # コンテンツ用ビルダー
│   │   │   ├── selection-builder.ts   # ツイート選択用ビルダー
│   │   │   └── analysis-builder.ts    # 📊 深夜分析用ビルダー（**※未実装**）
```

### 4. tests/claude/endpoints/配下への追加

#### 現状（107-108行目）
```
│   ├── endpoints/                    # エンドポイント別テスト (2ファイル)
│   │   ├── content-endpoint.test.ts     # コンテンツ生成エンドポイントテスト
```

#### 修正後
```
│   ├── endpoints/                    # エンドポイント別テスト (3ファイル)
│   │   ├── content-endpoint.test.ts     # コンテンツ生成エンドポイントテスト
│   │   ├── selection-endpoint.test.ts   # ツイート選択エンドポイントテスト
│   │   └── analysis-endpoint.test.ts    # 📊 深夜分析エンドポイントテスト（**※未実装**）
```

### 5. data/current/execution-YYYYMMDD-HHMM/claude-outputs/配下の修正

#### 追加項目
プロンプトログの保存先として、以下を追加：
```
│   │   │   └── analysis-prompt.yaml       # 深夜分析プロンプト（深夜分析時）
```

## 実装要件

### 注意事項
- 各ファイルに「**※未実装**」の表記を追加し、実装予定であることを明示
- 📊アイコンを使用して深夜分析関連ファイルを視覚的に識別可能にする
- コメント内のファイル数を正確に更新（3ファイル等）
- 🆕マークは削除（既存機能となるため）

### 確認事項
- ファイル構造の階層が正しいか
- 他のドキュメントとの整合性が保たれているか
- 未実装であることが明確に示されているか