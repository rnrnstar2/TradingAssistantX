/**
 * Claude SDK モックレスポンス生成ユーティリティ
 * 開発・テスト環境用のモックレスポンスを提供
 */

/**
 * コンテンツ生成用モックレスポンス
 * 重複投稿防止のため、タイムスタンプとランダム要素を追加
 */
export function generateMockContent(topic: string, contentType: string = 'educational'): string {
  // 現在時刻とランダム要素を生成
  const now = new Date();
  const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const randomTips = [
    '積立投資のコツ',
    'ポートフォリオの見直し',
    '市場の見方',
    '長期投資の心構え',
    'リスク分散の考え方'
  ];
  const randomTip = randomTips[Math.floor(Math.random() * randomTips.length)];
  
  const mockContents: Record<string, Record<string, string[]>> = {
    educational: {
      '投資教育': [
        `【投資の基本】分散投資の重要性について。一つの銘柄に集中投資するのではなく、複数の資産に分散することでリスクを軽減できます。長期的な資産形成には欠かせない考え方です。${timeString}更新 #投資教育 #資産運用`,
        `【${randomTip}】投資において最も重要なのは長期的な視点です。短期的な値動きに惑わされず、着実な資産形成を心がけましょう。時間を味方につけた投資戦略が成功の鍵です。${timeString} #投資教育 #資産運用`,
        `【投資メモ】${timeString} 今日のポイント：${randomTip}について考えてみましょう。投資は知識と経験の積み重ねです。一歩ずつ学びを深めて、賢い投資家を目指しましょう。#投資教育 #学習`
      ],
      'リスク管理': [
        `【リスク管理】投資における損切りの重要性。事前に損失許容額を決めておき、感情に流されない投資判断が大切です。資産を守りながら成長させる戦略を心がけましょう。${timeString} #投資教育 #リスク管理`,
        `【${timeString}の投資メモ】${randomTip}における重要ポイント。リスクとリターンのバランスを常に意識し、自分の投資目標に合った戦略を選択することが大切です。#リスク管理 #投資戦略`
      ],
      default: [
        `【投資教育】長期投資と複利効果について。時間を味方につけることで、小さな積み重ねが大きな資産に成長します。${timeString}の今、始める資産形成。#投資教育 #資産運用`,
        `【今日の投資のヒント】${timeString} ${randomTip}を活用した資産形成のポイント。継続こそが投資成功の最大の秘訣です。小額からでも始めてみましょう。#投資初心者 #資産形成`
      ]
    },
    market_analysis: {
      '投資教育': [
        `【市場分析】${timeString}現在、日経平均は前日比+0.5%で推移。米国市場の好調を受けて、リスクオン相場が継続。個人投資家の投資意欲は高い水準を維持しています。#市場分析 #投資`,
        `【${timeString}市場レポート】${randomTip}の観点から見た現在の投資環境。安定した市場環境を活用し、長期的な資産形成に取り組む好機です。#市場分析 #投資機会`
      ],
      default: [
        `【市場動向】${timeString}更新 グローバル市場は安定的に推移。長期投資家にとっては良好な投資環境が続いています。分散投資でリスクを管理しながら、着実な資産形成を目指しましょう。#市場分析 #投資戦略`
      ]
    },
    trending: {
      '投資教育': [
        `【話題】${timeString} 新NISA制度が話題に！多くの投資家が注目する中、投資信託を活用した長期資産形成への関心が高まっています。この機会に投資の基本を学び直してみませんか？#新NISA #投資トレンド`,
        `【${timeString}のトレンド】${randomTip}が注目されています。投資の基本を理解し、自分に合った投資スタイルを見つけることが資産形成の第一歩です。#投資トレンド #学習`
      ],
      default: [
        `【トレンド】${timeString} ESG投資への注目が高まっています。持続可能な社会への貢献と資産形成を両立できる投資手法として、個人投資家からも支持を集めています。#ESG投資 #サステナブル`
      ]
    }
  };

  const contentMap = mockContents[contentType] || mockContents.educational;
  const contentArray = contentMap[topic] || contentMap.default;
  
  // 配列からランダムに選択
  const selectedContent = contentArray[Math.floor(Math.random() * contentArray.length)];
  return selectedContent;
}

