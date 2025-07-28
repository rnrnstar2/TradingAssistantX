# TASK-002: TEST_MODE対応機能追加

## 🎯 **タスク概要**

**目的**: dev.ts用のTEST_MODE環境変数対応により、投稿を無効化する機能を追加  
**必要性**: dev.tsで`process.env.TEST_MODE = 'true'`設定時に実際の投稿を防ぐ  
**影響範囲**: `src/scripts/core-runner.ts` の最小限修正  

## 📋 **機能要件**

### **動作仕様**
- **TEST_MODE=true**: X投稿をスキップ、他の処理は正常実行
- **TEST_MODE≠true**: 通常通りX投稿を実行
- **ログ出力**: テストモード時は明確にスキップしたことを表示

### **実装箇所**
- **対象**: `core-runner.ts` の `postToX()` メソッド
- **方針**: 環境変数チェックを追加し、テストモード時はモック結果を返す

## 🔧 **実装指示**

### **修正対象ファイル**
- `src/scripts/core-runner.ts`

### **具体的修正内容**

**ファイル**: `src/scripts/core-runner.ts`  
**修正対象**: `postToX()` メソッド（449-477行目付近）

**修正前:**
```typescript
private async postToX(content: GeneratedContent): Promise<PostResult> {
  try {
    const xPoster = createXPosterFromEnv();
    const result = await xPoster.postToX(content);
    
    if (this.options.enableLogging) {
      console.log(`${result.success ? '✅' : '❌'} [X投稿] ${result.success ? '投稿成功' : '投稿失敗'}`);
      if (!result.success && result.error) {
        console.log(`   エラー: ${result.error}`);
      }
      if (result.postId) {
        console.log(`   投稿ID: ${result.postId}`);
      }
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      error: `X投稿エラー: ${errorMessage}`,
      timestamp: new Date(),
      finalContent: content.content
    };
  }
}
```

**修正後:**
```typescript
private async postToX(content: GeneratedContent): Promise<PostResult> {
  try {
    // TEST_MODE チェック
    if (process.env.TEST_MODE === 'true') {
      if (this.options.enableLogging) {
        console.log('🧪 [TEST_MODE] X投稿をスキップ（テストモード）');
        console.log(`📝 [投稿内容] ${content.content}`);
      }
      
      // テストモード用のモック結果を返す
      return {
        success: true,
        postId: 'test_mode_mock_id',
        timestamp: new Date(),
        finalContent: content.content
      };
    }
    
    // 通常の投稿処理
    const xPoster = createXPosterFromEnv();
    const result = await xPoster.postToX(content);
    
    if (this.options.enableLogging) {
      console.log(`${result.success ? '✅' : '❌'} [X投稿] ${result.success ? '投稿成功' : '投稿失敗'}`);
      if (!result.success && result.error) {
        console.log(`   エラー: ${result.error}`);
      }
      if (result.postId) {
        console.log(`   投稿ID: ${result.postId}`);
      }
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      error: `X投稿エラー: ${errorMessage}`,
      timestamp: new Date(),
      finalContent: content.content
    };
  }
}
```

## ✅ **検証要件**

### **1. テストモード動作確認**
```bash
# dev.ts でテストモード確認
pnpm dev
```

**期待される出力:**
```
🧪 [TEST_MODE] X投稿をスキップ（テストモード）
📝 [投稿内容] [生成されたコンテンツ]
✅ [X投稿] 投稿成功
   投稿ID: test_mode_mock_id
```

### **2. 通常モード動作確認**
```bash
# TEST_MODEを設定せずに通常実行
# （実際のX投稿は実行されるため、実環境では注意）
```

### **3. 環境変数パターンテスト**
- `TEST_MODE='true'`: 投稿スキップ
- `TEST_MODE='false'`: 通常投稿実行
- `TEST_MODE`未設定: 通常投稿実行

## 🚫 **MVP制約遵守事項**

### **禁止事項**
- ❌ 新しい複雑な機能の追加
- ❌ 設定ファイルへの依存追加
- ❌ 複雑なテストフレームワークの導入
- ❌ 既存機能の大幅な変更

### **許可範囲**
- ✅ 環境変数チェックの追加のみ
- ✅ 簡潔なログ出力の追加
- ✅ モック結果の返却
- ✅ 既存機能の完全保持

## 🔍 **品質基準**

### **TypeScript要件**
- strictモード準拠
- 型エラーなし
- lintエラーなし
- 既存の型定義を活用

### **動作要件**
- テストモード: 投稿スキップ・成功結果返却
- 通常モード: 既存機能の完全保持
- エラーハンドリング: 既存の動作を維持

### **コード品質**
- 修正箇所: 10行以下の追加
- 可読性: 明確なコメントとログ
- 保守性: シンプルな条件分岐

## 📊 **成功基準**

### **主要成功指標**
1. **機能追加**: TEST_MODE=true時の投稿スキップ
2. **互換性保持**: 既存機能への影響なし  
3. **ログ明確性**: テストモード時の明確な表示
4. **最小修正**: 10行以下の簡潔な修正

### **品質確認項目**
- [ ] TypeScript型チェック通過
- [ ] ESLint通過
- [ ] テストモード動作確認
- [ ] 通常モード動作確認

## 📋 **連携確認**

この修正により、TASK-001で実装される新しいdev.tsが以下のように動作します：

```typescript
// dev.ts内
process.env.TEST_MODE = 'true';
```

↓

```
🧪 [TEST_MODE] X投稿をスキップ（テストモード）
📝 [投稿内容] 生成されたコンテンツ
✅ [完了] 開発テスト実行完了
```

## 📋 **報告書要件**

実装完了後、以下を含む報告書を作成してください：

### **報告書パス**
`tasks/20250723_113723/reports/REPORT-002-test-mode-support.md`

### **報告書内容**
1. **修正内容詳細**: 追加したコードと変更箇所
2. **動作確認結果**: テストモード・通常モードの動作テスト
3. **品質確認結果**: TypeScript/ESLint結果
4. **互換性確認**: 既存機能への影響評価

---

## 🚨 **CRITICAL: Manager権限制限遵守**

この指示書に従い、src/scripts/core-runner.tsの指定箇所のみを修正してください。  
10行以下の最小限の修正に留めてください。  
実装完了後、必ず報告書を作成してください。