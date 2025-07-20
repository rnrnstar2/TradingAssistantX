import { DataCommunicationMessage, IntermediateResult } from '../types/index';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

export class DataCommunicationSystem {
  private dataDir: string;
  private messagesDir: string;
  private intermediateDir: string;

  constructor(dataDir: string = 'data') {
    this.dataDir = dataDir;
    this.messagesDir = join(dataDir, 'messages');
    this.intermediateDir = join(dataDir, 'intermediate');
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.dataDir, this.messagesDir, this.intermediateDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  async shareData(filename: string, data: any): Promise<void> {
    try {
      const filePath = join(this.dataDir, filename);
      const content = JSON.stringify(data, null, 2);
      writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      console.error(`データ共有エラー (${filename}):`, error);
      throw error;
    }
  }

  async readSharedData<T = any>(filename: string): Promise<T | null> {
    try {
      const filePath = join(this.dataDir, filename);
      if (!existsSync(filePath)) {
        return null;
      }
      
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
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
      const messageFile = `message-${message.id}.json`;
      const filePath = join(this.messagesDir, messageFile);
      writeFileSync(filePath, JSON.stringify(message, null, 2), 'utf8');
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
        const content = readFileSync(filePath, 'utf8');
        const message: DataCommunicationMessage = JSON.parse(content);
        
        if (!recipientId || message.to === recipientId || !message.to) {
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
        const content = readFileSync(filePath, 'utf8');
        const message: DataCommunicationMessage = JSON.parse(content);
        
        if (now - message.timestamp > maxAgeMs) {
          unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('メッセージクリーンアップエラー:', error);
    }
  }

  async saveIntermediateResult(result: IntermediateResult): Promise<void> {
    try {
      const filename = `intermediate-${result.taskId}-${result.id}.json`;
      const filePath = join(this.intermediateDir, filename);
      writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
    } catch (error) {
      console.error(`中間結果保存エラー:`, error);
      throw error;
    }
  }

  async readIntermediateResult(taskId: string, resultId?: string): Promise<IntermediateResult | null> {
    try {
      const pattern = resultId ? `intermediate-${taskId}-${resultId}.json` : `intermediate-${taskId}-`;
      const files = readdirSync(this.intermediateDir).filter(f => f.startsWith(pattern));
      
      if (files.length === 0) {
        return null;
      }
      
      // 最新の結果を返す
      const latestFile = files.sort().pop();
      if (!latestFile) {
        return null;
      }
      
      const filePath = join(this.intermediateDir, latestFile);
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
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
        const content = readFileSync(filePath, 'utf8');
        const result: IntermediateResult = JSON.parse(content);
        results.push(result);
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
        const content = readFileSync(filePath, 'utf8');
        const result: IntermediateResult = JSON.parse(content);
        
        if (result.expiresAt && now > result.expiresAt) {
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
}