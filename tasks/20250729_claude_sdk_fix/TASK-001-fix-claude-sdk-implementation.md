# タスク指示書: Claude SDK実装の修正

## タスクID: TASK-001-fix-claude-sdk-implementation
## 優先度: 高
## 作成日: 2025-07-29
## 作成者: Manager

---

## 1. 問題の概要

現在、`pnpm dev` 実行時にClaude SDKの呼び出しでワークフローが停止する問題が発生しています。

### 現象
- ステップ2（アクション実行）でgenerateContent関数を呼び出すとプロセスが停止
- `@instantlyeasy/claude-code-sdk-ts` パッケージの `claude()` 関数が正しく動作していない
- タイムアウトエラーも発生せず、単に処理が進まない

### エラーログ
```
⚡ ステップ2: アクション実行開始
[ここで処理が停止]
```

---

## 2. 修正対象ファイル

以下の3つのファイルでClaude SDK呼び出し部分を修正：

1. `/src/claude/endpoints/content-endpoint.ts`
2. `/src/claude/endpoints/analysis-endpoint.ts`
3. `/src/claude/endpoints/search-endpoint.ts`

---

## 3. 修正内容

### 3.1 content-endpoint.ts の修正

#### 修正前（現在のコード）
```typescript
async function generateWithClaudeQualityCheck(
  prompt: string, 
  topic: string, 
  qualityThreshold: number
): Promise<string> {
  // ... 既存のコード ...
  const response = await claude()
    .withModel('sonnet')
    .withTimeout(CLAUDE_TIMEOUT)
    .query(prompt)
    .asText();
  // ...
}
```

#### 修正後（モック実装）
```typescript
// ファイルの先頭付近に追加
function generateMockContent(topic: string): string {
  const mockContents: Record<string, string> = {
    '朝の投資教育': '【投資の基本】分散投資の重要性について。一つの銘柄に集中投資するのではなく、複数の資産に分散することでリスクを軽減できます。長期的な資産形成には欠かせない考え方です。#投資教育 #資産運用',
    'リスク管理': '【リスク管理】投資における損切りの重要性。事前に損失許容額を決めておき、感情に流されない投資判断が大切です。資産を守りながら成長させる戦略を心がけましょう。#投資教育 #リスク管理',
    'investment': '【投資教育】長期投資と複利効果について。時間を味方につけることで、小さな積み重ねが大きな資産に成長します。今日から始める資産形成。#投資教育 #資産運用',
    'default': '【投資の基本】資産形成は早く始めるほど有利です。少額からでも定期的な積立投資を始めることで、将来の経済的自由への第一歩となります。#投資教育 #資産運用'
  };
  
  return mockContents[topic] || mockContents.default;
}

// generateWithClaudeQualityCheck関数を修正
async function generateWithClaudeQualityCheck(
  prompt: string, 
  topic: string, 
  qualityThreshold: number
): Promise<string> {
  let attempts = 0;
  let bestContent = '';
  let bestQuality = 0;

  while (attempts < MAX_RETRIES) {
    try {
      // 開発環境では Claude SDK をスキップ
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 開発モード: Claude SDKをスキップし、モックレスポンスを使用');
        const mockContent = generateMockContent(topic);
        const quality = evaluateBasicQuality(mockContent, topic);
        
        if (quality >= qualityThreshold) {
          return mockContent;
        }
        
        // モックでも品質基準を満たさない場合は再生成
        attempts++;
        continue;
      }
      
      // 本番環境での Claude SDK 呼び出し（将来的に実装予定）
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(CLAUDE_TIMEOUT)
        .query(prompt)
        .asText();

      const content = response.trim();
      const quality = evaluateBasicQuality(content, topic);

      if (quality >= qualityThreshold) {
        return content;
      }

      if (quality > bestQuality) {
        bestContent = content;
        bestQuality = quality;
      }

      attempts++;
      console.warn(`Quality score ${quality} below threshold ${qualityThreshold}, regenerating (${attempts}/${MAX_RETRIES})`);

    } catch (error) {
      console.error(`Generation attempt ${attempts + 1} failed:`, error);
      
      // エラー時もモックで対応
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 エラー発生: モックレスポンスを使用');
        return generateMockContent(topic);
      }
      
      attempts++;
    }
  }

  if (bestContent) {
    console.warn(`Quality threshold not met but using best content (quality: ${bestQuality})`);
    return bestContent;
  }

  // 最終的なフォールバック
  console.warn('All attempts failed, using mock content as fallback');
  return generateMockContent(topic);
}

// generateQuoteComment関数も同様に修正
export async function generateQuoteComment(originalTweet: any): Promise<string> {
  try {
    // 開発環境ではモックを返す
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 開発モード: 引用コメントのモックレスポンスを使用');
      return '参考になる投資情報ですね。リスク管理を忘れずに、長期的な視点で資産形成を進めることが大切です。';
    }
    
    const prompt = buildQuoteCommentPrompt(originalTweet);

    const response = await claude()
      .withModel('sonnet')
      .withTimeout(10000)
      .query(prompt)
      .asText();

    return response.trim().substring(0, 150);

  } catch (error) {
    console.error('Quote comment generation failed:', error);
    return '参考になる情報ですね。投資は自己責任で行うことが大切です。';
  }
}
```

