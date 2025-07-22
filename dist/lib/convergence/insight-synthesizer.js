/**
 * 洞察統合器
 * 収集された情報から価値あるインサイトを抽出・統合する
 */
export class InsightSynthesizer {
    /**
     * 情報パターンの発見
     * 大量のデータから共通パターンや繰り返し要素を特定
     */
    discoverInformationPatterns(data) {
        const patterns = [];
        const patternMap = new Map();
        // キーワード抽出とパターン分析
        for (const item of data) {
            const keywords = this.extractKeywords(item.content);
            const themes = this.identifyThemes(keywords);
            for (const theme of themes) {
                if (!patternMap.has(theme)) {
                    patternMap.set(theme, { count: 0, sources: new Set(), keywords: [] });
                }
                const pattern = patternMap.get(theme);
                pattern.count++;
                pattern.sources.add(item.source);
                pattern.keywords.push(...keywords.filter(k => k.toLowerCase().includes(theme.toLowerCase())));
            }
        }
        // パターンの重要度算出
        for (const [theme, info] of patternMap.entries()) {
            if (info.count >= 2) { // 最低2回以上言及されたパターンのみ
                patterns.push({
                    id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    pattern: theme,
                    frequency: info.count,
                    significance: this.calculatePatternSignificance(info.count, info.sources.size, data.length),
                    sources: Array.from(info.sources),
                    category: this.categorizePattern(theme, info.keywords)
                });
            }
        }
        return patterns.sort((a, b) => b.significance - a.significance);
    }
    /**
     * 重複情報の知的統合
     * 類似情報を統合して価値を高める
     */
    synthesizeDuplicateInformation(similar) {
        if (similar.length === 0) {
            throw new Error('統合対象の情報がありません');
        }
        // 信頼性の高い情報を基準とする
        const sortedByReliability = similar.sort((a, b) => b.reliability - a.reliability);
        const baseInfo = sortedByReliability[0];
        // 共通要素の抽出
        const commonElements = this.extractCommonElements(similar);
        const uniqueElements = this.extractUniqueElements(similar);
        // 統合コンテンツの生成
        const synthesizedContent = this.generateSynthesizedContent(baseInfo, commonElements, uniqueElements, similar);
        // 一貫性スコアの計算
        const consistency = this.calculateConsistencyScore(similar);
        return {
            id: `synthesized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            synthesizedContent,
            sourceInsights: similar.map(s => s.id),
            confidence: Math.min(95, baseInfo.reliability + consistency * 10),
            consistency,
            addedValue: this.identifyAddedValue(commonElements, uniqueElements)
        };
    }
    /**
     * 矛盾情報の解決
     * 相反する情報から最も信頼できる見解を導出
     */
    resolveConflictingInformation(conflicts) {
        const resolved = [];
        for (const conflict of conflicts) {
            const resolution = this.analyzeConflict(conflict);
            resolved.push({
                id: `resolved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                resolution: resolution.conclusion,
                resolutionMethod: resolution.method,
                confidence: resolution.confidence,
                explanation: resolution.explanation
            });
        }
        return resolved;
    }
    /**
     * 隠れた関連性の発見
     * 一見無関係な情報間の関連性を発見
     */
    discoverHiddenConnections(data) {
        const connections = [];
        // 時系列的関連性の分析
        const timeConnections = this.analyzeTemporalConnections(data);
        connections.push(...timeConnections);
        // テーマ的関連性の分析
        const thematicConnections = this.analyzeThematicConnections(data);
        connections.push(...thematicConnections);
        // 因果関係の分析
        const causalConnections = this.analyzeCausalConnections(data);
        connections.push(...causalConnections);
        // 相関関係の分析
        const correlativeConnections = this.analyzeCorrelativeConnections(data);
        connections.push(...correlativeConnections);
        return connections.sort((a, b) => b.strength - a.strength);
    }
    // プライベートヘルパーメソッド
    extractKeywords(content) {
        // 基本的なキーワード抽出ロジック
        const text = content.toLowerCase();
        const words = text.match(/[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}/g) || [];
        // FX関連の重要キーワード
        const fxKeywords = [
            'usd', 'eur', 'jpy', 'gbp', 'chf', 'aud', 'cad', 'nzd',
            'ドル', '円', 'ユーロ', 'ポンド', '金利', '中央銀行',
            'fed', 'ecb', 'boj', '日銀', 'fomc',
            '経済指標', 'gdp', 'cpi', 'pmi', '雇用統計',
            'テクニカル', 'ファンダメンタル', 'レジスタンス', 'サポート'
        ];
        return words.filter(word => word.length > 2 &&
            (fxKeywords.includes(word) || this.isImportantWord(word)));
    }
    identifyThemes(keywords) {
        const themes = [];
        // 通貨ペア関連
        const currencies = keywords.filter(k => ['usd', 'eur', 'jpy', 'gbp', 'ドル', '円', 'ユーロ'].includes(k));
        if (currencies.length > 0) {
            themes.push('currency_movement');
        }
        // 金融政策関連
        const monetaryPolicy = keywords.filter(k => ['金利', '中央銀行', 'fed', 'ecb', 'boj'].includes(k));
        if (monetaryPolicy.length > 0) {
            themes.push('monetary_policy');
        }
        // 経済指標関連
        const indicators = keywords.filter(k => ['gdp', 'cpi', 'pmi', '雇用統計', '経済指標'].includes(k));
        if (indicators.length > 0) {
            themes.push('economic_indicators');
        }
        // テクニカル分析関連
        const technical = keywords.filter(k => ['テクニカル', 'レジスタンス', 'サポート'].includes(k));
        if (technical.length > 0) {
            themes.push('technical_analysis');
        }
        return themes;
    }
    calculatePatternSignificance(frequency, sourceCount, totalData) {
        // 頻度、情報源の多様性、全体に対する割合を考慮
        const frequencyScore = Math.min(100, (frequency / totalData) * 200);
        const diversityScore = Math.min(100, sourceCount * 20);
        const relevanceScore = frequency > totalData * 0.1 ? 100 : frequency / (totalData * 0.1) * 100;
        return (frequencyScore + diversityScore + relevanceScore) / 3;
    }
    categorizePattern(theme, keywords) {
        const categories = {
            'currency_movement': 'market_trend',
            'monetary_policy': 'economic_indicator',
            'economic_indicators': 'economic_indicator',
            'technical_analysis': 'analysis',
            'market_sentiment': 'expert_opinion'
        };
        return categories[theme] || 'general';
    }
    extractCommonElements(data) {
        const elementFrequency = new Map();
        for (const item of data) {
            const keywords = this.extractKeywords(item.content);
            for (const keyword of keywords) {
                elementFrequency.set(keyword, (elementFrequency.get(keyword) || 0) + 1);
            }
        }
        const threshold = Math.max(2, data.length * 0.5);
        return Array.from(elementFrequency.entries())
            .filter(([_, freq]) => freq >= threshold)
            .map(([element, _]) => element);
    }
    extractUniqueElements(data) {
        const allElements = new Set();
        const uniqueElements = [];
        for (const item of data) {
            const keywords = this.extractKeywords(item.content);
            for (const keyword of keywords) {
                if (!allElements.has(keyword)) {
                    allElements.add(keyword);
                    if (this.isValuableUniqueElement(keyword, item)) {
                        uniqueElements.push(keyword);
                    }
                }
            }
        }
        return uniqueElements;
    }
    generateSynthesizedContent(baseInfo, commonElements, uniqueElements, allInfo) {
        // 統合コンテンツの基本構造を構築
        const sources = allInfo.map(info => info.source).join(', ');
        const timespan = this.calculateTimespan(allInfo);
        let synthesized = `複数の信頼できる情報源（${sources}）からの分析によると、`;
        // 共通要素の統合
        if (commonElements.length > 0) {
            synthesized += `${commonElements.join('、')}に関する一貫した見解が示されている。`;
        }
        // ベース情報の核心部分
        synthesized += ` ${this.extractCoreMessage(baseInfo.content)}`;
        // 独自要素の価値追加
        if (uniqueElements.length > 0) {
            synthesized += ` 特筆すべき点として、${uniqueElements.slice(0, 3).join('、')}についての独自の視点も提示されている。`;
        }
        // 時間的文脈の追加
        if (timespan.isRecent) {
            synthesized += ` これらの情報は${timespan.description}のものであり、現在の市場状況を反映している。`;
        }
        return synthesized;
    }
    calculateConsistencyScore(data) {
        if (data.length <= 1)
            return 100;
        // 信頼性の分散を基に一貫性を評価
        const reliabilities = data.map(d => d.reliability);
        const avg = reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length;
        const variance = reliabilities.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / reliabilities.length;
        // 分散が小さいほど一貫性が高い
        return Math.max(0, 100 - Math.sqrt(variance));
    }
    identifyAddedValue(commonElements, uniqueElements) {
        let value = '';
        if (commonElements.length > 0) {
            value += `複数情報源での一致により信頼性向上（${commonElements.length}要素）`;
        }
        if (uniqueElements.length > 0) {
            if (value)
                value += '、';
            value += `新規視点の追加（${uniqueElements.length}要素）`;
        }
        return value || '情報統合による包括性向上';
    }
    analyzeConflict(conflict) {
        const sources = conflict.conflictingSources;
        // 権威性による解決を試行
        const authorityResult = this.resolveByAuthority(sources);
        if (authorityResult.confidence > 80) {
            return {
                conclusion: authorityResult.conclusion,
                method: 'authority',
                confidence: authorityResult.confidence,
                explanation: `信頼性の高い情報源（${authorityResult.source}）の見解を採用`
            };
        }
        // 最新性による解決を試行
        const recencyResult = this.resolveByRecency(sources);
        if (recencyResult.confidence > 70) {
            return {
                conclusion: recencyResult.conclusion,
                method: 'recency',
                confidence: recencyResult.confidence,
                explanation: `最新の情報（${new Date(recencyResult.timestamp).toLocaleString()}）を採用`
            };
        }
        // 証拠の量による解決
        const evidenceResult = this.resolveByEvidence(sources);
        return {
            conclusion: evidenceResult.conclusion,
            method: 'evidence',
            confidence: evidenceResult.confidence,
            explanation: `より多くの裏付けデータを持つ見解を採用`
        };
    }
    analyzeTemporalConnections(data) {
        const connections = [];
        const sortedByTime = data.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < sortedByTime.length - 1; i++) {
            const current = sortedByTime[i];
            const next = sortedByTime[i + 1];
            const timeDiff = next.timestamp - current.timestamp;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            if (hoursDiff <= 24 && this.hasTemporalRelation(current, next)) {
                connections.push({
                    id: `temporal_${Date.now()}_${i}`,
                    connectedInsights: [current.id, next.id],
                    connectionType: 'temporal',
                    strength: this.calculateTemporalStrength(hoursDiff, current, next),
                    explanation: `${hoursDiff.toFixed(1)}時間以内の関連する動きを検出`
                });
            }
        }
        return connections;
    }
    analyzeThematicConnections(data) {
        const connections = [];
        for (let i = 0; i < data.length; i++) {
            for (let j = i + 1; j < data.length; j++) {
                const thematicStrength = this.calculateThematicSimilarity(data[i], data[j]);
                if (thematicStrength > 60) {
                    connections.push({
                        id: `thematic_${i}_${j}`,
                        connectedInsights: [data[i].id, data[j].id],
                        connectionType: 'thematic',
                        strength: thematicStrength,
                        explanation: `共通テーマによる関連性を検出`
                    });
                }
            }
        }
        return connections;
    }
    analyzeCausalConnections(data) {
        const connections = [];
        const causalPatterns = [
            { cause: ['金利', '利上げ'], effect: ['ドル高', '通貨高'] },
            { cause: ['gdp', '成長'], effect: ['通貨', '強い'] },
            { cause: ['インフレ', 'cpi'], effect: ['金利', '政策'] }
        ];
        for (const pattern of causalPatterns) {
            const causes = data.filter(d => pattern.cause.some(c => d.content.toLowerCase().includes(c)));
            const effects = data.filter(d => pattern.effect.some(e => d.content.toLowerCase().includes(e)));
            for (const cause of causes) {
                for (const effect of effects) {
                    if (cause.timestamp <= effect.timestamp) {
                        connections.push({
                            id: `causal_${cause.id}_${effect.id}`,
                            connectedInsights: [cause.id, effect.id],
                            connectionType: 'causal',
                            strength: this.calculateCausalStrength(cause, effect, pattern),
                            explanation: `因果関係パターンを検出: ${pattern.cause.join('/')} → ${pattern.effect.join('/')}`
                        });
                    }
                }
            }
        }
        return connections;
    }
    analyzeCorrelativeConnections(data) {
        const connections = [];
        // 相関パターンの検出（例：同じ時期の似たような市場反応）
        const timeGroups = this.groupByTimeWindow(data, 3600000); // 1時間窓
        for (const group of timeGroups) {
            if (group.length >= 2) {
                const correlations = this.findCorrelationsInGroup(group);
                connections.push(...correlations);
            }
        }
        return connections;
    }
    // さらなるヘルパーメソッド
    isImportantWord(word) {
        const importantPatterns = [
            /\d+(\.\d+)?%/, // パーセンテージ
            /\d+(\.\d+)?bp/, // ベーシスポイント
            /\d+(\.\d+)?円/, // 価格
            /\d+(\.\d+)?ドル/
        ];
        return importantPatterns.some(pattern => pattern.test(word));
    }
    isValuableUniqueElement(element, item) {
        // 価値のある独自要素かどうかを判定
        return item.importance > 70 && element.length > 2;
    }
    extractCoreMessage(content) {
        // コンテンツの核心部分を抽出
        const sentences = content.split(/[。．.!?！？]/);
        return sentences.find(s => s.length > 20 && s.length < 150) || sentences[0] || content.substring(0, 100);
    }
    calculateTimespan(data) {
        const timestamps = data.map(d => d.timestamp);
        const oldest = Math.min(...timestamps);
        const newest = Math.max(...timestamps);
        const now = Date.now();
        const hoursOld = (now - newest) / (1000 * 60 * 60);
        if (hoursOld < 2) {
            return { isRecent: true, description: '直近2時間以内' };
        }
        else if (hoursOld < 24) {
            return { isRecent: true, description: '本日' };
        }
        else if (hoursOld < 168) {
            return { isRecent: true, description: '今週' };
        }
        return { isRecent: false, description: `${Math.floor(hoursOld / 24)}日前から` };
    }
    resolveByAuthority(sources) {
        const highestReliability = Math.max(...sources.map(s => s.reliability));
        const authoritative = sources.find(s => s.reliability === highestReliability);
        return {
            conclusion: authoritative.content,
            confidence: authoritative.reliability,
            source: authoritative.source
        };
    }
    resolveByRecency(sources) {
        const latest = sources.sort((a, b) => b.timestamp - a.timestamp)[0];
        return {
            conclusion: latest.content,
            confidence: Math.min(90, latest.reliability + 10),
            timestamp: latest.timestamp
        };
    }
    resolveByEvidence(sources) {
        // 最も詳細な（文字数の多い）コンテンツを証拠が多いと仮定
        const mostDetailed = sources.sort((a, b) => b.content.length - a.content.length)[0];
        return {
            conclusion: mostDetailed.content,
            confidence: Math.min(85, mostDetailed.reliability + sources.length * 5)
        };
    }
    hasTemporalRelation(current, next) {
        // キーワードの共通性で時系列関連を判定
        const currentKeywords = this.extractKeywords(current.content);
        const nextKeywords = this.extractKeywords(next.content);
        const commonCount = currentKeywords.filter(k => nextKeywords.includes(k)).length;
        return commonCount >= 2;
    }
    calculateTemporalStrength(hoursDiff, current, next) {
        const timeScore = Math.max(0, 100 - hoursDiff * 4); // 時間が近いほど高スコア
        const contentSimilarity = this.calculateThematicSimilarity(current, next);
        return (timeScore + contentSimilarity) / 2;
    }
    calculateThematicSimilarity(item1, item2) {
        const keywords1 = new Set(this.extractKeywords(item1.content));
        const keywords2 = new Set(this.extractKeywords(item2.content));
        const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
        const union = new Set([...keywords1, ...keywords2]);
        return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
    }
    calculateCausalStrength(cause, effect, pattern) {
        const timeGap = effect.timestamp - cause.timestamp;
        const maxRelevantGap = 24 * 60 * 60 * 1000; // 24時間
        if (timeGap > maxRelevantGap)
            return 0;
        const timeScore = (maxRelevantGap - timeGap) / maxRelevantGap * 100;
        const patternMatch = this.calculatePatternMatch(cause, effect, pattern);
        return (timeScore + patternMatch) / 2;
    }
    calculatePatternMatch(cause, effect, pattern) {
        const causeMatches = pattern.cause.filter((c) => cause.content.toLowerCase().includes(c)).length;
        const effectMatches = pattern.effect.filter((e) => effect.content.toLowerCase().includes(e)).length;
        const totalPatterns = pattern.cause.length + pattern.effect.length;
        const totalMatches = causeMatches + effectMatches;
        return (totalMatches / totalPatterns) * 100;
    }
    groupByTimeWindow(data, windowMs) {
        const groups = [];
        const sorted = data.sort((a, b) => a.timestamp - b.timestamp);
        let currentGroup = [];
        let windowStart = 0;
        for (const item of sorted) {
            if (currentGroup.length === 0) {
                windowStart = item.timestamp;
                currentGroup.push(item);
            }
            else if (item.timestamp - windowStart <= windowMs) {
                currentGroup.push(item);
            }
            else {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = [item];
                windowStart = item.timestamp;
            }
        }
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        return groups;
    }
    findCorrelationsInGroup(group) {
        const connections = [];
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const correlation = this.calculateCorrelation(group[i], group[j]);
                if (correlation > 70) {
                    connections.push({
                        id: `correlative_${group[i].id}_${group[j].id}`,
                        connectedInsights: [group[i].id, group[j].id],
                        connectionType: 'correlative',
                        strength: correlation,
                        explanation: `同時期の関連する市場反応を検出`
                    });
                }
            }
        }
        return connections;
    }
    calculateCorrelation(item1, item2) {
        // 簡化された相関計算（テーマ類似性＋重要度＋信頼性）
        const thematicSim = this.calculateThematicSimilarity(item1, item2);
        const importanceAlignment = 100 - Math.abs(item1.importance - item2.importance);
        const reliabilityAlignment = 100 - Math.abs(item1.reliability - item2.reliability);
        return (thematicSim + importanceAlignment + reliabilityAlignment) / 3;
    }
}
