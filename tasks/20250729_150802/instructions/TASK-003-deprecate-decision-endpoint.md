# TASK-003: decision-endpointの非推奨化対応

## 🎯 タスク概要
`src/claude/endpoints/decision-endpoint.ts`を非推奨（deprecated）としてマークし、関連するインポートやテストへの影響を調査・修正する。

## 📚 必須読み込み
- `/Users/rnrnstar/github/TradingAssistantX/REQUIREMENTS.md` - MVP要件定義書を必ず読み込むこと
- `/Users/rnrnstar/github/TradingAssistantX/docs/claude.md` - Claude SDK仕様書を確認
- `/Users/rnrnstar/github/TradingAssistantX/src/claude/index.ts` - エクスポート構造を確認

## 🎯 実装詳細

### 1. 修正対象ファイル
- `src/claude/endpoints/decision-endpoint.ts` - 非推奨マークの追加
- `src/claude/index.ts` - エクスポートへのコメント追加
- 関連するテストファイル（存在する場合）

### 2. 主要な修正内容

#### 2.1 decision-endpoint.tsへの非推奨マーク追加
ファイルの冒頭にJSDocコメントを追加:
```typescript
/**
 * @deprecated このエンドポイントは使用されなくなりました。
 * 両実行モード（dev/スケジュール）でYAMLから事前決定されたアクションを使用するため、
 * Claude判断ステップは不要になりました。
 * 
 * 参照: docs/workflow.md, docs/claude.md
 * 
 * このファイルは互換性のために残されていますが、新規使用は推奨されません。
 */
```

#### 2.2 makeDecision関数への非推奨マーク
```typescript
/**
 * @deprecated 使用されなくなりました。YAMLから事前決定されたアクションを使用してください。
 */
export async function makeDecision(input: DecisionInput): Promise<ClaudeDecision> {
  // 既存の実装はそのまま残す
}
```

#### 2.3 index.tsのエクスポートへのコメント追加
```typescript
// Decision endpoint - DEPRECATED
// @deprecated 両実行モードでYAML事前決定アクションを使用するため非推奨
export { 
  makeDecision
} from './endpoints/decision-endpoint';
```

### 3. 調査タスク

#### 3.1 使用箇所の確認
以下のコマンドで`makeDecision`の使用箇所を確認:
- `grep -r "makeDecision" src/`
- `grep -r "makeDecision" tests/`

#### 3.2 影響範囲の記録
- 使用している箇所をリストアップ
- Worker1の修正で対応済みの箇所を確認
- その他の使用箇所があれば報告書に記載

### 4. テスト関連の対応

#### 4.1 decision-endpoint.test.tsの確認
テストファイルが存在する場合:
- テストファイルの冒頭に非推奨コメントを追加
- テストは削除せず、将来の参照のために残す
- スキップフラグの追加を検討

```typescript
/**
 * @deprecated decision-endpointが非推奨になったため、このテストも非推奨です。
 */
describe.skip('decision-endpoint (DEPRECATED)', () => {
  // 既存のテスト
});
```

### 5. 品質基準
- 非推奨マークが適切に追加されている
- 既存の機能は壊さない（互換性維持）
- 使用箇所の完全な調査と記録

## 📋 完了条件
- [ ] decision-endpoint.tsに非推奨マーク追加
- [ ] makeDecision関数に@deprecatedタグ追加
- [ ] index.tsのエクスポートにコメント追加
- [ ] 使用箇所の完全な調査
- [ ] テストファイルの適切な処理

## 🚫 制約事項
- ファイルやコードの削除は行わない（互換性維持）
- 既存の動作を変更しない
- 非推奨マークとコメントの追加のみ

## 📁 出力管理
- 修正ファイルは既存の場所にそのまま保存
- 報告書: `tasks/20250729_150802/reports/REPORT-003-deprecate-decision-endpoint.md`
- 使用箇所調査結果も報告書に含める