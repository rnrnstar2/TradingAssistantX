# TASK-002: ファイルサイズ監視システム修正

## 🎯 修正対象

### エラー詳細
```
❌ [自動アーカイブエラー]: Error: ENOENT: no such file or directory
path: '/Users/rnrnstar/github/TradingAssistantX/data/archives/actions/daily-action-data-2025-07-21T11-55-36-388Z.yaml'
```

### 問題原因
1. `data/archives/actions/` ディレクトリが存在しない
2. `daily-action-data.yaml` ファイルが228行（制限50行を大幅超過）
3. `getArchiveSubDir()` メソッドが存在しないディレクトリを指定

## 🔧 修正作業

### 1. アーカイブディレクトリ作成
```bash
mkdir -p data/archives/actions
mkdir -p data/archives/general
```

### 2. ファイルサイズ監視システム改修
**ファイル**: `src/utils/file-size-monitor.ts`

#### A. エラーハンドリング強化
`triggerAutoArchive()` メソッドの修正:
- ディレクトリ存在チェック
- 自動ディレクトリ作成機能
- 詳細エラーログ

#### B. アーカイブパス検証
`getArchiveSubDir()` メソッドの改修:
- 戻り値ディレクトリの存在確認
- 必要に応じて自動作成

### 3. 既存ファイル処理
**daily-action-data.yaml (228行)の処理**:
- 手動アーカイブ実行
- 軽量版作成
- アーカイブ先: `data/archives/actions/daily-action-data-manual-archive-{timestamp}.yaml`

## 📂 実装仕様

### ディレクトリ自動作成機能
```typescript
private ensureArchiveDirExists(archiveSubDir: string): void {
  if (!existsSync(archiveSubDir)) {
    mkdirSync(archiveSubDir, { recursive: true });
    console.log(`📁 [ディレクトリ作成] ${archiveSubDir}`);
  }
}
```

### 修正された triggerAutoArchive()
```typescript
async triggerAutoArchive(filePath: string, fileName: string, reason: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFileName = `${fileName.replace('.yaml', '')}-${timestamp}.yaml`;
    const archiveSubDir = this.getArchiveSubDir(fileName);
    
    // アーカイブディレクトリの存在確認・作成
    this.ensureArchiveDirExists(archiveSubDir);
    
    const archivePath = join(archiveSubDir, archiveFileName);
    
    // 既存処理...
  } catch (error) {
    console.error('❌ [自動アーカイブエラー]:', error);
    console.error(`📍 [エラー詳細] ファイル: ${fileName}, パス: ${filePath}`);
  }
}
```

## 🚫 制約・禁止事項

1. **既存アーカイブファイル削除禁止**
2. **ファイルサイズ制限値の変更禁止**（50行制限を維持）
3. **アーカイブロジックの大幅変更禁止**

## ✅ 完了条件

1. `data/archives/actions/` ディレクトリ作成完了
2. ENOENT エラーの完全解消
3. `daily-action-data.yaml` の適切なアーカイブ処理
4. ファイルサイズ監視システムの正常動作確認
5. 型チェック・Lint通過

## 📂 出力先

- **修正完了報告**: `tasks/20250721_204728/reports/REPORT-002-file-monitoring-fix.md`
- **動作確認ログ**: `tasks/20250721_204728/outputs/file-monitoring-test.log`
- **アーカイブ実行ログ**: `tasks/20250721_204728/outputs/manual-archive-log.txt`

## 🧪 テスト要件

1. **単発実行テスト**: `pnpm run autonomous:single` でエラーなし
2. **アーカイブ機能テスト**: 制限超過ファイルの自動アーカイブ確認
3. **ディレクトリ作成テスト**: 存在しないアーカイブディレクトリの自動作成

---

**重要**: この修正により、ファイルサイズ監視システムの安定性が大幅に向上し、ENOENTエラーが完全に解消されます。