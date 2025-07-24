#!/usr/bin/env node
/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TradingAssistantX 開発用実行スクリプト
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 目的:
 * 開発・デバッグ用途で30分間隔を待たずに即座にメインワークフローを1回実行
 * 
 * 🔄 実行内容:
 * main.tsと同じ4ステップワークフローを1回だけ実行:
 * 1. データ読み込み → 2. Claude判断 → 3. アクション実行 → 4. 結果記録
 * 
 * 💻 使用方法:
 * ```bash
 * # 開発用1回実行
 * pnpm dev
 * # または直接実行
 * tsx src/dev.ts
 * ```
 */

import 'dotenv/config';
import { getConfig } from './shared/config';
import { systemLogger } from './shared/logger';
import { ComponentContainer } from './shared/component-container';

// メインワークフロークラス群（main.tsと同じ）
import { SystemLifecycle } from './main-workflows/system-lifecycle';
import { ExecutionFlow } from './main-workflows/execution-flow';

/**
 * 開発用実行クラス
 * main.tsのTradingAssistantXクラスからスケジューラー機能を除いた版
 */
class DevRunner {
  private container: ComponentContainer;
  private systemLifecycle: SystemLifecycle;
  private executionFlow: ExecutionFlow;

  constructor() {
    const config = getConfig();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 【初期化】main.tsと同じ初期化プロセス（スケジューラー以外）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    this.container = new ComponentContainer();
    this.systemLifecycle = new SystemLifecycle(this.container);
    this.container = this.systemLifecycle.initializeComponents(config);
    this.executionFlow = new ExecutionFlow(this.container);
    
    systemLogger.info('DevRunner initialized - 開発用1回実行版');
  }

  /**
   * 1回だけのメインワークフロー実行
   * main.tsのstart()からスケジューラー部分を除いた版
   */
  async executeOnce(): Promise<void> {
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 【ステップ1】システム起動（main.tsと同じ）
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      systemLogger.info('🚀 開発用1回実行開始');
      await this.systemLifecycle.startSystem();
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 【ステップ2】メインワークフロー1回実行（スケジューラーなし）
      // main.tsでは30分毎に自動実行されるが、ここでは1回だけ
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const result = await this.executionFlow.executeMainLoop();
      
      if (result.success) {
        systemLogger.success(`✅ 開発用1回実行完了: ${result.action} (${result.executionTime}ms)`);
      } else {
        systemLogger.error(`❌ 開発用1回実行失敗: ${result.error}`);
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 【ステップ3】システム終了（クリーンアップ）
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await this.systemLifecycle.stopSystem();
      systemLogger.info('🏁 開発用1回実行終了');
      
    } catch (error) {
      systemLogger.error('🚨 開発用1回実行エラー:', error);
      
      // エラー時もクリーンアップ
      try {
        await this.systemLifecycle.stopSystem();
      } catch (cleanupError) {
        systemLogger.error('クリーンアップエラー:', cleanupError);
      }
      
      throw error;
    }
  }
}

/**
 * 【開発用実行エントリーポイント】
 * main.tsのmain()関数の1回実行版
 */
async function runDev(): Promise<void> {
  const runner = new DevRunner();
  await runner.executeOnce();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 【直接実行チェック】ESM互換性確保
// このモジュールが直接実行された場合のみrunDev()を実行
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  runDev().catch((error) => {
    console.error('🚨 Fatal error:', error);
    
    // 【プロセス終了】エラー終了ステータス1で終了
    // 開発用実行失敗時の最終処理
    process.exit(1);
  });
}

export { DevRunner };