/**
 * 分析用モックレスポンス
 */
export function generateMockAnalysis(analysisType: string): string {
  const mockAnalyses: Record<string, string> = {
    market: JSON.stringify({
      insights: [
        '市場は全体的に安定した推移を見せています',
        '個人投資家の参入が増加傾向にあります',
        '長期投資に適した環境が整っています'
      ],
      recommendations: [
        '分散投資を心がけ、リスク管理を徹底しましょう',
        '定期的なポートフォリオの見直しを推奨します'
      ],
      confidence: 0.85
    }),
    performance: JSON.stringify({
      insights: [
        '投稿のエンゲージメント率が向上しています',
        '教育的コンテンツへの反応が特に良好です',
        'フォロワーの質が向上し、投資関心層が増加'
      ],
      recommendations: [
        '教育的コンテンツの投稿頻度を維持しましょう',
        '具体的な事例を交えた投稿が効果的です'
      ],
      confidence: 0.82
    }),
    trend: JSON.stringify({
      insights: [
        'NISA関連の話題がトレンドになっています',
        '初心者向けコンテンツの需要が高まっています',
        'AI・テクノロジー関連銘柄への関心が上昇'
      ],
      recommendations: [
        'NISA活用術に関するコンテンツを増やしましょう',
        '初心者向けの基礎知識コンテンツを充実させましょう'
      ],
      confidence: 0.78
    }),
    default: JSON.stringify({
      insights: ['分析結果1', '分析結果2', '分析結果3'],
      recommendations: ['推奨事項1', '推奨事項2'],
      confidence: 0.75
    })
  };

  return mockAnalyses[analysisType] || mockAnalyses.default;
}

/**
 * 検索クエリ用モックレスポンス
 */
export function generateMockSearchQuery(purpose: string, topic: string): string {
  const mockQueries: Record<string, any> = {
    retweet: {
      query: `${topic} 初心者 入門 -広告 -PR -spam`,
      filters: {
        minEngagement: 10,
        language: 'ja',
        maxAge: '24h',
        verified: false
      },
      priority: 0.8,
      expectedResults: 20
    },
    like: {
      query: `${topic} 体験談 成功 学び -広告 -spam`,
      filters: {
        minEngagement: 5,
        language: 'ja',
        maxAge: '12h',
        verified: false
      },
      priority: 0.7,
      expectedResults: 30
    },
    engagement: {
      query: `${topic} 質問 議論 意見 -広告 -spam`,
      filters: {
        minEngagement: 15,
        language: 'ja',
        maxAge: '24h',
        verified: false
      },
      priority: 0.85,
      expectedResults: 15
    },
    trend_analysis: {
      query: `${topic} トレンド 話題 最新 -広告 -spam`,
      filters: {
        minEngagement: 20,
        language: 'ja',
        maxAge: '6h',
        verified: true
      },
      priority: 0.9,
      expectedResults: 10
    }
  };

  return JSON.stringify(mockQueries[purpose] || mockQueries.retweet);
}

/**
 * 引用コメント用モックレスポンス
 */
export function generateMockQuoteComment(originalContent: string): string {
  const templates = [
    'とても参考になる投稿ですね。特に{point}の部分は初心者の方にも分かりやすいと思います。',
    '素晴らしい視点です。私も{point}について同じように考えています。皆さんはどう思われますか？',
    '重要なポイントですね。{point}を実践することで、より良い投資成果が期待できそうです。',
    'なるほど、{point}という観点は見落としがちですが、とても大切ですね。ありがとうございます。'
  ];

  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  const point = originalContent.length > 20 ? '前半で述べられている点' : 'この考え方';
  
  return randomTemplate.replace('{point}', point);
}

/**
 * 環境に応じたモック使用判定
 */
export function shouldUseMock(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.NODE_ENV === 'test' ||
         process.env.USE_CLAUDE_MOCK === 'true';
}