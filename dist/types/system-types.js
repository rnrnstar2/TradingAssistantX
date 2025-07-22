/**
 * Consolidated System Types
 *
 * This file consolidates core system and action types:
 * - Action types (from action-types.ts)
 * - Autonomous system types (from autonomous-system.ts)
 * - Shared system interfaces
 */
// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================
export function isDecision(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'id' in obj
        && 'type' in obj
        && 'priority' in obj;
}
export function isExecutionData(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'actionType' in obj;
}
export function isActionDecision(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'id' in obj
        && 'type' in obj
        && 'reasoning' in obj
        && 'params' in obj;
}
