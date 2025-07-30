# タスク指示書: Claude Code SDK認証設定と実装修正

## タスクID: TASK-003-claude-sdk-authentication-fix
## 優先度: 最高
## 作成日: 2025-07-29
## 作成者: Manager

---

## 1. 問題の原因

`@instantlyeasy/claude-code-sdk-ts`が動作しない原因は、**Claude CLIでの認証が完了していない**ためです。

### 前提条件（公式ドキュメントより）
1. Node.js 18以降
2. Claude Code CLIのグローバルインストール
3. `claude login`での認証完了

---

## 2. 修正手順

### 2.1 Claude Code CLIのインストールと認証

#### Step 1: Claude Code CLIのインストール確認
```bash
# Claude CLIがインストールされているか確認
claude --version

# インストールされていない場合は以下を実行
npm install -g @anthropic-ai/claude-code
```

#### Step 2: Claude認証
```bash
# Claude にログイン
claude login
```

**注意**: これはローカル環境での一度だけの設定です。ブラウザが開き、認証を求められます。

### 2.2 認証状態の確認

認証後、以下のファイルが作成されているか確認：
- macOS/Linux: `~/.claude/config.json`
- Windows: `%USERPROFILE%\.claude\config.json`

### 2.3 エラーハンドリングの改善

現在のコードはClaude CLIの認証エラーを適切に処理していません。以下の修正を実装：

#### `/src/claude/endpoints/content-endpoint.ts`の修正

```typescript
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { ContentInput, GeneratedContent } from '../types';

// ============================================================================
// ERROR HANDLING - エラーハンドリング
// ============================================================================

/**
 * Claude CLIの認証状態をチェック
 */
async function checkClaudeAuthentication(): Promise<boolean> {
  try {
    // 簡単なテストクエリで認証を確認
    const testResponse = await claude()
      .withModel('haiku')
      .withTimeout(5000)
      .query('Hello')
      .asText();
    
    return !!testResponse;
  } catch (error) {
    console.error('Claude認証エラー:', error);
    if (error.message?.includes('login') || error.message?.includes('authentication')) {
      console.error('⚠️ Claude CLIで認証が必要です。以下を実行してください:');
      console.error('  1. npm install -g @anthropic-ai/claude-code');
      console.error('  2. claude login');
    }
    return false;
  }
}

// ============================================================================
// QUALITY CHECK IMPLEMENTATION - 品質チェック実装
// ============================================================================

/**
 * Claude品質確保付きコンテンツ生成（認証エラーハンドリング付き）
 */
async function generateWithClaudeQualityCheck(
  prompt: string, 
  topic: string, 
  qualityThreshold: number
): Promise<string> {
  // 認証チェック
  const isAuthenticated = await checkClaudeAuthentication();
  if (!isAuthenticated) {
    throw new Error('Claude CLI認証が必要です。"claude login"を実行してください。');
  }

  let attempts = 0;
  let bestContent = '';
  let bestQuality = 0;

  while (attempts < MAX_RETRIES) {
    try {
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
      
      // 特定のエラーメッセージを確認
      if (error.message?.includes('login') || error.message?.includes('authentication')) {
        throw new Error('Claude CLI認証エラー: "claude login"を実行してください');
      } else if (error.message?.includes('timeout')) {
        console.warn('タイムアウトエラー、再試行します...');
      }
      
      attempts++;
    }
  }

  if (bestContent) {
    console.warn(`Quality threshold not met but using best content (quality: ${bestQuality})`);
    return bestContent;
  }

  throw new Error('Content generation failed after all retry attempts');
}

/**
 * 引用ツイート用コメント生成（エラーハンドリング改善）
 */
export async function generateQuoteComment(originalTweet: any): Promise<string> {
  try {
    const prompt = buildQuoteCommentPrompt(originalTweet);

    const response = await claude()
      .withModel('sonnet')
      .withTimeout(10000)
      .query(prompt)
      .asText();

    return response.trim().substring(0, 150);

  } catch (error) {
    console.error('Quote comment generation failed:', error);
    
    if (error.message?.includes('login') || error.message?.includes('authentication')) {
      throw new Error('Claude CLI認証エラー: "claude login"を実行してください');
    }
    
    throw error;
  }
}
```

### 2.4 一時的な開発環境対応

認証が完了するまでの一時的な対応として、環境変数で制御：

#### `.env`に追加
```
# Claude SDK開発モード（認証なしでモック使用）
CLAUDE_SDK_DEV_MODE=true
```

#### 条件付きモック使用
```typescript
async function generateWithClaudeQualityCheck(
  prompt: string, 
  topic: string, 
  qualityThreshold: number
): Promise<string> {
  // 開発モードチェック
  if (process.env.CLAUDE_SDK_DEV_MODE === 'true') {
    console.warn('⚠️ CLAUDE_SDK_DEV_MODE: Claude CLIをスキップ（一時的な対応）');
    // 開発用の固定レスポンス
    return generateDevResponse(topic);
  }

  // 通常のClaude SDK処理...
}

// 開発用レスポンス生成（別関数として分離）
function generateDevResponse(topic: string): string {
  const responses = {
    '朝の投資教育': '【投資の基本】分散投資でリスクを管理しましょう。',
    'default': '【投資教育】長期的な視点での資産形成が重要です。'
  };
  return responses[topic] || responses.default;
}
```

---

## 3. 実装順序

1. **Claude CLI認証の実行**（最優先）
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```

2. **エラーハンドリングの改善**
   - 認証チェック関数の追加
   - エラーメッセージの改善

3. **一時的な開発モードの実装**
   - 環境変数での制御
   - 開発用レスポンスの分離

4. **他のエンドポイントへの適用**
   - analysis-endpoint.ts
   - search-endpoint.ts

---

## 4. テスト手順

1. **認証確認**
   ```bash
   claude --version
   claude whoami  # ログイン状態を確認
   ```

2. **SDK動作確認**
   ```bash
   # 簡単なテストスクリプト作成
   echo "import { claude } from '@instantlyeasy/claude-code-sdk-ts';
   claude().query('Hello').asText().then(console.log);" > test-claude.ts
   
   # 実行
   npx tsx test-claude.ts
   ```

3. **ワークフロー確認**
   ```bash
   pnpm dev
   ```

---

## 5. 完了条件

- [ ] Claude CLIのインストール確認
- [ ] `claude login`での認証完了
- [ ] 認証チェック関数の実装
- [ ] エラーハンドリングの改善
- [ ] 一時的な開発モードの実装（オプション）
- [ ] `pnpm dev`が正常動作
- [ ] 適切なエラーメッセージの表示

---

## 6. 重要な注意事項

### セキュリティ
- Claude CLIの認証情報は`~/.claude/`に保存される
- この認証情報をGitにコミットしない
- チーム開発では各開発者が個別に認証する必要がある

### CI/CD環境
- CI/CD環境では異なる認証方法が必要になる可能性
- 環境変数での制御を検討

### トラブルシューティング
- 認証エラーが続く場合は`claude logout`してから再度`claude login`
- プロキシ環境では追加設定が必要な場合がある

---

以上の手順により、`@instantlyeasy/claude-code-sdk-ts`を正しく使用できるようになります。