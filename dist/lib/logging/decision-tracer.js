export class DecisionTracer {
    traces = new Map();
    chains = new Map();
    /**
     * Claude判断プロセスの詳細追跡
     */
    traceClaudeReasoning(reasoning) {
        console.log('🔍 [推論追跡] Claude判断プロセスの詳細追跡を開始...');
        const startTime = Date.now();
        const reasoningSteps = this.extractReasoningSteps(reasoning);
        const alternatives = this.identifyAlternatives(reasoning);
        const executionTime = Date.now() - startTime;
        const trace = {
            reasoningSteps,
            confidenceLevel: reasoning.confidence,
            alternativesConsidered: alternatives,
            finalJustification: this.extractFinalJustification(reasoning.reasoning),
            executionTime
        };
        // トレースを保存
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.traces.set(traceId, trace);
        console.log(`✅ [推論追跡完了] ${reasoningSteps.length}ステップ、${alternatives.length}代替案を追跡`);
        return trace;
    }
    /**
     * 意思決定チェーンの構築
     */
    buildDecisionChain(steps) {
        console.log('🔗 [意思決定チェーン] 決定プロセスのチェーン構築開始...');
        const sessionId = steps[0]?.sessionId || 'unknown';
        const branches = this.identifyDecisionBranches(steps);
        const totalExecutionTime = steps.reduce((total, step) => total + step.executionTime, 0);
        const qualityScore = this.calculateChainQuality(steps, branches);
        const chain = {
            sessionId,
            steps,
            branches,
            totalExecutionTime,
            qualityScore
        };
        this.chains.set(sessionId, chain);
        console.log(`✅ [チェーン構築完了] ${steps.length}ステップ、${branches.length}分岐を構築`);
        console.log(`   品質スコア: ${qualityScore.toFixed(2)}/1.0`);
        return chain;
    }
    /**
     * 分岐点・選択理由の分析
     */
    analyzeDecisionBranches(chain) {
        console.log('📊 [分岐分析] 意思決定の分岐点分析開始...');
        const totalBranches = chain.branches.length;
        const branchesExplored = chain.branches.filter(b => b.chosen).length;
        const optimalPathTaken = this.evaluateOptimalPath(chain);
        const improvementSuggestions = this.generateImprovementSuggestions(chain);
        const analysis = {
            totalBranches,
            branchesExplored,
            optimalPathTaken,
            improvementSuggestions
        };
        console.log(`✅ [分岐分析完了] ${totalBranches}分岐中${branchesExplored}探索`);
        console.log(`   最適パス: ${optimalPathTaken ? 'Yes' : 'No'}`);
        console.log(`   改善提案: ${improvementSuggestions.length}件`);
        return analysis;
    }
    /**
     * 判断品質スコアリング
     */
    scoreDecisionQuality(decision, outcome) {
        console.log('🎯 [品質スコアリング] 意思決定品質の評価開始...');
        const reasoningQuality = this.evaluateReasoningQuality(decision.reasoning || '');
        const executionEfficiency = this.evaluateExecutionEfficiency(decision.estimatedDuration || 0, outcome.executionTime);
        const outcomeAccuracy = this.evaluateOutcomeAccuracy(outcome);
        const overallScore = (reasoningQuality + executionEfficiency + outcomeAccuracy) / 3;
        const improvementAreas = this.identifyImprovementAreas(reasoningQuality, executionEfficiency, outcomeAccuracy);
        const qualityScore = {
            overallScore,
            reasoningQuality,
            executionEfficiency,
            outcomeAccuracy,
            improvementAreas,
            timestamp: new Date().toISOString()
        };
        console.log(`✅ [品質評価完了] 総合スコア: ${overallScore.toFixed(2)}/1.0`);
        console.log(`   推論品質: ${reasoningQuality.toFixed(2)}, 実行効率: ${executionEfficiency.toFixed(2)}, 結果精度: ${outcomeAccuracy.toFixed(2)}`);
        return qualityScore;
    }
    /**
     * 推論ステップの抽出
     */
    extractReasoningSteps(reasoning) {
        const steps = [];
        const reasoningText = reasoning.reasoning;
        // 推論テキストから段階的なステップを抽出
        const stepPatterns = [
            /^\d+\.\s*(.+?)$/gm,
            /^-\s*(.+?)$/gm,
            /^Step\s*\d*:?\s*(.+?)$/gm,
            /考慮事項[：:]\s*(.+?)$/gm,
            /判断理由[：:]\s*(.+?)$/gm
        ];
        let stepNumber = 1;
        for (const pattern of stepPatterns) {
            const matches = [...reasoningText.matchAll(pattern)];
            matches.forEach((match, index) => {
                if (match[1] && match[1].trim().length > 10) {
                    steps.push({
                        id: `step-${stepNumber}-${index}`,
                        stepNumber: stepNumber++,
                        description: match[1].trim().substring(0, 200),
                        reasoning: match[1].trim(),
                        confidence: reasoning.confidence * (0.8 + Math.random() * 0.2),
                        data: { extractedFrom: 'reasoning_text' },
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
        // 最低1つのステップは確保
        if (steps.length === 0) {
            steps.push({
                id: 'step-fallback-1',
                stepNumber: 1,
                description: '総合的な判断',
                reasoning: reasoningText.substring(0, 500),
                confidence: reasoning.confidence,
                data: { extractedFrom: 'full_reasoning' },
                timestamp: new Date().toISOString()
            });
        }
        return steps;
    }
    /**
     * 代替案の特定
     */
    identifyAlternatives(reasoning) {
        const alternatives = [];
        const reasoningText = reasoning.reasoning;
        // 代替案を示すパターン
        const alternativePatterns = [
            /代替案[：:]?\s*(.+?)$/gm,
            /他の選択肢[：:]?\s*(.+?)$/gm,
            /alternatively[：:]?\s*(.+?)$/gim,
            /一方で[：:]?\s*(.+?)$/gm,
            /しかし[：:]?\s*(.+?)$/gm
        ];
        let altId = 1;
        for (const pattern of alternativePatterns) {
            const matches = [...reasoningText.matchAll(pattern)];
            matches.forEach(match => {
                if (match[1] && match[1].trim().length > 20) {
                    alternatives.push({
                        id: `alt-${altId++}`,
                        description: match[1].trim().substring(0, 200),
                        reasoning: `代替案として考慮: ${match[1].trim()}`,
                        score: 0.3 + Math.random() * 0.4,
                        rejected: true
                    });
                }
            });
        }
        return alternatives;
    }
    /**
     * 最終判断理由の抽出
     */
    extractFinalJustification(reasoning) {
        // 最終的な判断を示すパターン
        const finalPatterns = [
            /最終的に[：:]?\s*(.+?)$/m,
            /結論[：:]?\s*(.+?)$/m,
            /よって[：:]?\s*(.+?)$/m,
            /そのため[：:]?\s*(.+?)$/m,
            /決定[：:]?\s*(.+?)$/m
        ];
        for (const pattern of finalPatterns) {
            const match = reasoning.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        // パターンにマッチしない場合は最後の200文字
        return reasoning.slice(-200).trim();
    }
    /**
     * 決定分岐の特定
     */
    identifyDecisionBranches(steps) {
        const branches = [];
        for (let i = 0; i < steps.length - 1; i++) {
            const currentStep = steps[i];
            const nextStep = steps[i + 1];
            // 信頼度が大きく変化している場合は分岐点とみなす
            if (Math.abs(currentStep.confidenceLevel - nextStep.confidenceLevel) > 0.2) {
                branches.push({
                    id: `branch-${i}-${i + 1}`,
                    parentStepId: currentStep.id,
                    branchType: nextStep.confidenceLevel > currentStep.confidenceLevel ? 'alternative' : 'fallback',
                    condition: `信頼度変化: ${currentStep.confidenceLevel} → ${nextStep.confidenceLevel}`,
                    reasoning: `ステップ${i}から${i + 1}での判断変更`,
                    chosen: true
                });
            }
        }
        return branches;
    }
    /**
     * チェーン品質の計算
     */
    calculateChainQuality(steps, branches) {
        // 基本品質スコア（ステップの平均信頼度）
        const avgConfidence = steps.reduce((sum, step) => sum + step.confidenceLevel, 0) / steps.length;
        // 分岐効率性（適度な分岐探索を評価）
        const branchEfficiency = Math.min(1.0, branches.length / Math.max(1, steps.length * 0.3));
        // 実行効率性（ステップ間の時間効率）
        const avgStepTime = steps.reduce((sum, step) => sum + step.executionTime, 0) / steps.length;
        const timeEfficiency = Math.max(0, 1 - (avgStepTime - 1000) / 10000); // 1秒を基準とした効率性
        return (avgConfidence * 0.5 + branchEfficiency * 0.3 + timeEfficiency * 0.2);
    }
    /**
     * 最適パス評価
     */
    evaluateOptimalPath(chain) {
        // 品質スコアが0.7以上で分岐探索も適切な場合を最適とする
        return chain.qualityScore >= 0.7 &&
            chain.branches.length >= 1 &&
            chain.branches.some(b => b.chosen);
    }
    /**
     * 改善提案の生成
     */
    generateImprovementSuggestions(chain) {
        const suggestions = [];
        if (chain.qualityScore < 0.6) {
            suggestions.push('推論プロセスの品質向上が必要');
        }
        if (chain.branches.length === 0) {
            suggestions.push('代替案の検討プロセスを追加');
        }
        if (chain.totalExecutionTime > 30000) {
            suggestions.push('実行時間の最適化が必要');
        }
        const lowConfidenceSteps = chain.steps.filter(s => s.confidenceLevel < 0.5);
        if (lowConfidenceSteps.length > 0) {
            suggestions.push(`信頼度の低いステップ(${lowConfidenceSteps.length}件)の改善が必要`);
        }
        return suggestions;
    }
    /**
     * 推論品質の評価
     */
    evaluateReasoningQuality(reasoning) {
        let score = 0.5; // 基準スコア
        // 文字数による評価（適度な詳細度）
        if (reasoning.length > 100 && reasoning.length < 1000)
            score += 0.1;
        // 論理構造の評価
        if (reasoning.includes('理由') || reasoning.includes('なぜなら') || reasoning.includes('because'))
            score += 0.1;
        if (reasoning.includes('そのため') || reasoning.includes('よって') || reasoning.includes('therefore'))
            score += 0.1;
        // 具体性の評価
        if (/\d+/.test(reasoning))
            score += 0.1; // 数値的根拠
        if (reasoning.includes('データ') || reasoning.includes('分析') || reasoning.includes('結果'))
            score += 0.1;
        // 総合判断の有無
        if (reasoning.includes('総合') || reasoning.includes('結論') || reasoning.includes('判断'))
            score += 0.1;
        return Math.min(1.0, score);
    }
    /**
     * 実行効率の評価
     */
    evaluateExecutionEfficiency(estimated, actual) {
        if (actual <= 0)
            return 0.5;
        const ratio = estimated / actual;
        // 予想時間に近いほど高スコア
        if (ratio >= 0.8 && ratio <= 1.2)
            return 1.0;
        if (ratio >= 0.6 && ratio <= 1.5)
            return 0.8;
        if (ratio >= 0.4 && ratio <= 2.0)
            return 0.6;
        return 0.4;
    }
    /**
     * 結果精度の評価
     */
    evaluateOutcomeAccuracy(outcome) {
        let score = outcome.success ? 0.7 : 0.3;
        // エラーの有無
        if (!outcome.errors || outcome.errors.length === 0)
            score += 0.1;
        // 警告の有無
        if (!outcome.warnings || outcome.warnings.length === 0)
            score += 0.1;
        // 出力の有無
        if (outcome.output)
            score += 0.1;
        return Math.min(1.0, score);
    }
    /**
     * 改善領域の特定
     */
    identifyImprovementAreas(reasoning, efficiency, accuracy) {
        const areas = [];
        if (reasoning < 0.7)
            areas.push('推論の詳細化と論理構造の改善');
        if (efficiency < 0.7)
            areas.push('実行時間の予測精度向上');
        if (accuracy < 0.7)
            areas.push('実行結果の品質向上');
        return areas;
    }
    /**
     * 保存されたトレースの取得
     */
    getTrace(traceId) {
        return this.traces.get(traceId);
    }
    /**
     * 保存されたチェーンの取得
     */
    getChain(sessionId) {
        return this.chains.get(sessionId);
    }
    /**
     * トレース統計の取得
     */
    getTraceStatistics() {
        const traces = Array.from(this.traces.values());
        const chains = Array.from(this.chains.values());
        return {
            totalTraces: traces.length,
            totalChains: chains.length,
            averageConfidence: traces.reduce((sum, t) => sum + t.confidenceLevel, 0) / traces.length || 0,
            averageExecutionTime: traces.reduce((sum, t) => sum + t.executionTime, 0) / traces.length || 0,
            averageChainQuality: chains.reduce((sum, c) => sum + c.qualityScore, 0) / chains.length || 0
        };
    }
}
