# 指示書：FXペルソナ設定とstrategy.yaml更新

## 🎯 ミッション概要
FXトレーダー向けのペルソナ設定を明確化し、strategy.yamlをFX特化の内容に更新する。将来的にFX関連システムの宣伝に活用することを見据えた戦略設定を行う。

## 📋 前提条件・制約
- **対象ファイル**: 
  - `/Users/rnrnstar/github/TradingAssistantX/data/config/strategy.yaml`
  - 新規作成: `/Users/rnrnstar/github/TradingAssistantX/docs/fx-persona.md`
- **背景**: ユーザーは自作のFX関連システムを将来的にXを通じて広めたい
- **品質基準**: FXトレーダーに特化した明確なペルソナとそれに対応した戦略設定

## 🔧 実装内容詳細

### 1. FXペルソナ文書の新規作成
`/Users/rnrnstar/github/TradingAssistantX/docs/fx-persona.md`を作成し、以下の内容を含める：

```markdown
# FXトレーダーペルソナ設定

## 🎯 ターゲットペルソナ

### プライマリペルソナ：FX中級トレーダー
- **経験年数**: 1-5年のFXトレード経験
- **特徴**:
  - テクニカル分析の基礎は理解している
  - より高度な戦略や手法を求めている
  - リスク管理の重要性を認識している
  - 自動売買システムに興味がある
- **悩み**:
  - 安定した利益を出せない
  - 感情的なトレードで損失を出す
  - 効率的な分析手法を探している
  - 信頼できる情報源が少ない

### セカンダリペルソナ：FX初心者
- **経験年数**: 0-1年
- **特徴**:
  - FXの基礎を学習中
  - デモトレードから実践への移行期
  - 情報過多で混乱している
- **悩み**:
  - どこから始めればいいかわからない
  - 専門用語が難しい
  - リスク管理の方法がわからない

## 📝 コンテンツ戦略

### トーン＆マナー
- **専門的だが親しみやすい**: 専門知識を分かりやすく解説
- **実践的**: 理論だけでなく実際のトレードに活かせる情報
- **正直で透明**: リスクも含めて正直に伝える
- **データドリブン**: 感覚ではなくデータに基づいた分析

### 価値提供の方向性
1. **実践的なFX分析手法**: チャート分析、ファンダメンタルズ分析
2. **リスク管理の重要性**: 資金管理、ポジションサイジング
3. **メンタルコントロール**: 感情的トレードの回避方法
4. **自動売買への導入**: システムトレードのメリット・デメリット
5. **市場の最新動向**: 重要な経済指標、中央銀行政策の影響

## 🚀 将来的な展開

### FXシステム宣伝への布石
- 自動売買の有効性について定期的に言及
- システムトレードの成功事例を紹介
- 感情を排除したトレードの重要性を強調
- 効率的な取引環境の必要性を訴求
```

### 2. strategy.yaml更新内容

以下の変更を実施：

1. **description更新**:
   - 現在: "独自性・専門性・予測重視の差別化戦略"
   - 変更: "FXトレーダー向け独自性・専門性・実践重視の差別化戦略"

2. **selection_weightsセクションの調整**:
   - FX関連キーワードの重視を追加コメントで明記
   - 各アクションでFX専門性を重視する旨を追記

3. **differentiation_strategiesの内容調整**:
   ```yaml
   differentiation_strategies:
     realtime_interpretation: true    # リアルタイムFX市場の独自解釈
     contrarian_views: true           # FX市場での逆張り・反常識視点
     data_driven_prediction: true     # FXチャート・データドリブン予測
     industry_insider: true           # FX業界内幕・本音暴露
     risk_warnings: true              # FXトレードの実践的リスク警告
     unique_frameworks: true          # 独自のFX分析フレームワーク
     behavioral_science: true         # FXトレーダー心理への科学的アプローチ
     prediction_verification: true    # FX市場予測とその検証
   ```

4. **content_toneセクション更新**:
   ```yaml
   content_tone: "FX専門的・実践的・挑戦的"
   complexity_level: "中〜高"
   controversial_topics: true
   fx_market_focus: true           # 新規追加
   practical_trading_tips: true    # 新規追加
   risk_management_emphasis: true  # 新規追加
   ```

5. **FX特化キーワード追加**（新セクション）:
   ```yaml
   # FX特化キーワード設定
   fx_keywords:
     primary:
       - "FX"
       - "為替"
       - "ドル円"
       - "ユーロドル"
       - "ポンド円"
     technical:
       - "テクニカル分析"
       - "ファンダメンタルズ"
       - "チャートパターン"
       - "インジケーター"
       - "サポートレジスタンス"
     risk_management:
       - "リスク管理"
       - "資金管理"
       - "損切り"
       - "利確"
       - "ポジションサイジング"
   ```

## 📝 実装手順
1. fx-persona.md文書を新規作成
2. strategy.yamlを読み込み、上記の更新を実施
3. 更新内容の整合性を確認
4. FX特化が明確になっているか検証

## ✅ 完了条件
- FXペルソナ文書が作成され、ターゲットが明確になっている
- strategy.yamlがFX特化の内容に更新されている
- 将来的なFXシステム宣伝への布石が含まれている

## 📋 報告書作成
実装完了後、`tasks/20250801_150706/reports/REPORT-004-fx-persona-strategy-setup.md`に以下を含む報告書を作成：
- 作成したペルソナ設定の要約
- strategy.yamlの更新内容詳細
- FX特化戦略の今後の展開提案