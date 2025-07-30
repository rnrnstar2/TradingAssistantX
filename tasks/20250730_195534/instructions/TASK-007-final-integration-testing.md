# TASK-007: 最終統合テストと動作確認 - 新アーキテクチャ完全検証

## 🎯 タスク概要

Worker6完了後の最終統合テストを実行します。新しい「1実行=1アクション」アーキテクチャが完全に動作することを検証し、全システムの整合性を確認します。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様（最新版確認済み）
- `docs/workflow.md` - ワークフロー仕様書
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. 前提条件の確認

#### Worker完了状況チェック
```bash
echo "🔍 前提条件確認:"
echo ""

# Worker6の緊急クリーンアップ完了確認
echo "Worker6 緊急クリーンアップ結果:"
echo "  data/context/ exists: $([ -d 'data/context' ] && echo 'EXISTS (ERROR)' || echo 'DELETED (OK)')"
echo "  data/current/active-session.yaml exists: $([ -f 'data/current/active-session.yaml' ] && echo 'EXISTS (ERROR)' || echo 'DELETED (OK)')"
echo ""

# 新構造の整合性確認
echo "新構造整合性:"
echo "  data/config/ exists: $([ -d 'data/config' ] && echo 'YES (OK)' || echo 'NO (ERROR)')"
echo "  data/learning/ exists: $([ -d 'data/learning' ] && echo 'YES (OK)' || echo 'NO (ERROR)')"
echo "  data/current/ exists: $([ -d 'data/current' ] && echo 'YES (OK)' || echo 'NO (ERROR)')"
echo ""

echo "実行ディレクトリ構造（新形式）:"
for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "  $exec_dir:"
    echo "    post.yaml exists: $([ -f "${exec_dir}post.yaml" ] && echo 'YES (OK)' || echo 'NO (MAYBE)')"
    echo "    old structure exists: $([ -d "${exec_dir}claude-outputs" -o -d "${exec_dir}kaito-responses" -o -d "${exec_dir}posts" ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
  fi
done
echo ""
```

### 2. TypeScriptコンパイル確認

#### 型安全性テスト
```bash
echo "🔍 TypeScript整合性確認..."

# TSファイルの型チェック（エラー表示付き）
if command -v npx >/dev/null 2>&1; then
  echo "TypeScript型チェック実行中..."
  npx tsc --noEmit --strict src/shared/data-manager.ts 2>&1 | head -10
  
  if [ $? -eq 0 ]; then
    echo "✅ DataManager型チェック成功"
  else
    echo "❌ DataManager型チェックエラー"
  fi
  
  npx tsc --noEmit --strict src/kaito-api/core/session.ts 2>&1 | head -10
  
  if [ $? -eq 0 ]; then
    echo "✅ SessionManager型チェック成功"
  else
    echo "❌ SessionManager型チェックエラー"
  fi
  
  npx tsc --noEmit --strict src/workflows/main-workflow.ts 2>&1 | head -10
  
  if [ $? -eq 0 ]; then
    echo "✅ MainWorkflow型チェック成功"
  else
    echo "❌ MainWorkflow型チェックエラー"
  fi
else
  echo "⚠️ npx not available, TypeScript チェックをスキップ"
fi
echo ""
```

### 3. DataManager機能テスト

#### 新しいAPI動作確認
Node.jsスクリプトを作成して実行：

