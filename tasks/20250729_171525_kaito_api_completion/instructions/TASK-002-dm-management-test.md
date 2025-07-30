# TASK-002: DirectMessageManagement単体テスト実装

## 📋 タスク概要

**目的**: `src/kaito-api/endpoints/authenticated/dm.ts`のDirectMessageManagementクラスに対する包括的な単体テストの実装

**重要度**: 高（V2ログイン認証必須のDM送信機能）

**実行方法**: 並列実行可能（他タスクと独立）

## 🎯 実装要件

### テストファイル作成
- **ファイルパス**: `tests/kaito-api/endpoints/authenticated/dm-management.test.ts`
- **フレームワーク**: Vitest + TypeScript
- **カバレッジ目標**: 90%以上

### テスト対象構造（325行の実装）
- **Public Method**: `sendDirectMessage(request: DirectMessageRequest): Promise<DirectMessageResponse>`
- **Private Methods**: バリデーション、セキュリティチェック、レスポンス処理、エラーハンドリング
- **全体テスト**: 統合フロー、認証連携、レート制限対応

## 📊 詳細テスト仕様

### 1. sendDirectMessage() メインフロー
```typescript
describe('sendDirectMessage', () => {
  // 正常系フロー
  it('有効なリクエストでDM送信成功')
  it('V2認証 → バリデーション → セキュリティチェック → API実行の完全フロー')
  it('メディア添付付きDM送信成功')
  it('最大文字数(10000文字)のDM送信成功')
  
  // 認証エラー系
  it('V2ログイン未実行時の認証エラー')
  it('login_cookie期限切れ時の認証エラー')
  it('無効なlogin_cookieでの認証エラー')
  
  // バリデーションエラー系
  it('recipientId未指定時のバリデーションエラー')
  it('text未指定時のバリデーションエラー')
  it('不正なrecipientId形式でバリデーションエラー')
  it('文字数制限超過(10001文字)でバリデーションエラー')
  it('無効なmediaIds配列でバリデーションエラー')
  
  // セキュリティチェックエラー系
  it('繰り返し文字過多でセキュリティエラー')
  it('絵文字過多(21個以上)でセキュリティエラー')
  it('疑わしいURL短縮サービスでセキュリティエラー')
  it('過度な大文字使用でセキュリティエラー')
  
  // APIエラー系
  it('レート制限(429)エラーの適切な処理')
  it('認証失敗(401)エラーの適切な処理')
  it('権限不足(403)エラーの適切な処理')
  it('受信者不明(404)エラーの適切な処理')
  it('ネットワークエラー(ENOTFOUND)の適切な処理')
});
```

### 2. 入力バリデーション（validateDirectMessageInput）
```typescript
describe('DirectMessage Input Validation', () => {
  // recipientIdバリデーション
  it('有効なrecipientId(数字文字列)で成功')
  it('recipientId未指定でエラー')
  it('recipientIdが非文字列でエラー')
  it('recipientIdに英字含む場合エラー')
  it('recipientIdが空文字列でエラー')
  
  // textバリデーション
  it('有効なtext(1-10000文字)で成功')
  it('text未指定でエラー')
  it('textが非文字列でエラー')
  it('textが空文字列でエラー')
  it('text=1文字で成功（境界値）')
  it('text=10000文字で成功（境界値）')
  it('text=10001文字でエラー（境界値）')
  
  // mediaIdsバリデーション（オプション）
  it('mediaIds未指定（undefined）で成功')
  it('有効なmediaIds配列([\"123\", \"456\"])で成功')
  it('mediaIdsが非配列でエラー')
  it('mediaIds=5個以上でエラー（上限4個）')
  it('mediaIds=4個で成功（境界値）')
  it('mediaIdsに非文字列要素でエラー')
  it('mediaIdsに英字含む要素でエラー')
  
  // 複合バリデーション
  it('複数エラー同時発生時の全エラー報告')
  it('最小有効データ(recipientId + text)で成功')
  it('最大有効データ(全オプション含む)で成功')
});
```

### 3. セキュリティチェック（performSecurityCheck）
```typescript
describe('Security Check', () => {
  // 繰り返し文字検出
  it('正常なテキストでセキュリティチェック通過')
  it('11文字以上の繰り返し文字(aaaaaaaaaaaa)で検出')
  it('10文字以下の繰り返し文字で通過')
  it('複数の繰り返しパターンで検出')
  
  // 絵文字過度使用検出
  it('20個以下の絵文字で通過')
  it('21個以上の絵文字で検出')
  it('20個ちょうどの絵文字で通過（境界値）')
  it('異なる種類の絵文字でのカウント')
  
  // 疑わしいURL検出
  it('通常のURLで通過')
  it('bit.ly URLで検出')
  it('tinyurl URLで検出')
  it('short URLで検出')
  it('大文字小文字混在(BIT.LY)で検出')
  
  // 大文字過度使用検出
  it('通常の大文字小文字混在で通過')
  it('70%以上大文字かつ20文字以上で検出')
  it('70%以上大文字でも20文字以下で通過')
  it('70%未満大文字で長文でも通過')
  
  // 複合セキュリティチェック
  it('複数セキュリティ違反同時発生での全違反報告')
  it('ボーダーライン組み合わせテスト')
});
```

### 4. レスポンス処理（processDirectMessageResponse）
```typescript
describe('Response Processing', () => {
  // 成功レスポンス処理
  it('標準的な成功レスポンスの正規化')
  it('messageIdとcreatedAtの正しい抽出')
  it('APIレスポンス構造の変化への対応')
  
  // エラーレスポンス処理
  it('errors配列含むレスポンスの処理')
  it('エラーメッセージの適切な抽出')
  it('複数エラー時の最初エラー使用')
  
  // 不正レスポンス処理
  it('不明な形式レスポンスでの適切なエラー')
  it('空レスポンスでの処理')
  it('nullレスポンスでの処理')
});
```

