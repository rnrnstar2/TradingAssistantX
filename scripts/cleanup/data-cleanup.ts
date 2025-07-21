#!/usr/bin/env tsx

import { readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

interface CleanupResult {
  tempFilesDeleted: number;
  oldTaskSessionsDeleted: number;
  errors: string[];
}

const PROTECTED_FILES = [
  'account-strategy.yaml',
  'content-patterns.yaml',
  'growth-targets.yaml',
  'posting-history.yaml',
  'performance-insights.yaml',
  'quality-assessments.yaml',
  'strategic-decisions.yaml',
  'collection-results.yaml'
];

const TEMP_DIRECTORIES = [
  'contexts',
  'intermediate',
  'status',
  'communication'
];

const DATA_DIR = './data';
const TASKS_DIR = './tasks';
const MAX_AGE_DAYS = 7;

function cleanupTempDirectories(): number {
  let deletedCount = 0;
  
  for (const dirName of TEMP_DIRECTORIES) {
    const dirPath = join(DATA_DIR, dirName);
    
    try {
      const files = readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        
        try {
          rmSync(filePath);
          deletedCount++;
          console.log(`削除: ${filePath}`);
        } catch (error) {
          console.log(`削除失敗: ${filePath} - ${error}`);
        }
      }
    } catch (error) {
      console.log(`ディレクトリアクセス失敗: ${dirPath} - ${error}`);
    }
  }
  
  return deletedCount;
}

function cleanupOldTaskSessions(): number {
  let deletedCount = 0;
  const cutoffTime = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  
  try {
    const taskDirs = readdirSync(TASKS_DIR);
    
    for (const taskDir of taskDirs) {
      const taskPath = join(TASKS_DIR, taskDir);
      
      try {
        const stats = statSync(taskPath);
        if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
          rmSync(taskPath, { recursive: true });
          deletedCount++;
          console.log(`削除: ${taskPath}`);
        }
      } catch (error) {
        console.log(`タスクセッション削除失敗: ${taskPath} - ${error}`);
      }
    }
  } catch (error) {
    console.log(`タスクディレクトリアクセス失敗: ${error}`);
  }
  
  return deletedCount;
}

function verifyProtectedFiles(): boolean {
  let allPresent = true;
  
  for (const file of PROTECTED_FILES) {
    const filePath = join(DATA_DIR, file);
    try {
      statSync(filePath);
      console.log(`保護対象ファイル確認: ${filePath}`);
    } catch (error) {
      console.log(`⚠️  保護対象ファイル不在: ${filePath}`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

function main(): void {
  const forceMode = process.argv.includes('--force');
  
  console.log('=== データクリーンアップ開始 ===');
  console.log(`実行モード: ${forceMode ? 'Force' : 'Normal'}`);
  console.log(`実行日時: ${new Date().toISOString()}`);
  
  // 保護対象ファイル確認
  console.log('\n--- 保護対象ファイル確認 ---');
  const protectedFilesOk = verifyProtectedFiles();
  
  if (!protectedFilesOk && !forceMode) {
    console.log('⚠️  保護対象ファイルの確認に失敗しました。--forceオプションで続行可能です。');
    process.exit(1);
  }
  
  const result: CleanupResult = {
    tempFilesDeleted: 0,
    oldTaskSessionsDeleted: 0,
    errors: []
  };
  
  // 一時ファイル削除
  console.log('\n--- 一時ファイル削除 ---');
  result.tempFilesDeleted = cleanupTempDirectories();
  
  // 古いタスクセッション削除
  console.log('\n--- 古いタスクセッション削除 ---');
  result.oldTaskSessionsDeleted = cleanupOldTaskSessions();
  
  // 結果表示
  console.log('\n=== クリーンアップ完了 ===');
  console.log(`一時ファイル削除数: ${result.tempFilesDeleted}`);
  console.log(`古いタスクセッション削除数: ${result.oldTaskSessionsDeleted}`);
  console.log('クリーンアップが正常に完了しました。');
}

if (require.main === module) {
  main();
}

export { main as dataCleanup };