# TradingAssistantX 要件定義書

## 🎯 ビジョン

**KaitoTwitterAPI完全統合による多機能X最適化システム**
- 📝 **知識駆動型コンテンツ生成**: Claude Code SDKがX上のトレンド・エンゲージメント分析に基づいて最適化された投資教育コンテンツを生成
- 📊 **X完全データ統合**: KaitoTwitterAPIによるリアルタイム投稿・フォロワー・競合・トレンド情報の包括的分析
- 🔄 **多様なアクション戦略**: 投稿・リツイート・引用リツイート・いいね・返信を統合した戦略的エンゲージメント
- 📈 **包括的成長分析**: フォロワー増加率、エンゲージメント率、影響力指数の多角的分析
- 🎯 **インフルエンサー戦略**: 他アカウントとの戦略的エンゲージメントによる影響力拡大

**コア技術**: Claude Code SDK + KaitoTwitterAPI による完全自律的X成長戦略システム

## 💡 システムの現実的な目標

### X完全統合による価値提供の最大化
- **最適アクション頻度**: エンゲージメント分析による投稿・RT・いいね・返信の戦略的組み合わせ（1日10-20アクション）
- **影響力特化型アカウント**: 高エンゲージメント率 + フォロワー質維持によるアルゴリズム優位性の確保
- **X内完結型コンテンツ**: 他アカウント投稿分析 + リアルタイムトレンドによる関連性最大化コンテンツ生成
- **即座学習サイクル**: 全アクション効果の15分以内フィードバックによる戦略の高速進化

### KaitoTwitterAPI単独による完全X最適化システム
- **X内市場インテリジェンス**: 投資関連アカウントの投稿・議論から市場動向を自動抽出
- **多層エンゲージメント戦略**: 投稿・RT・引用RT・いいね・返信を統合した影響力最大化
- **フォロワー行動予測**: 詳細なフォロワー分析による最適アクションタイミング予測
- **競合インフルエンサー分析**: 同業界影響力アカウントとの差別化・協調戦略の自動策定

## 🏗️ システムアーキテクチャ

### MVP 30分間隔自動実行システム
**実用最優先・動作確実性重視設計**

```
30分間隔スケジューラー (CoreScheduler)
     ↓
データ確認・読み込み (DataManager)
     ↓ 
Claude判断・アクション決定 (DecisionEngine)
     ↓ 
アクション実行 (ActionExecutor + KaitoTwitterAPI)
     ↓
結果記録・学習データ更新 (DataManager)
     ↓
次回30分後実行待機
```

### アクション種別（5種類）
```
1. 投稿 (post): トピック決定→内容生成→投稿実行
2. リツイート (retweet): 検索→候補分析→RT実行
3. 引用リツイート (quote_tweet): 検索→Claude評価→引用コメント生成→実行
4. いいね (like): 検索→品質評価→いいね実行
5. 待機 (wait): 次回30分後まで待機
```

### ハイブリッドデータ管理システム
- **API取得データ**: アカウント状況・投稿履歴・エンゲージメント・フォロワー情報（リアルタイム）
- **ローカル学習データ**: Claude Code SDK判断履歴・成功パターン・エラー教訓（蓄積・共有）
- **メモリ内処理**: API取得データの高速処理、学習データとの統合分析

**統合データ活用方針**: 
- リアルタイムデータ（API）+ 学習データ（ローカル）= 賢い判断
- Claude Code SDK同士での知識共有・継続学習
- 200 QPS性能を活かした高速データ統合処理

## 🧠 Claude Code SDK の高度アクション

### MVP判断基準
**シンプルな条件分岐**
- フォロワー数に基づく投稿頻度調整
- KaitoTwitterAPIデータの有無による収集判断
- 前回投稿からの経過時間
- 基本的なエラーハンドリング

**即時実装可能な基本機能**:
- リアルタイムエンゲージメント基本分析
- KaitoTwitterAPIデータの自動統合
- Claude Code SDKによる戦略自動調整

### 多次元データドリブン判断基準
**AI統合アクション最適化条件**
- **統合エンゲージメント率**: 投稿・RT・いいね・返信全アクションの効果統合分析
- **影響力拡大速度**: フォロワー増加率 + リーチ拡大率による戦略動的調整
- **X内市場センチメント**: 投資関連アカウント投稿分析による市場動向把握とテーマ選択
- **競合インフルエンサー活動**: 同業界影響力アカウントとのエンゲージメント比較・差別化戦略
- **アクション組み合わせ最適化**: 投稿・RT・いいね・返信の最適な組み合わせとタイミングの学習

