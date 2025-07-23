/**
 * Core System Types
 *
 * Essential system, action, and error types for TradingAssistantX
 * Simplified from the original 6-file structure for MVP efficiency
 */
// ============================================================================
// TYPE GUARDS
// ============================================================================
export function isActionDecision(obj) {
    return obj &&
        typeof obj.action === 'string' &&
        obj.params &&
        obj.metadata &&
        typeof obj.reasoning === 'string' &&
        typeof obj.confidence === 'number';
}
export function isExecutionResult(obj) {
    return obj &&
        typeof obj.id === 'string' &&
        typeof obj.action === 'string' &&
        typeof obj.success === 'boolean' &&
        typeof obj.timestamp === 'number';
}
export function isSystemError(obj) {
    return obj &&
        typeof obj.code === 'string' &&
        typeof obj.message === 'string' &&
        ['low', 'medium', 'high', 'critical'].includes(obj.severity) &&
        typeof obj.recoverable === 'boolean';
}
export function isValidationError(obj) {
    return isSystemError(obj) &&
        'field' in obj &&
        'expectedType' in obj &&
        typeof obj.field === 'string' &&
        typeof obj.expectedType === 'string';
}
