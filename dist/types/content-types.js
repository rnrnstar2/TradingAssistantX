/**
 * Content Types
 *
 * This file contains types for content creation and convergence:
 * - Content convergence types (from convergence-types.ts)
 * - Content creation and processing types
 * - Quality assessment and optimization types
 */
// ============================================================================
// QUALITY STANDARDS CONSTANTS
// ============================================================================
export const QUALITY_STANDARDS = {
    required: {
        factualAccuracy: 90,
        readability: 80,
        educationalValue: 75,
        uniqueness: 70,
        engagement: 60,
        timeliness: 70
    },
    preferred: {
        factualAccuracy: 95,
        readability: 90,
        educationalValue: 85,
        uniqueness: 80,
        engagement: 75,
        timeliness: 85
    },
    excellence: {
        factualAccuracy: 98,
        readability: 95,
        educationalValue: 90,
        uniqueness: 85,
        engagement: 80,
        timeliness: 90
    }
};
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
export function isQualityScore(obj) {
    return obj &&
        typeof obj.overall === 'number' &&
        obj.breakdown &&
        typeof obj.grade === 'string';
}
export function isConvergedPost(obj) {
    return obj &&
        typeof obj.id === 'string' &&
        typeof obj.content === 'string' &&
        obj.metadata &&
        Array.isArray(obj.insights) &&
        obj.structure;
}
export function calculateOverallQuality(metrics) {
    const weights = {
        factualAccuracy: 0.25,
        readability: 0.15,
        educationalValue: 0.20,
        uniqueness: 0.15,
        engagement: 0.15,
        timeliness: 0.10
    };
    return (metrics.factualAccuracy * weights.factualAccuracy +
        metrics.readability * weights.readability +
        metrics.educationalValue * weights.educationalValue +
        metrics.uniqueness * weights.uniqueness +
        metrics.engagement * weights.engagement +
        metrics.timeliness * weights.timeliness);
}
export function getQualityGrade(score) {
    if (score >= 95)
        return 'A+';
    if (score >= 90)
        return 'A';
    if (score >= 85)
        return 'B+';
    if (score >= 80)
        return 'B';
    if (score >= 75)
        return 'C+';
    if (score >= 70)
        return 'C';
    if (score >= 60)
        return 'D';
    return 'F';
}
