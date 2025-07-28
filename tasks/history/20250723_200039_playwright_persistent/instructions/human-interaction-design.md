# 人間操作支援システム詳細設計

## 🎯 概要

永続化Playwrightで人間の操作支援を効率的に行うためのインターフェース設計

## 🛠️ コア機能設計

### 1. インタラクション管理システム

**ファイル**: `src/services/human-interaction-service.ts`

```typescript
export interface InteractionRequest {
  id: string;
  type: InteractionType;
  priority: 'high' | 'medium' | 'low';
  message: string;
  instructions: string[];
  context: {
    url?: string;
    screenshot?: string;
    expectedResult: string;
    timeoutMs: number;
  };
  metadata: {
    requestedAt: string;
    requesterService: string;
    retryCount: number;
  };
}

export interface InteractionResult {
  success: boolean;
  completedAt: string;
  userAction?: string;
  error?: string;
  screenshot?: string;
  timeTaken: number;
}

export type InteractionType = 
  | 'login'           // ログイン要求
  | 'captcha'         // CAPTCHA解決
  | 'verification'    // 2FA認証
  | 'page_action'     // 特定ページでの操作
  | 'error_recovery'  // エラー時の手動復旧
  | 'custom';         // カスタム操作
```

### 2. CLI統合インターフェース

```typescript
export class CLIInteractionInterface {
  private readline: readline.Interface;
  private currentRequest: InteractionRequest | null;
  
  async displayRequest(request: InteractionRequest): Promise<void> {
    console.clear();
    console.log('🤖 人間の操作が必要です\n');
    console.log(`📋 タスク: ${request.type}`);
    console.log(`📝 説明: ${request.message}\n`);
    
    console.log('📋 手順:');
    request.instructions.forEach((instruction, index) => {
      console.log(`  ${index + 1}. ${instruction}`);
    });
    
    if (request.context.url) {
      console.log(`\n🌐 URL: ${request.context.url}`);
    }
    
    if (request.context.screenshot) {
      console.log(`📸 スクリーンショット: ${request.context.screenshot}`);
    }
    
    console.log(`\n⏰ タイムアウト: ${request.context.timeoutMs / 1000}秒`);
    console.log(`🎯 期待する結果: ${request.context.expectedResult}\n`);
  }
  
  async waitForCompletion(): Promise<InteractionResult> {
    return new Promise((resolve) => {
      console.log('✅ 操作完了後、Enterキーを押してください...');
      
      this.readline.question('', () => {
        resolve({
          success: true,
          completedAt: new Date().toISOString(),
          userAction: 'manual_completion',
          timeTaken: Date.now() - this.startTime
        });
      });
    });
  }
}
```

### 3. ブラウザ制御統合

