/**
 * Main Types Export Hub
 *
 * This file exports all types from the optimized consolidated type files.
 * Maintains backward compatibility while providing access to the new organized structure.
 */
// ============================================================================
// PRIMARY EXPORTS (conflict-free)
// ============================================================================
export * from './collection-types';
export * from './system-types';
// ============================================================================
// UTILITY TYPE EXPORTS
// ============================================================================
// Export type guards and utility functions from collection types
export { isBaseCollectionResult, isAutonomousCollectionResult, isConvergenceCollectionResult, createCollectionResult, createAutonomousResult, createConvergenceResult } from './collection-types';
// Export type guards and utility functions from system types
export { isDecision, isExecutionData, isActionDecision } from './system-types';
// Export type guards and utility functions from content types
export { calculateOverallQuality, getQualityGrade } from './content-types';
// Export type guards and utility functions from integration types
export { isQualityScore, isAPIResponse } from './integration-types';
// Export type guards and utility functions from decision types
export { isDecision as isDecisionLogging, isExecutionData as isExecutionDataLogging } from './decision-types';
