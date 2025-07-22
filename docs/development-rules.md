# TradingAssistantX 開発規約

## 🚨 **構造厳守の絶対原則**

### ハルシネーション防止の根幹
**定義された構造の厳格遵守が全ての基礎**
1. REQUIREMENTS.mdに記載されたディレクトリ・ファイルのみ使用可能
2. 新規ファイル・ディレクトリ作成は原則禁止
3. integrity-checker.tsが自動検出・拒否

### 必須ディレクトリ構造
```
TradingAssistantX/
├── src/         # ソースコード
│   ├── core/        # 意思決定・自律実行
│   ├── collectors/  # データ収集（RSS中心）
│   ├── services/    # コンテンツ生成・投稿実行
│   ├── utils/       # ユーティリティ
│   └── scripts/     # 実行スクリプト
├── data/        # YAML設定・データ（階層管理）
│   ├── config/      # システム設定（読み取り専用）
│   ├── current/     # ホットデータ（1MB・7日・20ファイル上限）
│   ├── learning/    # ウォームデータ（10MB・90日上限）
│   └── archives/    # コールドデータ（無制限・永続）
├── tests/       # テストコード
└── docs/        # ドキュメント
```

## 📊 **階層型データ管理原則**

### 3層構造の厳格運用
- **ホットデータ** (current/): 直近7日分、最大1MB、即座の意思決定用
- **ウォームデータ** (learning/): 90日分の分析済みインサイト、最大10MB
- **コールドデータ** (archives/): 全投稿の永続保存、容量無制限

### 自動階層移動ルール
1. 古いデータは自動的に下位層へ移動
2. 分析結果のみ保持し、生データは圧縮・移動
3. data-hierarchy-manager.tsによる自動管理

## 🧠 **Claude Code SDK自律システム規約**

### 疎結合設計の必須事項
1. **コレクターは必ずbase-collectorを継承** - アーキテクチャの一貫性
2. **統一インターフェース**: CollectionResult型でデータ統合
3. **戦略的切り替え**: YAMLファイルの設定変更だけでソース制御
4. **RSS Collector中心**: MVP段階はRSS収集のみ、将来拡張対応

### 特別なコレクター使用ルール
- **RSS Collector**: 主要データ収集源、構造化データで品質確保
- **Playwright Account**: 自アカウント分析のみ、一般情報収集にはRSS使用
- **動的クエリ対応**: Google News検索と連携、Claude SDKが最適検索条件選択

### 実行スクリプトのDRY原則
- **main.ts**と**dev.ts**は共通のcore-runner.tsを使用
- 重複コードの完全排除
- 単一責任の原則厳守

## 🔒 **ハルシネーション防止機構**

### 許可された書き込み先（厳格制限）
```yaml
allowed_paths:
  - data/current/
  - data/learning/
  - data/archives/
  - tasks/outputs/
```

### 読み取り専用ディレクトリ
```yaml
readonly_paths:
  - src/
  - data/config/
  - tests/
  - docs/
```

### 実行前後の必須検証
1. **構造検証**: 要件定義と完全一致確認
2. **ファイル数・サイズ制限チェック**
3. **命名規則**: 記載されたファイル名のみ使用可
4. **実行ログ記録**: 異常時は即座にロールバック

## ⚠️ **絶対禁止事項**

### システム破壊防止
- ❌ ルートディレクトリへの出力
- ❌ 要件定義にないファイル・ディレクトリの作成
- ❌ srcディレクトリ内変更（Manager権限例外のみ）

### データ品質保持
- ❌ モックデータ使用（REAL_DATA_MODE=true必須）
- ❌ テストモードでの実データ収集回避
- ❌ 階層別サイズ制限違反

### TypeScript/JavaScript ファイル
**kebab-case**を使用
```typescript
autonomous-executor.ts, rss-collector.ts, x-poster.ts
```

### クラス名・インターフェース名
**PascalCase**を使用
```typescript
class ContentCreator, interface CollectionResult
```

### YAML設定ファイル
**{機能名}-{種類}.yaml**形式
```yaml
autonomous-config.yaml, rss-sources.yaml, brand-strategy.yaml
```

### 変数・関数
- **変数**: camelCase
- **関数**: camelCase + 動詞で開始
- **定数**: UPPER_SNAKE_CASE

