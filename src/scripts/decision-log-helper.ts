#!/usr/bin/env node

/**
 * Claude Code 意思決定ログ管理ヘルパー
 * 
 * 使用例:
 * - npm run log:recent     # 最新10件の決定ログを表示
 * - npm run log:stats      # 今日の統計を表示
 * - npm run log:watch      # リアルタイム監視
 * - npm run log:errors     # エラーログのみ表示
 */

import { execSync } from 'child_process';
import path from 'path';

// ログビューアーのパスを取得
const viewerPath = path.join(__dirname, 'decision-log-viewer.ts');

// コマンドライン引数を解析
const args = process.argv.slice(2);
const command = args[0] || 'help';

function runViewer(viewerArgs: string[]): void {
  try {
    const cmd = `npx tsx "${viewerPath}" ${viewerArgs.join(' ')}`;
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error('ログビューアーの実行に失敗しました:', error);
    process.exit(1);
  }
}

// ショートカットコマンドの処理
switch (command) {
  case 'recent':
    console.log('📊 最新の決定ログを表示中...');
    runViewer(['list', '--limit', '10']);
    break;

  case 'today':
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 今日(${today})の決定ログを表示中...`);
    runViewer(['list', '--since', today, '--limit', '50']);
    break;

  case 'stats':
    console.log('📈 決定統計を表示中...');
    runViewer(['stats']);
    break;

  case 'stats-today':
    const todayStats = new Date().toISOString().split('T')[0];
    console.log(`📈 今日(${todayStats})の統計を表示中...`);
    runViewer(['stats', '--since', todayStats]);
    break;

  case 'watch':
    console.log('👀 リアルタイム監視を開始中...');
    runViewer(['watch']);
    break;

  case 'errors':
    console.log('❌ エラーログのみ表示中...');
    runViewer(['list', '--failed', '--limit', '20']);
    break;

  case 'success':
    console.log('✅ 成功ログのみ表示中...');
    runViewer(['list', '--success', '--limit', '20']);
    break;

  case 'search':
    if (args[1]) {
      console.log(`🔍 "${args[1]}" で検索中...`);
      runViewer(['search', args[1]]);
    } else {
      console.log('❌ 検索キーワードを指定してください');
      console.log('使用例: npm run log:search "strategic decisions"');
    }
    break;

  case 'show':
    if (args[1]) {
      console.log(`🔍 ログID "${args[1]}" の詳細を表示中...`);
      runViewer(['show', args[1], '--prompt', '--response']);
    } else {
      console.log('❌ ログIDを指定してください');
      console.log('使用例: npm run log:show log-1234567890-abc123');
    }
    break;

  case 'types':
    console.log('📝 決定タイプ別ログを表示中...');
    runViewer(['list', '--limit', '30']);
    break;

  case 'slow':
    console.log('🐌 処理時間の長い決定を表示中...');
    runViewer(['list', '--limit', '10']);
    break;

  case 'help':
  default:
    console.log('🔧 Claude Code 意思決定ログ管理ヘルパー');
    console.log('');
    console.log('利用可能なコマンド:');
    console.log('  recent        最新10件の決定ログを表示');
    console.log('  today         今日の決定ログを表示');
    console.log('  stats         全体統計を表示');
    console.log('  stats-today   今日の統計を表示');
    console.log('  watch         リアルタイム監視を開始');
    console.log('  errors        エラーログのみ表示');
    console.log('  success       成功ログのみ表示');
    console.log('  search <word> キーワード検索');
    console.log('  show <id>     指定IDの詳細表示');
    console.log('  types         決定タイプ別表示');
    console.log('  help          このヘルプを表示');
    console.log('');
    console.log('詳細なオプションを使用する場合:');
    console.log('  npx tsx src/scripts/decision-log-viewer.ts --help');
    break;
}