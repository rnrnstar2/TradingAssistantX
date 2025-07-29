/**
 * 共通初期化処理（必要最小限）
 */
export function initialize() {
  // 基本的な初期化のみ
  console.log('🔧 システム初期化完了');
}

// エクスポート
export { MainWorkflow } from './workflows/main-workflow';
export { getConfig } from './shared/config';
export { DataManager } from './shared/data-manager';