/**
 * KaitoAPI Endpoints Index
 * 新しい構造（read-only/authenticated）のエンドポイント統一エクスポート
 */

// Read-only endpoints (APIキー認証のみ)
export * from './read-only';

// Authenticated endpoints (V2ログイン認証必須)
export * from './authenticated';