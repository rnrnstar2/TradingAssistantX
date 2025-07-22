import { DataCommunicationMessage, IntermediateResult } from '../types/index';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { writeYamlSafe, loadYamlSafe } from '../utils/yaml-utils';

export class DataCommunicationSystem {
  private dataDir: string;
  private messagesDir: string;
  private intermediateDir: string;
  private parallelSessionsDir: string;
  private mergedResultsDir: string;
  private sessionId?: string;

  constructor(dataDir: string = 'data', sessionId?: string) {
    this.dataDir = dataDir;
    this.messagesDir = join(dataDir, 'messages');
    this.intermediateDir = join(dataDir, 'intermediate');
    this.parallelSessionsDir = join(dataDir, 'parallel_sessions');
    this.mergedResultsDir = join(dataDir, 'merged_results');
    this.sessionId = sessionId;
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.dataDir, this.messagesDir, this.intermediateDir, this.parallelSessionsDir, this.mergedResultsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
    
    // セッションID指定時は専用ディレクトリ作成
    if (this.sessionId) {
      const sessionDir = this.getSessionDirectory();
      if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
      }
    }
  }

  async shareData(filename: string, data: any): Promise<void> {
    try {
      // セッションIDが指定されている場合は専用ディレクトリに保存
      const filePath = this.sessionId 
        ? join(this.getSessionDirectory(), filename)
        : join(this.dataDir, filename);
      // YAMLファイル名に変更
      const yamlFilePath = filePath.replace(/\.[^.]+$/, '.yaml');
      writeYamlSafe(yamlFilePath, data);
    } catch (error) {
      console.error(`データ共有エラー (${filename}):`, error);
      throw error;
    }
  }

  async readSharedData<T = any>(filename: string): Promise<T | null> {
    try {
      // セッションIDが指定されている場合は専用ディレクトリから読み込み
      const filePath = this.sessionId 
        ? join(this.getSessionDirectory(), filename)
        : join(this.dataDir, filename);
      // YAMLファイル名を試行
      const yamlFilePath = filePath.replace(/\.[^.]+$/, '.yaml');
      if (existsSync(yamlFilePath)) {
        return loadYamlSafe<T>(yamlFilePath);
      }
      // 従来のJSONファイルもサポート（後方互換性）
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error(`データ読み取りエラー (${filename}):`, error);
      return null;
    }
  }

  async updateSharedData<T = any>(
    filename: string, 
    updater: (data: T | null) => T
  ): Promise<void> {
    try {
      const currentData = await this.readSharedData<T>(filename);
      const updatedData = updater(currentData);
      await this.shareData(filename, updatedData);
    } catch (error) {
      console.error(`データ更新エラー (${filename}):`, error);
      throw error;
    }
  }

  async sendMessage(message: DataCommunicationMessage): Promise<void> {
    try {
      const messageFile = `message-${message.id}.yaml`;
      const filePath = join(this.messagesDir, messageFile);
      writeYamlSafe(filePath, message);
    } catch (error) {
      console.error(`メッセージ送信エラー:`, error);
      throw error;
    }
  }

  async readMessages(recipientId?: string): Promise<DataCommunicationMessage[]> {
    try {
      const messages: DataCommunicationMessage[] = [];
      const files = readdirSync(this.messagesDir).filter(f => f.startsWith('message-'));
      
      for (const file of files) {
        const filePath = join(this.messagesDir, file);
        let message: DataCommunicationMessage | null = null;
        
        if (file.endsWith('.yaml')) {
          message = loadYamlSafe<DataCommunicationMessage>(filePath);
        } else if (file.endsWith('.json')) {
          // 後方互換性のためJSONも読み込み
          const content = readFileSync(filePath, 'utf8');
          message = JSON.parse(content);
        }
        
        if (message && (!recipientId || message.to === recipientId || !message.to)) {
          messages.push(message);
        }
      }
      
      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('メッセージ読み取りエラー:', error);
      return [];
    }
  }

  async cleanupOldMessages(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      const files = readdirSync(this.messagesDir).filter(f => f.startsWith('message-'));
      
      for (const file of files) {
        const filePath = join(this.messagesDir, file);
        let message: DataCommunicationMessage | null = null;
        
        if (file.endsWith('.yaml')) {
          message = loadYamlSafe<DataCommunicationMessage>(filePath);
        } else if (file.endsWith('.json')) {
          // 後方互換性のためJSONも読み込み
          const content = readFileSync(filePath, 'utf8');
          message = JSON.parse(content);
        }
        
        if (message && now - message.timestamp > maxAgeMs) {
          unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('メッセージクリーンアップエラー:', error);
    }
  }

  async saveIntermediateResult(result: IntermediateResult): Promise<void> {
    try {
      const filename = `intermediate-${result.taskId}-${result.id}.yaml`;
      const filePath = join(this.intermediateDir, filename);
      writeYamlSafe(filePath, result);
    } catch (error) {
      console.error(`中間結果保存エラー:`, error);
      throw error;
    }
  }

  async readIntermediateResult(taskId: string, resultId?: string): Promise<IntermediateResult | null> {
    try {
      const pattern = resultId ? `intermediate-${taskId}-${resultId}` : `intermediate-${taskId}-`;
      const files = readdirSync(this.intermediateDir).filter(f => 
        f.startsWith(pattern) && (f.endsWith('.yaml') || f.endsWith('.json'))
      );
      
      if (files.length === 0) {
        return null;
      }
      
      // 最新の結果を返す（YAMLを優先）
      const latestFile = files.sort().pop();
      if (!latestFile) {
        return null;
      }
      
      const filePath = join(this.intermediateDir, latestFile);
      if (latestFile.endsWith('.yaml')) {
        return loadYamlSafe<IntermediateResult>(filePath);
      } else {
        // 後方互換性のためJSONも読み込み
        const content = readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`中間結果読み取りエラー:`, error);
      return null;
    }
  }

  async listIntermediateResults(taskId: string): Promise<IntermediateResult[]> {
    try {
      const pattern = `intermediate-${taskId}-`;
      const files = readdirSync(this.intermediateDir).filter(f => f.startsWith(pattern));
      const results: IntermediateResult[] = [];
      
      for (const file of files) {
        const filePath = join(this.intermediateDir, file);
        let result: IntermediateResult | null = null;
        
        if (file.endsWith('.yaml')) {
          result = loadYamlSafe<IntermediateResult>(filePath);
        } else if (file.endsWith('.json')) {
          // 後方互換性のためJSONも読み込み
          const content = readFileSync(filePath, 'utf8');
          result = JSON.parse(content);
        }
        
        if (result) {
          results.push(result);
        }
      }
      
      return results.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error(`中間結果一覧取得エラー:`, error);
      return [];
    }
  }

  async cleanupExpiredResults(): Promise<void> {
    try {
      const now = Date.now();
      const files = readdirSync(this.intermediateDir).filter(f => f.startsWith('intermediate-'));
      
      for (const file of files) {
        const filePath = join(this.intermediateDir, file);
        let result: IntermediateResult | null = null;
        
        if (file.endsWith('.yaml')) {
          result = loadYamlSafe<IntermediateResult>(filePath);
        } else if (file.endsWith('.json')) {
          // 後方互換性のためJSONも読み込み
          const content = readFileSync(filePath, 'utf8');
          result = JSON.parse(content);
        }
        
        if (result && result.expiresAt && now > result.expiresAt) {
          unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('期限切れ結果クリーンアップエラー:', error);
    }
  }

  async broadcastStatus(from: string, status: string, data?: any): Promise<void> {
    const message: DataCommunicationMessage = {
      id: Date.now().toString(),
      type: 'status',
      from,
      data: { status, ...data },
      timestamp: Date.now()
    };
    
    await this.sendMessage(message);
  }

  async notifyResult(from: string, to: string, result: any): Promise<void> {
    const message: DataCommunicationMessage = {
      id: Date.now().toString(),
      type: 'result',
      from,
      to,
      data: result,
      timestamp: Date.now()
    };
    
    await this.sendMessage(message);
  }

  async notifyError(from: string, error: string, data?: any): Promise<void> {
    const message: DataCommunicationMessage = {
      id: Date.now().toString(),
      type: 'error',
      from,
      data: { error, ...data },
      timestamp: Date.now()
    };
    
    await this.sendMessage(message);
  }

  getDataDirectory(): string {
    return this.dataDir;
  }

  getMessagesDirectory(): string {
    return this.messagesDir;
  }

  getIntermediateDirectory(): string {
    return this.intermediateDir;
  }

  // 並列セッション対応メソッド
  getSessionDirectory(): string {
    if (!this.sessionId) {
      throw new Error('SessionID is not set');
    }
    return join(this.parallelSessionsDir, this.sessionId);
  }

  getParallelSessionsDirectory(): string {
    return this.parallelSessionsDir;
  }

  getMergedResultsDirectory(): string {
    return this.mergedResultsDir;
  }

  async saveMergedResult(filename: string, data: any): Promise<void> {
    try {
      const yamlFilename = filename.replace(/\.[^.]+$/, '.yaml');
      const filePath = join(this.mergedResultsDir, yamlFilename);
      writeYamlSafe(filePath, data);
    } catch (error) {
      console.error(`マージ結果保存エラー (${filename}):`, error);
      throw error;
    }
  }

  async getAllSessionResults(filename: string): Promise<Array<{ sessionId: string; data: any }>> {
    try {
      const results: Array<{ sessionId: string; data: any }> = [];
      
      if (!existsSync(this.parallelSessionsDir)) {
        return results;
      }

      const sessionDirs = readdirSync(this.parallelSessionsDir);
      
      for (const sessionDir of sessionDirs) {
        const sessionPath = join(this.parallelSessionsDir, sessionDir);
        const filePath = join(sessionPath, filename);
        
        // YAMLファイルを優先して確認
        const yamlFilePath = filePath.replace(/\.[^.]+$/, '.yaml');
        if (existsSync(yamlFilePath)) {
          const data = loadYamlSafe(yamlFilePath);
          if (data) {
            results.push({ sessionId: sessionDir, data });
          }
        } else if (existsSync(filePath)) {
          // 後方互換性のためJSONも確認
          const content = readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          results.push({ sessionId: sessionDir, data });
        }
      }
      
      return results;
    } catch (error) {
      console.error('セッション結果収集エラー:', error);
      return [];
    }
  }

  async mergeAllSessionResults(filename: string, mergeFilename: string): Promise<void> {
    try {
      const allResults = await this.getAllSessionResults(filename);
      const mergedData = {
        timestamp: new Date().toISOString(),
        totalSessions: allResults.length,
        sessionResults: allResults,
        mergedAt: Date.now()
      };
      
      await this.saveMergedResult(mergeFilename, mergedData);
      console.log(`✅ [データ統合] ${allResults.length}セッションの結果を${mergeFilename}に統合完了`);
    } catch (error) {
      console.error('セッション結果統合エラー:', error);
      throw error;
    }
  }
}