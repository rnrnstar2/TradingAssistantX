# TASK-005: 統合テストと動作確認

## 🎯 タスク概要

Worker1-4の作業完了後、ディレクトリ構造簡素化の統合テストと動作確認を実行します。新しい「1実行=1アクション」アーキテクチャが正常に動作することを検証します。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様
- `docs/workflow.md` - ワークフロー仕様書
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. 前提条件確認

以下のWorker作業が完了していることを確認：
- [ ] Worker1: DataManager簡素化完了
- [ ] Worker2: SessionManager修正完了  
- [ ] Worker3: データクリーンアップ完了
- [ ] Worker4: MainWorkflow修正完了

### 2. TypeScriptコンパイル確認

#### 全体コンパイルテスト
```bash
echo "🔍 TypeScriptコンパイル確認..."

# プロジェクトルートで実行
npm run build

if [ $? -eq 0 ]; then
  echo "✅ TypeScriptコンパイル成功"
else
  echo "❌ TypeScriptコンパイルエラー発生"
  exit 1
fi
```

#### 型チェック確認
```bash
echo "🔍 型チェック確認..."

npx tsc --noEmit --strict

if [ $? -eq 0 ]; then
  echo "✅ 型チェック成功"
else
  echo "❌ 型チェックエラー発生"
  exit 1
fi
```

### 3. ディレクトリ構造検証

#### 新構造確認スクリプト
```bash
echo "🔍 ディレクトリ構造検証..."

# 削除確認
echo "削除確認:"
echo "  data/context/ exists: $([ -d 'data/context' ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
echo "  data/current/active-session.yaml exists: $([ -f 'data/current/active-session.yaml' ] && echo 'YES (ERROR)' || echo 'NO (OK)')"

# 配置確認
echo "配置確認:"
echo "  data/config/ exists: $([ -d 'data/config' ] && echo 'YES (OK)' || echo 'NO (ERROR)')"
echo "  data/config/twitter-session.yaml exists: $([ -f 'data/config/twitter-session.yaml' ] && echo 'YES (OK)' || echo 'NO (MAYBE)')"

# 実行ディレクトリ構造確認
echo "実行ディレクトリ構造:"
for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "  $exec_dir:"
    echo "    claude-outputs/ exists: $([ -d "${exec_dir}claude-outputs" ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
    echo "    kaito-responses/ exists: $([ -d "${exec_dir}kaito-responses" ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
    echo "    posts/ exists: $([ -d "${exec_dir}posts" ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
    echo "    execution-summary.yaml exists: $([ -f "${exec_dir}execution-summary.yaml" ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
  fi
done
```

### 4. DataManager機能テスト

#### 基本機能テスト
```typescript
// テスト用スクリプト作成: test-datamanager.ts
import { DataManager } from '../src/shared/data-manager';

async function testDataManager() {
  console.log('🧪 DataManager機能テスト開始');
  
  const dataManager = new DataManager();
  
  try {
    // 1. 実行サイクル初期化テスト
    console.log('📋 実行サイクル初期化テスト...');
    const executionId = await dataManager.initializeExecutionCycle();
    console.log(`✅ 実行ID生成成功: ${executionId}`);
    
    // 2. 投稿保存テスト
    console.log('💾 投稿保存テスト...');
    await dataManager.savePost({
      actionType: 'post',
      content: 'テスト投稿',
      result: { success: true, message: 'Test success' },
      engagement: { likes: 0, retweets: 0, replies: 0 }
    });
    console.log('✅ 投稿保存成功');
    
    // 3. 学習データ読み込みテスト
    console.log('📊 学習データ読み込みテスト...');
    const learningData = await dataManager.loadLearningData();
    console.log(`✅ 学習データ読み込み成功: ${learningData.decisionPatterns.length}件`);
    
    console.log('🎉 DataManager機能テスト完了');
    
  } catch (error) {
    console.error('❌ DataManager機能テストエラー:', error);
    throw error;
  }
}

testDataManager().catch(console.error);
```

### 5. SessionManager機能テスト