```typescript
export class BrowserInteractionController {
  private browser: BrowserContext;
  private interactionService: HumanInteractionService;
  
  async performWithHumanAssist<T>(
    operation: () => Promise<T>,
    fallbackInteraction: InteractionRequest
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isHumanInteractionNeeded(error)) {
        const result = await this.interactionService.requestInteraction(fallbackInteraction);
        if (result.success) {
          return await operation(); // リトライ
        }
      }
      throw error;
    }
  }
  
  async takeScreenshotForUser(): Promise<string> {
    const page = await this.browser.newPage();
    const screenshotPath = `tasks/outputs/interaction-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    await page.close();
    return screenshotPath;
  }
}
```

## 🎮 使用例・実装パターン

### 1. ログイン支援

```typescript
async function loginWithHumanAssist(): Promise<boolean> {
  const interaction: InteractionRequest = {
    id: `login-${Date.now()}`,
    type: 'login',
    priority: 'high',
    message: 'X.comにログインしてください',
    instructions: [
      'ブラウザでX.comが開きます',
      'ユーザー名とパスワードを入力',
      'ログインボタンをクリック',
      '2FA認証がある場合は完了',
      'ホーム画面が表示されたら完了'
    ],
    context: {
      url: 'https://x.com/login',
      expectedResult: 'ホーム画面の表示',
      timeoutMs: 600000  // 10分
    },
    metadata: {
      requestedAt: new Date().toISOString(),
      requesterService: 'PlaywrightAccountCollector',
      retryCount: 0
    }
  };
  
  const result = await humanService.requestInteraction(interaction);
  return result.success;
}
```

### 2. CAPTCHA解決支援

```typescript
async function solveCaptchaWithHuman(page: Page): Promise<boolean> {
  const screenshotPath = await page.screenshot({ 
    path: `tasks/outputs/captcha-${Date.now()}.png` 
  });
  
  const interaction: InteractionRequest = {
    id: `captcha-${Date.now()}`,
    type: 'captcha',
    priority: 'high',
    message: 'CAPTCHAの解決が必要です',
    instructions: [
      'ブラウザでCAPTCHA画面が表示されています',
      'CAPTCHA問題を解決してください',
      '「私はロボットではありません」をチェック',
      '画像選択や音声認証を完了',
      '次のページに進んだら完了'
    ],
    context: {
      screenshot: screenshotPath,
      expectedResult: 'CAPTCHA通過後のページ表示',
      timeoutMs: 300000  // 5分
    },
    metadata: {
      requestedAt: new Date().toISOString(),
      requesterService: 'DataCollector',
      retryCount: 0
    }
  };
  
  return (await humanService.requestInteraction(interaction)).success;
}
```

### 3. エラー復旧支援

```typescript
async function recoverFromError(error: Error, page: Page): Promise<boolean> {
  const screenshotPath = await page.screenshot({ 
    path: `tasks/outputs/error-${Date.now()}.png` 
  });
  
  const interaction: InteractionRequest = {
    id: `recovery-${Date.now()}`,
    type: 'error_recovery',
    priority: 'medium',
    message: `エラーが発生しました: ${error.message}`,
    instructions: [
      'エラー画面のスクリーンショットを確認',
      'ページをリロードまたは修正',
      'ログインが必要な場合は再ログイン',
      '正常な状態に復旧',
      '準備ができたら完了'
    ],
    context: {
      screenshot: screenshotPath,
      expectedResult: '正常な画面の表示',
      timeoutMs: 600000  // 10分
    },
    metadata: {
      requestedAt: new Date().toISOString(),
      requesterService: 'ErrorHandler',
      retryCount: 1
    }
  };
  
  return (await humanService.requestInteraction(interaction)).success;
}
```

## 🔧 実装優先順位

### Phase 1: 基本インターフェース
1. `HumanInteractionService` の基本実装
2. `CLIInteractionInterface` のコンソール表示
3. 基本的な待機・完了確認機能

### Phase 2: ブラウザ統合
1. `BrowserInteractionController` 実装
2. スクリーンショット機能
3. エラーハンドリング統合

### Phase 3: 高度な機能
1. インタラクション履歴の記録
2. 自動リトライ機能
3. タイムアウト・キャンセル処理

## 📊 設定ファイル

**ファイル**: `data/config/human-interaction-config.yaml`

```yaml
human_interaction:
  enabled: true
  
  # デフォルトタイムアウト（秒）
  default_timeout: 300
  
  # 自動リトライ設定
  retry:
    max_attempts: 3
    backoff_seconds: 30
  
  # スクリーンショット設定
  screenshot:
    enabled: true
    quality: 80
    path: "tasks/outputs/screenshots"
  
  # ログ設定
  logging:
    save_interactions: true
    log_path: "tasks/outputs/interaction-logs"
  
  # タイプ別設定
  interaction_types:
    login:
      timeout: 600  # 10分
      priority: high
    captcha:
      timeout: 300  # 5分
      priority: high
    verification:
      timeout: 180  # 3分
      priority: high
    page_action:
      timeout: 120  # 2分
      priority: medium
```

## 🎯 運用フロー

### 通常の自動実行
1. システムが自動でデータ収集実行
2. 認証等の問題を検出
3. 人間支援要求を生成
4. CLIで指示を表示
5. 人間が手動で操作完了
6. システムが自動実行再開

### 手動介入モード
1. `pnpm dev --interactive` で開始
2. ブラウザが永続的に起動
3. 必要に応じて人間が操作
4. セッション情報を保存
5. 次回自動実行で利用

## ⚠️ 注意事項

### セキュリティ
- スクリーンショットに機密情報が含まれる可能性
- ユーザー操作の記録における個人情報保護
- セッション情報の適切な管理

### ユーザビリティ
- 明確で理解しやすい指示の提供
- 適切なタイムアウト設定
- エラー時の分かりやすい説明

### 技術的制約
- メモリ使用量の監視
- 長時間実行時の安定性
- プロセス間通信の信頼性

---

この設計により、人間の判断力とPlaywrightの自動化機能を組み合わせた効率的なデータ収集システムが実現できます。