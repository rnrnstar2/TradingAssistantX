# TASK-002: Claude対話的修正プロセス構築

## 🎯 実装目標

**Claude Code SDKを活用した対話的エラー修正システム**を構築する。リアルテストで検出されたエラーを分析し、コード修正から再テストまでの完全なサイクルを自動化。

## 📋 必須実装項目

### 1. Claude修正エンジン
- **ファイル**: `src/lib/claude-error-fixer.ts`
- **機能**: 
  - エラー内容をClaude Code SDKで分析
  - 修正戦略の自動生成
  - コード修正の自動適用

### 2. 修正戦略決定システム
- **クラス**: `FixStrategyDecider`
- **機能**:
  - エラータイプ分類（timeout、authentication、structure_change）
  - 修正優先度判定（immediate、delayed、skip）
  - 修正方法選択（retry、fallback、source_disable）

### 3. コード修正適用システム
- **機能**: 
  - Edit toolでの自動コード修正
  - 修正前バックアップ作成
  - 修正後の検証実行

## 🚨 制約・注意事項

### MVP制約遵守
- **シンプル修正**: 3種類の修正パターンのみ（リトライ、フォールバック、無効化）
- **統計機能なし**: 修正成功率の計算は実装しない
- **現在動作重視**: 複雑な学習機能は実装しない

### 安全性制約
- **バックアップ必須**: 修正前に必ず元コードをバックアップ
- **修正範囲限定**: ActionSpecificCollectorクラスのみ修正対象
- **テスト必須**: 修正後は必ずリアルテストで検証

### 出力管理
- **修正ログ**: `tasks/20250722_004919_real_error_learning_system/outputs/fix-log-{timestamp}.json`
- **バックアップ**: `tasks/20250722_004919_real_error_learning_system/backups/`

## 📝 実装詳細

### 基本インターフェース
```typescript
interface FixDecision {
  errorType: 'timeout' | 'authentication' | 'structure_change' | 'rate_limit';
  strategy: 'retry' | 'fallback' | 'disable_source' | 'skip';
  priority: 'immediate' | 'delayed' | 'skip';
  reasoning: string;
  codeChanges?: {
    filePath: string;
    oldCode: string;
    newCode: string;
  }[];
}
```

### Claude分析プロンプト例
```typescript
const analysisPrompt = `
エラー分析：

ソース: ${sourceName}
エラー: ${errorMessage}
発生回数: ${errorCount}
最終発生: ${lastOccurred}

このエラーに対する最適な修正戦略を判定してください：
1. retry: 一時的エラー、リトライ戦略で解決
2. fallback: 代替手段に切り替え
3. disable_source: このソースを無効化
4. skip: 修正不要（正常な動作）

JSON形式で回答してください。
`;
```

### 修正パターン実装
1. **タイムアウトエラー**: タイムアウト時間を30秒→60秒に延長
2. **認証エラー**: このソースを一時的に無効化
3. **構造変更**: フォールバック機能を追加
4. **レート制限**: 遅延時間を追加

## ✅ 完了条件

1. Claude Code SDKでエラー分析が可能
2. 3種類の修正パターンがすべて実装済み
3. 修正前のバックアップシステム動作確認
4. 修正後のリアルテスト自動実行
5. 修正ログの適切な出力
6. TypeScript strict mode完全対応

## 🔗 関連ファイル

- 修正対象: `src/lib/action-specific-collector.ts`
- バックアップ先: `tasks/20250722_004919_real_error_learning_system/backups/`
- テスト実行: TASK-001の成果物を使用

## 📊 期待される効果

**完全自動修正サイクル**の実現：
1. リアルテスト実行
2. エラー検出
3. Claude分析
4. 自動修正
5. 再テスト実行
6. 修正効果確認

---

**実装品質**: MVP制約準拠、安全性重視
**実行時間**: 最大120分
**依存関係**: TASK-001完了後に開始