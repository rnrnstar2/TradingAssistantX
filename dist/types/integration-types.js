/**
 * Integration Types
 *
 * This file contains types for external tool integrations:
 * - Claude tool integrations (from claude-tools.ts)
 * - Browser automation types
 * - Analysis tool types
 */
export function isQualityScore(obj) {
    return obj &&
        typeof obj.score === 'number' &&
        Array.isArray(obj.criteria) &&
        Array.isArray(obj.issues);
}
export function isAPIResponse(obj) {
    return obj &&
        typeof obj.success === 'boolean' &&
        typeof obj.statusCode === 'number' &&
        typeof obj.responseTime === 'number';
}
