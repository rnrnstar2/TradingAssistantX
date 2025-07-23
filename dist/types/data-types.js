/**
 * Data and Content Types
 *
 * Collection, content, and configuration types for TradingAssistantX
 * Focused on essential data structures for MVP functionality
 */
// ============================================================================
// COLLECTION RESULT COMPATIBILITY
// ============================================================================
// Type guard functions for CollectionResult compatibility
export function isLegacyCollectionResult(obj) {
    return obj &&
        ('type' in obj || 'content' in obj || 'timestamp' in obj) &&
        typeof obj.source === 'string' &&
        Array.isArray(obj.data);
}
// Safe access function for CollectionResult type
export function getCollectionResultType(result) {
    if (isLegacyCollectionResult(result)) {
        return result.type ?? 'unknown';
    }
    if ('source' in result) {
        return result.source ?? 'modern';
    }
    return 'unknown';
}
// Safe access function for CollectionResult content
export function getCollectionResultContent(result) {
    if (isLegacyCollectionResult(result)) {
        return result.data || result.content;
    }
    if ('content' in result) {
        return result.content;
    }
    return null;
}
// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================
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
        obj.metadata &&
        typeof obj.metadata.confidence === 'number';
}
export function isConvergenceCollectionResult(obj) {
    return isBaseCollectionResult(obj) &&
        obj.metadata &&
        typeof obj.metadata.importance === 'number';
}
export function createCollectionResult(id, content, source, metadata = {}) {
    return {
        source,
        data: Array.isArray(content) ? content : [content],
        metadata: {
            timestamp: new Date().toISOString(),
            count: Array.isArray(content) ? content.length : 1,
            sourceType: source,
            processingTime: 0,
            ...metadata
        },
        success: true
    };
}
export function createAutonomousResult(id, content, source, confidence, reasoning) {
    return {
        id,
        content,
        source,
        timestamp: Date.now(),
        metadata: {
            confidence,
            reasoning,
            priority: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low'
        },
        status: 'success'
    };
}
// Basic quality calculation (simplified for MVP)
export function calculateBasicQuality(metrics) {
    return (metrics.readability + metrics.engagement_prediction + metrics.educational_value) / 3;
}
// 型変換ヘルパー
export function toLegacyResult(result) {
    // Check if it's already a LegacyCollectionResult
    if ('data' in result && 'success' in result) {
        return result;
    }
    // Handle new CollectionResult types
    const newResult = result;
    const isSuccess = newResult.status === 'success' || !newResult.status;
    return {
        source: newResult.source,
        data: Array.isArray(newResult.content) ? newResult.content : [newResult.content],
        metadata: {
            timestamp: new Date(newResult.timestamp).toISOString(),
            count: Array.isArray(newResult.content) ? newResult.content.length : 1,
            sourceType: newResult.source,
            processingTime: 0,
            ...newResult.metadata
        },
        success: isSuccess,
        error: newResult.errors?.[0]
    };
}
