# タスク指示書: Claude SDK正式実装への修正

## タスクID: TASK-002-correct-claude-sdk-implementation
## 優先度: 最高
## 作成日: 2025-07-29
## 作成者: Manager

---

## 1. 問題の根本原因

現在使用している`@instantlyeasy/claude-code-sdk-ts`は非公式パッケージであり、これが動作しない原因です。

### 誤ったアプローチ
- ❌ モック実装を本番コードに埋め込む（アンチパターン）
- ❌ 非公式SDKの使用

### 正しいアプローチ
- ✅ 公式SDK `@anthropic-ai/sdk` を使用
- ✅ 適切な環境変数でAPIキーを管理
- ✅ 依存性注入パターンで抽象化

---

## 2. 修正手順

### 2.1 パッケージの更新

#### 削除
```bash
pnpm remove @instantlyeasy/claude-code-sdk-ts
```

#### インストール
```bash
pnpm add @anthropic-ai/sdk
```

### 2.2 環境変数の追加

`.env`ファイルに追加：
```
ANTHROPIC_API_KEY=your-api-key-here
```

### 2.3 Claude SDKラッパーの作成

**新規ファイル**: `/src/claude/core/claude-client.ts`

```typescript
/**
 * Claude API Client - 公式SDK使用の適切な実装
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources';

export interface ClaudeClientConfig {
  apiKey?: string;
  maxRetries?: number;
}

export class ClaudeClient {
  private client: Anthropic;
  
  constructor(config?: ClaudeClientConfig) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY,
      maxRetries: config?.maxRetries || 3
    });
  }
  
  /**
   * テキスト生成
   */
  async generateText(prompt: string, model: string = 'claude-3-sonnet-20240229'): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      
      // Extract text from the response
      const textContent = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
      
      return textContent;
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API呼び出しエラー: ${error.message}`);
    }
  }
  
  /**
   * ストリーミング生成
   */
  async generateTextStream(prompt: string, model: string = 'claude-3-sonnet-20240229'): Promise<AsyncIterable<string>> {
    const stream = await this.client.messages.create({
      model: model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    });
    
    return this.processStream(stream);
  }
  
  private async *processStream(stream: AsyncIterable<any>): AsyncIterable<string> {
    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === 'content_block_delta' && 
          messageStreamEvent.delta.type === 'text_delta') {
        yield messageStreamEvent.delta.text;
      }
    }
  }
}
```

### 2.4 エンドポイントの修正

#### content-endpoint.ts の修正

```typescript
import { ClaudeClient } from '../core/claude-client';
import { ContentInput, GeneratedContent } from '../types';

// ClaudeClientのインスタンス（依存性注入可能）
const claudeClient = new ClaudeClient();

// モック関数を削除

/**
 * Claude品質確保付きコンテンツ生成
 */
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
      // 公式SDKを使用した実装
      const content = await claudeClient.generateText(prompt);
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
      attempts++;
      
      // APIキーが設定されていない場合のエラーメッセージ
      if (error.message?.includes('API key')) {
        throw new Error('ANTHROPIC_API_KEY環境変数が設定されていません');
      }
    }
  }

  if (bestContent) {
    console.warn(`Quality threshold not met but using best content (quality: ${bestQuality})`);
    return bestContent;
  }

  throw new Error('Content generation failed after all retry attempts');
}

/**
 * 引用ツイート用コメント生成
 */
export async function generateQuoteComment(originalTweet: any): Promise<string> {
  try {
    const prompt = buildQuoteCommentPrompt(originalTweet);
    const response = await claudeClient.generateText(prompt);
    return response.trim().substring(0, 150);
  } catch (error) {
    console.error('Quote comment generation failed:', error);
    throw error; // エラーは適切に上位に伝播
  }
}
```

### 2.5 同様の修正を他のエンドポイントにも適用

- `/src/claude/endpoints/analysis-endpoint.ts`
- `/src/claude/endpoints/search-endpoint.ts`

### 2.6 型定義の更新

`/src/claude/types.ts`に追加：

```typescript
export interface ClaudeError {
  type: 'api_error' | 'invalid_request_error' | 'authentication_error';
  message: string;
}
```

---

## 3. テスト環境での対応

開発環境でAPIキーがない場合の適切な対応：

**新規ファイル**: `/src/claude/core/mock-client.ts`

```typescript
/**
 * テスト用モッククライアント（本番コードとは分離）
 */
export class MockClaudeClient {
  async generateText(prompt: string): Promise<string> {
    console.warn('⚠️ MockClaudeClient使用中 - 本番環境では使用しないでください');
    // テスト用の固定レスポンス
    return 'テスト用レスポンス';
  }
}
```

環境に応じた切り替え：

```typescript
// claude-client-factory.ts
export function createClaudeClient() {
  if (process.env.NODE_ENV === 'test' && !process.env.ANTHROPIC_API_KEY) {
    return new MockClaudeClient();
  }
  return new ClaudeClient();
}
```

---

## 4. 実装上の注意事項

### 4.1 エラーハンドリング
- APIキー未設定時の明確なエラーメッセージ
- レート制限エラーの適切な処理
- ネットワークエラーのリトライ

### 4.2 セキュリティ
- APIキーは環境変数経由でのみ設定
- APIキーをコードにハードコードしない
- エラーメッセージにAPIキーを含めない

### 4.3 パフォーマンス
- 適切なタイムアウト設定
- 必要に応じてストリーミングAPIの使用
- キャッシュの検討（将来的に）

---

## 5. テスト手順

1. **環境変数設定**
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

2. **パッケージ更新**
   ```bash
   pnpm remove @instantlyeasy/claude-code-sdk-ts
   pnpm add @anthropic-ai/sdk
   ```

3. **実装修正**
   - 上記の修正を実装

4. **動作確認**
   ```bash
   pnpm dev
   ```

5. **期待される結果**
   - ワークフローが停止せずに完了
   - 実際のClaude APIからのレスポンス取得
   - エラー時の適切なメッセージ表示

---

## 6. 完了条件

- [ ] 非公式SDKの削除
- [ ] 公式SDK `@anthropic-ai/sdk` のインストール
- [ ] ClaudeClientクラスの実装
- [ ] 3つのエンドポイントから直接モック実装を削除
- [ ] 環境変数によるAPIキー管理
- [ ] `pnpm dev` が正常動作
- [ ] TypeScriptのコンパイルエラーなし

---

## 7. 補足：APIキーの取得

Anthropic APIキーが必要な場合：
1. https://console.anthropic.com にアクセス
2. アカウント作成またはログイン
3. API Keysセクションでキーを生成
4. `.env`ファイルに設定

---

以上の修正により、アンチパターンを排除し、正しい実装パターンに移行します。