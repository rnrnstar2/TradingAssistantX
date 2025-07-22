#!/usr/bin/env node
import { OptimizationValidator } from '../utils/optimization-metrics.js';
import fs from 'fs';
import path from 'path';
class BaselineMeasurementSystem {
    validator;
    outputDir;
    constructor() {
        this.validator = new OptimizationValidator();
        this.outputDir = 'tasks/20250721_194158_system_optimization/outputs';
        this.ensureOutputDirectory();
    }
    ensureOutputDirectory() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }
    async runBaselineMeasurement() {
        console.log('🔍 Starting baseline performance measurement...');
        try {
            const results = [];
            const numSamples = 5;
            for (let i = 1; i <= numSamples; i++) {
                console.log(`📊 Running baseline sample ${i}/${numSamples}...`);
                const startTime = Date.now();
                const metrics = await this.validator.measureOptimizationEffect();
                const sampleTime = Date.now() - startTime;
                results.push({
                    sample: i,
                    timestamp: new Date().toISOString(),
                    sampleTime,
                    ...metrics
                });
                // Wait between samples
                if (i < numSamples) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            const averageMetrics = this.calculateAverageMetrics(results);
            const baselineReport = this.generateBaselineReport(results, averageMetrics);
            this.saveBaselineResults(results, averageMetrics, baselineReport);
            console.log('✅ Baseline measurement completed successfully');
            console.log(`📄 Results saved to: ${this.outputDir}/`);
        }
        catch (error) {
            console.error('❌ Baseline measurement failed:', error);
            throw error;
        }
    }
    calculateAverageMetrics(results) {
        const numSamples = results.length;
        return {
            contextUsage: {
                before: results.reduce((sum, r) => sum + r.contextUsage.before, 0) / numSamples,
                after: results.reduce((sum, r) => sum + r.contextUsage.after, 0) / numSamples,
                reduction: results.reduce((sum, r) => sum + r.contextUsage.reduction, 0) / numSamples
            },
            executionTime: {
                decisionTime: results.reduce((sum, r) => sum + r.executionTime.decisionTime, 0) / numSamples,
                totalTime: results.reduce((sum, r) => sum + r.executionTime.totalTime, 0) / numSamples,
                improvement: results.reduce((sum, r) => sum + r.executionTime.improvement, 0) / numSamples
            },
            systemHealth: {
                memoryUsage: results.reduce((sum, r) => sum + r.systemHealth.memoryUsage, 0) / numSamples,
                cpuUsage: results.reduce((sum, r) => sum + r.systemHealth.cpuUsage, 0) / numSamples,
                stability: results.reduce((sum, r) => sum + r.systemHealth.stability, 0) / numSamples
            },
            qualityMetrics: {
                decisionAccuracy: results.reduce((sum, r) => sum + r.qualityMetrics.decisionAccuracy, 0) / numSamples,
                contentQuality: results.reduce((sum, r) => sum + r.qualityMetrics.contentQuality, 0) / numSamples,
                userValue: results.reduce((sum, r) => sum + r.qualityMetrics.userValue, 0) / numSamples
            }
        };
    }
    generateBaselineReport(results, averageMetrics) {
        return `# Baseline Performance Measurement Report

## 📊 測定概要
- **測定日時**: ${new Date().toISOString()}
- **サンプル数**: ${results.length}
- **測定間隔**: 2秒
- **システム**: TradingAssistantX 最適化前

## 📈 平均パフォーマンス指標

### コンテキスト使用量
- **最適化前**: ${Math.round(averageMetrics.contextUsage.before)} bytes
- **最適化後**: ${Math.round(averageMetrics.contextUsage.after)} bytes
- **削減率**: ${averageMetrics.contextUsage.reduction.toFixed(1)}%

### 実行時間
- **Claude判断時間**: ${Math.round(averageMetrics.executionTime.decisionTime)}ms
- **総実行時間**: ${Math.round(averageMetrics.executionTime.totalTime)}ms
- **改善率**: ${averageMetrics.executionTime.improvement.toFixed(1)}%

### システムヘルス
- **メモリ使用量**: ${averageMetrics.systemHealth.memoryUsage.toFixed(1)}MB
- **CPU使用率**: ${averageMetrics.systemHealth.cpuUsage.toFixed(1)}%
- **安定性スコア**: ${Math.round(averageMetrics.systemHealth.stability)}

### 品質指標
- **判断精度**: ${Math.round(averageMetrics.qualityMetrics.decisionAccuracy)}点
- **コンテンツ品質**: ${Math.round(averageMetrics.qualityMetrics.contentQuality)}点
- **ユーザー価値**: ${Math.round(averageMetrics.qualityMetrics.userValue)}点

## 📋 詳細結果

| Sample | Decision Time | Total Time | Memory | CPU | Accuracy | Quality |
|--------|---------------|------------|--------|-----|----------|---------|
${results.map(r => `| ${r.sample} | ${Math.round(r.executionTime.decisionTime)}ms | ${Math.round(r.executionTime.totalTime)}ms | ${r.systemHealth.memoryUsage.toFixed(1)}MB | ${r.systemHealth.cpuUsage.toFixed(1)}% | ${Math.round(r.qualityMetrics.decisionAccuracy)} | ${Math.round(r.qualityMetrics.contentQuality)} |`).join('\n')}

## ⚠️ 注意事項
- この結果は最適化前のベースライン性能を示します
- 実際の運用環境での結果は異なる可能性があります
- 最適化後の比較測定が必要です

## 🎯 最適化目標
- **コンテキスト削減**: 30%以上
- **実行時間短縮**: 20%以上  
- **メモリ使用量**: 100MB以下維持
- **判断精度**: 85点以上維持
- **安定性**: 95%以上維持
`;
    }
    saveBaselineResults(results, averageMetrics, report) {
        // Raw data
        fs.writeFileSync(path.join(this.outputDir, 'TASK-004-baseline-raw-data.json'), JSON.stringify(results, null, 2));
        // Average metrics
        fs.writeFileSync(path.join(this.outputDir, 'TASK-004-baseline-metrics.json'), JSON.stringify(averageMetrics, null, 2));
        // Report
        fs.writeFileSync(path.join(this.outputDir, 'TASK-004-baseline-report.md'), report);
    }
}
// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const measurement = new BaselineMeasurementSystem();
    measurement.runBaselineMeasurement().catch(console.error);
}
export { BaselineMeasurementSystem };
