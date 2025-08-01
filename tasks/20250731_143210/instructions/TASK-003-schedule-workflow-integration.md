# TASK-003: スケジュールとワークフローへの参考ユーザー機能統合

## 🎯 タスク概要
`schedule.yaml`に参考ユーザー（reference_users）パラメータを追加し、`main-workflow.ts`を修正して、指定されたユーザーの最新ツイートを取得してコンテンツ生成に活用する機能を実装する。

## 📋 実装要件

### 1. schedule.yamlの構造拡張
**修正ファイル**: `data/config/schedule.yaml`

**追加するパラメータ構造**:
```yaml
# 各アクションにreference_usersパラメータを追加可能にする
# 例：
- time: "06:00"
  action: "post"
  topic: "おはよう！今日の市場注目ポイント"
  target_query: "投資 おはよう"
  reference_users:  # 新規追加パラメータ（オプション）
    - "financialjuice"
    - "marketwatch"

- time: "09:00"
  action: "post"
  topic: "市場オープン！今日の投資戦略"
  target_query: "日経平均 OR ドル円 OR 米国株"
  reference_users:  # リアルタイム市場情報アカウント
    - "financialjuice"
    - "jimcramer"
    - "stlouisfed"
```

**利用シーン例**:
- 朝の市場情報投稿時：financialjuice等から最新の市場ニュースを参考
- 経済指標発表時：stlouisfed等から統計データを参考
- 市場クローズ後：各アナリストの総括を参考

### 2. ワークフロー実装の修正
**修正ファイル**: `src/workflows/main-workflow.ts`

**インポート追加**:
```typescript
import { ReferenceAccountsConfig } from '../shared/types';
```

**executePostAction メソッドの修正**:
```typescript
private static async executePostAction(
  decision: any, 
  collectedData?: { profile: any, learningData: any }, 
  executionId?: string
): Promise<any> {
  try {
    // 既存のコード...

    // 参考ユーザーのツイート取得（新規追加）
    let referenceAccountTweets = null;
    if (decision.parameters?.reference_users && decision.parameters.reference_users.length > 0) {
      console.log(`👥 参考ユーザーの最新ツイート取得中: ${decision.parameters.reference_users.join(', ')}`);
      
      try {
        // reference-accounts.yamlから設定を読み込み
        const referenceConfig = await this.getDataManager().loadReferenceAccounts();
        
        // 指定されたユーザーの最新ツイートをバッチ取得
        const userTweetsMap = await this.kaitoClient.getBatchUserLastTweets(
          decision.parameters.reference_users,
          referenceConfig.search_settings.max_tweets_per_account || 20
        );
        
        // 取得結果を整形
        referenceAccountTweets = [];
        for (const [username, response] of userTweetsMap.entries()) {
          if (response.success && response.tweets.length > 0) {
            referenceAccountTweets.push({
              username,
              tweets: response.tweets.map(tweet => ({
                id: tweet.id,
                text: tweet.text,
                created_at: tweet.created_at,
                public_metrics: tweet.public_metrics
              }))
            });
            console.log(`✅ @${username}: ${response.tweets.length}件のツイート取得`);
          } else {
            console.warn(`⚠️ @${username}: ツイート取得失敗`);
          }
        }
        
        if (referenceAccountTweets.length > 0) {
          console.log(`📊 参考ユーザーツイート取得完了: ${referenceAccountTweets.length}アカウント`);
        }
      } catch (error) {
        console.error('❌ 参考ユーザーツイート取得エラー:', error);
        // エラー時はnullのまま続行（参考ツイートなしで生成）
      }
    }

    // SystemContextに参考ユーザーツイートを追加
    if (referenceAccountTweets) {
      systemContext.referenceAccountTweets = referenceAccountTweets;
    }

    // 既存のreferenceTweets（検索結果）と新しいreferenceAccountTweets（特定ユーザー）を両方含める
    const contentRequest: ContentGenerationRequest = {
      topic: decision.parameters.topic,
      contentType: decision.parameters.contentType || 'educational',
      targetAudience: decision.parameters.targetAudience || 'beginner',
      maxLength: decision.parameters.maxLength || 140,
      realtimeContext: true
    };

    // Claude SDKでコンテンツ生成（既存のコード）
    const generatedContent = await ClaudeEndpoints.generateContent({
      request: contentRequest,
      context: systemContext
    });

    // 以下既存のコード...
  } catch (error) {
    // エラーハンドリング...
  }
}
```

**loadScheduleData メソッドの修正**:
```typescript
private static async loadScheduleData(): Promise<any> {
  try {
    const scheduleData = await this.getDataManager().loadSchedule();
    
    // reference_usersパラメータの検証を追加
    if (scheduleData.daily_schedule) {
      scheduleData.daily_schedule.forEach((task: any, index: number) => {
        if (task.reference_users && !Array.isArray(task.reference_users)) {
          console.warn(`⚠️ スケジュール[${index}]: reference_usersは配列である必要があります`);
          task.reference_users = [];
        }
      });
    }
    
    return scheduleData;
  } catch (error) {
    console.error('❌ スケジュールデータ読み込みエラー:', error);
    throw error;
  }
}
```

### 3. 型定義の更新
**修正ファイル**: `src/workflows/types.ts`（存在しない場合は作成）

**追加する型定義**:
```typescript
// スケジュールタスクの型定義
export interface ScheduleTask {
  time: string;
  action: string;
  topic?: string;
  target_query?: string;
  reference_users?: string[];  // 新規追加
  // その他の既存フィールド...
}
```

### 4. ログ出力の改善
参考ユーザーツイートの使用状況を明確にするため、以下のログを追加：

```typescript
// executePostAction内のログ
if (systemContext.referenceAccountTweets && systemContext.referenceAccountTweets.length > 0) {
  console.log('📱 参考ユーザーツイートを含めてコンテンツ生成:');
  systemContext.referenceAccountTweets.forEach(account => {
    console.log(`  - @${account.username}: ${account.tweets.length}件`);
  });
}
```

## ⚠️ 実装時の注意事項

1. **後方互換性**: reference_usersはオプションパラメータとし、既存のスケジュールに影響しない
2. **エラーハンドリング**: 参考ユーザーの取得に失敗してもメイン処理は継続する
3. **レート制限**: 複数ユーザーの取得時はKaitoAPIのバッチ処理機能を使用
4. **優先順位**: target_query（検索結果）とreference_users（特定ユーザー）の両方がある場合は両方使用
5. **型安全性**: TypeScriptの型定義を厳密に守る

## 🧪 テスト要件

1. reference_usersありの投稿アクション実行テスト
2. reference_usersなしの投稿アクション実行テスト（既存動作の確認）
3. 存在しないユーザー指定時のエラーハンドリングテスト
4. 複数ユーザー指定時のバッチ処理テスト
5. schedule.yamlの読み込みと検証テスト

## 📁 成果物

1. `data/config/schedule.yaml` - reference_usersパラメータの追加例
2. `src/workflows/main-workflow.ts` - 参考ユーザーツイート取得機能の追加
3. `src/workflows/types.ts` - 型定義の追加（必要に応じて）

## ✅ 完了条件

- [ ] schedule.yamlにreference_usersパラメータが追加可能
- [ ] main-workflow.tsで参考ユーザーのツイートが取得される
- [ ] 取得したツイートがSystemContextに含まれる
- [ ] エラーハンドリングが適切に実装されている
- [ ] 既存の動作に影響がない（後方互換性）
- [ ] TypeScriptのコンパイルエラーがない