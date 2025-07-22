import { writeFileSync } from 'fs';
import { FXUnifiedCollector } from './fx-unified-collector';
import * as yaml from 'js-yaml';
/**
 * 次世代FXデータ収集システム
 * X依存から脱却し、API・構造化サイト中心の高品質データ収集
 */
export async function scrapeTargets() {
    const testMode = process.env.X_TEST_MODE === 'true';
    if (testMode) {
        console.log('🚀 次世代FX専門データ収集システム起動');
    }
    const collector = new FXUnifiedCollector({
        enableAPI: true,
        enableStructuredSites: true,
        enableLegacyX: testMode, // テストモードでのみレガシーX使用
        maxResults: 100,
        prioritizeAPIs: true
    });
    try {
        console.log('📊 [FX収集開始] API + 構造化サイト並列収集');
        const { results: collectionResults, stats } = await collector.collectAllFXData();
        // CollectionResultをScrapedDataに変換
        const results = collectionResults.map((result) => ({
            content: result.content,
            url: result.metadata?.url || result.source || 'fx-data',
            timestamp: result.timestamp,
            source: result.source || 'fx-unified-collector',
            metadata: result.metadata // 拡張メタデータを保持
        }));
        // 結果をYAMLファイルに出力
        writeFileSync('data/scraped.yaml', yaml.dump(results, {
            indent: 2,
            flowLevel: -1, // 常に展開形式
            noRefs: true // 参照使用しない
        }));
        // 統計情報をログ出力
        console.log(`✅ [FX収集完了] ${results.length}件取得`);
        console.log(`📈 [詳細統計] API: ${stats.apiResults}, サイト: ${stats.structuredSiteResults}, 実行時間: ${stats.executionTimeMs}ms`);
        // 成功ソース表示
        if (stats.successfulSources.length > 0) {
            console.log(`🎯 [成功ソース] ${stats.successfulSources.join(', ')}`);
        }
        // 失敗ソース警告
        if (stats.failedSources.length > 0) {
            console.warn(`⚠️ [失敗ソース] ${stats.failedSources.join(', ')}`);
        }
        return results;
    }
    catch (error) {
        console.error('❌ [FX収集エラー]:', error);
        // エラー時のフォールバック処理
        console.log('🔄 [フォールバック] 最小限のデータ収集を試行');
        return await fallbackCollection(collector);
    }
    finally {
        // リソースクリーンアップ
        await collector.cleanup();
    }
}
/**
 * エラー時のフォールバック収集
 */
async function fallbackCollection(collector) {
    try {
        // 最小限の設定で再試行
        const fallbackCollector = new FXUnifiedCollector({
            enableAPI: false,
            enableStructuredSites: true,
            enableLegacyX: false,
            maxResults: 20,
            timeoutMs: 30000
        });
        const { results } = await fallbackCollector.collectAllFXData();
        const fallbackResults = results.map(result => ({
            content: result.content,
            url: result.source || 'fallback',
            timestamp: result.timestamp,
            source: `fallback_${result.source}`,
            metadata: { isFallback: true, ...result.metadata }
        }));
        console.log(`🆘 [フォールバック成功] ${fallbackResults.length}件取得`);
        // フォールバック結果も保存
        writeFileSync('data/scraped.yaml', yaml.dump(fallbackResults, { indent: 2 }));
        await fallbackCollector.cleanup();
        return fallbackResults;
    }
    catch (fallbackError) {
        console.error('❌ [フォールバック失敗]:', fallbackError);
        // 最終フォールバック: 空の結果
        const emptyResults = [{
                content: 'FXデータ収集システムが一時的に利用できません。システム管理者にお問い合わせください。',
                url: 'system-error',
                timestamp: Date.now(),
                source: 'error-handler',
                metadata: { isError: true, errorTime: new Date().toISOString() }
            }];
        writeFileSync('data/scraped.yaml', yaml.dump(emptyResults, { indent: 2 }));
        return emptyResults;
    }
}
if (require.main === module) {
    scrapeTargets().catch((error) => {
        console.error('❌ [スクレイパー] 実行エラー:', error);
        process.exit(1);
    });
}
