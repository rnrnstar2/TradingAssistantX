import { ContentConvergenceEngine } from '../../src/lib/content-convergence-engine';
import { CollectionResult } from '../../src/types/convergence-types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * コンテンツ収束エンジンのテスト実行
 * サンプルデータを使用して実際に投稿を生成
 */

// サンプル収集データの作成
const sampleCollectionData: CollectionResult[] = [
  {
    id: 'sample_1',
    content: 'ドル円が150円台を突破。日銀の介入観測が高まる中、市場は神経質な展開が続いている。',
    url: 'https://fx-news.example.com/news1',
    source: 'FX News Daily',
    timestamp: Date.now() - 1000 * 60 * 30, // 30分前
    category: 'breaking_news',
    importance: 95,
    reliability: 88
  },
  {
    id: 'sample_2', 
    content: '米連邦準備制度理事会（Fed）は次回会合で0.25%の利上げを実施する見込み。雇用統計の好調な結果を受けて、インフレ抑制への姿勢を継続する方針。',
    url: 'https://economic-report.example.com/fed-analysis',
    source: 'Economic Analysis Weekly',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2時間前
    category: 'economic_indicator',
    importance: 87,
    reliability: 92
  },
  {
    id: 'sample_3',
    content: 'テクニカル分析では、ドル円は上昇トレンドが継続。152円のレジスタンスを突破すれば、さらなる上昇が期待される。',
    url: 'https://technical-fx.example.com/analysis',
    source: 'Technical FX Pro',
    timestamp: Date.now() - 1000 * 60 * 60 * 1, // 1時間前
    category: 'expert_opinion',
    importance: 78,
    reliability: 85
  },
  {
    id: 'sample_4',
    content: '日本の貿易収支は2ヶ月連続で改善。輸出の増加がドル需要を支えており、円安圧力が継続している。',
    url: 'https://japan-econ.example.com/trade-balance',
    source: 'Japan Economic Times',
    timestamp: Date.now() - 1000 * 60 * 60 * 4, // 4時間前
    category: 'economic_indicator',
    importance: 72,
    reliability: 90
  },
  {
    id: 'sample_5',
    content: '市場参加者の間では、日銀の介入水準を152-155円と予想する声が多い。過去の介入パターンからの分析。',
    url: 'https://market-survey.example.com/intervention',
    source: 'Market Survey Institute',
    timestamp: Date.now() - 1000 * 60 * 60 * 6, // 6時間前
    category: 'expert_opinion',
    importance: 85,
    reliability: 83
  }
];

