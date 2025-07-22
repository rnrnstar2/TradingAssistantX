/**
 * 物語構築器
 * インサイトから読みやすく魅力的な投稿構造を構築
 */
export class NarrativeBuilder {
    /**
     * 投稿の論理構造構築
     * インサイトを論理的に整理された投稿構造に変換
     */
    buildLogicalStructure(insights) {
        if (insights.length === 0) {
            throw new Error('構造構築に必要なインサイトがありません');
        }
        // インサイトの重要度・影響度でソート
        const sortedInsights = insights.sort((a, b) => {
            const aScore = this.calculateInsightScore(a);
            const bScore = this.calculateInsightScore(b);
            return bScore - aScore;
        });
        // フックの生成（最も強力なインサイトから）
        const primaryInsight = sortedInsights[0];
        const hook = this.generateHook(primaryInsight, insights);
        // 主要ポイントの構築
        const mainPoints = this.buildMainPoints(sortedInsights);
        // 裏付け情報の構築
        const supportingDetails = this.buildSupportingDetails(insights);
        // 結論の生成
        const conclusion = this.generateConclusion(insights, mainPoints);
        // 行動喚起の生成（オプション）
        const callToAction = this.generateCallToAction(insights);
        return {
            hook,
            mainPoints,
            supporting: supportingDetails,
            conclusion,
            callToAction: callToAction || undefined
        };
    }
    /**
     * 読みやすい流れの作成
     * 論理構造を自然で読みやすい文章フローに変換
     */
    createReadableFlow(structure) {
        const sequence = [];
        const transitions = [];
        // 開始：フック
        sequence.push(structure.hook);
        // 主要ポイントの展開
        for (let i = 0; i < structure.mainPoints.length; i++) {
            const point = structure.mainPoints[i];
            // 適切な遷移語を選択
            if (i === 0) {
                transitions.push('具体的には、');
            }
            else if (i === structure.mainPoints.length - 1) {
                transitions.push('さらに重要なのは、');
            }
            else {
                transitions.push(this.selectTransition(i, structure.mainPoints.length));
            }
            // ポイント本文
            sequence.push(point.content);
            // 関連する裏付け情報を挿入
            const relevantSupporting = structure.supporting.filter(s => point.supportingEvidence.includes(s.sourceId));
            if (relevantSupporting.length > 0) {
                const supportingText = this.formatSupportingDetails(relevantSupporting);
                sequence.push(supportingText);
                transitions.push('これを裏付けるデータとして、');
            }
        }
        // 結論
        transitions.push('これらの状況を踏まえると、');
        sequence.push(structure.conclusion);
        // 行動喚起（あれば）
        if (structure.callToAction) {
            transitions.push('今後の展開については、');
            sequence.push(structure.callToAction);
        }
        // 一貫性とreadabilityスコアを計算
        const coherenceScore = this.calculateCoherenceScore(sequence, transitions);
        const readabilityScore = this.calculateReadabilityScore(sequence.join(' '));
        return {
            id: `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sequence,
            transitions,
            coherenceScore,
            readabilityScore
        };
    }
    /**
     * 専門用語の適切な説明
     * 専門的な内容を一般読者にも分かりやすく説明
     */
    explainTechnicalTerms(content) {
        const technicalTerms = this.identifyTechnicalTerms(content);
        const explanations = {};
        let enhancedContent = content;
        // 各専門用語に説明を追加
        for (const term of technicalTerms) {
            const explanation = this.getTermExplanation(term);
            if (explanation) {
                explanations[term] = explanation;
                // コンテンツ内で初出の専門用語に説明を挿入
                const pattern = new RegExp(`(${this.escapeRegex(term)})`, 'g');
                let replaced = false;
                enhancedContent = enhancedContent.replace(pattern, (match, p1, offset) => {
                    if (!replaced) {
                        replaced = true;
                        return `${p1}（${explanation}）`;
                    }
                    return p1;
                });
            }
        }
        // 難易度の評価
        const difficulty = this.assessDifficulty(enhancedContent, technicalTerms);
        // 読了時間の推定
        const readingTime = this.estimateReadingTime(enhancedContent);
        return {
            content: enhancedContent,
            explanations,
            difficulty,
            readingTime
        };
    }
    /**
     * エンゲージメント要素の追加
     * 読者の関心を引き、インタラクションを促進する要素を追加
     */
    addEngagementElements(content) {
        const hooks = this.generateEngagementHooks(content);
        const callToActions = this.generateEngagementCTAs(content);
        const interactiveElements = this.generateInteractiveElements(content);
        // エンゲージメント要素を適切な位置に挿入
        let engagingContent = content;
        // 開始部分にフックを追加
        if (hooks.length > 0) {
            const selectedHook = hooks[0];
            engagingContent = `${selectedHook}\n\n${engagingContent}`;
        }
        // 中間部分にインタラクティブ要素を追加
        if (interactiveElements.length > 0) {
            const midPoint = Math.floor(engagingContent.length / 2);
            const sentences = engagingContent.split(/[。．.!?！？]/);
            const midIndex = Math.floor(sentences.length / 2);
            sentences.splice(midIndex, 0, `\n\n${interactiveElements[0]}\n`);
            engagingContent = sentences.join('。');
        }
        // 終了部分にCTAを追加
        if (callToActions.length > 0) {
            engagingContent += `\n\n${callToActions[0]}`;
        }
        // エンゲージメントスコアの計算
        const engagementScore = this.calculateEngagementScore(engagingContent, hooks, callToActions, interactiveElements);
        return {
            content: engagingContent,
            hooks,
            callToActions,
            interactiveElements,
            engagementScore
        };
    }
    // プライベートヘルパーメソッド
    calculateInsightScore(insight) {
        // 信頼度、影響度、教育価値、独自性を総合評価
        const impactScore = insight.impact === 'high' ? 100 : insight.impact === 'medium' ? 70 : 40;
        const timeScore = this.calculateTimeRelevanceScore(insight.timeRelevance);
        return (insight.confidence + impactScore + insight.educationalValue + insight.uniqueness + timeScore) / 5;
    }
    calculateTimeRelevanceScore(timeRelevance) {
        const urgencyScore = {
            'immediate': 100,
            'daily': 80,
            'weekly': 60,
            'timeless': 40
        }[timeRelevance.urgency] || 50;
        return Math.min(100, urgencyScore + timeRelevance.peakRelevance * 0.3);
    }
    generateHook(primaryInsight, allInsights) {
        const category = primaryInsight.category;
        const impactLevel = primaryInsight.impact;
        // カテゴリーと影響度に応じたフックパターンを選択
        const hookPatterns = {
            'market_trend': {
                'high': ['市場に大きな変化の兆しが見えています', '注目すべき市場動向が明らかになりました'],
                'medium': ['興味深い市場パターンが観察されています', '市場参加者が注目する動きがあります'],
                'low': ['最近の市場動向について', '市場で話題になっている動きがあります']
            },
            'economic_indicator': {
                'high': ['重要な経済指標が発表されました', '市場への影響が予想される経済データが公表されました'],
                'medium': ['注目の経済指標が公表されました', '経済の方向性を示すデータが発表されました'],
                'low': ['最新の経済指標について', '経済動向を示すデータが更新されました']
            },
            'expert_opinion': {
                'high': ['業界専門家の重要な見解が注目されています', '市場のプロが警鐘を鳴らしています'],
                'medium': ['専門家の興味深い分析が発表されました', 'エキスパートの見解に注目が集まっています'],
                'low': ['専門家の最新見解について', '業界関係者の分析をお伝えします']
            },
            'breaking_news': {
                'high': ['重大なニュースが市場を揺るがしています', '緊急速報：市場に大きな影響を与える出来事が'],
                'medium': ['重要なニュースが発表されました', '市場関係者が注目するニュースが入りました'],
                'low': ['最新のニュースについて', '関連するニュースをお伝えします']
            }
        };
        const patterns = hookPatterns[category]?.[impactLevel] || ['最新の市場動向について'];
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        // インサイトの内容を部分的に組み込む
        const contentPreview = this.extractKeyPhrase(primaryInsight.content);
        return `${selectedPattern}。${contentPreview}`;
    }
    buildMainPoints(insights) {
        const mainPoints = [];
        // 最大3つの主要ポイントに絞る
        const topInsights = insights.slice(0, 3);
        for (let i = 0; i < topInsights.length; i++) {
            const insight = topInsights[i];
            mainPoints.push({
                id: `main_point_${i + 1}`,
                content: this.formatMainPointContent(insight),
                supportingEvidence: insight.sources,
                importance: this.calculateInsightScore(insight)
            });
        }
        return mainPoints;
    }
    buildSupportingDetails(insights) {
        const supportingDetails = [];
        for (const insight of insights) {
            for (const source of insight.sources) {
                supportingDetails.push({
                    id: `support_${supportingDetails.length + 1}`,
                    content: this.extractSupportingEvidence(insight, source),
                    sourceId: source,
                    relevance: insight.confidence
                });
            }
        }
        return supportingDetails.sort((a, b) => b.relevance - a.relevance);
    }
    generateConclusion(insights, mainPoints) {
        // 全体のトレンドを分析
        const overallTrend = this.analyzeOverallTrend(insights);
        const keyTakeaways = mainPoints.map(p => this.extractKeyTakeaway(p.content));
        let conclusion = '総合的に見ると、';
        // トレンドの要約
        conclusion += `${overallTrend}という状況が見て取れます。`;
        // 重要なポイントの再強調
        if (keyTakeaways.length > 0) {
            conclusion += ` 特に${keyTakeaways[0]}は今後の展開において重要な要素となるでしょう。`;
        }
        // 将来への示唆
        conclusion += this.generateFutureImplication(insights);
        return conclusion;
    }
    generateCallToAction(insights) {
        const urgentInsights = insights.filter(i => i.timeRelevance.urgency === 'immediate');
        const highImpactInsights = insights.filter(i => i.impact === 'high');
        if (urgentInsights.length > 0 || highImpactInsights.length > 0) {
            return '今後の市場動向については引き続き注視が必要です。重要な動きがあれば速やかにお伝えします。';
        }
        return null;
    }
    selectTransition(index, total) {
        const transitions = [
            'また、', 'さらに、', '一方で、', '同時に、', 'これに関連して、',
            '重要なことは、', '注目すべきは、', 'そして、'
        ];
        return transitions[index % transitions.length];
    }
    formatSupportingDetails(details) {
        if (details.length === 0)
            return '';
        const topDetails = details.slice(0, 2); // 最大2つの裏付けを使用
        const formatted = topDetails.map(d => d.content).join('、');
        return `（${formatted}）`;
    }
    calculateCoherenceScore(sequence, transitions) {
        // シーケンスの論理的一貫性を評価
        let score = 100;
        // 遷移の適切性をチェック
        if (transitions.length !== sequence.length - 1) {
            score -= 20;
        }
        // 内容の関連性をチェック
        for (let i = 0; i < sequence.length - 1; i++) {
            const similarity = this.calculateTextSimilarity(sequence[i], sequence[i + 1]);
            if (similarity < 30) {
                score -= 10; // 関連性が低い場合減点
            }
        }
        return Math.max(0, score);
    }
    calculateReadabilityScore(text) {
        // 文の長さ、使用語彙の複雑さなどで評価
        const sentences = text.split(/[。．.!?！？]/).filter(s => s.length > 0);
        const avgSentenceLength = text.length / sentences.length;
        let score = 100;
        // 文が長すぎる場合減点
        if (avgSentenceLength > 100) {
            score -= 20;
        }
        else if (avgSentenceLength > 150) {
            score -= 40;
        }
        // 複雑な語彙の使用頻度をチェック
        const complexWords = this.identifyTechnicalTerms(text);
        const complexityRatio = complexWords.length / (text.length / 100);
        if (complexityRatio > 5) {
            score -= 15;
        }
        return Math.max(0, score);
    }
    identifyTechnicalTerms(content) {
        const fxTechnicalTerms = [
            'レバレッジ', 'スプレッド', 'ピップス', 'ロット', 'マージンコール',
            'スワップポイント', 'ボラティリティ', 'レジスタンス', 'サポート',
            'テクニカル分析', 'ファンダメンタルズ', 'フィボナッチ', 'RSI',
            'MACD', 'ストキャスティクス', 'ボリンジャーバンド'
        ];
        const economicTerms = [
            'GDP', 'CPI', 'PMI', 'FOMC', '量的緩和', 'テーパリング',
            'インフレ', 'デフレ', '金融政策', '財政政策'
        ];
        const allTerms = [...fxTechnicalTerms, ...economicTerms];
        return allTerms.filter(term => content.includes(term));
    }
    getTermExplanation(term) {
        const explanations = {
            'レバレッジ': 'てこの原理を使って少ない資金で大きな取引を行う仕組み',
            'スプレッド': '買値と売値の差額',
            'ピップス': '通貨ペアの最小単位',
            'ボラティリティ': '価格変動の激しさ',
            'GDP': '国内総生産、国の経済規模を示す指標',
            'CPI': '消費者物価指数、インフレの指標',
            'FOMC': '米連邦公開市場委員会、米国の金融政策を決定',
            'PMI': '購買担当者景気指数、製造業の景況感を示す'
        };
        return explanations[term] || '';
    }
    assessDifficulty(content, technicalTerms) {
        const termRatio = technicalTerms.length / (content.length / 100);
        if (termRatio < 2)
            return 'beginner';
        if (termRatio < 5)
            return 'intermediate';
        return 'advanced';
    }
    estimateReadingTime(content) {
        // 日本語の平均読速を400文字/分として計算
        return Math.ceil(content.length / 400);
    }
    generateEngagementHooks(content) {
        const hooks = [
            '🚨 注目！',
            '📈 トレーダー必見：',
            '💡 知っておきたい：',
            '⚡ 速報：',
            '🔍 深掘り解説：'
        ];
        // コンテンツの内容に応じてフックを選択
        if (content.includes('速報') || content.includes('緊急')) {
            return ['⚡ 速報：', '🚨 注目！'];
        }
        if (content.includes('分析') || content.includes('解説')) {
            return ['🔍 深掘り解説：', '💡 知っておきたい：'];
        }
        return hooks.slice(0, 2);
    }
    generateEngagementCTAs(content) {
        return [
            '💬 どう思われますか？コメントでお聞かせください',
            '🔄 有益な情報でしたらRT・いいねで拡散をお願いします',
            '📊 他にも気になる通貨ペアがあればお聞かせください',
            '🔔 フォローで最新の市場情報をお届けします'
        ];
    }
    generateInteractiveElements(content) {
        return [
            '❓ この動きをどう読みますか？',
            '💭 あなたの取引戦略は？',
            '📊 注目している指標は？',
            '🎯 今週の予想は？'
        ];
    }
    calculateEngagementScore(content, hooks, ctas, interactive) {
        let score = 50; // ベーススコア
        // 各要素の存在でスコア加算
        score += hooks.length * 10;
        score += ctas.length * 15;
        score += interactive.length * 12;
        // コンテンツの長さによる調整
        const lengthFactor = content.length > 280 ? 0.9 : 1.1; // Twitter制限考慮
        score *= lengthFactor;
        return Math.min(100, Math.max(0, score));
    }
    // 追加のヘルパーメソッド
    extractKeyPhrase(content) {
        const sentences = content.split(/[。．.!?！？]/).filter(s => s.length > 10);
        return sentences[0]?.substring(0, 50) + '...' || content.substring(0, 50) + '...';
    }
    formatMainPointContent(insight) {
        // インサイトを読みやすい形式に整形
        let formatted = insight.content;
        // 信頼度に応じた表現の調整
        if (insight.confidence > 90) {
            formatted = `確実な情報として、${formatted}`;
        }
        else if (insight.confidence > 70) {
            formatted = `信頼できる情報によると、${formatted}`;
        }
        else {
            formatted = `現在の情報では、${formatted}`;
        }
        return formatted;
    }
    extractSupportingEvidence(insight, source) {
        return `${source}からの情報（信頼度${insight.confidence}%）`;
    }
    analyzeOverallTrend(insights) {
        const highConfidenceInsights = insights.filter(i => i.confidence > 80);
        const highImpactInsights = insights.filter(i => i.impact === 'high');
        if (highImpactInsights.length > highConfidenceInsights.length * 0.5) {
            return '重要な変化の兆候が複数確認されており';
        }
        if (highConfidenceInsights.length > insights.length * 0.7) {
            return '信頼性の高い情報が揃っており';
        }
        return '様々な情報を総合すると';
    }
    extractKeyTakeaway(content) {
        // 文章から最重要ポイントを抽出
        const keyPhrases = content.split(/[、，,]/).filter(phrase => phrase.length > 5);
        return keyPhrases[0] || content.substring(0, 30);
    }
    generateFutureImplication(insights) {
        const urgentCount = insights.filter(i => i.timeRelevance.urgency === 'immediate').length;
        const highImpactCount = insights.filter(i => i.impact === 'high').length;
        if (urgentCount > 0) {
            return ' 短期的な動きに注意が必要な状況です。';
        }
        if (highImpactCount > 0) {
            return ' 中長期的な影響を慎重に見極める必要があります。';
        }
        return ' 今後の推移を注視していく必要があります。';
    }
    calculateTextSimilarity(text1, text2) {
        // 簡単な類似度計算（共通単語の割合）
        const words1 = new Set(text1.match(/\S+/g) || []);
        const words2 = new Set(text2.match(/\S+/g) || []);
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
    }
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
