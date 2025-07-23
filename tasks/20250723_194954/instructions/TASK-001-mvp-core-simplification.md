# TASK-001: MVP コアシステム簡素化

## 🎯 目的
現在の複雑なClaudeAutonomousAgentを新しいMVP要件に合わせてシンプルに修正する

## 📋 実装対象
`src/core/claude-autonomous-agent.ts` の完全なMVP化

## 🚨 現状分析
現在のコードは「真の自律システム」という複雑な実装になっているが、新REQUIREMENTS.mdでは「シンプルで継続的な投稿システム」を目指している。

## ✅ MVP要件（REQUIREMENTS.md準拠）

### MVPの基本アクション（4つのみ）
1. **collect_data**: RSS等からデータ収集
2. **create_post**: 投稿作成と実行  
3. **analyze**: アカウント状況分析（フォロワー数のみ）
4. **wait**: 戦略的待機

### MVP判断基準（シンプル化）
- フォロワー数に基づく投稿頻度調整
- RSS データの有無による収集判断
- 前回投稿からの経過時間
- 基本的なエラーハンドリング

## 🔧 実装指示

### 1. クラス構造の簡素化
```typescript
export class ClaudeAutonomousAgent {
  private systemPrompt: string;
  
  constructor() {
    this.systemPrompt = this.buildSimpleSystemPrompt();
  }

  // MVPの4アクションのみを判定する簡単なメソッド
  async decideMVPAction(context: SystemContext): Promise<ClaudeAction> {
    // 複雑な履歴管理は削除
    // シンプルな条件分岐での判定
  }
}
```

### 2. 削除すべき複雑機能
- `conversationHistory` の複雑な履歴管理
- 複雑な意思決定ロジック
- 過度な抽象化
- 将来拡張を想定したオーバーエンジニアリング

### 3. MVPシステムプロンプト作成
新しいREQUIREMENTS.mdに基づいた簡素なプロンプト作成：
- 4つのアクションのみ
- シンプルな判断基準
- 継続的投稿システムの実現

### 4. 判定ロジック簡素化
複雑な機械学習的判定ではなく：
- 前回投稿時刻チェック
- フォロワー数による頻度調整
- RSS データ存在チェック
- 基本的な条件分岐

## 🚫 MVP制約（実装禁止）

### 過剰実装の禁止
- 複雑な学習機能
- 詳細なエンゲージメント分析
- 複数戦略の動的切替
- 高度な最適化アルゴリズム

### YAGNI原則遵守
- 将来の拡張性を考慮しない
- 現在必要な機能のみ実装
- 統計・分析機能は含まない
- シンプルさを最優先

## 📁 出力制約
- **プロダクションコード**: `src/core/claude-autonomous-agent.ts` のみ修正
- **出力禁止**: ルートディレクトリへの新規ファイル作成
- **テスト**: MVP機能の基本動作確認のみ

## 🎯 完了条件
1. claude-autonomous-agent.tsがMVP仕様に準拠
2. 4つのアクションのみの簡潔な実装
3. TypeScript strict モード通過
4. 基本的な動作確認完了

## 📋 実装後報告書
実装完了後、以下を作成：
`tasks/20250723_194954/reports/REPORT-001-mvp-core-simplification.md`

**報告内容**:
- 削除した複雑機能の一覧
- MVPアクション実装状況
- 簡素化によるコード行数削減結果
- 基本動作確認結果