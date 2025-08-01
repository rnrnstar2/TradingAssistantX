# TASK-001: dev.tsアクション選択必須化

## 🎯 実装目標

現在の `pnpm dev` （デフォルト実行）を廃止し、dev.tsでアクション指定を必須化することで、テスト実行時の明示性を向上させる。

## 📋 現在の問題

### 🔧 現状の動作
- `pnpm dev` → スケジュールの最初のアクションを自動選択
- `pnpm dev:post` → postアクション実行
- `pnpm dev:retweet` → retweetアクション実行
- etc...

### ⚠️ 問題点
- **非明示的**: `pnpm dev` でどのアクションが実行されるか分からない
- **予期しない動作**: スケジュール変更により実行内容が変わってしまう
- **テスト品質低下**: 意図しないアクションでのテスト実行

## 🔧 修正内容

### Phase 1: dev.ts修正（アクション必須化）

#### 📍 修正対象ファイル
`src/dev.ts` - 47-52行目の修正

#### 修正前（現在のコード）
```typescript
} else {
  // デフォルトは最初のアクション
  selectedAction = scheduleItems[0];
  console.log(`🎯 開発モード: アクション '${selectedAction.action}' (${selectedAction.topic || selectedAction.target_query || '基本実行'}) を実行`);
}
```

#### 修正後（必須化）
```typescript
} else {
  // アクション指定なしはエラー
  console.error('❌ アクション指定が必要です。以下のいずれかを使用してください:');
  console.log('');
  console.log('📋 利用可能なコマンド:');
  console.log('  pnpm dev:post      # 投稿テスト');
  console.log('  pnpm dev:retweet   # リツイートテスト');
  console.log('  pnpm dev:like      # いいねテスト');
  console.log('  pnpm dev:quote     # 引用ツイートテスト');
  console.log('  pnpm dev:follow    # フォローテスト');
  console.log('');
  console.log('📖 詳細: 各アクションは利用可能なスケジュールから実行されます');
  throw new Error('Action specification required');
}
```

### Phase 2: エラーハンドリング強化

#### 🛡️ 追加機能
1. **利用可能アクション表示**: 実際のschedule.yamlから動的に取得
2. **分かりやすいエラーメッセージ**: 利用方法を明確に説明
3. **動作一貫性**: 指定アクションが見つからない場合の適切な処理

#### 実装コード例
```typescript
/**
 * アクション必須チェックとヘルプ表示
 */
function displayAvailableActions(scheduleItems: any[]) {
  console.error('❌ アクション指定が必要です。以下のいずれかを使用してください:');
  console.log('');
  console.log('📋 利用可能なコマンド:');
  
  const actionTypes = [...new Set(scheduleItems.map(item => item.action))];
  actionTypes.forEach(action => {
    const examples = scheduleItems.filter(item => item.action === action).slice(0, 2);
    const exampleDesc = examples[0]?.topic || examples[0]?.target_query || '基本実行';
    console.log(`  pnpm dev:${action.padEnd(8)} # ${action}テスト (例: ${exampleDesc})`);
  });
  
  console.log('');
  console.log('📖 詳細: docs/workflow.md を参照');
  console.log('🔍 スケジュール: data/config/schedule.yaml に定義済み');
}
```

## 🎯 実装指針

### ドキュメント参照要件
**必須参照**:
- `docs/workflow.md` - dev実行とスケジュール実行の違い
- `docs/directory-structure.md` - プロジェクト構造理解
- `package.json` - 既存のdev:xxxスクリプト確認

### 品質要件
- **TypeScript strict**: 型安全性確保
- **エラーハンドリング**: 適切なエラーメッセージとprocess.exit
- **ユーザビリティ**: 分かりやすいヘルプメッセージ

### テスト要件
```bash
# 期待される動作
pnpm dev            # → エラー + ヘルプ表示
pnpm dev:post       # → postアクション実行
pnpm dev:invalid    # → 該当なしの場合は最初のアクションで実行 + 警告
```

## 📁 影響するファイル

### 直接修正対象
- `src/dev.ts` - メインファイル（アクション必須化）

### 動作確認対象
- `package.json` - dev:xxxスクリプトとの連携確認
- `data/config/schedule.yaml` - アクション一覧の動的取得確認

## ⚠️ 重要な制約

### 後方互換性
- **dev:xxxスクリプト**: 既存のdev:post, dev:retweet等は影響なし
- **schedule.yaml**: 既存の設定ファイルはそのまま使用
- **main.ts**: スケジュール実行（本番実行）への影響なし

### 依存関係
- ScheduleLoaderクラスの正常動作が前提
- MainWorkflow.execute()への引数渡しは現状維持

## ✅ 完了基準

1. **アクション必須化完了**: 引数なしでの実行時に適切なエラー表示
2. **ヘルプ機能実装完了**: 利用可能なコマンド一覧の動的表示
3. **エラーハンドリング完了**: 分かりやすいエラーメッセージとexit処理
4. **動作確認完了**: 全dev:xxxスクリプトの正常動作確認
5. **TypeScript品質確認**: strict modeでのコンパイルエラーなし

## 🔧 実装順序

1. **Phase 1**: アクション必須チェック実装（47-52行目修正）
2. **Phase 2**: ヘルプ表示関数実装（displayAvailableActions）
3. **Phase 3**: エラーハンドリング強化
4. **Phase 4**: 動作テスト・品質確認

## 📋 報告書作成要件

実装完了後、`tasks/20250730_202653/reports/REPORT-001-dev-script-action-required.md`に以下内容で報告書を作成：

1. **修正サマリー**: 変更した機能・削除したコード
2. **ヘルプ機能**: 動的アクション一覧表示の実装詳細
3. **動作確認結果**: 全dev:xxxスクリプトのテスト結果
4. **ユーザビリティ**: エラーメッセージの分かりやすさ確認
5. **今後の保守**: 新アクション追加時の対応方法

---

**🚨 CRITICAL**: この修正により、dev実行時の明示性が大幅に向上し、意図しないアクション実行を防止できる。テスト品質の向上に直結する重要な改善。