async function testConvergenceEngine() {
  console.log('🚀 コンテンツ収束エンジンテスト開始');
  console.log(`📊 サンプルデータ数: ${sampleCollectionData.length}件`);
  
  try {
    // エンジンの初期化
    const engine = new ContentConvergenceEngine();
    
    // 収束処理の実行
    console.log('\n⚙️ 収束処理を実行中...');
    const startTime = Date.now();
    
    const convergedPost = await engine.convergeToSinglePost(sampleCollectionData);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ 処理完了 (${processingTime}ms)`);
    
    // 品質検証の実行
    console.log('\n🔍 品質検証を実行中...');
    const qualityAssessment = await engine.validatePostQuality(convergedPost);
    
    // 結果の表示
    console.log('\n📝 生成された投稿:');
    console.log('=' .repeat(60));
    console.log(convergedPost.content);
    console.log('=' .repeat(60));
    
    console.log('\n📊 メタデータ:');
    console.log(`- ソース数: ${convergedPost.metadata.sourceCount}`);
    console.log(`- 処理時間: ${convergedPost.metadata.processingTime}ms`);
    console.log(`- 信頼度: ${convergedPost.metadata.confidence}%`);
    console.log(`- カテゴリ: ${convergedPost.metadata.category}`);
    console.log(`- 総合品質: ${convergedPost.metadata.qualityScore.overall}点 (${convergedPost.metadata.qualityScore.grade})`);
    
    console.log('\n🎯 インサイト数:', convergedPost.insights.length);
    convergedPost.insights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight.category} - 信頼度${insight.confidence}%`);
    });
    
    console.log('\n✨ 代替投稿数:', convergedPost.alternatives?.length || 0);
    
    console.log('\n📈 品質評価:');
    console.log(`- 最低基準クリア: ${qualityAssessment.passesMinimumStandards ? '✅' : '❌'}`);
    console.log(`- 事実正確性: ${qualityAssessment.score.breakdown.factualAccuracy}%`);
    console.log(`- 読みやすさ: ${qualityAssessment.score.breakdown.readability}%`);
    console.log(`- 教育価値: ${qualityAssessment.score.breakdown.educationalValue}%`);
    console.log(`- 独自性: ${qualityAssessment.score.breakdown.uniqueness}%`);
    console.log(`- エンゲージメント: ${qualityAssessment.score.breakdown.engagement}%`);
    console.log(`- タイムリー性: ${qualityAssessment.score.breakdown.timeliness}%`);
    
    if (qualityAssessment.improvements.length > 0) {
      console.log('\n🔧 改善提案:');
      qualityAssessment.improvements.forEach((improvement, i) => {
        console.log(`  ${i + 1}. ${improvement}`);
      });
    }
    
    if (qualityAssessment.strengths.length > 0) {
      console.log('\n💪 強み:');
      qualityAssessment.strengths.forEach((strength, i) => {
        console.log(`  ${i + 1}. ${strength}`);
      });
    }
    
    // 結果をファイルに保存
    const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'outputs');
    
    // サンプル投稿
    const samplePosts = {
      main: convergedPost,
      alternatives: convergedPost.alternatives,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime,
        sourceDataCount: sampleCollectionData.length,
        testVersion: '1.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'sample-converged-posts.json'),
      JSON.stringify(samplePosts, null, 2),
      'utf8'
    );
    
    // 品質分析レポート
    const qualityReport = {
      assessment: qualityAssessment,
      standards: {
        required: {
          factualAccuracy: 90,
          readability: 80,
          educationalValue: 75,
          uniqueness: 70,
          engagement: 60,
          timeliness: 70
        }
      },
      comparison: {
        meetsRequired: qualityAssessment.passesMinimumStandards,
        scoreBreakdown: qualityAssessment.score.breakdown,
        overallGrade: qualityAssessment.score.grade
      },
      generatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'quality-analysis.json'),
      JSON.stringify(qualityReport, null, 2),
      'utf8'
    );
    
    // プロセスログ
    const processLog = [
      `${new Date().toISOString()} - テスト開始`,
      `${new Date().toISOString()} - サンプルデータ準備完了 (${sampleCollectionData.length}件)`,
      `${new Date().toISOString()} - 収束処理開始`,
      `${new Date().toISOString()} - 収束処理完了 (${processingTime}ms)`,
      `${new Date().toISOString()} - 品質検証完了`,
      `${new Date().toISOString()} - 結果出力完了`,
      '',
      '=== 収束プロセス詳細 ===',
      `入力データ: ${sampleCollectionData.length}件`,
      `抽出インサイト: ${convergedPost.insights.length}件`,
      `最終投稿文字数: ${convergedPost.content.length}文字`,
      `総合品質スコア: ${convergedPost.metadata.qualityScore.overall}点`,
      `信頼度: ${convergedPost.metadata.confidence}%`,
      '',
      '=== 品質分析結果 ===',
      `最低基準クリア: ${qualityAssessment.passesMinimumStandards}`,
      `強み: ${qualityAssessment.strengths.join(', ')}`,
      `改善要望: ${qualityAssessment.improvements.join(', ')}`,
      '',
      `テスト完了時刻: ${new Date().toISOString()}`
    ].join('\n');
    
    fs.writeFileSync(
      path.join(outputDir, 'convergence-logs.txt'),
      processLog,
      'utf8'
    );
    
    console.log('\n💾 ファイル出力完了:');
    console.log('- sample-converged-posts.json');
    console.log('- quality-analysis.json'); 
    console.log('- convergence-logs.txt');
    
    console.log('\n🎉 テスト完了！');
    
    return {
      success: true,
      post: convergedPost,
      quality: qualityAssessment,
      processingTime
    };
    
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    
    // エラーログの出力
    const errorLog = `
テスト実行エラー
=================
時刻: ${new Date().toISOString()}
エラー内容: ${error}
スタックトレース: ${error instanceof Error ? error.stack : 'N/A'}

サンプルデータ:
${JSON.stringify(sampleCollectionData, null, 2)}
`;
    
    const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'outputs');
    fs.writeFileSync(
      path.join(outputDir, 'error-log.txt'),
      errorLog,
      'utf8'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// テストの実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testConvergenceEngine()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ 全てのテストが成功しました');
        process.exit(0);
      } else {
        console.log('\n❌ テストが失敗しました');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 予期しないエラー:', error);
      process.exit(1);
    });
}

export { testConvergenceEngine };