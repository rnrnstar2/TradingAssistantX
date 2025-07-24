# TASK-006: ApplicationRunner クラス作成

## 🎯 タスク概要
**責務**: CLI起動・シグナルハンドリング機能の独立クラス化  
**対象**: src/main.ts の 336-424行のCLI起動機能を分離  
**依存**: TASK-001〜005 全ての新クラス完了必須

## 📂 実装対象
**新規作成ファイル**: `src/cli/application-runner.ts`

## 🔧 実装内容

### 1. ディレクトリ作成
```bash
mkdir -p src/cli
```

### 2. ApplicationRunner クラス実装
```typescript
import { Logger, systemLogger } from '../shared/logger';

// TradingAssistantX のインターface定義（型安全性のため）
interface ITradingAssistantX {
  start(): Promise<void>;
  stop(): Promise<void>;
  getSystemStatus(): any;
  triggerManualExecution(): Promise<void>;
  reloadConfiguration(): Promise<void>;
}

export class ApplicationRunner {
  private logger: Logger;
  private app: ITradingAssistantX | null = null;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * アプリケーション実行
   */
  async run(appInstance: ITradingAssistantX): Promise<void> {
    this.app = appInstance;

    this.displayStartupBanner();
    this.setupSignalHandlers();

    try {
      // システム開始
      await this.app.start();

      this.displaySystemInfo();
      this.setupDevelopmentMode();

    } catch (error) {
      console.error('🚨 System startup failed:', error);
      process.exit(1);
    }
  }

  private displayStartupBanner(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                            TradingAssistantX                                 ║
║                    30分間隔自動実行システム - MVP版                           ║
║                        REQUIREMENTS.md準拠版                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
  }

  private setupSignalHandlers(): void {
    if (!this.app) {
      throw new Error('App instance not set');
    }

    // グレースフルシャットダウンハンドラー
    const shutdownHandler = async (signal: string) => {
      console.log(`\n📧 ${signal} signal received`);
      if (this.app) {
        await this.app.stop();
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));   // Ctrl+C
    process.on('SIGTERM', () => shutdownHandler('SIGTERM')); // Termination
    process.on('SIGQUIT', () => shutdownHandler('SIGQUIT')); // Quit

    // 未処理エラーハンドラー
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      shutdownHandler('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdownHandler('UNHANDLED_REJECTION');
    });
  }

  private displaySystemInfo(): void {
    console.log(`
📊 システム情報:
   - Process ID: ${process.pid}
   - Node Version: ${process.version}
   - Platform: ${process.platform}
   - Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
   - Started At: ${new Date().toLocaleString('ja-JP')}
`);
  }

  private setupDevelopmentMode(): void {
    if (!this.app) {
      return;
    }

    // デバッグモードでの追加情報
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode enabled');
      
      // 手動実行コマンド例
      console.log(`
💡 手動実行コマンド例:
   kill -USR1 ${process.pid}  # 手動実行トリガー
   kill -USR2 ${process.pid}  # 設定リロード
`);

      // 開発用シグナルハンドラー
      process.on('SIGUSR1', async () => {
        try {
          if (this.app) {
            await this.app.triggerManualExecution();
          }
        } catch (error) {
          console.error('Manual execution failed:', error);
        }
      });

      process.on('SIGUSR2', async () => {
        try {
          if (this.app) {
            await this.app.reloadConfiguration();
          }
        } catch (error) {
          console.error('Configuration reload failed:', error);
        }
      });
    }
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 基本的なCLI起動・シグナルハンドリングのみ
- ✅ **確実な動作**: 既存ロジックの単純移行、機能追加なし
- 🚫 **複雑なCLI機能禁止**: 引数パース・サブコマンド等は含めない
- 🚫 **詳細なシステム情報禁止**: 基本的なプロセス情報のみ表示

## ✅ 完了条件
1. `src/cli/application-runner.ts` ファイル作成完了
2. TypeScript エラーなし (npm run typecheck)
3. ESLint エラーなし (npm run lint)
4. 既存のmain.tsのCLI起動機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_124302_main_refactor/reports/REPORT-006-application-runner.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- CLI起動・シグナルハンドリングの動作確認