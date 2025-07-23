import fetch from 'node-fetch';

/**
 * TwitterAPI.io認証ヘルパー
 * ユーザー名/パスワードでのログイン機能を提供
 */
export class TwitterApiAuth {
  private readonly API_BASE_URL = 'https://api.twitterapi.io';
  private readonly LOGIN_ENDPOINT = '/twitter/login_by_email_or_username';
  private apiKey: string;
  private loginData?: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * ユーザー名/パスワードでTwitterにログイン
   */
  async login(usernameOrEmail: string, password: string, proxy?: string): Promise<{
    success: boolean;
    loginData?: string;
    error?: string;
  }> {
    try {
      console.log('🔄 TwitterAPI.io ログイン中...');
      
      const url = `${this.API_BASE_URL}${this.LOGIN_ENDPOINT}`;
      // プロキシが指定されていない場合は環境変数から取得、それもない場合はnull
      const proxyToUse = proxy || process.env.X_PROXY || null;
      
      const requestBody = {
        username_or_email: usernameOrEmail,
        password: password,
        proxy: proxyToUse
      };

      console.log('🔍 [DEBUG] Login Request:', {
        url,
        username_or_email: usernameOrEmail,
        password: '***',
        proxy: proxy || '(empty)'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ログイン失敗:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json() as {
        hint?: string;
        login_data?: string;
        status?: string;
        msg?: string;
      };

      console.log('🔍 [DEBUG] Login Response:', {
        status: result.status,
        msg: result.msg,
        hint: result.hint,
        hasLoginData: !!result.login_data
      });

      if (result.status === 'success' && result.login_data) {
        this.loginData = result.login_data;
        console.log('✅ ログイン成功');
        
        return {
          success: true,
          loginData: result.login_data
        };
      } else {
        return {
          success: false,
          error: result.msg || 'ログインに失敗しました'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ ログイン処理エラー:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 保存されているログインデータを取得
   */
  getLoginData(): string | undefined {
    return this.loginData;
  }

  /**
   * ログインデータを設定（外部から提供された場合）
   */
  setLoginData(loginData: string): void {
    this.loginData = loginData;
  }

  /**
   * ログイン状態をクリア
   */
  logout(): void {
    this.loginData = undefined;
    console.log('🔄 ログアウト完了');
  }

  /**
   * ログイン状態を確認
   */
  isLoggedIn(): boolean {
    return !!this.loginData;
  }
}

/**
 * 環境変数からTwitterApiAuthインスタンスを作成するヘルパー関数
 */
export function createTwitterApiAuthFromEnv(): TwitterApiAuth {
  const apiKey = process.env.X_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing required environment variable: X_API_KEY');
  }

  return new TwitterApiAuth(apiKey);
}

/**
 * 環境変数を使用してログインを実行するヘルパー関数
 */
export async function loginFromEnv(): Promise<{
  success: boolean;
  auth?: TwitterApiAuth;
  error?: string;
}> {
  try {
    const username = process.env.X_USERNAME;
    const password = process.env.X_PASSWORD;
    
    if (!username || !password) {
      return {
        success: false,
        error: 'Missing X_USERNAME or X_PASSWORD environment variables'
      };
    }

    const auth = createTwitterApiAuthFromEnv();
    const loginResult = await auth.login(username, password);
    
    if (loginResult.success) {
      return {
        success: true,
        auth
      };
    } else {
      return {
        success: false,
        error: loginResult.error
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}