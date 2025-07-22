/**
 * Consolidated Collection Types
 *
 * This file consolidates all data collection-related type definitions:
 * - Base collection types (from collection-common.ts)
 * - Multi-source collection (from multi-source.ts)
 * - RSS collection (from rss-collection-types.ts)
 * - Adaptive collection (from adaptive-collection.d.ts)
 */
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Type guard functions
 */
export function isBaseCollectionResult(obj) {
    return obj &&
        typeof obj.id === 'string' &&
        obj.content !== undefined &&
        typeof obj.source === 'string' &&
        typeof obj.timestamp === 'number' &&
        obj.metadata !== undefined;
}
export function isAutonomousCollectionResult(obj) {
    return isBaseCollectionResult(obj) &&
        typeof obj.type === 'string' &&
        typeof obj.relevanceScore === 'number';
}
export function isConvergenceCollectionResult(obj) {
    return isBaseCollectionResult(obj) &&
        typeof obj.category === 'string' &&
        typeof obj.importance === 'number' &&
        typeof obj.reliability === 'number' &&
        typeof obj.url === 'string';
}
/**
 * Utility functions for creating collection results
 */
export function createCollectionResult(id, content, source, metadata) {
    return {
        id,
        content,
        source,
        timestamp: Date.now(),
        metadata,
        status: 'success'
    };
}
export function createAutonomousResult(id, content, source, type, relevanceScore, metadata = {}) {
    return {
        id,
        content,
        source,
        type,
        relevanceScore,
        timestamp: Date.now(),
        metadata: {
            ...metadata,
            source,
            category: type
        },
        status: 'success'
    };
}
export function createConvergenceResult(id, content, source, category, importance, reliability, url, metadata = {}) {
    return {
        id,
        content,
        source,
        category,
        importance,
        reliability,
        url,
        timestamp: Date.now(),
        metadata: {
            ...metadata,
            source,
            category,
            url
        },
        status: 'success'
    };
}
