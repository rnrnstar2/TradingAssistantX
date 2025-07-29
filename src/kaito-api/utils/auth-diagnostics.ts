/**
 * 認証エラー診断ツール
 * Authentication failed: login failed エラーの詳細分析用
 */

export class AuthDiagnostics {
  /**
   * 認証エラーの種類を判定
   */
  static analyzeAuthError(errorMessage: string): {
    errorType: string;
    severity: 'low' | 'medium' | 'high';
    possibleCauses: string[];
    recommendedActions: string[];
  } {
    const error = errorMessage.toLowerCase();
    
    if (error.includes('authentication failed')) {
      return {
        errorType: 'AUTHENTICATION_FAILED',
        severity: 'high',
        possibleCauses: [
          'ユーザー名またはパスワードが間違っている',
          'アカウントがロックされている',
          '2段階認証の設定に問題がある',
          'TOTP(Time-based One-Time Password)の秘密鍵が間違っている'
        ],
        recommendedActions: [
          'Twitter.comで直接ログインを試行',
          '環境変数 X_USERNAME, X_EMAIL, X_PASSWORD を再確認',
          '2段階認証の設定を確認',
          'アカウントのロック状態を確認'
        ]
      };
    }
    
    if (error.includes('login failed')) {
      return {
        errorType: 'LOGIN_FAILED',
        severity: 'high',
        possibleCauses: [
          'TwitterAPI.ioサーバー側の問題',
          'ネットワーク接続の問題',
          'APIキーの問題',
          'ログインエンドポイントの変更'
        ],
        recommendedActions: [
          'KAITO_API_TOKEN環境変数を再確認',
          'ネットワーク接続を確認',
          'TwitterAPI.ioサービス状況を確認',
          'APIキーの有効期限を確認'
        ]
      };
    }
    
    if (error.includes('timeout') || error.includes('network')) {
      return {
        errorType: 'NETWORK_ERROR',
        severity: 'medium',
        possibleCauses: [
          'ネットワーク接続が不安定',
          'プロキシ設定の問題',
          'ファイアウォールがブロック',
          'DNSの問題'
        ],
        recommendedActions: [
          'インターネット接続を確認',
          'プロキシ設定を確認',
          'ファイアウォール設定を確認',
          'しばらく待ってから再試行'
        ]
      };
    }
    
    if (error.includes('unauthorized') || error.includes('401')) {
      return {
        errorType: 'UNAUTHORIZED',
        severity: 'high',
        possibleCauses: [
          'APIキーが無効または期限切れ',
          '認証トークンの問題',
          'アクセス権限の不足'
        ],
        recommendedActions: [
          'APIキーを再生成',
          '環境変数KAITO_API_TOKENを更新',
          'アカウントの権限を確認'
        ]
      };
    }
    
    if (error.includes('forbidden') || error.includes('403')) {
      return {
        errorType: 'FORBIDDEN',
        severity: 'medium',
        possibleCauses: [
          'APIキーの権限不足',
          'レート制限に達している',
          'アカウントが制限されている'
        ],
        recommendedActions: [
          'APIキーの権限レベルを確認',
          'しばらく待ってから再試行',
          'アカウント状態を確認'
        ]
      };
    }
    
    // その他のエラー
    return {
      errorType: 'UNKNOWN_ERROR',
      severity: 'medium',
      possibleCauses: [
        '予期しないエラー',
        'システム側の問題',
        '設定の問題'
      ],
      recommendedActions: [
        'エラーメッセージの詳細を確認',
        '設定を再確認',
        'サポートに問い合わせ'
      ]
    };
  }
  
