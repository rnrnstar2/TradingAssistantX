/**
 * Type Guard Functions
 * 
 * Utility functions to safely check types and prevent undefined-related errors
 * Phase 3: undefined安全性改善のためのタイプガード関数
 */

import type { ExecutionMetadata, Context, Decision } from '../types/core-types';
import type { BaseMetadata, CollectionResult } from '../types/data-types';

// ============================================================================
// TIMESTAMP TYPE GUARDS
// ============================================================================

export function hasTimestamp(obj: any): obj is { timestamp: string } {
  return obj && typeof obj.timestamp === 'string';
}

export function hasValidTimestamp(obj: any): obj is { timestamp: number } {
  return obj && typeof obj.timestamp === 'number' && obj.timestamp > 0;
}

export function hasStringTimestamp(obj: any): obj is { timestamp: string } {
  return obj && typeof obj.timestamp === 'string' && obj.timestamp.length > 0;
}

// ============================================================================
// METADATA TYPE GUARDS
// ============================================================================

export function isValidMetadata(obj: any): obj is ExecutionMetadata {
  return obj && 
    typeof obj.startTime === 'number' &&
    (!obj.endTime || typeof obj.endTime === 'number');
}

export function isValidBaseMetadata(obj: any): obj is BaseMetadata {
  return obj && typeof obj === 'object';
}

export function hasExecutionMetadata(obj: any): obj is { metadata: ExecutionMetadata } {
  return obj && obj.metadata && isValidMetadata(obj.metadata);
}

// ============================================================================
// CONTEXT TYPE GUARDS
// ============================================================================

export function isValidContext(obj: any): obj is Context {
  return obj && 
    typeof obj.currentTime === 'number' &&
    obj.accountStatus &&
    Array.isArray(obj.recentActions) &&
    obj.systemState &&
    obj.constraints;
}

export function hasContextMetrics(obj: any): obj is Context & { metrics: any } {
  return isValidContext(obj) && obj.metrics && typeof obj.metrics === 'object';
}

// ============================================================================
// DECISION TYPE GUARDS
// ============================================================================

export function isValidDecision(obj: any): obj is Decision {
  return obj && 
    typeof obj.type === 'string' &&
    typeof obj.reasoning === 'string' &&
    typeof obj.confidence === 'number';
}

export function hasDecisionData(obj: any): obj is Decision & { data: any } {
  return isValidDecision(obj) && obj.data && typeof obj.data === 'object';
}

// ============================================================================
// COLLECTION RESULT TYPE GUARDS
// ============================================================================

export function isValidCollectionResult(obj: any): obj is CollectionResult {
  return obj && 
    typeof obj.source === 'string' &&
    obj.metadata &&
    typeof obj.metadata === 'object';
}

export function hasCollectionContent(obj: any): obj is CollectionResult & { content: any } {
  return isValidCollectionResult(obj) && obj.content !== undefined;
}

// ============================================================================
// SAFE ACCESS UTILITIES
// ============================================================================

/**
 * Safely get timestamp, defaulting to current time if undefined
 */
export function safeTimestamp(data: any): string {
  if (hasTimestamp(data)) {
    return data.timestamp;
  }
  if (hasValidTimestamp(data)) {
    return new Date(data.timestamp).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Safely get numeric timestamp, defaulting to current time if undefined
 */
export function safeNumericTimestamp(data: any): number {
  if (hasValidTimestamp(data)) {
    return data.timestamp;
  }
  if (hasTimestamp(data)) {
    const parsed = new Date(data.timestamp).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
}

/**
 * Safely get array property, defaulting to empty array if undefined
 */
export function safeArray<T>(value: T[] | undefined | null): T[] {
  return value ?? [];
}

/**
 * Safely get string property, defaulting to provided default if undefined
 */
export function safeString(value: string | undefined | null, defaultValue: string = ''): string {
  return value ?? defaultValue;
}

/**
 * Safely get number property, defaulting to provided default if undefined
 */
export function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  return value ?? defaultValue;
}

/**
 * Safely get object property, defaulting to empty object if undefined
 */
export function safeObject<T extends object>(value: T | undefined | null): T | {} {
  return value ?? {};
}

// ============================================================================
// SPECIFIC PROPERTY GUARDS
// ============================================================================

export function hasCategory(obj: any): obj is { category: string } {
  return obj && typeof obj.category === 'string';
}

export function hasImportance(obj: any): obj is { importance: 'high' | 'medium' | 'low' } {
  return obj && 
    typeof obj.importance === 'string' &&
    ['high', 'medium', 'low'].includes(obj.importance);
}

export function hasTags(obj: any): obj is { tags: string[] } {
  return obj && Array.isArray(obj.tags) && obj.tags.every((tag: any) => typeof tag === 'string');
}

export function hasQualityScore(obj: any): obj is { quality_score: number } {
  return obj && typeof obj.quality_score === 'number';
}