### 5. V2APIエラーハンドリング（handleV2APIError）
```typescript
describe('V2 API Error Handling', () => {
  // HTTPステータスコード別処理
  it('429(Rate Limit)エラーの適切な処理とリセット時刻表示')
  it('401(Unauthorized)エラーの適切な処理')
  it('403(Forbidden)エラーの適切な処理')
  it('404(Not Found)エラーの適切な処理')
  
  // ネットワークエラー処理
  it('ENOTFOUND(DNS解決失敗)エラーの処理')
  it('ECONNREFUSED(接続拒否)エラーの処理')
  
  // login_cookie関連エラー
  it('login_cookie期限切れエラーの処理')
  it('login_cookie形式エラーの処理')
  
  // 一般エラー処理
  it('不明なエラーでのデフォルト処理')
  it('errorオブジェクト構造の多様性への対応')
  it('エラーメッセージ抽出の優先順位確認')
});
```

## 🏗️ テスト実装構造

### インポート設定
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectMessageManagement } from '../../../../src/kaito-api/endpoints/authenticated/dm';
import type { 
  DirectMessageRequest, 
  DirectMessageResponse,
  HttpClient 
} from '../../../../src/kaito-api/utils/types';
import type { AuthManager } from '../../../../src/kaito-api/core/auth-manager';
```

### モック設定
```typescript
// HttpClientモック
const mockHttpClient: HttpClient = {
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

// AuthManagerモック
const mockAuthManager: AuthManager = {
  getUserSession: vi.fn(),
  getAuthHeaders: vi.fn(),
  isAuthenticated: vi.fn()
} as any;

// 有効なDMリクエストモック
const validDMRequest: DirectMessageRequest = {
  recipientId: '1234567890',
  text: 'テストメッセージです。',
  mediaIds: ['media123', 'media456']
};
```

### テスト環境設定
```typescript
describe('DirectMessageManagement', () => {
  let dmManagement: DirectMessageManagement;
  
  beforeEach(() => {
    vi.clearAllMocks();
    dmManagement = new DirectMessageManagement(mockHttpClient, mockAuthManager);
    
    // デフォルトの認証成功設定
    (mockAuthManager.getUserSession as any).mockReturnValue('valid_login_cookie');
  });
});
```

## ⚠️ 特別な考慮事項

### 1. V2認証テスト
- `mockAuthManager.getUserSession()`の各種返却値テスト
- 認証成功/失敗/期限切れの各シナリオ

### 2. 非同期処理テスト
- `async/await`での適切なPromise処理
- エラー時のPromise rejection確認

### 3. プライベートメソッドテスト
- パブリックメソッド経由での間接テスト
- テスト可能性を保ちつつユニット性維持

### 4. モックの詳細制御
- `mockHttpClient.post`の返却値細かい制御
- エラーレスポンスの多様なパターン模擬

### 5. セキュリティテスト
- 実際の攻撃パターンを考慮したテストケース
- Unicode文字、特殊文字の適切な処理確認

## 📋 品質基準

### コード品質
- TypeScript strict mode準拠
- ESLint警告ゼロ
- 適切なJSDoc/コメント

### テスト品質
- 全てのpublic/privateメソッドロジックカバー
- V2認証フロー完全再現
- 実際のAPIエラーパターン網羅

### カバレッジ
- ライン: 90%以上
- ブランチ: 90%以上  
- 関数: 100%
- 特にエラーハンドリング分岐の完全カバー

## 🚀 実装手順

1. **環境準備**: テストファイル作成、モック設定
2. **正常系実装**: 基本的なDM送信成功フローテスト
3. **認証系実装**: V2ログイン認証関連の全パターンテスト
4. **バリデーション系実装**: 入力検証の全パターンテスト  
5. **セキュリティ系実装**: セキュリティチェックの全パターンテスト
6. **エラー系実装**: API/ネットワークエラーの全パターンテスト
7. **統合テスト**: 複合エラー、エッジケース、境界値テスト
8. **リファクタリング**: テストコードの最適化、重複排除

## 📊 最終確認項目

- [ ] sendDirectMessage()の全フローテスト完了
- [ ] 入力バリデーション全パターンテスト完了
- [ ] セキュリティチェック全パターンテスト完了
- [ ] エラーハンドリング全パターンテスト完了
- [ ] V2認証連携テスト完了
- [ ] TypeScript型安全性確保
- [ ] Vitestテスト実行で全Pass
- [ ] ESLintエラーゼロ
- [ ] テストカバレッジ90%以上達成

## 🔄 関連ファイル

- **実装対象**: `src/kaito-api/endpoints/authenticated/dm.ts` (325行)
- **型定義**: `src/kaito-api/endpoints/authenticated/types.ts`
- **依存関係**: `src/kaito-api/core/auth-manager.ts`
- **テスト出力**: `tests/kaito-api/endpoints/authenticated/dm-management.test.ts`

## 💡 参考情報

REQUIREMENTS.mdの投資教育システムにおいて、DM機能は教育者との直接コミュニケーションチャネルとして重要です。V2ログイン認証が必要な高度な機能のため、セキュリティとエラーハンドリングの包括的なテストが特に重要です。

特に、実際の投資教育運用では大量のDM送信が想定されるため、レート制限処理とセキュリティチェックの確実な動作が必要です。