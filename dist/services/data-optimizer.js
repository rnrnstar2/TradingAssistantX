import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { loadYamlSafe, loadYamlAsync, writeYamlAsync } from '../utils/yaml-utils';
/**
 * DataOptimizer: データ最適化・クレンジングを担当するクラス
 * Claude Code SDK向けの最適なデータセット維持システム
 */
export class DataOptimizer {
    dataRoot;
    archiveRoot;
    learningDataRoot;
    retentionRules = null;
    constructor() {
        this.dataRoot = join(process.cwd(), 'data');
        this.archiveRoot = join(this.dataRoot, 'archives');
        this.learningDataRoot = join(this.dataRoot, 'learning');
    }
    /**
     * 学習データ保持ルールを読み込み
     * @returns 保持ルール設定
     */
    async loadRetentionRules() {
        if (this.retentionRules) {
            return this.retentionRules;
        }
        try {
            const rulesPath = join(this.dataRoot, 'config', 'learning-retention-rules.yaml');
            const rules = await loadYamlSafe(rulesPath);
            this.retentionRules = rules;
            console.log('✅ [学習データ設定] 保持ルールを読み込み');
            return rules;
        }
        catch (error) {
            console.error('❌ [学習データ設定] ルール読み込みエラー:', error);
            // デフォルトルールを使用
            return this.getDefaultRetentionRules();
        }
    }
    /**
     * デフォルト保持ルールを取得
     * @returns デフォルト設定
     */
    getDefaultRetentionRules() {
        return {
            retention_rules: {
                success_patterns: {
                    max_entries: 50,
                    min_success_rate: 0.70,
                    retention_days: 30,
                    archive_threshold: 0.50
                },
                high_engagement: {
                    max_entries: 100,
                    min_engagement_rate: 3.0,
                    retention_days: 60,
                    performance_decay_days: 90
                },
                effective_topics: {
                    max_entries: 30,
                    effectiveness_threshold: 0.60,
                    trend_data_retention_days: 90,
                    seasonal_data_years: 2
                }
            },
            quality_filters: {
                min_data_quality_score: 0.60,
                remove_corrupted_data: true,
                validate_yaml_syntax: true,
                check_data_consistency: true
            },
            performance_constraints: {
                max_file_size_mb: 5,
                max_total_learning_data_mb: 50,
                memory_usage_threshold: 0.80
            },
            value_assessment: {
                educational_value_weight: 0.40,
                engagement_score_weight: 0.30,
                recency_weight: 0.20,
                strategic_relevance_weight: 0.10,
                min_total_value_score: 40
            }
        };
    }
    /**
     * データセットの全体最適化を実行
     * @returns 最適化結果
     */
    async optimizeDataset() {
        const startTime = Date.now();
        console.log('📊 データセット最適化を開始...');
        let removedCount = 0;
        let archivedCount = 0;
        try {
            // 1. 古いデータのクリーンアップ (7日以上のアカウント分析データ)
            const accountAnalysisCleanup = await this.cleanOldData(7);
            removedCount += accountAnalysisCleanup.removedFiles.length;
            archivedCount += accountAnalysisCleanup.archivedFiles.length;
            // 2. 低エンゲージメントデータの削除 (30日以上)
            const lowEngagementCleanup = await this.cleanLowEngagementData(30);
            removedCount += lowEngagementCleanup.removedFiles.length;
            archivedCount += lowEngagementCleanup.archivedFiles.length;
            // 3. 重複データの削除
            const duplicateCleanup = await this.removeDuplicateData();
            removedCount += duplicateCleanup.removedFiles.length;
            // 4. アーカイブ処理
            const archiveResult = await this.archiveOldCurrentData();
            archivedCount += archiveResult.archivedCount;
            // 5. コンテキスト圧縮
            const contextResult = await this.compressContext();
            // 6. 現在のデータサイズを測定
            const currentDataSize = await this.calculateCurrentDataSize();
            const result = {
                removedCount,
                archivedCount,
                currentDataSize,
                contextCompressionRatio: contextResult.compressionRatio
            };
            console.log(`✅ データセット最適化完了: ${Date.now() - startTime}ms`);
            console.log(`   削除: ${removedCount}件, アーカイブ: ${archivedCount}件`);
            console.log(`   現在のデータサイズ: ${Math.round(currentDataSize / 1024)}KB`);
            console.log(`   コンテキスト圧縮率: ${(contextResult.compressionRatio * 100).toFixed(1)}%`);
            return result;
        }
        catch (error) {
            console.error('❌ データセット最適化エラー:', error);
            throw error;
        }
    }
    /**
     * 古いデータのクリーンアップ
     * @param retentionDays 保持日数
     * @returns クリーンアップ結果
     */
    async cleanOldData(retentionDays) {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        console.log(`🧹 古いデータクリーンアップ開始: ${retentionDays}日以前のデータを対象`);
        const removedFiles = [];
        const archivedFiles = [];
        const errors = [];
        let totalSpaceFreed = 0;
        try {
            // data配下の対象ディレクトリをチェック
            const targetDirs = [
                join(this.dataRoot, 'current'),
                join(this.dataRoot, 'autonomous-sessions'),
                this.dataRoot
            ];
            for (const dir of targetDirs) {
                if (await this.directoryExists(dir)) {
                    const files = await this.getAllYamlFiles(dir);
                    for (const file of files) {
                        try {
                            // アカウント分析データのフィルタリング
                            if (!file.includes('account-analysis') && dir === this.dataRoot) {
                                continue;
                            }
                            const stats = await fs.stat(file);
                            if (stats.mtime < cutoffDate) {
                                // ファイルの価値を評価
                                const data = await loadYamlAsync(file);
                                if (data) {
                                    const valueScore = await this.evaluateDataValue(data);
                                    // 高価値データはアーカイブ、低価値データは削除
                                    if (valueScore.totalScore > 50) {
                                        // アーカイブ処理
                                        const now = new Date();
                                        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                        const relativePath = file.replace(this.dataRoot, '');
                                        const archivePath = join(this.archiveRoot, yearMonth, relativePath);
                                        await this.archiveData(file, archivePath);
                                        archivedFiles.push(file);
                                        console.log(`📦 アーカイブ: ${file} (価値スコア: ${valueScore.totalScore.toFixed(1)})`);
                                    }
                                    else {
                                        // 削除処理
                                        totalSpaceFreed += stats.size;
                                        await fs.unlink(file);
                                        removedFiles.push(file);
                                        console.log(`🗑️  削除: ${file} (価値スコア: ${valueScore.totalScore.toFixed(1)})`);
                                    }
                                }
                                else {
                                    // データが読み込めない場合は削除
                                    totalSpaceFreed += stats.size;
                                    await fs.unlink(file);
                                    removedFiles.push(file);
                                }
                            }
                        }
                        catch (error) {
                            errors.push(`Error processing file ${file}: ${error}`);
                        }
                    }
                }
            }
            return {
                removedFiles,
                archivedFiles,
                totalSpaceFreed,
                errors
            };
        }
        catch (error) {
            console.error('❌ 古いデータクリーンアップエラー:', error);
            errors.push(`General cleanup error: ${error}`);
            return { removedFiles, archivedFiles, totalSpaceFreed, errors };
        }
    }
    /**
     * データの価値を評価
     * @param data 評価対象のデータ
     * @returns 価値スコア
     */
    async evaluateDataValue(data) {
        let educationalValue = 0;
        let engagementScore = 0;
        let recencyScore = 0;
        try {
            // 教育的価値の評価
            if (data.educationalContent) {
                educationalValue = (data.educationalContent.complexity || 0) * 10 +
                    (data.educationalContent.topicRelevance || 0) * 15 +
                    (data.educationalContent.learningValue || 0) * 20;
            }
            else if (data.content && typeof data.content === 'string') {
                // コンテンツの長さと複雑さを基に評価
                const contentLength = data.content.length;
                const hasEducationalKeywords = /学習|教育|分析|戦略|投資|金融/.test(data.content);
                educationalValue = Math.min(contentLength / 10, 30) + (hasEducationalKeywords ? 15 : 0);
            }
            // エンゲージメントスコアの評価
            if (data.engagementMetrics) {
                const metrics = data.engagementMetrics;
                engagementScore = (metrics.likes || 0) * 0.5 +
                    (metrics.retweets || 0) * 2 +
                    (metrics.replies || 0) * 1.5;
                engagementScore = Math.min(engagementScore, 50); // 最大50点
            }
            // 新鮮度スコアの評価
            if (data.timestamp) {
                const dataTime = new Date(data.timestamp).getTime();
                const now = Date.now();
                const ageInDays = (now - dataTime) / (24 * 60 * 60 * 1000);
                recencyScore = Math.max(0, 20 - ageInDays * 0.5); // 40日で0点になる
            }
            // 戦略的関連性ボーナス
            const strategicBonus = data.strategicRelevance || 0;
            const totalScore = educationalValue + engagementScore + recencyScore + strategicBonus;
            return {
                educationalValue,
                engagementScore,
                recencyScore,
                totalScore: Math.max(0, totalScore)
            };
        }
        catch (error) {
            console.error('❌ データ価値評価エラー:', error);
            return { educationalValue: 0, engagementScore: 0, recencyScore: 0, totalScore: 0 };
        }
    }
    /**
     * データをアーカイブに移動
     * @param targetPath 移動元パス
     * @param archivePath 移動先パス
     */
    async archiveData(targetPath, archivePath) {
        try {
            // 月別アーカイブディレクトリの作成
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            let finalArchivePath = archivePath;
            // アーカイブパスに年月が含まれていない場合は追加
            if (!archivePath.includes(yearMonth)) {
                const relativePath = targetPath.replace(this.dataRoot, '');
                const cleanRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                // data/learning/ → data/archives/YYYY-MM/learning/
                // data/current/ → data/archives/YYYY-MM/current/
                if (cleanRelativePath.startsWith('current/')) {
                    finalArchivePath = join(this.archiveRoot, yearMonth, cleanRelativePath);
                }
                else if (cleanRelativePath.includes('learning')) {
                    finalArchivePath = join(this.archiveRoot, yearMonth, 'learning', basename(targetPath));
                }
                else {
                    finalArchivePath = join(this.archiveRoot, yearMonth, cleanRelativePath);
                }
            }
            // アーカイブディレクトリを作成
            await fs.mkdir(dirname(finalArchivePath), { recursive: true });
            // ファイルをコピーしてから削除（より安全）
            const data = await loadYamlAsync(targetPath);
            if (data) {
                const success = await writeYamlAsync(finalArchivePath, data);
                if (success) {
                    await fs.unlink(targetPath);
                    console.log(`📦 アーカイブ: ${targetPath} → ${finalArchivePath}`);
                }
                else {
                    throw new Error('Failed to write archive file');
                }
            }
            else {
                throw new Error('Failed to read source file');
            }
        }
        catch (error) {
            console.error('❌ アーカイブエラー:', error);
            throw error;
        }
    }
    /**
     * コンテキストを圧縮
     * @returns 圧縮結果
     */
    async compressContext() {
        console.log('🗜️  コンテキスト圧縮開始...');
        let originalSize = 0;
        let optimizedSize = 0;
        try {
            const currentDir = join(this.dataRoot, 'current');
            if (await this.directoryExists(currentDir)) {
                const files = await this.getAllYamlFiles(currentDir);
                for (const file of files) {
                    const stats = await fs.stat(file);
                    originalSize += stats.size;
                    // データを読み込んで最適化
                    const data = await loadYamlAsync(file);
                    if (data) {
                        const optimizedData = this.compressDataStructure(data);
                        // 最適化されたデータを書き込み
                        await writeYamlAsync(file, optimizedData);
                        const newStats = await fs.stat(file);
                        optimizedSize += newStats.size;
                    }
                }
            }
            const compressionRatio = originalSize > 0 ? (originalSize - optimizedSize) / originalSize : 0;
            console.log(`✅ コンテキスト圧縮完了: ${(compressionRatio * 100).toFixed(1)}% 削減`);
            return {
                originalSize,
                optimizedSize,
                compressionRatio
            };
        }
        catch (error) {
            console.error('❌ コンテキスト圧縮エラー:', error);
            throw error;
        }
    }
    /**
     * 低エンゲージメントデータのクリーンアップ
     * @param retentionDays 保持日数
     * @returns クリーンアップ結果
     */
    async cleanLowEngagementData(retentionDays) {
        console.log(`📊 低エンゲージメントデータクリーンアップ: ${retentionDays}日以前`);
        const removedFiles = [];
        const archivedFiles = [];
        const errors = [];
        let totalSpaceFreed = 0;
        try {
            // posting-data.yamlの低エンゲージメントエントリをクリーンアップ
            const postingDataPath = join(this.dataRoot, 'posting-data.yaml');
            if (await this.directoryExists(dirname(postingDataPath))) {
                try {
                    const postingData = await loadYamlAsync(postingDataPath);
                    if (postingData && Array.isArray(postingData)) {
                        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
                        const originalCount = postingData.length;
                        const filteredData = [];
                        for (const entry of postingData) {
                            const entryDate = new Date(entry.timestamp || entry.createdAt || 0);
                            if (entryDate < cutoffDate) {
                                const valueScore = await this.evaluateDataValue(entry);
                                // エンゲージメントスコアが極端に低い場合は除外
                                if (valueScore.engagementScore >= 5 || valueScore.totalScore >= 25) {
                                    filteredData.push(entry);
                                }
                            }
                            else {
                                filteredData.push(entry);
                            }
                        }
                        if (filteredData.length < originalCount) {
                            await writeYamlAsync(postingDataPath, filteredData);
                            removedFiles.push(`${originalCount - filteredData.length} low-engagement entries from posting-data.yaml`);
                        }
                    }
                }
                catch (error) {
                    errors.push(`Error processing posting-data.yaml: ${error}`);
                }
            }
            // アーカイブディレクトリの低エンゲージメントデータ
            const archiveDir = join(this.archiveRoot, 'actions');
            if (await this.directoryExists(archiveDir)) {
                const files = await this.getAllYamlFiles(archiveDir);
                const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
                for (const file of files) {
                    try {
                        const stats = await fs.stat(file);
                        if (stats.mtime < cutoffDate) {
                            const data = await loadYamlAsync(file);
                            if (data) {
                                const valueScore = await this.evaluateDataValue(data);
                                // エンゲージメントスコアが極端に低い場合は削除
                                if (valueScore.engagementScore < 5 && valueScore.totalScore < 25) {
                                    totalSpaceFreed += stats.size;
                                    await fs.unlink(file);
                                    removedFiles.push(file);
                                    console.log(`📉 低エンゲージメントデータ削除: ${file}`);
                                }
                            }
                        }
                    }
                    catch (error) {
                        errors.push(`Error processing ${file}: ${error}`);
                    }
                }
            }
            return {
                removedFiles,
                archivedFiles,
                totalSpaceFreed,
                errors
            };
        }
        catch (error) {
            console.error('❌ 低エンゲージメントデータクリーンアップエラー:', error);
            errors.push(`Low engagement cleanup error: ${error}`);
            return { removedFiles, archivedFiles, totalSpaceFreed, errors };
        }
    }
    /**
     * 重複データの削除
     * @returns クリーンアップ結果
     */
    async removeDuplicateData() {
        console.log('🔍 重複データ検出・削除開始...');
        const removedFiles = [];
        const archivedFiles = [];
        const errors = [];
        let totalSpaceFreed = 0;
        const seenHashes = new Set();
        try {
            // 重複検出対象のディレクトリ
            const targetDirs = [
                join(this.dataRoot, 'autonomous-sessions'),
                join(this.dataRoot, 'current'),
                join(this.archiveRoot)
            ];
            for (const dir of targetDirs) {
                if (await this.directoryExists(dir)) {
                    const files = await this.getAllYamlFiles(dir);
                    for (const file of files) {
                        try {
                            const data = await loadYamlAsync(file);
                            if (data) {
                                const hash = this.generateDataHash(data);
                                if (seenHashes.has(hash)) {
                                    const stats = await fs.stat(file);
                                    totalSpaceFreed += stats.size;
                                    await fs.unlink(file);
                                    removedFiles.push(file);
                                    console.log(`🗑️  重複データ削除: ${file}`);
                                }
                                else {
                                    seenHashes.add(hash);
                                }
                            }
                        }
                        catch (error) {
                            errors.push(`Error processing duplicate check for ${file}: ${error}`);
                        }
                    }
                }
            }
            // posting-data.yaml内の重複削除
            try {
                const postingDataPath = join(this.dataRoot, 'posting-data.yaml');
                if (await this.directoryExists(dirname(postingDataPath))) {
                    const postingData = await loadYamlAsync(postingDataPath);
                    if (postingData && Array.isArray(postingData)) {
                        const originalCount = postingData.length;
                        const uniqueData = this.removeDuplicatesFromArray(postingData);
                        if (uniqueData.length < originalCount) {
                            await writeYamlAsync(postingDataPath, uniqueData);
                            removedFiles.push(`${originalCount - uniqueData.length} duplicate entries from posting-data.yaml`);
                        }
                    }
                }
            }
            catch (error) {
                errors.push(`Error removing duplicates from posting-data.yaml: ${error}`);
            }
            return {
                removedFiles,
                archivedFiles,
                totalSpaceFreed,
                errors
            };
        }
        catch (error) {
            console.error('❌ 重複データ削除エラー:', error);
            errors.push(`Duplicate removal error: ${error}`);
            return { removedFiles, archivedFiles, totalSpaceFreed, errors };
        }
    }
    /**
     * 配列から重複を削除
     * @param array 元の配列
     * @returns 重複を削除した配列
     */
    removeDuplicatesFromArray(array) {
        const seen = new Set();
        return array.filter(item => {
            const hash = this.generateDataHash(item);
            if (seen.has(hash)) {
                return false;
            }
            seen.add(hash);
            return true;
        });
    }
    /**
     * 古いcurrentデータをアーカイブ
     * @returns アーカイブ結果
     */
    async archiveOldCurrentData() {
        console.log('📦 現在データのアーカイブ処理開始...');
        let archivedCount = 0;
        try {
            const currentDir = join(this.dataRoot, 'current');
            if (await this.directoryExists(currentDir)) {
                const files = await this.getAllYamlFiles(currentDir);
                const now = new Date();
                const archiveDir = join(this.archiveRoot, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                for (const file of files) {
                    const stats = await fs.stat(file);
                    const ageInHours = (Date.now() - stats.mtime.getTime()) / (60 * 60 * 1000);
                    // 24時間以上経過したファイルをアーカイブ
                    if (ageInHours > 24) {
                        const filename = file.split('/').pop();
                        const archivePath = join(archiveDir, 'current', filename);
                        await this.archiveData(file, archivePath);
                        archivedCount++;
                    }
                }
            }
            console.log(`✅ アーカイブ完了: ${archivedCount}件`);
            return { archivedCount };
        }
        catch (error) {
            console.error('❌ アーカイブ処理エラー:', error);
            throw error;
        }
    }
    /**
     * 現在のデータサイズを計算
     * @returns バイト単位のサイズ
     */
    async calculateCurrentDataSize() {
        let totalSize = 0;
        try {
            const currentDir = join(this.dataRoot, 'current');
            if (await this.directoryExists(currentDir)) {
                const files = await this.getAllYamlFiles(currentDir);
                for (const file of files) {
                    const stats = await fs.stat(file);
                    totalSize += stats.size;
                }
            }
            return totalSize;
        }
        catch (error) {
            console.error('❌ データサイズ計算エラー:', error);
            return 0;
        }
    }
    /**
     * データ構造を圧縮
     * @param data 元データ
     * @returns 圧縮されたデータ
     */
    compressDataStructure(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        const compressed = { ...data };
        // 不要なフィールドを削除
        delete compressed._metadata;
        delete compressed._internal;
        delete compressed.debug;
        delete compressed.verbose;
        // 空のオブジェクトや配列を削除
        Object.keys(compressed).forEach(key => {
            const value = compressed[key];
            if (Array.isArray(value) && value.length === 0) {
                delete compressed[key];
            }
            else if (value && typeof value === 'object' && Object.keys(value).length === 0) {
                delete compressed[key];
            }
        });
        return compressed;
    }
    /**
     * データのハッシュを生成
     * @param data データオブジェクト
     * @returns ハッシュ文字列
     */
    generateDataHash(data) {
        const crypto = require('crypto');
        const content = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    /**
     * ディレクトリが存在するかチェック
     * @param dirPath ディレクトリパス
     * @returns 存在するかどうか
     */
    async directoryExists(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
    /**
     * ディレクトリから全YAMLファイルを取得
     * @param dirPath ディレクトリパス
     * @returns YAMLファイルのパス配列
     */
    async getAllYamlFiles(dirPath) {
        const files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.getAllYamlFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            console.warn(`⚠️ ディレクトリ読み込み警告: ${dirPath}`, error);
        }
        return files;
    }
    /**
     * 成功パターンデータのクレンジング
     * @returns 処理完了のPromise
     */
    async cleanSuccessPatterns() {
        console.log('🧹 [成功パターンクリーンアップ] 開始...');
        const rules = await this.loadRetentionRules();
        const successPatternsRule = rules.retention_rules.success_patterns;
        try {
            const successPatternsPath = join(this.learningDataRoot, 'success-patterns.yaml');
            if (!await this.directoryExists(dirname(successPatternsPath))) {
                console.log('⚠️ [成功パターン] success-patterns.yamlが見つかりません');
                return;
            }
            const successData = await loadYamlAsync(successPatternsPath);
            if (!successData || !Array.isArray(successData)) {
                console.log('⚠️ [成功パターン] データが空または配列ではありません');
                return;
            }
            console.log(`📊 [成功パターン] ${successData.length}件のエントリを処理中...`);
            const cutoffDate = new Date(Date.now() - successPatternsRule.retention_days * 24 * 60 * 60 * 1000);
            const filteredData = [];
            const archivedEntries = [];
            let removedCount = 0;
            for (const entry of successData) {
                const entryDate = new Date(entry.timestamp || entry.createdAt || 0);
                const successRate = entry.successRate || entry.success_rate || 0;
                const valueScore = await this.evaluateDataValue(entry);
                // 高品質データは保持
                if (valueScore.totalScore >= rules.value_assessment.min_total_value_score) {
                    filteredData.push(entry);
                }
                // 最小成功率を満たし、保持期間内のデータは保持
                else if (successRate >= successPatternsRule.min_success_rate && entryDate >= cutoffDate) {
                    filteredData.push(entry);
                }
                // アーカイブ閾値以上は古くてもアーカイブ
                else if (successRate >= successPatternsRule.archive_threshold) {
                    archivedEntries.push(entry);
                }
                // それ以外は削除
                else {
                    removedCount++;
                }
            }
            // エントリ数制限の適用
            if (filteredData.length > successPatternsRule.max_entries) {
                // 価値スコア順でソートして上位のみ保持
                filteredData.sort((a, b) => {
                    const scoreA = this.calculateQuickValueScore(a);
                    const scoreB = this.calculateQuickValueScore(b);
                    return scoreB - scoreA;
                });
                const excessEntries = filteredData.splice(successPatternsRule.max_entries);
                archivedEntries.push(...excessEntries);
            }
            // アーカイブ処理
            if (archivedEntries.length > 0) {
                await this.archiveLearningData('success-patterns', archivedEntries);
                console.log(`📦 [成功パターン] ${archivedEntries.length}件をアーカイブ`);
            }
            // 更新されたデータを保存
            if (filteredData.length !== successData.length) {
                const success = await writeYamlAsync(successPatternsPath, filteredData);
                if (success) {
                    console.log(`✅ [成功パターン] クリーンアップ完了: ${removedCount}件削除, ${archivedEntries.length}件アーカイブ, ${filteredData.length}件保持`);
                }
                else {
                    console.error('❌ [成功パターン] データ保存に失敗');
                }
            }
            else {
                console.log('✅ [成功パターン] クリーンアップ不要（データは最適な状態）');
            }
        }
        catch (error) {
            console.error('❌ [成功パターン] クリーンアップエラー:', error);
            throw error;
        }
    }
    /**
     * 高エンゲージメントデータのクレンジング
     * @returns 処理完了のPromise
     */
    async cleanHighEngagementData() {
        console.log('📈 [高エンゲージメントクリーンアップ] 開始...');
        const rules = await this.loadRetentionRules();
        const engagementRule = rules.retention_rules.high_engagement;
        try {
            const highEngagementPath = join(this.learningDataRoot, 'high-engagement.yaml');
            if (!await this.directoryExists(dirname(highEngagementPath))) {
                console.log('⚠️ [高エンゲージメント] high-engagement.yamlが見つかりません');
                return;
            }
            const engagementData = await loadYamlAsync(highEngagementPath);
            if (!engagementData || !Array.isArray(engagementData)) {
                console.log('⚠️ [高エンゲージメント] データが空または配列ではありません');
                return;
            }
            console.log(`📊 [高エンゲージメント] ${engagementData.length}件のエントリを処理中...`);
            const cutoffDate = new Date(Date.now() - engagementRule.retention_days * 24 * 60 * 60 * 1000);
            const decayDate = new Date(Date.now() - engagementRule.performance_decay_days * 24 * 60 * 60 * 1000);
            const filteredData = [];
            const archivedEntries = [];
            let removedCount = 0;
            for (const entry of engagementData) {
                const entryDate = new Date(entry.timestamp || entry.createdAt || 0);
                const engagementRate = entry.engagementRate || entry.engagement_rate || 0;
                const valueScore = await this.evaluateDataValue(entry);
                // パフォーマンス減衰期間を過ぎたデータの評価
                const isDecayed = entryDate < decayDate;
                const adjustedEngagementRate = isDecayed ? engagementRate * 0.7 : engagementRate;
                // 高品質データは保持
                if (valueScore.totalScore >= rules.value_assessment.min_total_value_score) {
                    filteredData.push(entry);
                }
                // 最小エンゲージメント率を満たし、保持期間内のデータは保持
                else if (adjustedEngagementRate >= engagementRule.min_engagement_rate && entryDate >= cutoffDate) {
                    filteredData.push(entry);
                }
                // 過去の高エンゲージメントデータはアーカイブ
                else if (engagementRate >= engagementRule.min_engagement_rate * 0.8 && !isDecayed) {
                    archivedEntries.push(entry);
                }
                // それ以外は削除
                else {
                    removedCount++;
                }
            }
            // エントリ数制限の適用
            if (filteredData.length > engagementRule.max_entries) {
                filteredData.sort((a, b) => {
                    const scoreA = this.calculateQuickValueScore(a);
                    const scoreB = this.calculateQuickValueScore(b);
                    return scoreB - scoreA;
                });
                const excessEntries = filteredData.splice(engagementRule.max_entries);
                archivedEntries.push(...excessEntries);
            }
            // アーカイブ処理
            if (archivedEntries.length > 0) {
                await this.archiveLearningData('high-engagement', archivedEntries);
                console.log(`📦 [高エンゲージメント] ${archivedEntries.length}件をアーカイブ`);
            }
            // 更新されたデータを保存
            if (filteredData.length !== engagementData.length) {
                const success = await writeYamlAsync(highEngagementPath, filteredData);
                if (success) {
                    console.log(`✅ [高エンゲージメント] クリーンアップ完了: ${removedCount}件削除, ${archivedEntries.length}件アーカイブ, ${filteredData.length}件保持`);
                }
                else {
                    console.error('❌ [高エンゲージメント] データ保存に失敗');
                }
            }
            else {
                console.log('✅ [高エンゲージメント] クリーンアップ不要（データは最適な状態）');
            }
        }
        catch (error) {
            console.error('❌ [高エンゲージメント] クリーンアップエラー:', error);
            throw error;
        }
    }
    /**
     * 効果的トピックデータのクレンジング
     * @returns 処理完了のPromise
     */
    async cleanEffectiveTopics() {
        console.log('🎯 [効果的トピッククリーンアップ] 開始...');
        const rules = await this.loadRetentionRules();
        const topicsRule = rules.retention_rules.effective_topics;
        try {
            const effectiveTopicsPath = join(this.learningDataRoot, 'effective-topics.yaml');
            if (!await this.directoryExists(dirname(effectiveTopicsPath))) {
                console.log('⚠️ [効果的トピック] effective-topics.yamlが見つかりません');
                return;
            }
            const topicsData = await loadYamlAsync(effectiveTopicsPath);
            if (!topicsData || !Array.isArray(topicsData)) {
                console.log('⚠️ [効果的トピック] データが空または配列ではありません');
                return;
            }
            console.log(`📊 [効果的トピック] ${topicsData.length}件のエントリを処理中...`);
            const trendCutoffDate = new Date(Date.now() - topicsRule.trend_data_retention_days * 24 * 60 * 60 * 1000);
            const seasonalCutoffDate = new Date(Date.now() - topicsRule.seasonal_data_years * 365 * 24 * 60 * 60 * 1000);
            const filteredData = [];
            const archivedEntries = [];
            let removedCount = 0;
            for (const entry of topicsData) {
                const entryDate = new Date(entry.timestamp || entry.createdAt || 0);
                const effectiveness = entry.effectiveness || entry.effectiveness_score || 0;
                const isSeasonal = entry.seasonal || entry.is_seasonal || false;
                const valueScore = await this.evaluateDataValue(entry);
                // 適用する保持期間を決定（季節データは長期保持）
                const relevantCutoffDate = isSeasonal ? seasonalCutoffDate : trendCutoffDate;
                // 高品質データは保持
                if (valueScore.totalScore >= rules.value_assessment.min_total_value_score) {
                    filteredData.push(entry);
                }
                // 効果閾値を満たし、保持期間内のデータは保持
                else if (effectiveness >= topicsRule.effectiveness_threshold && entryDate >= relevantCutoffDate) {
                    filteredData.push(entry);
                }
                // 季節データで効果が中程度のものはアーカイブ
                else if (isSeasonal && effectiveness >= topicsRule.effectiveness_threshold * 0.7) {
                    archivedEntries.push(entry);
                }
                // それ以外は削除
                else {
                    removedCount++;
                }
            }
            // エントリ数制限の適用
            if (filteredData.length > topicsRule.max_entries) {
                filteredData.sort((a, b) => {
                    const scoreA = this.calculateQuickValueScore(a);
                    const scoreB = this.calculateQuickValueScore(b);
                    return scoreB - scoreA;
                });
                const excessEntries = filteredData.splice(topicsRule.max_entries);
                archivedEntries.push(...excessEntries);
            }
            // アーカイブ処理
            if (archivedEntries.length > 0) {
                await this.archiveLearningData('effective-topics', archivedEntries);
                console.log(`📦 [効果的トピック] ${archivedEntries.length}件をアーカイブ`);
            }
            // 更新されたデータを保存
            if (filteredData.length !== topicsData.length) {
                const success = await writeYamlAsync(effectiveTopicsPath, filteredData);
                if (success) {
                    console.log(`✅ [効果的トピック] クリーンアップ完了: ${removedCount}件削除, ${archivedEntries.length}件アーカイブ, ${filteredData.length}件保持`);
                }
                else {
                    console.error('❌ [効果的トピック] データ保存に失敗');
                }
            }
            else {
                console.log('✅ [効果的トピック] クリーンアップ不要（データは最適な状態）');
            }
        }
        catch (error) {
            console.error('❌ [効果的トピック] クリーンアップエラー:', error);
            throw error;
        }
    }
    /**
     * ディープクリーニング（全体的な品質向上処理）
     * @returns 処理完了のPromise
     */
    async performDeepCleaning() {
        console.log('🔬 [ディープクリーンアップ] 開始...');
        const rules = await this.loadRetentionRules();
        try {
            // 1. 全学習データのクリーンアップを実行
            await this.cleanSuccessPatterns();
            await this.cleanHighEngagementData();
            await this.cleanEffectiveTopics();
            // 2. 品質フィルタリング
            if (rules.quality_filters.remove_corrupted_data) {
                await this.removeCorruptedLearningData();
            }
            // 3. データ整合性チェック
            if (rules.quality_filters.check_data_consistency) {
                await this.validateDataConsistency();
            }
            // 4. パフォーマンス最適化
            await this.optimizeLearningDataPerformance();
            console.log('✅ [ディープクリーンアップ] 全体処理完了');
        }
        catch (error) {
            console.error('❌ [ディープクリーンアップ] エラー:', error);
            throw error;
        }
    }
    /**
     * 学習データのアーカイブ処理
     * @param dataType データ種別
     * @param entries アーカイブするエントリ
     */
    async archiveLearningData(dataType, entries) {
        try {
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const archiveDir = join(this.archiveRoot, yearMonth, 'learning');
            // アーカイブディレクトリを作成
            await fs.mkdir(archiveDir, { recursive: true });
            // アーカイブファイルパス
            const archiveFilePath = join(archiveDir, `${dataType}-archive-${Date.now()}.yaml`);
            // アーカイブデータを保存
            await writeYamlAsync(archiveFilePath, {
                archived_at: now.toISOString(),
                data_type: dataType,
                entry_count: entries.length,
                entries: entries
            });
            console.log(`📦 [学習データアーカイブ] ${dataType}: ${entries.length}件を${archiveFilePath}に保存`);
        }
        catch (error) {
            console.error('❌ [学習データアーカイブ] エラー:', error);
            throw error;
        }
    }
    /**
     * 簡易価値スコア計算（パフォーマンス重視）
     * @param data データオブジェクト
     * @returns 価値スコア
     */
    calculateQuickValueScore(data) {
        let score = 0;
        // エンゲージメント要素
        if (data.engagementRate || data.engagement_rate) {
            score += (data.engagementRate || data.engagement_rate) * 30;
        }
        // 成功率要素
        if (data.successRate || data.success_rate) {
            score += (data.successRate || data.success_rate) * 40;
        }
        // 新鮮度要素
        const timestamp = data.timestamp || data.createdAt || Date.now();
        const ageInDays = (Date.now() - new Date(timestamp).getTime()) / (24 * 60 * 60 * 1000);
        score += Math.max(0, 20 - ageInDays * 0.5);
        // 効果的要素
        if (data.effectiveness || data.effectiveness_score) {
            score += (data.effectiveness || data.effectiveness_score) * 10;
        }
        return Math.max(0, score);
    }
    /**
     * 破損した学習データの削除
     */
    async removeCorruptedLearningData() {
        console.log('🔍 [品質チェック] 破損データの検出・削除...');
        const learningFiles = [
            join(this.learningDataRoot, 'success-patterns.yaml'),
            join(this.learningDataRoot, 'high-engagement.yaml'),
            join(this.learningDataRoot, 'effective-topics.yaml')
        ];
        for (const filePath of learningFiles) {
            try {
                if (await this.directoryExists(dirname(filePath))) {
                    // YAML構文チェック
                    const data = await loadYamlAsync(filePath);
                    if (!data) {
                        console.log(`⚠️ [品質チェック] ${basename(filePath)}: データが空`);
                    }
                }
            }
            catch (error) {
                console.error(`❌ [品質チェック] ${basename(filePath)}: 破損検出 - ${error}`);
                // 破損ファイルのバックアップ作成後、初期化
                const backupPath = `${filePath}.corrupted.${Date.now()}`;
                try {
                    await fs.rename(filePath, backupPath);
                    await writeYamlAsync(filePath, []);
                    console.log(`🔧 [品質チェック] ${basename(filePath)}: 破損ファイルをバックアップして初期化`);
                }
                catch (backupError) {
                    console.error(`❌ [品質チェック] バックアップ失敗:`, backupError);
                }
            }
        }
    }
    /**
     * データ整合性の検証
     */
    async validateDataConsistency() {
        console.log('✓ [整合性チェック] データ一貫性を検証...');
        try {
            // 各学習ファイルのスキーマ検証などを実装
            // 現在は基本的な存在チェックのみ
            const requiredFiles = [
                join(this.learningDataRoot, 'success-patterns.yaml'),
                join(this.learningDataRoot, 'high-engagement.yaml'),
                join(this.learningDataRoot, 'effective-topics.yaml')
            ];
            for (const filePath of requiredFiles) {
                if (!await this.directoryExists(dirname(filePath))) {
                    await writeYamlAsync(filePath, []);
                    console.log(`📝 [整合性チェック] ${basename(filePath)}: ファイルを作成`);
                }
            }
            console.log('✅ [整合性チェック] 完了');
        }
        catch (error) {
            console.error('❌ [整合性チェック] エラー:', error);
        }
    }
    /**
     * 学習データのパフォーマンス最適化
     */
    async optimizeLearningDataPerformance() {
        console.log('⚡ [パフォーマンス最適化] 学習データ最適化...');
        const rules = await this.loadRetentionRules();
        try {
            // ファイルサイズチェック
            const learningFiles = await this.getAllYamlFiles(this.learningDataRoot);
            let totalSize = 0;
            for (const filePath of learningFiles) {
                try {
                    const stats = await fs.stat(filePath);
                    const fileSizeMB = stats.size / (1024 * 1024);
                    totalSize += fileSizeMB;
                    // 個別ファイルサイズ制限
                    if (fileSizeMB > rules.performance_constraints.max_file_size_mb) {
                        console.log(`⚠️ [パフォーマンス] ${basename(filePath)}: サイズ制限超過 (${fileSizeMB.toFixed(2)}MB)`);
                        // 必要に応じて圧縮やデータ削減を実行
                    }
                }
                catch (error) {
                    console.error(`❌ [パフォーマンス] ${filePath}: チェックエラー`, error);
                }
            }
            // 総容量チェック
            if (totalSize > rules.performance_constraints.max_total_learning_data_mb) {
                console.log(`⚠️ [パフォーマンス] 学習データ総容量制限超過: ${totalSize.toFixed(2)}MB`);
                // 追加のクリーンアップを実行
                await this.performEmergencyCleanup();
            }
            else {
                console.log(`✅ [パフォーマンス] 学習データ容量: ${totalSize.toFixed(2)}MB (制限内)`);
            }
        }
        catch (error) {
            console.error('❌ [パフォーマンス最適化] エラー:', error);
        }
    }
    /**
     * 緊急時クリーンアップ
     */
    async performEmergencyCleanup() {
        console.log('🚨 [緊急クリーンアップ] 容量制限により緊急処理を実行...');
        const rules = await this.loadRetentionRules();
        // より厳しい基準でクリーンアップ
        const strictRules = {
            ...rules,
            retention_rules: {
                success_patterns: {
                    ...rules.retention_rules.success_patterns,
                    max_entries: Math.floor(rules.retention_rules.success_patterns.max_entries * 0.6),
                    min_success_rate: rules.retention_rules.success_patterns.min_success_rate * 1.2
                },
                high_engagement: {
                    ...rules.retention_rules.high_engagement,
                    max_entries: Math.floor(rules.retention_rules.high_engagement.max_entries * 0.6),
                    min_engagement_rate: rules.retention_rules.high_engagement.min_engagement_rate * 1.2
                },
                effective_topics: {
                    ...rules.retention_rules.effective_topics,
                    max_entries: Math.floor(rules.retention_rules.effective_topics.max_entries * 0.6),
                    effectiveness_threshold: rules.retention_rules.effective_topics.effectiveness_threshold * 1.1
                }
            },
            value_assessment: {
                ...rules.value_assessment,
                min_total_value_score: rules.value_assessment.min_total_value_score * 1.3
            }
        };
        // 一時的に厳しいルールを適用
        this.retentionRules = strictRules;
        try {
            await this.cleanSuccessPatterns();
            await this.cleanHighEngagementData();
            await this.cleanEffectiveTopics();
            console.log('✅ [緊急クリーンアップ] 完了');
        }
        finally {
            // 元のルールに戻す
            this.retentionRules = null;
        }
    }
}
/**
 * デフォルトエクスポート
 */
export default DataOptimizer;
