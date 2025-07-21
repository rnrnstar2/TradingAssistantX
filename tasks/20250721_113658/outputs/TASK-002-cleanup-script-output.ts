// TASK-002-cleanup-script-output.ts
import { SimpleXClient } from '../../../src/lib/x-client';

// クリーンアップ実行
const client = new SimpleXClient('dummy');
client.clearHistory();

console.log('履歴クリーンアップ完了');