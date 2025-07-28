/**
 * 階層型データ管理システム初期化スクリプト
 * このファイルをsrc/scripts/init-hierarchical-data.tsにコピーして実行
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { format, startOfWeek } from 'date-fns';
import { writeYamlSafe } from '../utils/yaml-utils';

/**
 * ファイルの存在確認
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 階層型データ管理の初期化
 */
async function initializeHierarchicalData(): Promise<void> {
  console.log('🚀 階層型データ管理システムの初期化を開始...');
  
  const dataRoot = join(process.cwd(), 'data');
  
  // 1. 必須ディレクトリの作成
  const directories = [
    join(dataRoot, 'archives', 'posts', format(new Date(), 'yyyy-MM')),
    join(dataRoot, 'archives', 'insights', format(new Date(), 'yyyy-Q'))
  ];
  
  for (const dir of directories) {
    await fs.mkdir(dir, { recursive: true });
    console.log(`✅ ディレクトリ作成: ${dir}`);
  }
  
  // 2. 必須ファイルの初期化
  const files = [
    {
      path: join(dataRoot, 'current', 'weekly-summary.yaml'),
      content: {
        summary: {
          week_of: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
          total_posts: 0,
          avg_engagement: 0,
          top_topics: [],
          key_insights: []
        },
        metadata: {
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }
      }
    },
    {
      path: join(dataRoot, 'current', 'execution-log.yaml'),
      content: {
        execution_log: [],
        metadata: {
          max_entries: 100,
          created_at: new Date().toISOString()
        }
      }
    },
    {
      path: join(dataRoot, 'learning', 'post-insights.yaml'),
      content: {
        insights: [],
        metadata: {
          retention_days: 90,
          created_at: new Date().toISOString()
        }
      }
    },
    {
      path: join(dataRoot, 'learning', 'engagement-patterns.yaml'),
      content: {
        patterns: {
          high_performing: {
            times: [],
            formats: [],
            topics: []
          },
          low_performing: {
            times: [],
            formats: [],
            topics: []
          }
        },
        metadata: {
          last_analysis: new Date().toISOString(),
          sample_size: 0
        }
      }
    }
  ];
  
  // ファイル作成
  for (const file of files) {
    if (!await fileExists(file.path)) {
      await writeYamlSafe(file.path, file.content);
      console.log(`✅ ファイル作成: ${file.path}`);
    } else {
      console.log(`⏩ 既存ファイルをスキップ: ${file.path}`);
    }
  }
  
  // 3. サンプルアーカイブファイルの作成（動作確認用）
  const samplePostPath = join(
    dataRoot, 
    'archives', 
    'posts', 
    format(new Date(), 'yyyy-MM'),
    'sample-post.yaml'
  );
  
  if (!await fileExists(samplePostPath)) {
    await writeYamlSafe(samplePostPath, {
      content: "これはサンプル投稿です。階層型データ管理システムのテスト用。",
      timestamp: new Date().toISOString(),
      postId: "sample-001",
      archived_at: new Date().toISOString(),
      metadata: {
        is_sample: true,
        hashtags: ["投資", "初心者向け"],
        contentLength: 42
      }
    });
    console.log(`✅ サンプル投稿作成: ${samplePostPath}`);
  }
  
  console.log('\n✨ 階層型データ管理システムの初期化が完了しました！');
  console.log('\n📋 作成されたファイル構造:');
  console.log('data/');
  console.log('├── current/');
  console.log('│   ├── weekly-summary.yaml (新規)');
  console.log('│   └── execution-log.yaml (新規)');
  console.log('├── learning/');
  console.log('│   ├── post-insights.yaml (新規)');
  console.log('│   └── engagement-patterns.yaml (新規)');
  console.log('└── archives/');
  console.log('    ├── posts/');
  console.log(`    │   └── ${format(new Date(), 'yyyy-MM')}/`);
  console.log('    └── insights/');
  console.log(`        └── ${format(new Date(), 'yyyy-Q')}/`);
}

// 直接実行された場合
if (require.main === module) {
  initializeHierarchicalData()
    .then(() => {
      console.log('\n🎉 初期化完了！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 初期化エラー:', error);
      process.exit(1);
    });
}

export { initializeHierarchicalData };