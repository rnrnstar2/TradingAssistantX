#!/usr/bin/env tsx
/**
 * 設定管理システムデモンストレーション
 * 
 * 使用方法:
 *   pnpm tsx src/scripts/config-system-demo.ts [command]
 * 
 * コマンド:
 *   init - システム初期化とテンプレート生成
 *   validate - 既存設定の検証
 *   watch - 設定ファイル監視のデモ
 *   health - 健全性チェック実行
 *   docs - ドキュメント生成
 *   optimize - 最適化提案
 */

import { defaultConfigSystem, ConfigSystem } from '../utils/config-integration';
import { defaultValidator } from '../utils/config-validator';
import { defaultTemplateManager } from '../utils/config-templates';
import path from 'path';

// コマンドライン引数処理
const command = process.argv[2] || 'help';

async function main() {
  console.log('🚀 TradingAssistantX 設定管理システムデモ\n');

  try {
    await defaultConfigSystem.initialize();

    switch (command) {
      case 'init':
        await initDemo();
        break;
      case 'validate':
        await validateDemo();
        break;
      case 'watch':
        await watchDemo();
        break;
      case 'health':
        await healthCheckDemo();
        break;
      case 'docs':
        await documentationDemo();
        break;
      case 'optimize':
        await optimizationDemo();
        break;
      case 'help':
        showHelp();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

async function initDemo() {
  console.log('📝 初期化デモ: テンプレートベース設定ファイル生成\n');

  // 新しい設定ファイルを生成
  const configs = [
    {
      template: 'autonomous',
      output: 'generated/autonomous-config-demo.yaml',
      options: {
        claude_autonomous: {
          max_context_size: 25000,
          decision_mode: 'autonomous'
        }
      }
    },
    {
      template: 'account',
      output: 'generated/account-config-demo.yaml',
      options: {
        account: {
          username: 'demo_user',
          verified: false
        },
        current_metrics: {
          followers_count: 100
        }
      }
    },
    {
      template: 'multi-source',
      output: 'generated/multi-source-config-demo.yaml',
      options: {
        rss: {
          sources: {
            custom_feed: {
              base_url: 'https://example.com',
              refresh_interval: 600
            }
          }
        }
      }
    }
  ];

  for (const config of configs) {
    const success = await defaultConfigSystem.generateConfigFile(
      config.template,
      config.output,
      config.options
    );
    
    if (success) {
      console.log(`✅ Generated: ${config.output}`);
    } else {
      console.log(`❌ Failed to generate: ${config.output}`);
    }
  }

  console.log('\n📊 システム状況:');
  console.log(JSON.stringify(defaultConfigSystem.getStatus(), null, 2));
}

async function validateDemo() {
  console.log('🔍 検証デモ: 既存設定ファイルの検証\n');

  const configFiles = [
    'autonomous-config.yaml',
    'account-config.yaml',
    'multi-source-config.yaml'
  ];

  for (const configFile of configFiles) {
    console.log(`🔍 Validating: ${configFile}`);
    
    const { config, validation } = await defaultConfigSystem.loadAndValidateConfig(
      configFile,
      path.basename(configFile, '.yaml').replace('-', '')
    );

    if (config) {
      if (validation.isValid) {
        console.log(`  ✅ Valid configuration`);
      } else {
        console.log(`  ❌ Invalid configuration:`);
        validation.errors.forEach(error => {
          console.log(`    - ${error.path}: ${error.message}`);
        });
      }

      if (validation.warnings.length > 0) {
        console.log(`  ⚠️ Warnings:`);
        validation.warnings.forEach(warning => {
          console.log(`    - ${warning.path}: ${warning.message}`);
        });
      }
    } else {
      console.log(`  ❌ Configuration not found or failed to load`);
    }
    
    console.log('');
  }
}

async function watchDemo() {
  console.log('👁️ 監視デモ: 設定ファイル変更の監視\n');
  console.log('設定ファイルを編集してください。変更を検出します...');
  console.log('Ctrl+C で終了');

  // 変更イベントをリスン
  let changeCount = 0;
  const maxChanges = 10;

  const cleanup = () => {
    console.log('\n🛑 監視を停止しています...');
    defaultConfigSystem.cleanup()
      .then(() => {
        console.log('✅ クリーンアップ完了');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ クリーンアップエラー:', error);
        process.exit(1);
      });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // イベントリスナー追加
  (defaultConfigSystem as any).manager.on('config:changed', (event: any) => {
    changeCount++;
    console.log(`📝 [${changeCount}] ${path.basename(event.filePath)} が変更されました`);
    console.log(`   時刻: ${new Date(event.timestamp).toLocaleTimeString()}`);
    
    if (changeCount >= maxChanges) {
      console.log(`\n最大変更数 (${maxChanges}) に達しました。デモを終了します。`);
      cleanup();
    }
  });

  (defaultConfigSystem as any).manager.on('config:validation-failed', (event: any) => {
    console.log(`⚠️ ${path.basename(event.filePath)} のバリデーションに失敗しました`);
  });

  // 無限ループで待機
  await new Promise(() => {});
}

async function healthCheckDemo() {
  console.log('🏥 健全性チェックデモ\n');

  const healthResult = await defaultConfigSystem.healthCheck();

  console.log(`🏥 システム健全性: ${healthResult.isHealthy ? '✅ 良好' : '❌ 問題あり'}\n`);

  if (healthResult.issues.length > 0) {
    console.log('❌ 発見された問題:');
    healthResult.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
    console.log('');
  }

  if (healthResult.recommendations.length > 0) {
    console.log('💡 推奨事項:');
    healthResult.recommendations.forEach((recommendation, index) => {
      console.log(`  ${index + 1}. ${recommendation}`);
    });
    console.log('');
  }

  // システム状況も表示
  console.log('📊 システム状況:');
  const status = defaultConfigSystem.getStatus();
  console.log(`  キャッシュされた設定: ${status.manager.cachedConfigs}`);
  console.log(`  アクティブウォッチャー: ${status.manager.activeWatchers}`);
  console.log(`  登録済みバリデーター: ${status.validator.registeredValidators}`);
  console.log(`  利用可能テンプレート: ${status.templates.availableTemplates.join(', ')}`);
  console.log(`  ファイル監視: ${status.isWatching ? '有効' : '無効'}`);
}

async function documentationDemo() {
  console.log('📚 ドキュメント生成デモ\n');

  const templates = ['autonomous', 'account', 'multi-source'];
  
  for (const template of templates) {
    console.log(`📄 Generating documentation for: ${template}`);
    
    const documentation = await defaultConfigSystem.generateDocumentation(
      template,
      `docs/generated/${template}-config.md`
    );

    // 先頭100文字を表示
    console.log(`   Preview: ${documentation.substring(0, 100)}...`);
    console.log('');
  }

  console.log('📚 すべてのドキュメントが data/docs/generated/ に生成されました');
}

async function optimizationDemo() {
  console.log('⚡ 最適化提案デモ\n');

  const suggestions = await defaultConfigSystem.suggestOptimizations();

  for (const [configName, optimizedConfig] of Object.entries(suggestions)) {
    console.log(`⚡ ${configName} の最適化提案:`);
    console.log(JSON.stringify(optimizedConfig, null, 2));
    console.log('');

    // 最適化版の設定ファイルを生成
    const outputPath = `optimized/${configName}-optimized.yaml`;
    const success = await defaultConfigSystem.generateConfigFile(
      configName,
      outputPath,
      optimizedConfig,
      false // バリデーションスキップ（最適化版のため）
    );

    if (success) {
      console.log(`💾 最適化版を保存: ${outputPath}\n`);
    }
  }
}

function showHelp() {
  console.log(`
📖 設定管理システムデモ

使用方法:
  pnpm tsx src/scripts/config-system-demo.ts [command]

コマンド:
  init        システム初期化とテンプレート生成
  validate    既存設定の検証
  watch       設定ファイル監視のデモ (Ctrl+C で終了)
  health      健全性チェック実行
  docs        ドキュメント生成
  optimize    最適化提案
  help        このヘルプを表示

例:
  pnpm tsx src/scripts/config-system-demo.ts init
  pnpm tsx src/scripts/config-system-demo.ts validate
  pnpm tsx src/scripts/config-system-demo.ts watch
`);
}

// プロセス終了時のクリーンアップ
process.on('exit', () => {
  defaultConfigSystem.cleanup().catch(console.error);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  defaultConfigSystem.cleanup()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  defaultConfigSystem.cleanup()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

// メイン実行
main().catch((error) => {
  console.error('Main execution failed:', error);
  process.exit(1);
});