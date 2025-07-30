# TASK-001: SessionManager単体テスト実装

## 📋 タスク概要

**目的**: `src/kaito-api/core/session.ts`のSessionManagerクラスに対する包括的な単体テストの実装

**重要度**: 高（KaitoAPI認証システムの中核機能）

**実行方法**: 並列実行可能（他タスクと独立）

## 🎯 実装要件

### テストファイル作成
- **ファイルパス**: `tests/kaito-api/core/session-manager.test.ts`
- **フレームワーク**: Vitest + TypeScript
- **カバレッジ目標**: 90%以上

### テスト対象メソッド（全6メソッド）
1. `saveSession(loginResult: LoginResult): void`
2. `getValidCookie(): string | null`
3. `isSessionValid(): boolean`
4. `getSessionInfo(): SessionData | null`
5. `clearSession(): void`
6. `getSessionStats(): SessionStats`

## 📊 詳細テスト仕様

### 1. saveSession()テスト
```typescript
describe('saveSession', () => {
  // 正常系
  it('有効なLoginResultでセッションを正常保存')
  it('24時間の有効期限が正しく設定される')
  it('セッションIDが適切に生成される')
  it('userId情報が正しく保存される')
  
  // 異常系
  it('無効なLoginResult(success: false)でエラー')
  it('login_cookieが未定義の場合エラー')
  it('不正な形式のLoginResultでエラー')
  
  // 境界値
  it('最小限の有効データで保存成功')
  it('user_info未定義時のデフォルト処理')
});
```

### 2. getValidCookie()テスト
```typescript
describe('getValidCookie', () => {
  // 正常系
  it('有効期限内のセッションでcookieを返却')
  it('セッションが存在しない場合null返却')
  
  // 期限切れ処理
  it('期限切れセッションでnull回傘＋自動クリア')
  it('期限ギリギリのセッションで正常返却')
  
  // エッジケース
  it('セッション保存直後のcookie取得')
  it('複数回呼び出しでの一貫性')
});
```

### 3. isSessionValid()テスト
```typescript
describe('isSessionValid', () => {
  // 基本動作
  it('有効セッション存在時にtrue')
  it('セッション無し時にfalse')
  it('期限切れセッション時にfalse')
  
  // 内部ロジック確認
  it('getValidCookie()と結果が一致')
});
```

### 4. getSessionInfo()テスト
```typescript
describe('getSessionInfo', () => {
  // 正常系
  it('有効セッションの完全情報返却')
  it('返却データが元データのコピー（参照分離）')
  
  // 無効状態
  it('無効セッション時にnull返却')
  it('期限切れセッション時にnull返却')
  
  // データ整合性
  it('返却データの型・構造が正確')
  it('全必須フィールドが含まれている')
});
```

### 5. clearSession()テスト
```typescript
describe('clearSession', () => {
  // 基本動作
  it('セッションデータの完全削除')
  it('削除後の各種メソッドでnull/false返却')
  
  // 状態確認
  it('クリア前後の状態変化確認')
  it('既にクリア済み状態での重複実行')
  
  // ログ出力確認
  it('適切なログメッセージ出力')
});
```

### 6. getSessionStats()テスト
```typescript
describe('getSessionStats', () => {
  // セッション有り状態
  it('有効セッション時の統計情報返却')
  it('時間残量計算の正確性')
  it('expirse/AtのISO形式確認')
  
  // セッション無し状態
  it('セッション無し時のデフォルト値')
  
  // 時間計算
  it('期限ギリギリでの時間残量計算')
  it('負の値を0にクランプ')
});
```

## 🏗️ テスト実装構造

### インポート設定
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../../src/kaito-api/core/session';
import type { LoginResult, SessionData } from '../../../src/kaito-api/utils/types';
```

### モックデータ準備
```typescript
// 有効なLoginResultモック
const validLoginResult: LoginResult = {
  success: true,
  login_cookie: 'test_cookie_value_123',
  user_info: {
    id: 'test_user_123',
    username: 'testuser'
  }
};

// 無効なLoginResultモック
const invalidLoginResult: LoginResult = {
  success: false,
  error: 'Login failed'
};
```

### テスト環境設定
```typescript
describe('SessionManager', () => {
  let sessionManager: SessionManager;
  
  beforeEach(() => {
    // タイマーモック
    vi.useFakeTimers();
    sessionManager = new SessionManager();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
});
```

## ⚠️ 特別な考慮事項

### 1. 時間関連テスト
- `vi.useFakeTimers()`でタイマー制御
- `vi.advanceTimersByTime()`で時間経過シミュレーション
- 24時間（86400000ms）の期限切れテスト

### 2. ログ出力テスト
- `console.log`のスパイ化
- ログメッセージの内容確認
- ログ出力タイミングの検証

### 3. 参照分離テスト
- `getSessionInfo()`の返却データが元データへの参照でないことを確認
- オブジェクトの深いコピー動作検証

### 4. エラーハンドリング
- 各異常系でのthrow Error確認
- エラーメッセージの内容検証

## 📋 品質基準

### コード品質
- TypeScript strict mode準拠
- ESLint警告ゼロ
- 適切なJSDoc/コメント

### テスト品質
- 全メソッドの正常系・異常系・境界値テスト
- モック使用でのユニット性保証
- 実行時間の短縮（100ms以内/テスト）

### カバレッジ
- ライン: 90%以上
- ブランチ: 90%以上
- 関数: 100%

## 🚀 実装手順

1. **環境準備**: テストファイル作成、インポート設定
2. **モックデータ**: 各種LoginResult、SessionDataモック準備
3. **基本テスト**: 各メソッドの正常系テスト実装
4. **異常系テスト**: エラーケース、boundary conditions
5. **統合テスト**: メソッド間連携動作確認
6. **リファクタリング**: テストコードの最適化、重複排除

## 📊 最終確認項目

- [ ] 全6メソッドのテスト実装完了
- [ ] 正常系・異常系・境界値テスト実施
- [ ] TypeScript型安全性確保
- [ ] Vitestテスト実行で全Pass
- [ ] ESLintエラーゼロ
- [ ] テストカバレッジ90%以上達成

## 🔄 関連ファイル

- **実装対象**: `src/kaito-api/core/session.ts`
- **型定義**: `src/kaito-api/utils/types.ts`
- **テスト出力**: `tests/kaito-api/core/session-manager.test.ts`

## 💡 参考情報

REQUIREMENTS.mdの投資教育システムにおけるセッション管理は、長時間の自動実行での認証状態維持に重要な役割を果たしています。包括的なテストにより、24時間運用での信頼性を保証してください。