### 3.2 analysis-endpoint.ts の修正

同様のパターンでClaude SDK呼び出し部分をモック化：

```typescript
// モック分析結果を生成する関数を追加
function generateMockAnalysis(action: any): any {
  return {
    performance: {
      expected_engagement_rate: 3.5,
      risk_level: 'low',
      recommendation: '継続実行を推奨'
    },
    insights: [
      '投稿タイミングが適切です',
      'コンテンツの品質が高く評価されています'
    ],
    next_action_suggestion: 'wait',
    confidence_score: 0.85
  };
}

// Claude SDK呼び出し部分を修正
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 開発モード: 分析のモックレスポンスを使用');
  return generateMockAnalysis(performanceData);
}
```

### 3.3 search-endpoint.ts の修正

検索クエリ生成も同様にモック化：

```typescript
// モック検索クエリを生成する関数を追加
function generateMockSearchQuery(input: SearchInput): SearchQuery {
  const baseQueries: Record<string, string> = {
    'investment': '投資 初心者 基本',
    'trend_analysis': '投資トレンド 2025',
    'educational': '投資教育 資産形成',
    'default': '投資 資産運用'
  };
  
  const query = baseQueries[input.purpose || 'default'] || baseQueries.default;
  
  return {
    query: query,
    filters: {
      language: 'ja',
      minEngagement: 10,
      maxResults: input.constraints?.maxResults || 10
    },
    sortBy: 'relevance',
    metadata: {
      generatedAt: new Date().toISOString(),
      purpose: input.purpose || 'general'
    }
  };
}

// Claude SDK呼び出し部分を修正
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 開発モード: 検索クエリのモックレスポンスを使用');
  return generateMockSearchQuery(input);
}
```

---

## 4. テスト手順

### 4.1 修正後の動作確認

1. 上記の修正を実装
2. `pnpm dev` を実行
3. 以下の点を確認：
   - ワークフローが停止せずに完了すること
   - モックレスポンスが正しく生成されること
   - 3ステップ（データ収集→アクション実行→結果保存）が正常に動作すること

### 4.2 期待される出力

```
🚀 開発モード実行開始
...
⚡ ステップ2: アクション実行開始
🔧 開発モード: Claude SDKをスキップし、モックレスポンスを使用
✅ アクション実行完了 { action: 'post', success: true }
💾 ステップ3: 結果保存開始
✅ 結果保存完了
🎉 スケジュール実行完了 (XXXXms)
✅ ワークフロー完了
```

---

## 5. 追加の注意事項

### 5.1 型安全性の維持
- TypeScriptの型エラーが発生しないよう、モック関数の返り値の型を正しく設定
- 既存のインターフェースとの互換性を保つ

### 5.2 エラーハンドリング
- try-catch文を適切に配置
- エラー時のログ出力を詳細に

### 5.3 将来の改善に向けて
- モック実装はあくまで暫定対応
- 正しいClaude SDK TypeScriptパッケージが判明次第、本実装への移行を計画

---

## 6. 完了条件

- [ ] 3つのエンドポイントファイルの修正が完了
- [ ] `pnpm dev` が正常に動作し、ワークフローが完了する
- [ ] モックレスポンスが期待通りに生成される
- [ ] エラーログが適切に出力される
- [ ] TypeScriptのコンパイルエラーがない

---

## 7. 報告事項

修正完了後、以下の情報を含めて報告してください：

1. 修正したファイルのリスト
2. 実行ログの抜粋（成功した場合）
3. 発生した問題や懸念事項（あれば）
4. 今後の改善提案（あれば）

---

以上の指示に従って、Claude SDK実装の修正を行ってください。
不明な点があれば、修正前に確認してください。