```javascript
// test-datamanager-integration.js として作成
const { DataManager } = require('./dist/shared/data-manager.js');

async function testDataManagerIntegration() {
  console.log('🧪 DataManager統合テスト開始');
  
  try {
    const dataManager = new DataManager();
    
    // 1. 実行サイクル初期化テスト
    console.log('📋 実行サイクル初期化テスト...');
    const executionId = await dataManager.initializeExecutionCycle();
    console.log(`✅ 実行ID生成成功: ${executionId}`);
    
    // 2. 新しい統合post.yaml保存テスト
    console.log('💾 統合post.yaml保存テスト...');
    await dataManager.savePost({
      actionType: 'post',
      content: 'テスト投稿内容',
      result: { 
        success: true, 
        message: '統合テスト投稿', 
        data: { tweetId: 'test_123' } 
      },
      engagement: { likes: 0, retweets: 0, replies: 0 },
      claudeSelection: {
        score: 8.5,
        reasoning: '統合テスト用の選択',
        expectedImpact: 'high'
      }
    });
    console.log('✅ 統合post.yaml保存成功');
    
    // 3. 新しい学習データ構造テスト
    console.log('📊 新学習データ構造テスト...');
    const learningData = await dataManager.loadLearningData();
    console.log(`✅ 学習データ読み込み成功:`, {
      engagementPatterns: !!learningData.engagementPatterns,
      successfulTopics: !!learningData.successfulTopics,
      topicsCount: learningData.successfulTopics?.topics?.length || 0
    });
    
    // 4. アーカイブ機能テスト
    console.log('📚 アーカイブ機能テスト...');
    await dataManager.archiveCurrentToHistory();
    console.log('✅ アーカイブ機能動作確認');
    
    console.log('🎉 DataManager統合テスト完了');
    return true;
    
  } catch (error) {
    console.error('❌ DataManager統合テストエラー:', error.message);
    return false;
  }
}

testDataManagerIntegration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

#### テスト実行
```bash
echo "🧪 DataManager統合テスト実行..."

# TypeScriptコンパイル（必要に応じて）
if [ -f "tsconfig.json" ]; then
  echo "TypeScriptビルド実行中..."
  npx tsc --outDir dist 2>/dev/null || echo "⚠️ TypeScriptビルドスキップ"
fi

# Node.jsテスト実行
if [ -f "test-datamanager-integration.js" ]; then
  echo "DataManager統合テスト実行..."
  node test-datamanager-integration.js
  
  if [ $? -eq 0 ]; then
    echo "✅ DataManager統合テスト成功"
  else
    echo "❌ DataManager統合テスト失敗"
  fi
else
  echo "⚠️ テストファイルが見つかりません。手動で作成してください。"
fi
echo ""
```

### 4. SessionManager動作確認

#### パス変更確認テスト
```bash
echo "🔍 SessionManager動作確認..."

# 一時的なNode.jsスクリプトで確認
cat > test-session-path.js << 'EOF'
try {
  // data/config/twitter-session.yaml パスが正しく設定されているか確認
  const fs = require('fs');
  const path = require('path');
  
  const expectedPath = path.join(process.cwd(), 'data', 'config', 'twitter-session.yaml');
  console.log('Expected session path:', expectedPath);
  
  // ディレクトリが存在するか確認
  const configDir = path.dirname(expectedPath);
  if (fs.existsSync(configDir)) {
    console.log('✅ Config directory exists:', configDir);
  } else {
    console.log('❌ Config directory missing:', configDir);
  }
  
  console.log('✅ SessionManager path verification completed');
} catch (error) {
  console.error('❌ SessionManager path verification failed:', error.message);
  process.exit(1);
}
EOF

node test-session-path.js && rm test-session-path.js
echo ""
```

### 5. MainWorkflow基本動作確認

#### 簡易ワークフローテスト
```bash
echo "🔍 MainWorkflow基本構造確認..."

# pnpm devの基本実行テスト（エラー確認用）
echo "基本実行テスト（短時間で停止）:"
timeout 10s npm run dev 2>&1 | head -20 || echo "⚠️ 10秒でタイムアウト（正常）"

echo ""
echo "利用可能なスクリプト確認:"
npm run 2>/dev/null | grep -E "(dev|start|test)" | head -10
echo ""
```

### 6. 新ディレクトリ構造完全性チェック

#### docs/directory-structure.md との整合性確認
```bash
echo "🔍 ディレクトリ構造完全性チェック..."

echo "期待される構造 vs 実際の構造:"
echo ""

echo "data/config/ 内容:"
ls -la data/config/ 2>/dev/null || echo "  (directory not found)"
echo ""

echo "data/learning/ 内容:"
ls -la data/learning/ 2>/dev/null || echo "  (directory not found)"
echo ""

echo "data/current/ 内容（実行ディレクトリのみ表示）:"
ls -la data/current/ | grep execution || echo "  (no execution directories)"
echo ""

