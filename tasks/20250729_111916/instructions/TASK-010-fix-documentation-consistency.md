# TASK-010: ドキュメント整合性の完全修正

## 🎯 タスク概要
すべてのドキュメントファイル間の矛盾点を解消し、最新の実装状態を正確に反映する

## 📋 修正内容

### 1. 環境変数記載の統一

#### docs/README.md の修正
```markdown
### 環境変数・機密情報の取り扱い

- **禁止事項**: 実際のAPIキー、パスワード、秘密鍵の記載
- **推奨形式**: プレースホルダー使用
  - Claude API: `CLAUDE_API_KEY=your_claude_api_key`
  - X (Twitter) 認証:
    - `X_USERNAME=your_twitter_username`
    - `X_PASSWORD=your_twitter_password`
    - `X_EMAIL=your_email_address`
    - `X_PROXY=your_proxy_url`
- **設定方法**: `.env`ファイルまたは環境変数として設定
```

#### docs/workflow.md の修正
```markdown
### 環境変数
```bash
# Claude API認証
CLAUDE_API_KEY=your_claude_api_key

# X (Twitter) 認証（Kaito API用）
X_USERNAME=your_twitter_username
X_PASSWORD=your_twitter_password
X_EMAIL=your_email_address
X_PROXY=your_proxy_url  # プロキシ設定（必要な場合）
```

**注意**: 
- 旧環境変数名（TWITTER_USERNAME等）は廃止
- X_で始まる新しい環境変数名を使用
- `.env`ファイルは自動的に読み込まれます（dotenv使用）
```

### 2. エントリーポイントの説明更新

#### docs/workflow.md に追加
```markdown
## エントリーポイント

### 開発用: pnpm dev
**ファイル**: `src/dev.ts`
**用途**: 単一実行、即座にワークフローを1回実行して終了
**特徴**: 
- 環境変数を`.env`ファイルから自動読み込み（dotenv.config()）
- MainWorkflowクラスを使用した4ステップ実行

```bash
pnpm dev
# → dotenv.config() → MainWorkflow.execute() → 終了
```

### 本番用: pnpm start
**ファイル**: `src/main.ts`  
**用途**: スケジュール実行、YAMLファイルに従って継続実行
**特徴**:
- 環境変数を`.env`ファイルから自動読み込み（dotenv.config()）
- TimeSchedulerによる時刻ベース実行

```bash
pnpm start
# → dotenv.config() → TimeScheduler.start() → 継続実行
# Ctrl+C で終了
```
```

### 3. KaitoApiClient初期化の説明追加

#### docs/workflow.md の「実装詳細」セクションに追加
```markdown
### 実装詳細

#### KaitoApiClient初期化
MainWorkflowクラスでは、KaitoApiClientを適切に初期化する必要があります：

```typescript
// 初回実行時の初期化処理
if (!this.kaitoClientInitialized) {
  const configManager = new KaitoAPIConfigManager();
  const apiConfig = await configManager.generateConfig('dev');
  
  this.kaitoClient = new KaitoApiClient();
  this.kaitoClient.initializeWithConfig(apiConfig);
  
  this.kaitoClientInitialized = true;
}
```

この初期化により、httpClientが正しく設定され、API通信が可能になります。
```

### 4. directory-structure.md の修正

#### ファイル末尾の改行追加
```markdown
## 今後の計画

### 次期改善予定
- TypeScript型定義の整合性改善
- テストカバレッジの向上

```
（最後に空行を追加）

#### レガシー構造の記載削除
main-workflows/の記載をすべて削除（既に削除済みのため）

### 5. 新しいファイル構造の反映

#### docs/directory-structure.md に追加
```markdown
## ⚙️ 設定ファイル
**プロジェクト設定とビルド構成**

```
TradingAssistantX/
├── package.json                      # Node.js依存関係とスクリプト
├── pnpm-lock.yaml                    # pnpm ロックファイル
├── pnpm-workspace.yaml               # pnpm ワークスペース設定
├── tsconfig.json                     # TypeScript設定
├── vitest.config.ts                  # Vitest テスト設定
├── vitest.setup.ts                   # Vitest セットアップ
├── eslint.config.js                  # ESLint設定
└── .env                              # 環境変数設定（Git管理外）
```

### 6. workflow.md のStep番号修正

スケジュール実行時の3ステップで、Step番号を正しく記載：
- Step 1: データ収集
- Step 2: アクション実行（事前決定）
- Step 3: 結果保存

手動実行時の4ステップ：
- Step 1: データ収集
- Step 2: アクション決定（Claude）
- Step 3: アクション実行
- Step 4: 結果保存

### 7. README.md に workflow.md の追加確認

既に追加済みなので変更不要

## ⚠️ 注意事項
- 実際のコードと一致するよう注意
- 環境変数名は X_ プレフィックスで統一
- dotenv.config() の使用を明記
- ファイル末尾には必ず改行を入れる

## 🔧 技術要件
- Markdownフォーマット
- 一貫性のある記述
- 最新の実装状態を反映

## 📂 成果物
- 更新: `docs/README.md`
- 更新: `docs/workflow.md`
- 更新: `docs/directory-structure.md`

## ✅ 完了条件
- [ ] 環境変数の記載が統一されている
- [ ] dotenv.config()の使用が記載されている
- [ ] KaitoApiClient初期化が説明されている
- [ ] ファイル末尾に改行がある
- [ ] すべての矛盾点が解消されている