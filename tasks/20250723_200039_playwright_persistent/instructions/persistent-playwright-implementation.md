# 永続化Playwright実装指示書

## 🎯 目標

Xのログイン後データ取得を可能にする永続化Playwrightシステムの実装

### 核心要件
1. **永続化ブラウザインスタンス**: プロセス間でブラウザセッションを維持
2. **人間操作支援**: 認証やCAPTCHA解決時の人間介入機能
3. **セッション管理**: ログイン状態の保持と復元

## 🏗️ アーキテクチャ設計

### 1. 永続化ブラウザマネージャー拡張

**ファイル**: `src/collectors/playwright-account.ts`

```typescript
class PersistentPlaywrightManager {
  // 永続化セッション管理
  private persistentBrowser: Browser | null = null;
  private userDataDir: string;
  private sessionStateFile: string;
  
  // 人間操作支援
  private humanInteractionMode: boolean = false;
  private interactionCallbacks: Map<string, Function>;
  
  async initializePersistentBrowser(options?: {
    headless?: boolean;
    userDataDir?: string;
    preserveSession?: boolean;
  }): Promise<Browser>;
  
  async requestHumanInteraction(type: 'login' | 'captcha' | 'verification', 
                               context: any): Promise<boolean>;
  
  async saveSessionState(): Promise<void>;
  async restoreSessionState(): Promise<boolean>;
  
  async keepAlive(): Promise<void>;
}
```

### 2. 人間操作支援インターフェース

**新規ファイル**: `src/services/human-interaction-service.ts`

```typescript
export class HumanInteractionService {
  private interactionQueue: InteractionRequest[];
  private currentInteraction: InteractionRequest | null;
  
  async requestInteraction(request: InteractionRequest): Promise<InteractionResult>;
  async waitForHumanInput(timeoutMs?: number): Promise<boolean>;
  async displayInstructionsToUser(instructions: string): Promise<void>;
  async captureUserAction(): Promise<ActionResult>;
}

interface InteractionRequest {
  id: string;
  type: 'login' | 'captcha' | 'verification' | 'custom';
  message: string;
  url?: string;
  screenshot?: Buffer;
  expectedAction: string;
  timeout: number;
}
```

### 3. セッション永続化システム

**新規ファイル**: `src/utils/session-manager.ts`

```typescript
export class SessionManager {
  private sessionDir: string;
  private cookiesFile: string;
  private localStorageFile: string;
  
  async saveSession(context: BrowserContext): Promise<void>;
  async restoreSession(browser: Browser): Promise<BrowserContext>;
  async isSessionValid(): Promise<boolean>;
  async clearSession(): Promise<void>;
}
```

## 🚀 実装手順

### Phase 1: 基本永続化機能

1. **PersistentPlaywrightManager実装**
   - 現在のPlaywrightBrowserManagerを拡張
   - userDataDirを使用した永続化ブラウザ起動
   - セッション状態の保存・復元機能

2. **設定ファイル更新**
   - `data/config/playwright-config.yaml`に永続化設定追加
   ```yaml
   persistent_browser:
     enabled: true
     user_data_dir: "data/browser-sessions/main"
     headless: false  # 人間操作のため
     keep_alive_interval: 300000  # 5分
   ```

### Phase 2: 人間操作支援

1. **HumanInteractionService実装**
   - ユーザーへの指示表示
   - 操作完了待ち機能
   - スクリーンショット撮影・表示

2. **インタラクティブモード**
   ```typescript
   // 使用例
   const result = await humanService.requestInteraction({
     type: 'login',
     message: 'X.comにログインしてください。完了したらEnterキーを押してください。',
     url: 'https://x.com/login',
     expectedAction: 'ログイン完了',
     timeout: 300000  // 5分
   });
   ```

### Phase 3: 統合・最適化

1. **既存コレクターとの統合**
   - `PlaywrightAccountCollector`で永続化ブラウザ使用
   - ログイン状態でのデータ収集機能

