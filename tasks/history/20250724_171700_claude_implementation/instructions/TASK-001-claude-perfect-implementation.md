# TASK-001: Claude Directory Perfect Implementation

## 📋 **実装概要**

**目的**: REQUIREMENTS.md完全準拠版のsrc/claudeディレクトリ実装
**重要性**: TradingAssistantX MVPの中核となるClaude SDK統合

## 🎯 **現状分析結果**

### 現在の構造問題
```
src/claude/ [現在: 9ファイル] → [REQUIREMENTS.md: 6ファイル]
├── endpoints/ ✅ 正しく実装済み (4ファイル)
│   ├── decision-endpoint.ts ✅
│   ├── content-endpoint.ts ✅ 
│   ├── analysis-endpoint.ts ✅
│   └── search-endpoint.ts ✅
├── types.ts ✅ 正しく実装済み
├── index.ts ✅ 正しく実装済み
├── content-generator.ts ❌ レガシー・削除対象
├── decision-engine.ts ❌ レガシー・削除対象
├── market-analyzer.ts ❌ レガシー・削除対象
├── performance-tracker.ts ❌ レガシー・削除対象
└── prompt-builder.ts ❌ レガシー・削除対象
```

### 重複機能の特定
- **decision-engine.ts** ⇔ **decision-endpoint.ts**: 判断機能が重複
- **content-generator.ts** ⇔ **content-endpoint.ts**: コンテンツ生成機能が重複
- **market-analyzer.ts** ⇔ **analysis-endpoint.ts**: 分析機能が重複

## 🚀 **実装作業指示**

### Phase 1: レガシーファイル完全削除

**削除対象ファイル** (必須実行):
```bash
# 以下のファイルを完全削除
rm src/claude/content-generator.ts
rm src/claude/decision-engine.ts  
rm src/claude/market-analyzer.ts
rm src/claude/performance-tracker.ts
rm src/claude/prompt-builder.ts
```

**削除理由**:
1. REQUIREMENTS.mdエンドポイント別設計に不適合
2. endpoints/配下の新実装と機能重複
3. 6ファイル構成への適合必須

### Phase 2: エンドポイント実装完全性検証

**検証対象**: `src/claude/endpoints/` 配下4ファイル

#### A. decision-endpoint.ts 完全性チェック
- [ ] `makeDecision(input: DecisionInput): Promise<ClaudeDecision>` 関数実装
- [ ] Claude SDK統合（@instantlyeasy/claude-code-sdk-ts）
- [ ] 基本制約チェック（日次投稿制限、システムヘルス）
- [ ] エラーハンドリング（失敗時は素直に待機）
- [ ] types.tsからの型インポート完全性

#### B. content-endpoint.ts 完全性チェック
- [ ] `generateContent(input: ContentInput): Promise<GeneratedContent>` 関数実装
- [ ] `generateQuoteComment()` 関数実装
- [ ] 投資教育コンテンツ生成特化
- [ ] 品質スコア計算機能
- [ ] エラーハンドリング完全性

#### C. analysis-endpoint.ts 完全性チェック
- [ ] `analyzePerformance()` 関数実装
- [ ] `analyzeMarketContext()` 関数実装
- [ ] `recordExecution()` 関数実装
- [ ] 学習データ生成機能
- [ ] パフォーマンスメトリクス算出

#### D. search-endpoint.ts 完全性チェック
- [ ] `generateSearchQuery()` 関数実装
- [ ] `generateRetweetQuery()` 関数実装
- [ ] `generateLikeQuery()` 関数実装
- [ ] `generateQuoteQuery()` 関数実装
- [ ] 目的別検索クエリ最適化

### Phase 3: types.ts 型安全性最適化

**必須実装**:
- エンドポイント別入力/出力型の完全性
- 型ガード関数の実装完全性
- SYSTEM_LIMITS定数の妥当性検証
- 既存コード互換性エイリアス

### Phase 4: index.ts エクスポート統合最適化

**エクスポート検証**:
- 4つのエンドポイント関数群
- 全型定義（入力型・出力型・補助型）
- 定数・ユーティリティ
- 型ガード関数

### Phase 5: 統合テスト・品質確認

**必須実行**:
```bash
# TypeScript型チェック
npm run typecheck

# Lint実行
npm run lint

# ビルド検証
npm run build
```

## 📊 **品質基準**

### 必須要件
- ✅ REQUIREMENTS.md 6ファイル構成完全準拠
- ✅ TypeScript strict モード対応
- ✅ エンドポイント別設計原則遵守
- ✅ Claude SDK統合完全性
- ✅ エラーハンドリング確実実装

### MVP制約遵守
- 🚫 過剰な抽象化禁止
- 🚫 統計・分析機能の過剰実装禁止
- ✅ 役割明確化重視（1エンドポイント = 1つの役割）
- ✅ 実際に使用するエンドポイントのみ実装

## 🔒 **実装制約**

### 技術制約
- **Claude SDK**: `@instantlyeasy/claude-code-sdk-ts` 使用必須
- **モデル**: `sonnet` 指定
- **タイムアウト**: 10-15秒程度
- **エラー処理**: 失敗時は素直に待機決定

### 設計制約
- **エンドポイント責任分離**: 各ファイル単一責任
- **型安全**: 厳密な入力/出力型定義
- **一貫性**: kaito-apiとのendpoints/構造統一
- **拡張性**: 新機能 = 新エンドポイント追加

## 🎯 **成功基準**

### 完了条件
1. ✅ src/claude/が正確に6ファイル構成
2. ✅ レガシーファイル完全削除
3. ✅ 全エンドポイント関数が正常動作
4. ✅ npm run typecheck パス
5. ✅ npm run lint パス
6. ✅ npm run build 成功

### 動作確認
- 各エンドポイント関数の正常呼び出し
- 型安全性の確保
- エラーハンドリングの適切性
- REQUIREMENTS.mdとの完全適合

## 💡 **実装優先度**

**最優先**: Phase 1 (レガシーファイル削除)
**必須**: Phase 2 (エンドポイント完全性検証)
**重要**: Phase 3-4 (型安全性・統合最適化)
**最終**: Phase 5 (品質確認・テスト)

## ⚠️ **注意事項**

### 削除時の注意
- git履歴は保持（`git rm`ではなく`rm`使用）
- 依存関係の事前確認
- バックアップは不要（エンドポイント版に移行済み）

### 品質保証
- 各Phase完了時点でTypeScript確認
- エラーは即座に修正
- 妥協なし・品質最優先

---

**重要**: この実装により、TradingAssistantX MVPの中核となるClaude SDK統合が完成します。REQUIREMENTS.md完全準拠版を確実に実現してください。