**KaitoTwitterAPI完全活用機能**:
- 200 QPS活用による即座の市場動向分析
- 投稿・RT・引用・いいね・返信の統合戦略自動実行
- フォロワー・競合・インフルエンサーの動的関係分析と戦略調整

## 🤖 Claude Code SDK の基本実装

### 学習統合型システム
```typescript
// src/claude/decision-engine.ts
export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;           // 投稿トピック
    searchQuery?: string;     // 検索クエリ
    content?: string;         // 生成内容
    targetTweetId?: string;   // 対象投稿ID
  };
  confidence: number;         // 確信度
  learning_applied: string[]; // 適用した過去の教訓
}

// MVP実装クラス（機能別分離）
export class DecisionEngine {
  // 30分間隔での判断実行
  async makeDecision(context: SystemContext): Promise<ClaudeDecision> {
    const currentData = await this.dataManager.loadCurrentContext();
    const learningData = await this.dataManager.loadLearningData();
    return await this.callClaude(this.buildDecisionPrompt(currentData, learningData));
  }
  
  // アクション判断プロンプト構築
  private buildDecisionPrompt(data: SystemContext, learning: LearningData): string
  
  // Claude応答の解析
  private parseDecision(response: string): ClaudeDecision
}
```

### MVP実行フロー（30分間隔）
```
[1] スケジューラー起動: 30分間隔での自動実行開始
[2] データ確認: src/dataディレクトリから学習データ・設定読み込み
[3] Claude判断: 現在状況+学習データに基づくアクション決定（JSON返却）
[4] アクション実行: switch文による5種類のアクション実行
[5] 結果記録: 実行結果の記録・学習データ更新
[6] 次回待機: 30分後の次回実行まで待機
```

### 学習データ活用例
```typescript
// 学習データの構造例
interface LearningData {
  decision_patterns: {
    situation: string;
    action_taken: string;
    result: "success" | "failure";
    engagement_rate: number;
    lesson: string;
  }[];
  
  success_strategies: {
    strategy: string;
    success_rate: number;
    best_times: string[];
    effective_topics: string[];
  }[];
  
  error_lessons: {
    error_type: string;
    context: string;
    solution: string;
    prevention: string;
  }[];
}

// Claudeへの拡張プロンプト例
const enhancedPrompt = `
現在の状況: ${liveData}

過去の成功パターン:
- 投資基礎テーマは朝9時の投稿で高エンゲージメント（3.2%）
- 市場解説は21時投稿で効果的（フォロワー+15%）

過去の失敗教訓:
- 複雑な専門用語使用時はエンゲージメント低下
- 連続投稿（3回以上）は逆効果

この知識を活用して次のアクションを決定してください：
{
  "action": "...",
  "reasoning": "...",
  "learning_applied": ["朝9時効果", "専門用語回避"]
}
`;
```

## 📋 MVPコア機能（実装優先）

### 基本フロー
**投稿内容でのアカウント構築が最重要課題**

1. **トピック決定**
   - Claudeが現在のアカウント状況と市場状況から最適な投稿テーマを選択
   - フォロワー数に基づく戦略調整（現在取得可能な唯一の指標）

2. **データ収集（KaitoTwitterAPI統合）**
   - KaitoTwitterAPIから投資関連データを直接取得
   - RSS収集は廃止、APIによるリアルタイムデータ活用

3. **投稿文章作成**
   - 収集データや既存知識から投稿内容を生成
   - アカウント構築に効果的な内容を重視

4. **投稿実行**
   - 作成した文章をX（Twitter）に投稿
   - 結果を記録し、次回の学習に活用

### KaitoTwitterAPIによる革新的機能実現
- **完全エンゲージメント可視化**: いいね・RT・返信・インプレッション数の詳細追跡とパターン分析
- **フォロワー行動分析**: フォロワーの投稿反応時間・興味分野・エンゲージメントパターンの詳細把握
- **競合インテリジェンス**: 同業界アカウントの投稿戦略・効果・フォロワー動向の包括分析
- **リアルタイム市場連動**: 金融市場の動きとX上の議論トレンドの即座連携
- **自動戦略進化**: 投稿効果の機械学習による戦略パラメータの自動最適化

### データドリブン成功指標（定量測定可能）
- **エンゲージメント率**: 目標3.5%以上（業界平均の2倍）
- **フォロワー増加率**: 月次10%成長の持続的達成
- **投稿効果指数**: いいね・RT・返信の統合スコアによる品質定量化
- **市場連動度**: KaitoTwitterAPI市場データと投稿タイミングの最適化効果測定
- **競合優位性**: 同業界アカウントとのエンゲージメント率比較での上位維持

