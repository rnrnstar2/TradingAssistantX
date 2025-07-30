# TASK-001: 重複投稿防止機能の緊急修正

## 🚨 **CRITICAL BUG**: 重複防止機能が完全に無効化

### 問題の重要度
- **優先度**: 🔥 CRITICAL - 即座修正必要
- **影響範囲**: 投稿品質・ユーザー体験に直接影響
- **発生頻度**: 毎回のdev実行で発生

### 問題の詳細確認済み
- **実際の問題**: 同テーマ投稿が8分間隔で生成（14:32 → 14:40）
- **根本原因**: `loadRecentPosts()`関数がファイル構造不整合で動作不能
- **検証完了**: data/current構造とコード期待値の完全不一致

## 🐛 **根本原因分析**

### 現在の実装問題
```typescript
// src/claude/endpoints/content-endpoint.ts:47
const dataPath = path.join(process.cwd(), 'data', 'current');
const files = await fs.readdir(dataPath);
// ↑ data/currentの直接ファイルのみ読み込み
```

### 実際のファイル構造
```
data/current/
├── execution-20250729-2332/
│   └── posts/
│       └── post-2025-07-29T14-32-36-273Z.yaml  <- 実際の投稿データ
├── execution-20250729-2340/
│   └── posts/
│       └── post-2025-07-29T14-40-09-709Z.yaml  <- 実際の投稿データ
```

### 期待される動作 vs 実際の動作
- **期待**: execution-*/posts/post-*.yamlファイルを読み込み、重複チェック実行
- **実際**: data/currentディレクトリ直下を読み込み、投稿データ0件取得

## 🛠️ **修正実装仕様**

### 対象ファイル
- `src/claude/endpoints/content-endpoint.ts`
- 関数: `loadRecentPosts()` (L45-L87)

### 修正内容詳細

#### 1. ディレクトリ走査の修正
```typescript
async function loadRecentPosts(): Promise<Array<{ content: string; timestamp: string }>> {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'current');
    const executionDirs = await fs.readdir(dataPath);
    const recentPosts: Array<{ content: string; timestamp: string }> = [];
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // execution-*ディレクトリを走査
    for (const dir of executionDirs) {
      if (!dir.startsWith('execution-')) continue;
      
      const postsPath = path.join(dataPath, dir, 'posts');
      
      try {
        // posts/ディレクトリが存在するかチェック
        const postsExists = await fs.access(postsPath).then(() => true).catch(() => false);
        if (!postsExists) continue;
        
        const postFiles = await fs.readdir(postsPath);
        
        // post-*.yamlファイルを処理
        for (const file of postFiles) {
          if (!file.startsWith('post-') || !file.endsWith('.yaml')) continue;
          if (file === 'post-index.yaml') continue; // インデックスファイルはスキップ
          
          const filePath = path.join(postsPath, file);
          const stat = await fs.stat(filePath);
          
          if (stat.mtime > twentyFourHoursAgo) {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // YAMLファイルから投稿内容を抽出
            const contentMatch = content.match(/content:\s*[>|-]\s*(.+?)(?=\n\w+:|$)/s);
            if (contentMatch) {
              const cleanContent = contentMatch[1]
                .replace(/\n\s*/g, ' ')  // 改行とインデントを除去
                .trim();
              
              recentPosts.push({
                content: cleanContent,
                timestamp: stat.mtime.toISOString()
              });
            }
          }
        }
      } catch (dirError) {
        // ディレクトリアクセスエラーは無視して継続
        continue;
      }
    }
    
    // 最新順でソートし、最新10件まで
    return recentPosts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
      
  } catch (error) {
    console.warn('過去投稿の読み込みに失敗:', error);
    return [];
  }
}
```

#### 2. YAML解析の改善
現在の正規表現パターンでは複数行YAMLの`content: |-`形式を正しく解析できません。

**修正前**: 
```typescript
const contentMatch = content.match(/content:\s*["']([^"']+)["']/m);
```

**修正後**:
```typescript
const contentMatch = content.match(/content:\s*[>|-]\s*(.+?)(?=\n\w+:|$)/s);
```

#### 3. デバッグログの追加
```typescript
console.log(`🔍 重複チェック: ${recentPosts.length}件の過去投稿を読み込み`);
if (recentPosts.length > 0) {
  console.log(`📝 最新投稿プレビュー: ${recentPosts[0].content.substring(0, 50)}...`);
}
```

