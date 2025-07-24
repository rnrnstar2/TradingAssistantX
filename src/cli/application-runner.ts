import { Logger, systemLogger } from '../shared/logger';

// TradingAssistantX のインターface定義（型安全性のため）
interface ITradingAssistantX {
  start(): Promise<void>;
  stop(): Promise<void>;
  getSystemStatus(): Record<string, unknown>;
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

    process.on('SIGINT', () => void shutdownHandler('SIGINT'));   // Ctrl+C
    process.on('SIGTERM', () => void shutdownHandler('SIGTERM')); // Termination
    process.on('SIGQUIT', () => void shutdownHandler('SIGQUIT')); // Quit

    // 未処理エラーハンドラー
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      void shutdownHandler('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      void shutdownHandler('UNHANDLED_REJECTION');
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