## 🚨 MVP構成

### KaitoTwitterAPI統合実装
- **即時利用可能**: KaitoTwitterAPIによる高度な機能をMVPから活用
- **200 QPS対応**: 高速データ収集と分析
- **平均700msレスポンス**: リアルタイム性の高い処理

### KaitoTwitterAPI完全統合構成
- **統合データ収集（KaitoTwitterAPI単独）**:
  - ユーザープロフィール・フォロワー/フォロー分析
  - ツイート検索・詳細取得（リプライ、引用、RT）
  - トレンド・コミュニティ情報
  - 投資関連市場データ取得
- **投稿生成**: Claude Code SDKによる高品質コンテンツ作成
- **KaitoTwitterAPI投稿機能**:
  - ツイート投稿・返信・引用
  - 画像アップロード対応
  - いいね・リツイート機能
- **設定管理**: 最小限のYAML設定による制御

### データ収集の特徴（統合型）
- **KaitoTwitterAPI統合**: X上のリアルタイムデータ + 投資関連市場情報の統合取得
- **RSS収集廃止**: APIによる効率的データ取得に統一

### KaitoTwitterAPIの主要機能
- **ユーザー管理**: プロフィール取得、フォロワー/フォロー分析
- **ツイート操作**: 投稿・返信・引用・画像アップロード
- **データ取得**: 高度な検索、エンゲージメント詳細
- **パフォーマンス**: $0.15/1k tweets のコスト効率

### 成長分析機能
- **フォロワー分析**: 詳細なフォロワー情報とフォロー関係
- **エンゲージメント分析**: いいね、RT、返信の詳細データ
- **投稿最適化**: データに基づく投稿戦略の自動調整

## 🚀 基本的なワークフロー

1. **データ確認**: KaitoTwitterAPIからの統合データ取得（投資情報 + X分析データ）
2. **投稿判断**: Claude Code SDKによる投稿の必要性判断（JSON返却）
3. **コンテンツ作成**: 教育的価値の高い投稿内容の生成
4. **アクション実行**: 投稿・RT・いいね・返信の基本実行
5. **結果記録**: 基本的な成長状況の把握と記録

## 🎯 MVPの目標

### 基本的な目標
- **継続的な投稿**: 定期実行による安定した投稿
- **投稿品質**: 投資教育に役立つ内容
- **フォロワー成長**: 基本的な成長確認

### 期待する効果
- 投資初心者向けの有益なコンテンツ提供
- 定期投稿による信頼感の構築
- 基本的なアカウント成長

## 🌟 将来の拡張計画

### 段階的な改善
- より多様な情報源の追加
- 投稿形式の改善実験
- より詳細な分析機能

### 長期的な展望
- エンゲージメント詳細分析
- 複数テーマの対応
- より高度な投稿戦略

## 📁 ディレクトリ・ファイル構造

### ⚠️ MVP構造厳守の絶対原則
**動作確実性保証の根幹**: MVP機能別構造の厳格遵守
1. **機能別分離**: 各ディレクトリは明確な機能別責務
2. **30分間隔実行の確実性**: システムの根幹機能
3. **12ファイル構成の維持**: 不要な複雑化を避ける
4. **既存コード活用**: x-poster.tsなKaitoTwitterAPI統合機能を最大活用
5. **記載されたファイルのみ使用可能**: MVP構造逸脱は禁止

### ルートディレクトリ
```
TradingAssistantX/
├── src/         # ソースコード
├── data/        # YAML設定・データ
├── tests/       # テストコード
├── docs/        # ドキュメント
└── REQUIREMENTS.md
```

### /src ディレクトリ（MVP機能別分類版）
**19ファイル・6ディレクトリ構成 - 動作確実性優先設計（データ統合版）**