## 🧪 **テスト要件**

### 手動テスト手順
1. **事前準備**: 現在のdata/current/に投稿データが存在することを確認
2. **dev実行1回目**: `pnpm dev`で投稿作成
3. **dev実行2回目**: 即座に`pnpm dev`再実行
4. **結果確認**: 
   - コンソールに「重複チェック: X件の過去投稿を読み込み」が表示される
   - 2回目の投稿内容が1回目と明確に異なる
   - プロンプトに「避けるべき表現」が含まれる

### テストコマンド
```bash
# 連続実行テスト
pnpm dev && sleep 2 && pnpm dev

# 結果比較（最新2件の投稿内容比較）
find data/current -name "post-*.yaml" -type f | tail -2 | xargs grep -A1 "content:"
```

### 期待される結果
- **修正前**: 同テーマ・類似内容の投稿が生成
- **修正後**: 明確に異なる視点・表現の投稿が生成
- **ログ出力**: 重複チェック機能の動作確認メッセージ

## 🚫 **実装制約**

### MVP制約遵守
- ✅ **バグ修正のみ**: 新機能追加は禁止
- ✅ **既存API維持**: `loadRecentPosts()`の戻り値型は変更禁止
- ✅ **パフォーマンス考慮**: ファイル読み込み上限10件維持

### 技術制約
- **TypeScript Strict**: 厳密な型チェック必須
- **エラーハンドリング**: ファイルアクセスエラーの適切な処理
- **後方互換性**: 既存のプロンプト構築ロジックは維持
- **ログレベル**: console.logは最小限、console.warnでエラー通知

### ファイル制約
- **対象ファイル**: content-endpoint.tsのみ編集
- **関数スコープ**: `loadRecentPosts()`関数内のみ修正
- **依存関係**: 新パッケージ追加禁止

## 📋 **完了条件**

### 機能要件
- [x] execution-*/posts/ディレクトリからの投稿データ読み込み
- [x] 複数行YAML形式（`content: |-`）の正しい解析
- [x] 24時間以内の投稿フィルタリング動作確認
- [x] 重複チェック機能の実動作確認

### 品質要件  
- [x] TypeScript strict モードでエラーなし
- [x] 連続dev実行で異なる内容生成確認
- [x] エラーケース（ディレクトリなし等）での適切な動作
- [x] デバッグログでの動作状況確認

### テスト要件
- [x] 手動連続実行テストで重複防止確認
- [x] 過去投稿読み込み件数のログ出力確認
- [x] 投稿内容の明確な差異化確認

## 💡 **実装のコツ**

### ファイル走査パターン
```typescript
// execution-ディレクトリのフィルタリング
if (!dir.startsWith('execution-')) continue;

// posts/ディレクトリ存在確認
const postsExists = await fs.access(postsPath).then(() => true).catch(() => false);

// post-*.yamlファイルの識別
if (!file.startsWith('post-') || !file.endsWith('.yaml')) continue;
if (file === 'post-index.yaml') continue;
```

### YAML解析の改善
```typescript
// 複数行YAMLコンテンツの正規表現
const contentMatch = content.match(/content:\s*[>|-]\s*(.+?)(?=\n\w+:|$)/s);

// 改行・インデント正規化
const cleanContent = contentMatch[1]
  .replace(/\n\s*/g, ' ')
  .trim();
```

### デバッグログ戦略
```typescript
console.log(`🔍 重複チェック: ${recentPosts.length}件の過去投稿を読み込み`);
console.log(`📁 走査対象: ${validExecutionDirs.length}個のexecution-ディレクトリ`);
```

## ⚡ **緊急度説明**

### なぜCRITICALか
1. **ユーザー体験悪化**: 同テーマ投稿の連続生成
2. **システム信頼性**: MVP要件「多様性確保」の完全破綻
3. **開発効率**: dev実行での品質検証が不可能
4. **本番影響**: スケジュール実行でも同様の問題発生可能性

### 修正優先度
- **最高優先度**: 他の全てのタスクより優先
- **即座対応**: 24時間以内修正必須
- **完全動作**: 中途半端な修正は不可

---

**📋 報告書作成指示**: 実装完了後、以下パスに報告書を作成
- 📋 報告書: `tasks/20250730_001543_duplicate_prevention_fix/reports/REPORT-001-fix-duplicate-prevention.md`

**🔍 最終確認**: 実装完了前に必ず連続dev実行テストで重複防止機能動作確認を実施すること