2. **エラーハンドリング強化**
   - セッション期限切れ検出
   - 自動再ログイン要求
   - フォールバック機能

## 📋 実装詳細

### 1. 永続化ブラウザ初期化

```typescript
async initializePersistentBrowser(options = {}) {
  const defaultOptions = {
    headless: false,  // 人間操作のため
    userDataDir: path.join(process.cwd(), 'data/browser-sessions/main'),
    preserveSession: true
  };
  
  const config = { ...defaultOptions, ...options };
  
  this.persistentBrowser = await chromium.launchPersistentContext(
    config.userDataDir,
    {
      headless: config.headless,
      viewport: { width: 1280, height: 800 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  );
  
  return this.persistentBrowser;
}
```

### 2. 人間操作フロー

```typescript
async collectWithHumanAssist(): Promise<CollectionResult> {
  const browser = await this.getPersistentBrowser();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://x.com/');
    
    // ログイン状態確認
    const isLoggedIn = await this.checkLoginStatus(page);
    
    if (!isLoggedIn) {
      // 人間によるログイン支援要求
      const loginResult = await this.humanService.requestInteraction({
        type: 'login',
        message: `
ブラウザが開きました。以下の手順でログインしてください：

1. X.com のログインページが表示されています
2. ユーザー名とパスワードを入力してログイン
3. 2FA認証がある場合は完了してください
4. ログイン完了後、このターミナルでEnterキーを押してください

ブラウザはこのプロセスが終了するまで開いたままになります。
        `,
        url: 'https://x.com/login',
        expectedAction: 'ログイン完了確認',
        timeout: 600000  // 10分
      });
      
      if (!loginResult.success) {
        throw new Error('ログインがキャンセルされました');
      }
    }
    
    // ログイン後のデータ収集
    return await this.collectAuthenticatedData(page);
    
  } catch (error) {
    throw error;
  }
  // ページは閉じるが、ブラウザは永続化
}
```

### 3. CLI統合

```typescript
// src/scripts/interactive-mode.ts
export async function startInteractiveMode() {
  console.log('🔥 永続化Playwrightモードを開始します...');
  
  const manager = PersistentPlaywrightManager.getInstance();
  await manager.initializePersistentBrowser({ headless: false });
  
  console.log('✅ ブラウザが起動しました。');
  console.log('💡 このブラウザは終了するまで維持されます。');
  console.log('🔧 データ収集コマンド: pnpm dev --interactive');
  
  // キープアライブループ
  await manager.keepAlive();
}
```

## ⚠️ 制約・注意事項

### セキュリティ
- ユーザーデータディレクトリの適切な権限設定
- セッション情報の暗号化（将来拡張）
- ログイン情報の非保存原則

### リソース管理
- ブラウザプロセスのメモリ監視
- 長時間実行時のクリーンアップ
- プロセス終了時の適切なブラウザ終了

### ユーザビリティ
- 明確な操作指示の提供
- タイムアウト処理
- エラー時の復旧手順提示

## 🎯 完成後の使用フロー

1. **初回起動**
   ```bash
   pnpm start:interactive
   ```

2. **ブラウザでログイン**
   - 人間がブラウザでX.comにログイン
   - 2FA認証も手動で完了

3. **データ収集実行**
   ```bash
   pnpm dev --authenticated
   ```

4. **永続化維持**
   - ブラウザセッションは次回まで維持
   - 必要に応じて再認証を人間が支援

## 📊 期待される効果

- **認証後データ取得**: DM、詳細なエンゲージメント、非公開情報
- **高品質データ**: 認証済みAPIレベルの情報取得
- **柔軟性**: 人間の判断でCAPTCHA等を突破
- **継続性**: セッション維持で効率的な運用

---

**注意**: この実装はREQUIREMENTS.mdに準拠し、MVP原則に従って最小限の機能で最大の効果を目指します。