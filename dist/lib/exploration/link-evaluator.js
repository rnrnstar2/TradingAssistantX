import { LINK_INTEREST_PATTERNS } from '../../types/exploration-types';
export class LinkEvaluator {
    evaluateRelevance(linkText, linkUrl) {
        let score = 0;
        for (const pattern of LINK_INTEREST_PATTERNS.highValue) {
            if (pattern.test(linkText) || pattern.test(linkUrl)) {
                score += 30;
            }
        }
        for (const pattern of LINK_INTEREST_PATTERNS.continueExploration) {
            if (pattern.test(linkText) || pattern.test(linkUrl)) {
                score += 15;
            }
        }
        for (const pattern of LINK_INTEREST_PATTERNS.exclude) {
            if (pattern.test(linkText) || pattern.test(linkUrl)) {
                score = Math.max(0, score - 50);
            }
        }
        const fxKeywords = ['FX', 'forex', '為替', 'ドル円', 'ユーロ', '経済指標', '金利', 'FOMC'];
        const matchedKeywords = fxKeywords.filter(keyword => linkText.toLowerCase().includes(keyword.toLowerCase()) ||
            linkUrl.toLowerCase().includes(keyword.toLowerCase()));
        score += matchedKeywords.length * 5;
        return Math.min(100, score);
    }
    evaluateNovelty(linkText, linkUrl) {
        const currentDate = new Date();
        const todayKeywords = ['今日', '本日', '速報', 'breaking'];
        const recentKeywords = ['最新', '新着', 'latest', 'new'];
        let noveltyScore = 50;
        for (const keyword of todayKeywords) {
            if (linkText.includes(keyword) || linkUrl.includes(keyword)) {
                noveltyScore += 20;
                break;
            }
        }
        for (const keyword of recentKeywords) {
            if (linkText.includes(keyword) || linkUrl.includes(keyword)) {
                noveltyScore += 10;
                break;
            }
        }
        const timeBasedPatterns = [
            /\d{4}年\d{1,2}月\d{1,2}日/,
            /\d{1,2}\/\d{1,2}/,
            /\d{2}:\d{2}/
        ];
        for (const pattern of timeBasedPatterns) {
            if (pattern.test(linkText)) {
                noveltyScore += 5;
                break;
            }
        }
        return Math.min(100, noveltyScore);
    }
    evaluateDepthValue(linkText, linkUrl) {
        let depthValue = 40;
        const analysisKeywords = ['分析', '解説', '詳細', 'analysis', 'detailed'];
        const reportKeywords = ['レポート', 'report', '報告'];
        const expertKeywords = ['専門家', 'expert', 'analyst', 'アナリスト'];
        for (const keyword of analysisKeywords) {
            if (linkText.toLowerCase().includes(keyword.toLowerCase()) ||
                linkUrl.toLowerCase().includes(keyword.toLowerCase())) {
                depthValue += 15;
                break;
            }
        }
        for (const keyword of reportKeywords) {
            if (linkText.toLowerCase().includes(keyword.toLowerCase()) ||
                linkUrl.toLowerCase().includes(keyword.toLowerCase())) {
                depthValue += 12;
                break;
            }
        }
        for (const keyword of expertKeywords) {
            if (linkText.toLowerCase().includes(keyword.toLowerCase()) ||
                linkUrl.toLowerCase().includes(keyword.toLowerCase())) {
                depthValue += 18;
                break;
            }
        }
        if (linkText.length > 50) {
            depthValue += 5;
        }
        return Math.min(100, depthValue);
    }
    evaluateUrgency(linkText, linkUrl) {
        let urgencyScore = 30;
        const urgentKeywords = ['緊急', 'urgent', '速報', 'breaking', '重要', 'important'];
        const marketEventKeywords = ['発表', '決定', 'announcement', 'decision'];
        const timeKeywords = ['今', 'now', '直前', '予定'];
        for (const keyword of urgentKeywords) {
            if (linkText.toLowerCase().includes(keyword.toLowerCase()) ||
                linkUrl.toLowerCase().includes(keyword.toLowerCase())) {
                urgencyScore += 25;
                break;
            }
        }
        for (const keyword of marketEventKeywords) {
            if (linkText.toLowerCase().includes(keyword.toLowerCase()) ||
                linkUrl.toLowerCase().includes(keyword.toLowerCase())) {
                urgencyScore += 15;
                break;
            }
        }
        for (const keyword of timeKeywords) {
            if (linkText.toLowerCase().includes(keyword.toLowerCase()) ||
                linkUrl.toLowerCase().includes(keyword.toLowerCase())) {
                urgencyScore += 10;
                break;
            }
        }
        return Math.min(100, urgencyScore);
    }
    assessExplorationValue(link) {
        const relevanceScore = this.evaluateRelevance(link.text, link.url);
        const noveltyScore = this.evaluateNovelty(link.text, link.url);
        const depthValue = this.evaluateDepthValue(link.text, link.url);
        const urgencyScore = this.evaluateUrgency(link.text, link.url);
        return {
            relevanceScore,
            noveltyScore,
            depthValue,
            urgencyScore
        };
    }
    calculatePriority(score) {
        const weights = {
            relevance: 0.4,
            novelty: 0.2,
            depth: 0.25,
            urgency: 0.15
        };
        return (score.relevanceScore * weights.relevance +
            score.noveltyScore * weights.novelty +
            score.depthValue * weights.depth +
            score.urgencyScore * weights.urgency);
    }
    rankLinksByPriority(links) {
        const evaluatedLinks = links.map(link => {
            const score = this.assessExplorationValue(link);
            const priority = this.calculatePriority(score);
            return {
                ...link,
                score,
                priority
            };
        });
        evaluatedLinks.sort((a, b) => b.priority - a.priority);
        return evaluatedLinks.map((link, index) => ({
            ...link,
            rank: index + 1
        }));
    }
    filterByMinimumScore(rankedLinks, minScore) {
        return rankedLinks.filter(link => link.priority >= minScore);
    }
    selectTopLinks(rankedLinks, count) {
        return rankedLinks.slice(0, count);
    }
}
