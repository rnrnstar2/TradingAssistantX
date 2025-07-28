# TASK-003: 依存関係の移行と実装

## 目的
削除したユーティリティファイルに依存していたコードを、MVP原則に従って修正する

## 前提条件
- TASK-001（ファイル削除）が完了していること
- TASK-002の分析結果（REPORT-002-dependency-analysis.md）を確認済みであること

## 作業内容

### 1. 依存関係の確認
REPORT-002-dependency-analysis.mdから、修正が必要なファイルのリストを確認してください。

### 2. 移行作業

#### A. error-handler.ts の移行
エラーハンドリングは標準のtry-catchに置き換えます：

```typescript
// 削除前のコード例
import { handleError } from '../utils/error-handler';
try {
  // 処理
} catch (error) {
  handleError(error);
}

// 移行後のコード例
try {
  // 処理
} catch (error) {
  console.error('Error:', error);
  throw error; // または適切なエラー処理
}
```

#### B. yaml-manager.ts / yaml-utils.ts の移行
js-yamlを直接使用するように修正します：

```typescript
// 削除前のコード例
import { YamlManager } from '../utils/yaml-manager';
const data = await YamlManager.load('file.yaml');
await YamlManager.save('file.yaml', data);

// 移行後のコード例
import * as yaml from 'js-yaml';
import { readFile, writeFile } from 'fs/promises';

// 読み込み
const content = await readFile('file.yaml', 'utf-8');
const data = yaml.load(content);

// 書き込み
const yamlStr = yaml.dump(data);
await writeFile('file.yaml', yamlStr, 'utf-8');
```

#### C. monitoring関連の削除
health-check.tsやresource-monitor.tsへの参照は単純に削除します：

```typescript
// 削除前のコード例
import { HealthCheck } from '../utils/monitoring/health-check';
await HealthCheck.run();

// 移行後：この行を削除
// モニタリング機能はMVPに含まれない
```

### 3. 実装手順

1. **依存ファイルの修正**
   - 各ファイルを開き、削除したユーティリティへのインポートを削除
   - 上記の移行パターンに従って実装を修正

2. **TypeScriptエラーの解決**
   - `pnpm typecheck`を実行してエラーを確認
   - 必要に応じて型定義を追加

3. **テストの実行**（もしテストがある場合）
   - 修正後、関連するテストを実行して動作確認

### 4. 残存ユーティリティの確認
以下のファイルが正しく残っていることを確認：
- `logger.ts` - ロギング機能（必須）
- `integrity-checker.ts` - データ整合性チェック（必須）
- `file-size-monitor.ts` - ファイルサイズ監視（データ管理に必要）
- `context-compressor.ts` - コンテキスト圧縮（AI統合に必要）
- `type-guards.ts` - 型ガード（TypeScript開発に必要）

### 5. 報告書の作成
作業完了後、以下の内容を含む報告書を作成してください：
- 修正したファイルのリスト
- 各ファイルで行った変更の概要
- TypeScriptビルドの成功確認
- 残った課題や注意点

報告書は `tasks/20250723_170500_utils_cleanup/reports/REPORT-003-utils-implementation.md` に保存してください。

## 重要な注意事項
- **MVP原則の厳守**: 「nice to have」機能は一切実装しない
- **疎結合の維持**: 各モジュール間の依存関係を最小限に保つ
- **シンプルさ優先**: 複雑な抽象化より直接的な実装を選択
- **REQUIREMENTS.md準拠**: 要件定義に記載されていない機能は追加しない