#### パス変更確認テスト
```typescript
// テスト用スクリプト作成: test-sessionmanager.ts
import { SessionManager } from '../src/kaito-api/core/session';

async function testSessionManager() {
  console.log('🧪 SessionManager機能テスト開始');
  
  try {
    const sessionManager = new SessionManager();
    
    // パス確認（privateメンバーなので間接的にテスト）
    console.log('🔍 SessionManager初期化確認...');
    const isValid = sessionManager.isSessionValid();
    console.log(`✅ SessionManager初期化成功: valid=${isValid}`);
    
    console.log('🎉 SessionManager機能テスト完了');
    
  } catch (error) {
    console.error('❌ SessionManager機能テストエラー:', error);
    throw error;
  }
}

testSessionManager().catch(console.error);
```

### 6. MainWorkflow基本テスト

#### ワークフロー初期化テスト
```typescript
// テスト用スクリプト作成: test-workflow.ts
import { MainWorkflow } from '../src/workflows/main-workflow';

async function testWorkflow() {
  console.log('🧪 MainWorkflow機能テスト開始');
  
  try {
    // 基本的な初期化確認（実際の実行は行わない）
    console.log('🔍 MainWorkflow初期化確認...');
    
    // プライベートメソッドなので間接的にテスト
    // 実際のexecute()は外部APIが必要なので実行しない
    console.log('✅ MainWorkflow基本構造確認完了');
    
    console.log('🎉 MainWorkflow機能テスト完了');
    
  } catch (error) {
    console.error('❌ MainWorkflow機能テストエラー:', error);
    throw error;
  }
}

testWorkflow().catch(console.error);
```

## 🚨 重要な制約事項

### テスト範囲
- **構造確認重視**: ディレクトリ構造とファイル配置の確認を最優先
- **コンパイル確認**: TypeScriptエラーがないことを重点確認
- **外部API不要**: 実際のKaitoAPI呼び出しは行わない

### MVP制約遵守
- **最小限のテスト**: 過剰なテスト機能は実装しない
- **手動実行**: 自動テスト環境の構築は不要
- **シンプルな確認**: 基本動作の確認のみ

## 📝 実装手順

1. **前提条件確認**: Worker1-4の完了確認
2. **コンパイル確認**: TypeScriptエラーチェック
3. **構造検証**: ディレクトリ・ファイル配置確認
4. **機能テスト**: 各コンポーネントの基本機能確認
5. **結果レポート**: 統合テスト結果のまとめ

## ✅ 完了条件

### 構造確認
- [ ] `data/context/` ディレクトリが削除されている
- [ ] `data/current/active-session.yaml` が削除されている
- [ ] `data/config/twitter-session.yaml` が存在する（またはWorker2で移動済み）
- [ ] 実行ディレクトリ内の複雑な構造が削除されている

### コンパイル確認
- [ ] `npm run build` が成功する
- [ ] TypeScript strict modeでエラーが発生しない
- [ ] 型チェックが成功する

### 機能確認
- [ ] DataManagerの基本機能が動作する
- [ ] SessionManagerが正常に初期化される
- [ ] MainWorkflowの基本構造が正常である

## 📋 注意事項

### テスト実行環境
- **プロジェクトルート**: すべてのテストはプロジェクトルートから実行
- **Node.js環境**: 適切なNode.js環境で実行
- **権限確認**: ファイル読み書き権限の確認

### エラー対応
- **段階的確認**: エラー発生時は段階的に原因を特定
- **詳細ログ**: エラー発生時は詳細なログを記録
- **復旧可能性**: 可能な限り問題を特定し、修正方法を提示

### 出力制限
- **報告書のみ**: tasks/20250730_180627/reports/REPORT-005-integration-testing.md にのみ報告書を出力
- **テストファイル**: 必要に応じて一時的なテストファイルを作成可能（実行後削除）

## 🎯 期待される効果

- 新しいアーキテクチャの動作確認
- 統合後の問題の早期発見
- 全体システムの整合性確認
- 今後の開発への安全な移行

## 🔧 最終確認項目

1. **構造整合性**: 新しいディレクトリ構造が正しく適用されている
2. **コンパイル成功**: TypeScriptエラーが完全に解消されている
3. **基本機能**: 各コンポーネントが基本的に動作する
4. **データ管理**: 新しいpost.yaml形式でのデータ保存が可能
5. **セッション管理**: 認証情報の新しい配置が正常に動作する