  /**
   * 環境変数の診断
   */
  static diagnoseEnvironmentVariables(): {
    status: 'complete' | 'partial' | 'missing';
    issues: string[];
    recommendations: string[];
  } {
    const required = ['KAITO_API_TOKEN', 'X_USERNAME', 'X_EMAIL', 'X_PASSWORD'];
    const missing: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    required.forEach(envVar => {
      const value = process.env[envVar];
      
      if (!value) {
        missing.push(envVar);
        issues.push(`${envVar}が設定されていません`);
      } else if (value.trim() === '') {
        issues.push(`${envVar}が空文字です`);
      } else {
        // 値の妥当性チェック
        if (envVar === 'KAITO_API_TOKEN' && value.length < 10) {
          issues.push(`${envVar}の長さが短すぎます`);
        }
        
        if (envVar === 'X_EMAIL' && !value.includes('@')) {
          issues.push(`${envVar}のメールアドレス形式が不正です`);
        }
      }
    });
    
    // ステータス判定
    let status: 'complete' | 'partial' | 'missing';
    if (missing.length === 0 && issues.length === 0) {
      status = 'complete';
    } else if (missing.length === required.length) {
      status = 'missing';
    } else {
      status = 'partial';
    }
    
    // 推奨事項
    if (missing.length > 0) {
      recommendations.push('不足している環境変数を.envファイルに追加してください');
      recommendations.push('環境変数の設定例: X_USERNAME=your_username');
    }
    
    if (issues.length > 0) {
      recommendations.push('環境変数の値を再確認してください');
      recommendations.push('特殊文字が含まれる場合は引用符で囲んでください');
    }
    
    return {
      status,
      issues,
      recommendations
    };
  }
  
  /**
   * ログイン失敗の総合診断
   */
  static diagnoseLoginFailure(
    errorMessage: string,
    authStatus: any,
    debugInfo: any
  ): {
    summary: string;
    criticalIssues: string[];
    actionPlan: string[];
    nextSteps: string[];
  } {
    const errorAnalysis = this.analyzeAuthError(errorMessage);
    const envDiagnosis = this.diagnoseEnvironmentVariables();
    
    const criticalIssues: string[] = [];
    const actionPlan: string[] = [];
    const nextSteps: string[] = [];
    
    // 環境変数の問題
    if (envDiagnosis.status !== 'complete') {
      criticalIssues.push('環境変数の設定に問題があります');
      actionPlan.push(...envDiagnosis.recommendations);
    }
    
    // APIキーの問題
    if (!authStatus.apiKeyValid) {
      criticalIssues.push('APIキーが無効です');
      actionPlan.push('KAITO_API_TOKEN環境変数を確認してください');
    }
    
    // 認証エラーの対策
    criticalIssues.push(`認証エラー: ${errorAnalysis.errorType}`);
    actionPlan.push(...errorAnalysis.recommendedActions);
    
    // 次のステップ
    if (errorAnalysis.severity === 'high') {
      nextSteps.push('まず環境変数とAPIキーを確認してください');
      nextSteps.push('Twitter.comで直接ログインできるかテストしてください');
    }
    
    nextSteps.push('ログイン専用テストを実行: pnpm test:login');
    nextSteps.push('問題が続く場合はサポートに連絡してください');
    
    const summary = `ログイン失敗の主な原因: ${errorAnalysis.errorType} (重要度: ${errorAnalysis.severity})`;
    
    return {
      summary,
      criticalIssues,
      actionPlan,
      nextSteps
    };
  }
  
  /**
   * 診断レポートの生成
   */
  static generateDiagnosticReport(
    errorMessage: string,
    authStatus: any,
    debugInfo: any
  ): string {
    const diagnosis = this.diagnoseLoginFailure(errorMessage, authStatus, debugInfo);
    
    let report = '\n🔍 認証エラー診断レポート\n';
    report += '================================\n\n';
    
    report += `📋 概要: ${diagnosis.summary}\n\n`;
    
    if (diagnosis.criticalIssues.length > 0) {
      report += '🚨 重要な問題:\n';
      diagnosis.criticalIssues.forEach((issue, index) => {
        report += `  ${index + 1}. ${issue}\n`;
      });
      report += '\n';
    }
    
    if (diagnosis.actionPlan.length > 0) {
      report += '🛠️ 推奨対策:\n';
      diagnosis.actionPlan.forEach((action, index) => {
        report += `  ${index + 1}. ${action}\n`;
      });
      report += '\n';
    }
    
    if (diagnosis.nextSteps.length > 0) {
      report += '📋 次のステップ:\n';
      diagnosis.nextSteps.forEach((step, index) => {
        report += `  ${index + 1}. ${step}\n`;
      });
      report += '\n';
    }
    
    report += '================================\n';
    
    return report;
  }
}