**🚀 MVP機能別責務分離**
```
src/
├── claude/                    # Claude Code SDK関連 (3ファイル)
│   ├── decision-engine.ts     # アクション決定エンジン
│   ├── content-generator.ts   # 投稿内容生成
│   └── post-analyzer.ts       # 投稿分析・品質評価
│
├── kaito-api/                 # KaitoTwitterAPI関連 (3ファイル)
│   ├── client.ts              # KaitoTwitterAPIクライアント
│   ├── search-engine.ts       # 投稿検索エンジン
│   └── action-executor.ts     # アクション実行統合
│
├── scheduler/                 # スケジュール制御 (2ファイル)
│   ├── core-scheduler.ts      # 30分間隔制御
│   └── main-loop.ts           # メイン実行ループ統合
│
├── data/                      # データ管理統合 (8ファイル)
│   ├── data-manager.ts        # データ管理クラス
│   ├── config/                # システム設定
│   │   └── api-config.yaml   # KaitoTwitterAPI認証設定
│   ├── learning/              # 学習データ（Claude判断材料）
│   │   ├── decision-patterns.yaml    # 過去の判断パターンと結果
│   │   ├── success-strategies.yaml   # 成功戦略の記録
│   │   └── action-results.yaml       # アクション結果履歴
│   └── context/               # 実行コンテキスト
│       ├── session-memory.yaml       # セッション間引き継ぎ
│       └── current-status.yaml       # 現在の実行状況
│
├── shared/                    # 共通機能 (3ファイル)
│   ├── types.ts               # 型定義統合
│   ├── config.ts              # 設定管理
│   └── logger.ts              # ログ管理
│
└── main.ts                    # システム起動スクリプト (1ファイル)
```

**🎯 MVP機能別分離の利点**:
- **Claude系集約**: AI判断機能の独立性・プロンプト管理統一
- **KaitoAPI系集約**: API通信機能統一・外部依存局所化
- **スケジュール系分離**: 実行制御の明確化・タイミング管理統一
- **実装効率**: 動作確実性優先・理解しやすい構造
- **保守性**: 問題箇所の特定容易・機能追加時の影響局所化
- **将来拡張**: Clean Architectureへの段階的移行可能

### データ管理統合方針
**src/data/ ディレクトリによる統合管理**
- データ管理クラス（data-manager.ts）とYAML設定ファイルを統合
- 学習データとシステム設定の一元管理
- プロジェクト構造の簡素化と管理効率向上

**統合データ管理方針**: 
- **API取得データ**: アカウント状況・投稿・エンゲージメント・フォロワー情報（リアルタイム）
- **ローカル学習データ**: Claude Code SDK判断結果・成功パターン・失敗教訓（蓄積型）
- **実行ログ**: tasks/outputs/配下への詳細ログ出力

## 🔒 ハルシネーション防止機構

### 許可された出力先（厳格制限）
```yaml
# 書き込み許可
allowed_paths:
  - src/data/learning/    # Claude Code SDK学習データ
  - src/data/context/     # 実行コンテキスト
  - tasks/outputs/        # 実行ログ

# 書き込み禁止（読み取り専用）
readonly_paths:
  - src/ (except src/data/learning/ and src/data/context/)
  - src/data/config/
  - tests/
  - docs/
```

### 実行前後の検証
1. 構造検証：要件定義と完全一致確認
2. 実行ログ記録：tasks/outputs/配下への出力のみ

### 禁止事項
- 要件定義にないファイル・ディレクトリ作成
- src/data/config/以外へのローカルデータ保存
- ルートディレクトリへの直接ファイル作成

---

## 🚨 実装時の教訓・過剰実装防止原則

### MVP開発の絶対原則（機能別分類版 - 2025-01-23更新）
- **要件定義外の機能は実装しない**: リソース制限、パフォーマンス監視などの「あったら良い」機能は避ける
- **動作確実性優先**: Clean Architecture < 動作するシステム
- **30分間隔実行の確実性**: システムの最重要機能
- **機能別ディレクトリ分離**: claude/、kaito-api/、scheduler/などの明確な責務分離
- **既存コード活用優先**: 新規作成より既存機能の最大活用

### 🚫 絶対に実装してはいけない過剰機能
- **実行監視機能**: ExecutionMonitor、HealthCheck、SystemResourceChecker
- **複雑なロック管理**: YAMLファイルベースのロック、PID追跡、プロセス監視
- **自動リカバリー機能**: 指数関数的バックオフ、システム自動修復、エラー分類
- **詳細メトリクス収集**: CPU/メモリ/ディスク監視、パフォーマンス分析
- **自動ファイル管理**: FileSizeMonitor、自動アーカイブ、データ階層移動
- **構造検証機能**: IntegrityChecker、命名規則検証、データ制限検証

### ✅ MVP機能別分類適合手法
- **claude/**: Claude関連機能の集約、シンプルなAPI呼び出し
- **kaito-api/**: KaitoTwitterAPI通信、既存x-poster.tsの最大活用
- **scheduler/**: 30分間隔実行制御、setIntervalによるシンプル実装
- **data/**: 学習データ管理、YAMLファイルの基本読み書き
- **shared/**: 共通機能の統合、重複排除
- **エラーハンドリング**: 基本的try-catch + コンソールログ、次回実行の継続保証

---

**MVPの目標**: 継続的で質の高い投資教育コンテンツの自動投稿システムの実現
