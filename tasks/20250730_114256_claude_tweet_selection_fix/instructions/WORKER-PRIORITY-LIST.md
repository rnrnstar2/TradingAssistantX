# Worker権限 作業優先順位リスト

**Manager指示**: Claude ツイート選択機能の統合修正  
**作業期限**: 当日中  
**緊急度**: 高

---

## 🎯 **作業優先順位（上から順に実行）**

### 1. **型定義修正** ⚡ 最優先
**ファイル**: `src/claude/types.ts`  
**作業時間**: 10分  
**内容**: TweetCandidate型をKaitoAPI TweetDataと完全一致させる

```typescript
// impression_count を必須に変更
// in_reply_to_user_id, conversation_id を追加
```

### 2. **選択エンドポイント修正** ⚡ 高優先
**ファイル**: `src/claude/endpoints/selection-endpoint.ts`  
**作業時間**: 30分  
**内容**: 
- 型変換関数の追加
- エラーハンドリング強化
- author_id取得ロジックの統一

### 3. **ワークフロー統合** ⚡ 高優先  
**ファイル**: `src/workflows/main-workflow.ts`  
**作業時間**: 20分  
**内容**: 
- import文追加
- 実際の使用箇所での型安全性確保
- AccountInfo変換ロジック追加

### 4. **動作確認** ⚡ 必須
**実行**: `pnpm dev:like`  
**作業時間**: 15分  
**内容**: 実際の動作確認とログ検証

### 5. **エラーケーステスト** 🔧 重要
**実行**: Claude未認証状態でのテスト  
**作業時間**: 10分  
**内容**: フォールバック処理の確認

---

## ✅ **完了チェックリスト**

- [ ] `npm run typecheck` エラーゼロ
- [ ] `pnpm dev:like` でClaude選択動作
- [ ] 選択ログメッセージ表示確認
- [ ] フォールバック処理動作確認
- [ ] コードレビュー準備完了

---

## 🚨 **Worker権限での注意事項**

### 許可されている作業
- ✅ `src/` 配下のプロダクションコード編集
- ✅ `data/current/`, `data/learning/` への出力
- ✅ 実装・統合・テスト

### 禁止されている作業  
- ❌ `docs/` ディレクトリの編集
- ❌ `REQUIREMENTS.md` の変更
- ❌ 要件定義の変更

### エラー発生時の対応
1. **型エラー**: 技術仕様書を参照して修正
2. **実行エラー**: ログを確認してエラーハンドリング強化
3. **Claude認証エラー**: フォールバック処理の確認
4. **解決困難**: Manager権限に報告・相談

---

## 📋 **作業報告テンプレート**

```
## 作業完了報告

**作業内容**: Claude ツイート選択機能の統合修正
**所要時間**: XX分
**修正ファイル**: 
- src/claude/types.ts
- src/claude/endpoints/selection-endpoint.ts  
- src/workflows/main-workflow.ts

**動作確認結果**:
- [ ] 型チェック: OK/NG
- [ ] 実行テスト: OK/NG
- [ ] エラーケース: OK/NG

**問題・懸念事項**: 
- （なし or 具体的な問題）

**次回作業提案**:
- （なし or 改善提案）
```

---

**指示者**: Manager権限  
**実行**: Worker権限  
**レビュー**: Manager権限が実施