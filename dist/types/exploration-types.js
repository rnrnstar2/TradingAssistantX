export var CollectionMethod;
(function (CollectionMethod) {
    CollectionMethod["SIMPLE_HTTP"] = "simple_http";
    CollectionMethod["PLAYWRIGHT_LIGHT"] = "playwright";
    CollectionMethod["API_DIRECT"] = "api_direct";
})(CollectionMethod || (CollectionMethod = {}));
export const DEFAULT_EXPLORATION_CONFIG = {
    maxRetries: 3,
    requestTimeout: 10000,
    respectRobotsTxt: true,
    delayBetweenRequests: 2000,
    maxConcurrentRequests: 3,
    userAgent: 'TradingAssistantX/1.0 FX Information Collector',
    maxDepth: 3,
    maxExplorationTime: 30000,
    minContentResults: 5,
    minRelevanceScore: 70
};
export const EXPLORATION_SEEDS = {
    minkabu: {
        url: 'https://fx.minkabu.jp/news',
        depth: 3,
        interestKeywords: ['市場分析', '経済指標', '中央銀行', '要人発言']
    },
    zai: {
        url: 'https://zai.diamond.jp/fx/news',
        depth: 2,
        interestKeywords: ['今日の為替', '市況レポート', '専門家コメント']
    },
    reuters: {
        url: 'https://jp.reuters.com/news/archive/jp-markets-news',
        depth: 2,
        interestKeywords: ['為替', '日銀', 'FRB', 'ECB', '市場見通し']
    }
};
export const LINK_INTEREST_PATTERNS = {
    highValue: [
        /今日の.*為替/,
        /市場.*見通し/,
        /経済指標.*結果/,
        /中央銀行.*発表/,
        /ドル円.*分析/,
        /FOMC.*決定/
    ],
    continueExploration: [
        /詳細.*記事/,
        /続き.*読む/,
        /分析.*レポート/,
        /専門家.*コメント/
    ],
    exclude: [
        /広告/,
        /PR記事/,
        /口座開設/,
        /キャンペーン/
    ]
};