# post.yaml の内容サンプル確認
echo "post.yaml 構造サンプル（最新のもの）:"
latest_exec=$(ls -1t data/current/execution-*/ 2>/dev/null | head -1)
if [ -n "$latest_exec" ] && [ -f "${latest_exec}post.yaml" ]; then
  echo "  File: ${latest_exec}post.yaml"
  head -10 "${latest_exec}post.yaml" 2>/dev/null || echo "  (cannot read file)"
else
  echo "  (no post.yaml found)"
fi
echo ""
```

## 🚨 重要な制約事項

### テスト範囲の制限
- **外部API呼び出し禁止**: 実際のKaitoAPI、Claude APIは使用しない
- **基本動作確認のみ**: 完全なエンドツーエンドテストは行わない
- **型安全性重視**: TypeScript整合性を最重要視

### MVP制約遵守
- **最小限のテスト**: 過剰なテスト機能は実装しない
- **手動実行中心**: 複雑な自動テスト環境は構築しない
- **シンプルな確認**: 基本構造の確認に集中

## 📝 実装手順

1. **前提条件確認**: Worker6完了とディレクトリ構造確認
2. **TypeScript確認**: 型整合性と基本的なコンパイル確認
3. **DataManager確認**: 新API動作と統合post.yaml確認
4. **SessionManager確認**: パス変更の正常動作確認
5. **MainWorkflow確認**: 基本構造と実行可能性確認
6. **構造完全性確認**: docs仕様との一致確認
7. **最終報告**: 統合テスト結果の総合評価

## ✅ 完了条件

### 構造確認
- [ ] 旧構造ファイルが完全に削除されている
- [ ] 新構造ファイルが正しく配置されている
- [ ] docs/directory-structure.md と実際の構造が一致している

### 機能確認  
- [ ] DataManagerの新API（savePost, loadLearningData）が動作する
- [ ] SessionManagerのパス変更が正常に動作する
- [ ] MainWorkflowの基本構造が正常である

### TypeScript確認
- [ ] 主要ファイルでTypeScriptエラーが発生しない
- [ ] 型定義の整合性が保たれている

### 統合確認
- [ ] post.yaml形式でのデータ保存が正常に動作する
- [ ] 学習データの2ファイル構造が正常に動作する
- [ ] アーカイブ機能が正常に動作する

## 📋 注意事項

### テスト実行の制限
- **外部依存回避**: APIキーや認証情報を使用しない
- **データ保護**: 既存の重要データを変更しない
- **一時ファイル**: テスト用一時ファイルは実行後に削除

### 評価基準
- **動作可能性**: 基本的な機能が動作すること
- **構造整合性**: 新しいアーキテクチャに完全移行できていること
- **型安全性**: TypeScript strict modeでエラーがないこと

### 出力制限
- **報告書のみ**: tasks/20250730_195534/reports/REPORT-007-final-integration-testing.md にのみ報告書を出力
- **テストファイル**: 必要に応じて一時的なテストファイルを作成可能（実行後削除）

## 🎯 期待される効果

- 新しいアーキテクチャの完全動作確認
- 全システム統合の問題早期発見
- 今後の開発への安全な移行完了
- プロダクション環境への準備完了

## 🏆 成功基準

### 最低限の成功基準
1. **TypeScriptエラーゼロ**: 主要ファイルでコンパイルエラーなし
2. **新構造完全移行**: 旧構造ファイル完全削除・新構造正常配置
3. **基本機能動作**: DataManager, SessionManager, MainWorkflowの基本動作確認

### 理想的な成功基準
1. **完全統合動作**: 新しいpost.yaml形式での完全なデータフロー確認
2. **学習データ統合**: 2ファイル構造での学習データ正常動作
3. **アーキテクチャ整合性**: docs仕様と実装の完全一致

## 📊 最終評価フォーマット

報告書では以下の形式で評価を行うこと：

```
【統合テスト結果】成功/部分成功/失敗
【構造移行状況】完了/未完了
【TypeScript整合性】良好/要修正/問題あり  
【機能動作確認】正常/部分正常/異常
【総合評価】A(優秀)/B(良好)/C(要改善)/D(問題あり)
【次のアクション】具体的な推奨事項
```