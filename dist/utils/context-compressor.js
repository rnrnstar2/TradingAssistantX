/**
 * コンテキスト圧縮・最適化クラス
 */
export class ContextCompressor {
    defaultOptions = {
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
    compress(data, options) {
        const opts = { ...this.defaultOptions, ...options };
        const originalSize = this.calculateDataSize(data);
        const startTime = Date.now();
        let compressedContent = this.deepClone(data);
        const restoration = {};
        let deduplicatedItems = 0;
        const removedFields = [];
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
        }
        catch (error) {
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
    decompress(compressedData) {
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
        }
        catch (error) {
            console.error('データ復元エラー:', error);
            return compressedData.content;
        }
    }
    /**
     * Claude Code SDK向けにデータを最適化
     */
    optimizeForClaude(data, goal = '投資コンテンツ生成') {
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
    calculateCompressionRatio(original, compressed) {
        const originalSize = this.calculateDataSize(original);
        const compressedSize = this.calculateDataSize(compressed);
        return originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
    }
    // プライベートメソッド
    preprocessData(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.preprocessData(item));
        }
        if (data && typeof data === 'object') {
            const processed = {};
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
    deduplicateData(data, threshold) {
        if (!Array.isArray(data)) {
            return { data, duplicateMap: {}, removedCount: 0 };
        }
        const uniqueItems = [];
        const duplicateMap = {};
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
    calculateSimilarity(obj1, obj2) {
        if (obj1 === obj2)
            return 1;
        const str1 = JSON.stringify(obj1);
        const str2 = JSON.stringify(obj2);
        if (str1 === str2)
            return 1;
        // シンプルなJaccard係数による類似度計算
        const set1 = new Set(str1.split(''));
        const set2 = new Set(str2.split(''));
        const set1Array = Array.from(set1);
        const set2Array = Array.from(set2);
        const intersection = new Set(set1Array.filter(x => set2.has(x)));
        const union = new Set([...set1Array, ...set2Array]);
        return intersection.size / union.size;
    }
    removeOptionalFields(data) {
        const removedData = {};
        const removedFields = [];
        const optionalFields = [
            'metadata', 'debug', 'trace', 'temporary', 'cache',
            'originalUrl', 'rawHtml', 'processingTime', 'retryCount'
        ];
        const processObject = (obj, path = '') => {
            if (!obj || typeof obj !== 'object')
                return obj;
            if (Array.isArray(obj)) {
                return obj.map((item, index) => processObject(item, `${path}[${index}]`));
            }
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                if (optionalFields.includes(key)) {
                    removedData[currentPath] = value;
                    removedFields.push(currentPath);
                }
                else {
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
    compressMetadata(data) {
        const processItem = (item) => {
            if (!item || typeof item !== 'object')
                return item;
            if (item.metadata && typeof item.metadata === 'object') {
                // メタデータを重要な項目のみに圧縮
                const compressedMeta = {};
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
    truncateContent(data, maxLength) {
        const processItem = (item) => {
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
    flattenStructure(data) {
        // 構造の平坦化実装（簡易版）
        const flatten = (obj, prefix = '') => {
            const flattened = {};
            for (const [key, value] of Object.entries(obj)) {
                const newKey = prefix ? `${prefix}_${key}` : key;
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, flatten(value, newKey));
                }
                else {
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
    restoreOptionalFields(data, removedData) {
        // オプショナルフィールドの復元実装
        const restored = this.deepClone(data);
        for (const [path, value] of Object.entries(removedData)) {
            this.setNestedProperty(restored, path, value);
        }
        return restored;
    }
    restoreDuplicates(data, duplicateMap) {
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
    extractCollectionResults(data) {
        return data.filter(item => item &&
            typeof item === 'object' &&
            'id' in item &&
            'content' in item &&
            'source' in item);
    }
    extractKeyPoints(data) {
        const points = [];
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
    extractCategories(data) {
        const categories = new Set();
        for (const item of data) {
            if (item.metadata?.category) {
                categories.add(item.metadata.category);
            }
        }
        return Array.from(categories);
    }
    extractSources(data) {
        const sources = new Set();
        for (const item of data) {
            if (item.source) {
                sources.add(item.source);
            }
        }
        return Array.from(sources);
    }
    extractTimeRange(data) {
        const timestamps = data
            .map(item => item.timestamp)
            .filter(ts => typeof ts === 'number' && ts > 0);
        if (timestamps.length === 0)
            return undefined;
        return {
            from: Math.min(...timestamps),
            to: Math.max(...timestamps)
        };
    }
    extractTypes(data) {
        const types = new Set();
        for (const item of data) {
            if ('type' in item && typeof item.type === 'string') {
                types.add(item.type);
            }
        }
        return Array.from(types);
    }
    extractPriorities(data) {
        const priorities = new Set();
        for (const item of data) {
            if (item.metadata?.priority && ['high', 'medium', 'low'].includes(item.metadata.priority)) {
                priorities.add(item.metadata.priority);
            }
        }
        return Array.from(priorities);
    }
    extractTags(data) {
        const tags = new Set();
        for (const item of data) {
            if (item.metadata?.tags && Array.isArray(item.metadata.tags)) {
                item.metadata.tags.forEach(tag => tags.add(tag));
            }
        }
        return Array.from(tags);
    }
    generateClaudeOptimizedContent(data, goal) {
        const sections = [];
        sections.push(`# Context for ${goal}`);
        sections.push('');
        // データソース別に整理
        const sourceGroups = {};
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
    calculateKeywordDensity(content) {
        const words = content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        const density = {};
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
    determineContextType(data) {
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
    calculateDataSize(data) {
        return new TextEncoder().encode(JSON.stringify(data)).length;
    }
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj.getTime());
        if (obj instanceof Array)
            return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }
    setNestedProperty(obj, path, value) {
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
export function compressForClaude(data, options) {
    return defaultContextCompressor.compress(data, options);
}
export function optimizeForClaude(data, goal) {
    return defaultContextCompressor.optimizeForClaude(data, goal);
}