```typescript
const accountStatus = '...';
function generateContent(theme: string) { }
const MAX_POSTS_PER_DAY = 15;
```

## 📋 **YAML駆動開発原則**

### 必須配置ルール
- **読み取り専用**: `data/config/`（システム設定）
- **書き込み可能**: `data/current/`, `data/learning/`, `data/archives/`
- **形式**: `.yaml`拡張子必須

### 基本構造例
```yaml
# data/config/autonomous-config.yaml
version: "1.0"
autonomous:
  enabled: true
  execution_mode: "balanced"
  
data_collection:
  primary_source: "rss"
  fallback_sources: ["api", "community"]
  
posting:
  max_per_day: 15
  quality_threshold: 0.8
```

### 設定駆動制御の原則
- ハードコードの完全排除
- YAMLファイル変更による動作制御
- 設定と実装の完全分離

## ⚙️ **実装必須遵守事項**

### 9つの絶対ルール
1. **構造厳守**: 要件定義書の構造から一切の逸脱禁止
2. **適切配置**: 新規ファイルは必ず指定ディレクトリに配置
3. **データ最小化**: data/current/は常に最小限のデータのみ保持
4. **自動階層移動**: 古いデータは自動的にarchivesへ移動
5. **疎結合継承**: コレクターは必ずbase-collectorを継承
6. **DRY原則**: main.tsとdev.tsは共通のcore-runner.tsを使用
7. **整合性検証**: 実行前後でintegrity-checker.tsによる検証必須
8. **ファイル制限**: 要件定義にないファイル作成は自動拒否
9. **実行追跡**: 実行ログ記録、異常時は即座にロールバック

## 🛡️ **安全削除プロセス**

### 3ステップ削除
1. **影響範囲確認**: `grep -r "対象名" src/`で使用箇所を洗い出し
2. **型チェック実行**: `npm run check-types`でエラー事前確認
3. **段階的削除**: 一つずつ削除し、各回検証実行

### 必須チェックリスト
- [ ] 使用箇所の完全把握
- [ ] 依存関係確認
- [ ] バックアップ作成
- [ ] テスト実行計画策定

### ロールバック手順
エラー発生時は`git checkout -- [削除ファイル]`で即座復元

## 👥 **権限別開発制約**

### Manager権限
**許可事項**:
- ✅ 指示書作成・Worker統率
- ✅ `tasks/{TIMESTAMP}/instructions/`配下の指示書作成のみ

**絶対禁止事項**:
- 🚫 プロダクションコード（src/）の実装・編集

### Worker権限
**許可事項**:
- ✅ 要件定義に従った実装作業
- ✅ `data/current/`, `data/learning/`, `data/archives/`への出力
- ✅ テスト作成・実行・デバッグ

**制限事項**:
- 🚫 要件定義にないファイル・ディレクトリ作成

## 💻 **コーディング標準**

### TypeScript必須設定
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### エラーハンドリング
```typescript
try {
  const result = await collectRSSData();
  return result;
} catch (error) {
  errorHandler.log('RSS収集失敗', error);
  throw new CustomError('データ収集に失敗', error);
}
```

### テスト要件
- 全publicメソッドの単体テスト
- エラーケース・エッジケーステスト
- コンポーネント間連携テスト

## ✅ **品質保証チェックリスト**

### 実装前必須確認
- [ ] ROLEとREQUIREMENTS.md確認完了
- [ ] 対象ファイルが要件定義に記載されている
- [ ] 適切なディレクトリに配置
- [ ] 疎結合設計原則に従っている
- [ ] モックデータを使用していない

### コードレビュー必須項目
- [ ] 命名規則の遵守
- [ ] 型安全性の確保
- [ ] エラーハンドリングの適切性
- [ ] テストカバレッジの十分性
- [ ] YAML駆動設計の遵守

## 🔄 **継続的品質改善**

### 自動検証サイクル
1. `integrity-checker.ts`による構造検証
2. ファイルサイズ・数制限チェック
3. 実行ログ記録・異常検出
4. 自動ロールバック実行
5. 品質メトリクス測定・改善

---

**重要原則**: Claude Code SDKによる完全自律システム実現のため、この規約は厳格に遵守し、人間の介入を最小化した高品質な投資教育コンテンツ生成を実現する。