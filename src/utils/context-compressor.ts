import { BaseCollectionResult } from '../types/collection-types';

/**
 * Claude Code SDK向けにコンテキストデータを最適化・圧縮するユーティリティ
 */

export interface CompressionOptions {
  /** 重複データの除去を有効にするか */
  deduplication?: boolean;
  /** メタデータの圧縮を有効にするか */
  compressMetadata?: boolean;
  /** 最大文字数制限（トークン節約のため） */
  maxContentLength?: number;
  /** 優先度の低いフィールドを除去するか */
  removeOptionalFields?: boolean;
  /** 構造化データの平坦化を行うか */
  flattenStructure?: boolean;
  /** 重複コンテンツの閾値（類似度％） */
  duplicateThreshold?: number;
}

export interface CompressedData {
  /** 圧縮されたメインデータ */
  content: any;
  /** 圧縮メタデータ */
  meta: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    deduplicatedItems?: number;
    removedFields?: string[];
    timestamp: number;
    algorithm: string;
  };
  /** 復元用の補助データ */
  restoration: {
    schema?: any;
    fieldMappings?: Record<string, any>;
    duplicateMap?: Record<string, number>;
    removedOptionalData?: Record<string, any>;
  };
}

export interface ClaudeOptimizedData {
  /** Claude向けに最適化された内容 */
  optimizedContent: string;
  /** 重要な要約データ */
  summary: {
    keyPoints: string[];
    totalItems: number;
    categories: string[];
    timeRange?: {
      from: number;
      to: number;
    };
  };
  /** 構造化されたメタデータ */
  structuredData: {
    sources: string[];
    types: string[];
    priorities: Array<'high' | 'medium' | 'low'>;
    tags: string[];
  };
  /** Claude処理用の補助情報 */
  claudeHints: {
    contextType: string;
    processingGoal: string;
    expectedOutputFormat: string;
    keywordDensity: Record<string, number>;
  };
}

/**
 * ContextCompressorインターフェース
 */
export interface ContextCompressorInterface {
  compress(data: any, options?: CompressionOptions): CompressedData;
  decompress(compressedData: CompressedData): any;
  optimizeForClaude(data: any, goal?: string): ClaudeOptimizedData;
  calculateCompressionRatio(original: any, compressed: any): number;
}

/**
 * コンテキスト圧縮・最適化クラス
 */
export class ContextCompressor implements ContextCompressorInterface {
  private readonly defaultOptions: Required<CompressionOptions> = {
    deduplication: true,
    compressMetadata: true,
    maxContentLength: 5000,
    removeOptionalFields: true,
    flattenStructure: false,
    duplicateThreshold: 85
  };

  /**
   * データを圧縮
   */
  compress(data: any, options?: CompressionOptions): CompressedData {
    const opts = { ...this.defaultOptions, ...options };
    const originalSize = this.calculateDataSize(data);
    const startTime = Date.now();

    let compressedContent = this.deepClone(data);
    const restoration: CompressedData['restoration'] = {};
    let deduplicatedItems = 0;
    const removedFields: string[] = [];

    try {
      // 1. データの前処理
      compressedContent = this.preprocessData(compressedContent);

      // 2. 重複除去
      if (opts.deduplication) {
        const deduplicationResult = this.deduplicateData(compressedContent, opts.duplicateThreshold);
        compressedContent = deduplicationResult.data;
        restoration.duplicateMap = deduplicationResult.duplicateMap;
        deduplicatedItems = deduplicationResult.removedCount;
      }

      // 3. オプショナルフィールド除去
      if (opts.removeOptionalFields) {
        const removalResult = this.removeOptionalFields(compressedContent);
        compressedContent = removalResult.data;
        restoration.removedOptionalData = removalResult.removedData;
        removedFields.push(...removalResult.removedFields);
      }

      // 4. メタデータ圧縮
      if (opts.compressMetadata) {
        compressedContent = this.compressMetadata(compressedContent);
      }

      // 5. コンテンツ長制限
      if (opts.maxContentLength > 0) {
        compressedContent = this.truncateContent(compressedContent, opts.maxContentLength);
      }

      // 6. 構造平坦化（オプション）
      if (opts.flattenStructure) {
        compressedContent = this.flattenStructure(compressedContent);
      }

      const compressedSize = this.calculateDataSize(compressedContent);
      const compressionRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;

      return {
        content: compressedContent,
        meta: {
          originalSize,
          compressedSize,
          compressionRatio,
          deduplicatedItems: deduplicatedItems > 0 ? deduplicatedItems : undefined,
          removedFields: removedFields.length > 0 ? removedFields : undefined,
          timestamp: Date.now(),
          algorithm: 'context-compressor-v1'
        },
        restoration
      };

    } catch (error) {
      // エラーが発生した場合は元のデータを返す
      return {
        content: data,
        meta: {
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 0,
          timestamp: Date.now(),
          algorithm: 'no-compression-error'
        },
        restoration: {}
      };
    }
  }

