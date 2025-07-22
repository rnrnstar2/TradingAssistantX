/**
 * Consolidated Decision Types
 *
 * This file consolidates decision and decision logging types:
 * - Core decision types (from original decision-types.ts)
 * - Decision logging types (from decision-logging-types.ts)
 * - Performance monitoring and visualization types
 */
// ============================================================================
// CORE DECISION TYPES
// ============================================================================
export var CollectionMethod;
(function (CollectionMethod) {
    CollectionMethod["SIMPLE_HTTP"] = "http";
    CollectionMethod["PLAYWRIGHT_STEALTH"] = "stealth";
    CollectionMethod["API_PREFERRED"] = "api";
    CollectionMethod["HYBRID"] = "hybrid";
})(CollectionMethod || (CollectionMethod = {}));
// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================
export function isDecision(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'id' in obj
        && 'type' in obj
        && 'reasoning' in obj
        && 'confidence' in obj;
}
export function isExecutionData(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'actionType' in obj;
}
