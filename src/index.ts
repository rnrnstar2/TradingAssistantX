/**
 * 共通初期化処理（必要最小限）
 */
export function initialize() {
  // 環境変数の基本チェック
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY is required');
  }
  
  // 基本的な初期化のみ
  console.log('🔧 システム初期化完了');
}

// エクスポート
export { MainWorkflow } from './workflows/main-workflow';
export { getConfig } from './shared/config';
export { DataManager } from './data/data-manager';