  /**
   * 圧縮データを復元
   */
  decompress(compressedData: CompressedData): any {
    try {
      let restoredData = this.deepClone(compressedData.content);

      // 除去されたオプショナルデータの復元
      if (compressedData.restoration.removedOptionalData) {
        restoredData = this.restoreOptionalFields(restoredData, compressedData.restoration.removedOptionalData);
      }

      // 重複データの復元
      if (compressedData.restoration.duplicateMap) {
        restoredData = this.restoreDuplicates(restoredData, compressedData.restoration.duplicateMap);
      }

      return restoredData;
    } catch (error) {
      console.error('データ復元エラー:', error);
      return compressedData.content;
    }
  }

  /**
   * Claude Code SDK向けにデータを最適化
   */
  optimizeForClaude(data: any, goal = '投資コンテンツ生成'): ClaudeOptimizedData {
    const processedData = Array.isArray(data) ? data : [data];
    const collectibleData = this.extractCollectionResults(processedData);

    // 重要なコンテンツの抽出
    const keyPoints = this.extractKeyPoints(collectibleData);
    const categories = this.extractCategories(collectibleData);
    const sources = this.extractSources(collectibleData);
    const timeRange = this.extractTimeRange(collectibleData);

    // Claude向け最適化コンテンツの生成
    const optimizedContent = this.generateClaudeOptimizedContent(collectibleData, goal);

    // キーワード密度の計算
    const keywordDensity = this.calculateKeywordDensity(optimizedContent);

    return {
      optimizedContent,
      summary: {
        keyPoints,
        totalItems: collectibleData.length,
        categories,
        timeRange
      },
      structuredData: {
        sources,
        types: this.extractTypes(collectibleData),
        priorities: this.extractPriorities(collectibleData),
        tags: this.extractTags(collectibleData)
      },
      claudeHints: {
        contextType: this.determineContextType(collectibleData),
        processingGoal: goal,
        expectedOutputFormat: 'markdown',
        keywordDensity
      }
    };
  }

  /**
   * 圧縮率を計算
   */
  calculateCompressionRatio(original: any, compressed: any): number {
    const originalSize = this.calculateDataSize(original);
    const compressedSize = this.calculateDataSize(compressed);
    
    return originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
  }

  // プライベートメソッド

