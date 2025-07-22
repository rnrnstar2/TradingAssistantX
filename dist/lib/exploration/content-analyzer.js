export class ContentAnalyzer {
    extractFXContent(html, url) {
        const title = this.extractTitle(html);
        const textContent = this.extractTextContent(html);
        const summary = this.generateSummary(textContent);
        const keyPoints = this.extractKeyPoints(textContent);
        const marketData = this.extractMarketData(textContent);
        const economicIndicators = this.extractEconomicIndicators(textContent);
        const expertOpinions = this.extractExpertOpinions(textContent);
        const publishedAt = this.extractPublishDate(html, textContent);
        const confidence = this.calculateConfidence(textContent, title);
        return {
            title,
            summary,
            keyPoints,
            marketData,
            economicIndicators,
            expertOpinions,
            publishedAt,
            confidence
        };
    }
    extractTitle(html) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch) {
            return titleMatch[1].replace(/&[^;]+;/g, '').trim();
        }
        const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) {
            return h1Match[1].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
        }
        return 'タイトル未取得';
    }
    extractTextContent(html) {
        let text = html
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[^;]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return text;
    }
    generateSummary(textContent) {
        const sentences = textContent.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
        const fxRelatedSentences = sentences.filter(sentence => {
            const fxKeywords = ['為替', 'ドル円', 'FX', '円安', '円高', '金利', '経済指標'];
            return fxKeywords.some(keyword => sentence.includes(keyword));
        });
        if (fxRelatedSentences.length >= 3) {
            return fxRelatedSentences.slice(0, 3).join('。') + '。';
        }
        return sentences.slice(0, 2).join('。') + '。';
    }
    extractKeyPoints(textContent) {
        const keyPoints = [];
        const listItems = textContent.match(/(?:・|1\.|2\.|3\.|①|②|③)(.*?)(?=・|1\.|2\.|3\.|①|②|③|$)/g);
        if (listItems) {
            keyPoints.push(...listItems.map(item => item.replace(/^(・|1\.|2\.|3\.|①|②|③)/, '').trim()).filter(item => item.length > 5));
        }
        const importantSentences = textContent.split(/[。！？.!?]/).filter(sentence => {
            const importantKeywords = ['重要', 'ポイント', '注目', 'key', 'important'];
            return importantKeywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase())) && sentence.length > 10;
        });
        keyPoints.push(...importantSentences.slice(0, 3));
        const marketMovements = textContent.split(/[。！？.!?]/).filter(sentence => {
            return /\d+円|\d+ドル|\d+%/.test(sentence) && sentence.length > 10;
        });
        keyPoints.push(...marketMovements.slice(0, 2));
        return keyPoints.slice(0, 5);
    }
    extractMarketData(textContent) {
        const marketData = [];
        const currencyPairs = [
            { symbol: 'USDJPY', patterns: [/ドル円.*?(\d+\.?\d*)円/, /USD\/JPY.*?(\d+\.?\d*)/] },
            { symbol: 'EURJPY', patterns: [/ユーロ円.*?(\d+\.?\d*)円/, /EUR\/JPY.*?(\d+\.?\d*)/] },
            { symbol: 'GBPJPY', patterns: [/ポンド円.*?(\d+\.?\d*)円/, /GBP\/JPY.*?(\d+\.?\d*)/] }
        ];
        for (const pair of currencyPairs) {
            for (const pattern of pair.patterns) {
                const match = textContent.match(pattern);
                if (match) {
                    const value = parseFloat(match[1]);
                    if (!isNaN(value)) {
                        marketData.push({
                            symbol: pair.symbol,
                            value,
                            timestamp: new Date()
                        });
                    }
                }
            }
        }
        return marketData;
    }
    extractEconomicIndicators(textContent) {
        const indicators = [];
        const indicatorPatterns = [
            { name: 'GDP', patterns: [/GDP.*?(\d+\.?\d*)%/, /国内総生産.*?(\d+\.?\d*)%/] },
            { name: 'CPI', patterns: [/CPI.*?(\d+\.?\d*)%/, /消費者物価.*?(\d+\.?\d*)%/] },
            { name: '失業率', patterns: [/失業率.*?(\d+\.?\d*)%/, /unemployment.*?(\d+\.?\d*)%/] }
        ];
        for (const indicator of indicatorPatterns) {
            for (const pattern of indicator.patterns) {
                const match = textContent.match(pattern);
                if (match) {
                    indicators.push({
                        name: indicator.name,
                        country: 'Japan',
                        impact: 'medium',
                        actual: match[1] + '%',
                        timestamp: new Date()
                    });
                }
            }
        }
        return indicators;
    }
    extractExpertOpinions(textContent) {
        const opinions = [];
        const expertPatterns = [
            /(\w+)氏.*?「(.*?)」/g,
            /(\w+)アナリスト.*?「(.*?)」/g,
            /(\w+)専門家.*?「(.*?)」/g
        ];
        for (const pattern of expertPatterns) {
            let match;
            while ((match = pattern.exec(textContent)) !== null && opinions.length < 3) {
                opinions.push({
                    author: match[1],
                    role: 'アナリスト',
                    comment: match[2],
                    timestamp: new Date(),
                    sentiment: this.analyzeSentiment(match[2])
                });
            }
        }
        return opinions;
    }
    extractPublishDate(html, textContent) {
        const datePatterns = [
            /"datePublished":"([^"]+)"/,
            /"publishedTime":"([^"]+)"/,
            /(\d{4})年(\d{1,2})月(\d{1,2})日/,
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/
        ];
        for (const pattern of datePatterns) {
            const match = html.match(pattern) || textContent.match(pattern);
            if (match) {
                try {
                    if (match[1].includes('-') || match[1].includes('T')) {
                        return new Date(match[1]);
                    }
                    else {
                        const year = parseInt(match[1] || match[3]);
                        const month = parseInt(match[2]) - 1;
                        const day = parseInt(match[3] || match[1]);
                        return new Date(year, month, day);
                    }
                }
                catch (error) {
                    continue;
                }
            }
        }
        return undefined;
    }
    calculateConfidence(textContent, title) {
        let confidence = 50;
        if (textContent.length > 500)
            confidence += 15;
        if (textContent.length > 1000)
            confidence += 10;
        const fxKeywords = ['FX', '為替', 'ドル円', '経済指標', '金利'];
        const matchedKeywords = fxKeywords.filter(keyword => textContent.includes(keyword) || title.includes(keyword));
        confidence += matchedKeywords.length * 5;
        const dataIndicators = [/\d+\.?\d*円/, /\d+\.?\d*%/, /\d{4}年\d{1,2}月/];
        const matchedData = dataIndicators.filter(pattern => pattern.test(textContent));
        confidence += matchedData.length * 8;
        if (/「.*?」/.test(textContent))
            confidence += 10;
        return Math.min(100, confidence);
    }
    analyzeSentiment(comment) {
        const bullishWords = ['上昇', '強い', '買い', '高い', '良好', 'positive', 'bullish'];
        const bearishWords = ['下落', '弱い', '売り', '低い', '悪化', 'negative', 'bearish'];
        const bullishCount = bullishWords.filter(word => comment.includes(word)).length;
        const bearishCount = bearishWords.filter(word => comment.includes(word)).length;
        if (bullishCount > bearishCount)
            return 'bullish';
        if (bearishCount > bullishCount)
            return 'bearish';
        return 'neutral';
    }
    evaluateContentQuality(content) {
        const readability = this.evaluateReadability(content);
        const informativeness = this.evaluateInformativeness(content);
        const recency = this.evaluateRecency();
        const authorCredibility = this.evaluateAuthorCredibility(content);
        const sourceReliability = this.evaluateSourceReliability(content);
        const overallScore = (readability + informativeness + recency + authorCredibility + sourceReliability) / 5;
        return {
            readability,
            informativeness,
            recency,
            authorCredibility,
            sourceReliability,
            overallScore
        };
    }
    evaluateReadability(content) {
        const sentenceLength = content.split(/[。！？.!?]/).length;
        const avgSentenceLength = content.length / sentenceLength;
        let score = 70;
        if (avgSentenceLength < 30)
            score += 15;
        else if (avgSentenceLength > 60)
            score -= 10;
        const complexityIndicators = ['については', 'において', 'に関して'];
        const complexityCount = complexityIndicators.filter(indicator => content.includes(indicator)).length;
        score -= complexityCount * 3;
        return Math.max(0, Math.min(100, score));
    }
    evaluateInformativeness(content) {
        let score = 40;
        if (content.length > 500)
            score += 20;
        if (content.length > 1000)
            score += 10;
        const dataPoints = [/\d+\.?\d*%/, /\d+\.?\d*円/, /\d+\.?\d*ドル/];
        const dataMatches = dataPoints.filter(pattern => pattern.test(content)).length;
        score += dataMatches * 10;
        const infoKeywords = ['分析', '予測', 'データ', '統計', '結果'];
        const infoMatches = infoKeywords.filter(keyword => content.includes(keyword)).length;
        score += infoMatches * 5;
        return Math.min(100, score);
    }
    evaluateRecency() {
        return 80;
    }
    evaluateAuthorCredibility(content) {
        let score = 50;
        const credibilityIndicators = ['アナリスト', '専門家', '経済学者', 'エコノミスト'];
        const matches = credibilityIndicators.filter(indicator => content.includes(indicator)).length;
        score += matches * 15;
        return Math.min(100, score);
    }
    evaluateSourceReliability(content) {
        let score = 60;
        const reliableIndicators = ['調査', '研究', 'レポート', '発表'];
        const matches = reliableIndicators.filter(indicator => content.includes(indicator)).length;
        score += matches * 8;
        return Math.min(100, score);
    }
    assessPostingValue(content) {
        const engagementPotential = this.evaluateEngagementPotential(content);
        const educationalValue = this.evaluateEducationalValue(content);
        const timelinessScore = this.evaluateTimeliness(content);
        const uniquenessScore = this.evaluateUniqueness(content);
        const overallValue = (engagementPotential + educationalValue + timelinessScore + uniquenessScore) / 4;
        return {
            engagementPotential,
            educationalValue,
            timelinessScore,
            uniquenessScore,
            overallValue
        };
    }
    evaluateEngagementPotential(content) {
        let score = 50;
        if (content.marketData && content.marketData.length > 0)
            score += 20;
        if (content.expertOpinions && content.expertOpinions.length > 0)
            score += 15;
        if (content.keyPoints.length >= 3)
            score += 10;
        const engagingKeywords = ['速報', '重要', '注目', '予測'];
        const matches = engagingKeywords.filter(keyword => content.title.includes(keyword)).length;
        score += matches * 5;
        return Math.min(100, score);
    }
    evaluateEducationalValue(content) {
        let score = 40;
        if (content.economicIndicators && content.economicIndicators.length > 0)
            score += 25;
        if (content.keyPoints.length >= 5)
            score += 15;
        if (content.summary.length > 100)
            score += 10;
        const educationalKeywords = ['解説', '分析', '解説', '仕組み'];
        const matches = educationalKeywords.filter(keyword => content.title.includes(keyword) || content.summary.includes(keyword)).length;
        score += matches * 5;
        return Math.min(100, score);
    }
    evaluateTimeliness(content) {
        if (!content.publishedAt)
            return 50;
        const now = new Date();
        const diffHours = (now.getTime() - content.publishedAt.getTime()) / (1000 * 60 * 60);
        if (diffHours < 1)
            return 100;
        if (diffHours < 6)
            return 90;
        if (diffHours < 24)
            return 80;
        if (diffHours < 72)
            return 70;
        return 50;
    }
    evaluateUniqueness(content) {
        let score = 60;
        if (content.expertOpinions && content.expertOpinions.length > 0)
            score += 20;
        if (content.marketData && content.marketData.length > 2)
            score += 15;
        const uniqueIndicators = ['独自', '特別', '限定', 'exclusive'];
        const matches = uniqueIndicators.filter(indicator => content.title.includes(indicator) || content.summary.includes(indicator)).length;
        score += matches * 5;
        return Math.min(100, score);
    }
}
