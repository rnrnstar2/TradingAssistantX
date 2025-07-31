import { PromptLogData, PromptLogMetadata } from '../types';
import { DataManager } from '../../shared/data-manager';

export class ClaudePromptLogger {
  private static getDataManager(): DataManager {
    return DataManager.getInstance();
  }

  /**
   * プロンプトログを保存
   */
  static async logPrompt(data: PromptLogData): Promise<void> {
    try {
      // content-prompt.yamlのみ保存（postアクション時のみ）
      if (data.prompt_metadata.endpoint !== 'generateContent') {
        console.log(`⏭️ ${data.prompt_metadata.endpoint}のプロンプトログはスキップ`);
        return;
      }

      const sanitizedData = this.sanitizePromptData(data);
      const filename = this.generateLogFilename(data.prompt_metadata.endpoint);
      
      // DataManagerに実行IDを設定
      const dataManager = this.getDataManager();
      if (data.prompt_metadata.execution_id && data.prompt_metadata.execution_id !== 'unknown') {
        dataManager.setCurrentExecutionId(data.prompt_metadata.execution_id);
      }
      
      // 実行IDが設定されていない場合はスキップ
      if (!dataManager.getCurrentExecutionId()) {
        console.log('⏭️ 実行サイクルが未設定のため、プロンプトログ保存をスキップ');
        return;
      }
      
      // 実行ディレクトリに直接保存
      await dataManager.saveExecutionData(filename, sanitizedData);
      
      console.log(`📝 Claude プロンプトログ保存: ${filename}`);
    } catch (error) {
      console.error('❌ プロンプトログ保存エラー:', error);
      // エラーでもワークフローを停止させない
    }
  }

  /**
   * 機密情報の除外
   */
  private static sanitizePromptData(data: PromptLogData): PromptLogData {
    // APIキー、パスワード、トークンなどを除外
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // プロンプト内の機密情報パターンを除外
    if (sanitized.full_prompt) {
      sanitized.full_prompt = sanitized.full_prompt
        .replace(/api[_-]?key[:\s]*[a-zA-Z0-9_-]+/gi, 'api_key: [REDACTED]')
        .replace(/token[:\s]*[a-zA-Z0-9_-]+/gi, 'token: [REDACTED]')
        .replace(/password[:\s]*[^\s]+/gi, 'password: [REDACTED]');
    }
    
    return sanitized;
  }

  /**
   * ログファイル名生成
   */
  private static generateLogFilename(endpoint: string): string {
    // generateContentのみ対応
    return 'content-prompt.yaml';
  }
}