  private preprocessData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.preprocessData(item));
    }
    
    if (data && typeof data === 'object') {
      const processed: any = {};
      for (const [key, value] of Object.entries(data)) {
        // null, undefined, 空文字列を除去
        if (value !== null && value !== undefined && value !== '') {
          processed[key] = this.preprocessData(value);
        }
      }
      return processed;
    }
    
    return data;
  }

  private deduplicateData(data: any[], threshold: number): {
    data: any[];
    duplicateMap: Record<string, number>;
    removedCount: number;
  } {
    if (!Array.isArray(data)) {
      return { data, duplicateMap: {}, removedCount: 0 };
    }

    const uniqueItems: any[] = [];
    const duplicateMap: Record<string, number> = {};
    let removedCount = 0;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let isDuplicate = false;

      for (let j = 0; j < uniqueItems.length; j++) {
        const similarity = this.calculateSimilarity(item, uniqueItems[j]);
        if (similarity >= threshold / 100) {
          duplicateMap[`item_${i}`] = j;
          isDuplicate = true;
          removedCount++;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueItems.push(item);
      }
    }

    return { data: uniqueItems, duplicateMap, removedCount };
  }

  private calculateSimilarity(obj1: any, obj2: any): number {
    if (obj1 === obj2) return 1;
    
    const str1 = JSON.stringify(obj1);
    const str2 = JSON.stringify(obj2);
    
    if (str1 === str2) return 1;
    
    // シンプルなJaccard係数による類似度計算
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const set1Array = Array.from(set1);
    const set2Array = Array.from(set2);
    const intersection = new Set(set1Array.filter(x => set2.has(x)));
    const union = new Set([...set1Array, ...set2Array]);
    
    return intersection.size / union.size;
  }

  private removeOptionalFields(data: any): {
    data: any;
    removedData: Record<string, any>;
    removedFields: string[];
  } {
    const removedData: Record<string, any> = {};
    const removedFields: string[] = [];
    
    const optionalFields = [
      'metadata', 'debug', 'trace', 'temporary', 'cache',
      'originalUrl', 'rawHtml', 'processingTime', 'retryCount'
    ];
    
    const processObject = (obj: any, path = ''): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map((item, index) => processObject(item, `${path}[${index}]`));
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (optionalFields.includes(key)) {
          removedData[currentPath] = value;
          removedFields.push(currentPath);
        } else {
          result[key] = processObject(value, currentPath);
        }
      }
      return result;
    };
    
    return {
      data: processObject(data),
      removedData,
      removedFields
    };
  }

  private compressMetadata(data: any): any {
    const processItem = (item: any): any => {
      if (!item || typeof item !== 'object') return item;
      
      if (item.metadata && typeof item.metadata === 'object') {
        // メタデータを重要な項目のみに圧縮
        const compressedMeta: any = {};
        const importantFields = ['source', 'category', 'priority', 'tags', 'confidence'];
        
        for (const field of importantFields) {
          if (item.metadata[field] !== undefined) {
            compressedMeta[field] = item.metadata[field];
          }
        }
        
        return { ...item, metadata: compressedMeta };
      }
      
      return item;
    };
    
    if (Array.isArray(data)) {
      return data.map(processItem);
    }
    
    return processItem(data);
  }

  private truncateContent(data: any, maxLength: number): any {
    const processItem = (item: any): any => {
      if (typeof item === 'string' && item.length > maxLength) {
        return item.substring(0, maxLength) + '...';
      }
      
      if (item && typeof item === 'object') {
        if (item.content && typeof item.content === 'string' && item.content.length > maxLength) {
          return { ...item, content: item.content.substring(0, maxLength) + '...' };
        }
      }
      
      return item;
    };
    
    if (Array.isArray(data)) {
      return data.map(processItem);
    }
    
    return processItem(data);
  }

  private flattenStructure(data: any): any {
    // 構造の平坦化実装（簡易版）
    const flatten = (obj: any, prefix = ''): any => {
      const flattened: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flatten(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }
      
      return flattened;
    };
    
    if (Array.isArray(data)) {
      return data.map(item => flatten(item));
    }
    
    return flatten(data);
  }

  private restoreOptionalFields(data: any, removedData: Record<string, any>): any {
    // オプショナルフィールドの復元実装
    const restored = this.deepClone(data);
    
    for (const [path, value] of Object.entries(removedData)) {
      this.setNestedProperty(restored, path, value);
    }
    
    return restored;
  }

  private restoreDuplicates(data: any[], duplicateMap: Record<string, number>): any[] {
    // 重複データの復元実装
    const restored = [...data];
    
    for (const [itemKey, originalIndex] of Object.entries(duplicateMap)) {
      const index = parseInt(itemKey.replace('item_', ''));
      if (originalIndex < restored.length) {
        restored.splice(index, 0, this.deepClone(restored[originalIndex]));
      }
    }
    
    return restored;
  }

  private extractCollectionResults(data: any[]): BaseCollectionResult[] {
    return data.filter(item => 
      item && 
      typeof item === 'object' &&
      'id' in item &&
      'content' in item &&
      'source' in item
    );
  }

  private extractKeyPoints(data: BaseCollectionResult[]): string[] {
    const points: string[] = [];
    
    for (const item of data) {
      if (typeof item.content === 'string') {
        // 簡易キーポイント抽出
        const sentences = item.content.split(/[.。!！?？]/);
        const shortSentences = sentences
          .filter(s => s.trim().length > 10 && s.trim().length < 100)
          .slice(0, 2);
        points.push(...shortSentences.map(s => s.trim()));
      }
    }
    
    return points.slice(0, 10);
  }

  private extractCategories(data: BaseCollectionResult[]): string[] {
    const categories = new Set<string>();
    
    for (const item of data) {
      if (item.metadata?.category) {
        categories.add(item.metadata.category);
      }
    }
    
    return Array.from(categories);
  }

  private extractSources(data: BaseCollectionResult[]): string[] {
    const sources = new Set<string>();
    
    for (const item of data) {
      if (item.source) {
        sources.add(item.source);
      }
    }
    
    return Array.from(sources);
  }

  private extractTimeRange(data: BaseCollectionResult[]): { from: number; to: number } | undefined {
    const timestamps = data
      .map(item => item.timestamp)
      .filter(ts => typeof ts === 'number' && ts > 0);
    
    if (timestamps.length === 0) return undefined;
    
    return {
      from: Math.min(...timestamps),
      to: Math.max(...timestamps)
    };
  }

  private extractTypes(data: BaseCollectionResult[]): string[] {
    const types = new Set<string>();
    
    for (const item of data) {
      if ('type' in item && typeof item.type === 'string') {
        types.add(item.type);
      }
    }
    
    return Array.from(types);
  }

  private extractPriorities(data: BaseCollectionResult[]): Array<'high' | 'medium' | 'low'> {
    const priorities = new Set<'high' | 'medium' | 'low'>();
    
    for (const item of data) {
      if (item.metadata?.priority && ['high', 'medium', 'low'].includes(item.metadata.priority)) {
        priorities.add(item.metadata.priority);
      }
    }
    
    return Array.from(priorities);
  }

  private extractTags(data: BaseCollectionResult[]): string[] {
    const tags = new Set<string>();
    
    for (const item of data) {
      if (item.metadata?.tags && Array.isArray(item.metadata.tags)) {
        item.metadata.tags.forEach(tag => tags.add(tag));
      }
    }
    
    return Array.from(tags);
  }

  private generateClaudeOptimizedContent(data: BaseCollectionResult[], goal: string): string {
    const sections: string[] = [];
    
    sections.push(`# Context for ${goal}`);
    sections.push('');
    
    // データソース別に整理
    const sourceGroups: Record<string, BaseCollectionResult[]> = {};
    for (const item of data) {
      if (!sourceGroups[item.source]) {
        sourceGroups[item.source] = [];
      }
      sourceGroups[item.source].push(item);
    }
    
    for (const [source, items] of Object.entries(sourceGroups)) {
      sections.push(`## Source: ${source}`);
      
      for (const item of items.slice(0, 5)) { // 最大5項目
        if (typeof item.content === 'string') {
          const truncated = item.content.length > 500 
            ? item.content.substring(0, 500) + '...'
            : item.content;
          sections.push(`- ${truncated}`);
        }
      }
      
      sections.push('');
    }
    
    return sections.join('\n');
  }

  private calculateKeywordDensity(content: string): Record<string, number> {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const density: Record<string, number> = {};
    const totalWords = words.length;
    
    for (const word of words) {
      density[word] = (density[word] || 0) + 1;
    }
    
    // 密度を計算（出現回数/総単語数）
    for (const word in density) {
      density[word] = density[word] / totalWords;
    }
    
    // 上位10単語のみ返す
    const sorted = Object.entries(density)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    return Object.fromEntries(sorted);
  }

  private determineContextType(data: BaseCollectionResult[]): string {
    const types = this.extractTypes(data);
    const sources = this.extractSources(data);
    
    if (types.includes('news') || sources.some(s => s.includes('news'))) {
      return 'news-analysis';
    }
    if (types.includes('market') || sources.some(s => s.includes('market'))) {
      return 'market-data';
    }
    return 'mixed-content';
  }

  private calculateDataSize(data: any): number {
    return new TextEncoder().encode(JSON.stringify(data)).length;
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
}

// デフォルトインスタンスをエクスポート
export const defaultContextCompressor = new ContextCompressor();

// 便利な関数をエクスポート
export function compressForClaude(data: any, options?: CompressionOptions): CompressedData {
  return defaultContextCompressor.compress(data, options);
}

export function optimizeForClaude(data: any, goal?: string): ClaudeOptimizedData {
  return defaultContextCompressor.optimizeForClaude(data, goal);
}