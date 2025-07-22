# TradingAssistantX 開発規約

## 1. 命名規則

### ファイル・ディレクトリ命名規則

**TypeScript/JavaScript ファイル**: kebab-case を使用
```typescript
user-auth.ts, api-client.ts, x-api-manager.ts
```

**クラス名**: PascalCase を使用
```typescript
class ContentGenerator, class XApiManager
```

**設定ファイル**: {機能名}-config.yaml 形式
```typescript
autonomous-config.yaml, account-config.yaml
```

### 変数・関数命名規則

**変数**: camelCase を使用
```typescript
const userAccount = 'john';
const postingFrequency = 15;
```

**関数**: camelCase + 動詞で開始
```typescript
function generateContent(theme: string) { }
function schedulePost(content: PostContent) { }
```

**定数**: UPPER_SNAKE_CASE を使用
```typescript
const MAX_POSTS_PER_DAY = 15;
const API_BASE_URL = 'https://api.example.com';
```

### 型定義命名規則

**インターフェース**: PascalCase を使用
```typescript
interface PostContent { }
interface AccountStrategy { }
```

**型エイリアス**: PascalCase + Type で終わる
```typescript
type ConfigType = 'production' | 'development';
type PostingPhase = 'growth' | 'engagement';
```

### YAML設定ファイル命名

- **設置場所**: `data/` ディレクトリ直下のみ
- **出力先**: `tasks/outputs/` または `tasks/{TIMESTAMP}/outputs/`
- **タスク命名**: `TASK-XXX-{name}-{type}.{ext}`

## 2. 出力管理規則

### 許可された出力先

✅ **許可場所**:
```bash
tasks/{TIMESTAMP}/outputs/    # メイン出力先
tasks/outputs/               # 一般出力先
```

### 禁止された出力先

🚫 **絶対禁止場所**:
- プロジェクトルートディレクトリへの直接出力
- src/ ディレクトリへの出力（Manager権限例外を除く）
- data/config/ ディレクトリへの出力
- docs/ ディレクトリへの出力（Manager権限例外を除く）

### 出力ファイル命名規則

**統一命名形式**:
```bash
TASK-XXX-{name}-{type}.{ext}
```

**例**:
```bash
TASK-001-content-generation-report.md
TASK-005-development-rules-implementation.md
```

### 違反時の対処

**検証プロセス**:
1. ファイル作成前に出力先パスを確認
2. 許可されたディレクトリ内かチェック
3. 命名規則に準拠しているか確認

**修正方法**:
- 違反ファイルを即座に削除
- 正しいディレクトリに移動
- 命名規則に従って再作成

## 3. 削除安全規則

### 3ステップ削除プロセス

#### Step 1: 使用箇所確認
```bash
grep -r "関数名" src/
```

全プロジェクト内で削除対象の使用箇所を確認し、影響範囲を把握する。

#### Step 2: TypeScriptエラーチェック
```bash
npm run check-types
```

型チェックを実行し、削除による型エラーの発生を事前に確認する。

#### Step 3: 段階的削除
1つずつ削除し、各回Step 2でチェックを実行する。

### 削除前チェックリスト

- [ ] 使用箇所の完全な把握
- [ ] 依存関係の確認
- [ ] バックアップの作成
- [ ] テストの実行計画策定

### 段階的削除の手順

1. **影響範囲の特定**: grep による使用箇所の洗い出し
2. **依存関係の解析**: import/export 関係の確認
3. **段階的な削除**: 一つずつ削除し、その都度検証
4. **エラー修正**: 発生したエラーを即座に解決

### ロールバック手順

**エラー発生時は即座に復元**:
1. Git を使用した即座の復元: `git checkout -- [削除したファイル]`
2. 削除プロセスの再評価
3. より安全なアプローチでの再実行

## 4. YAML駆動開発原則

### YAML配置ルール

**設置場所**: `data/` ディレクトリ直下のみ
- **形式**: `.yaml` 拡張子必須
- **禁止場所**: `config/`, `settings/`, ルートディレクトリ

**基本構造例**:
```yaml
# data/autonomous-config.yaml
version: "1.0"
autonomous:
  enabled: true
  mode: "balanced"
  
posting:
  max_per_day: 15
  quality_threshold: 0.8
  
schedule:
  prime_times:
    - "09:00"
    - "12:30"
    - "21:00"
```

### YAML優先の設計思想

設定駆動による疎結合設計を重視し、ハードコードを避ける。YAMLファイルによる設定変更で動作を制御する。

### 設定と実装の分離

実装コードと設定データを完全に分離し、設定変更による柔軟な動作制御を実現する。

**必須事項**:
1. Git管理下に配置
2. 設定変更時はバックアップ作成
3. コメントで設定意図を記載

## 5. 実装ルール（必須遵守）

以下の9項目は絶対に守らなければならない実装ルールです：

1. **この構造から外れた実装は禁止** - 要件定義書の構造に厳密に従う
2. **新規ファイルは必ず適切なディレクトリに配置** - ディレクトリ構造の遵守
3. **data/current/は常に最小限のデータのみ保持** - データの肥大化防止
4. **古いデータは自動的にarchivesへ移動** - データライフサイクルの管理
5. **コレクターは必ずbase-collectorを継承（疎結合維持）** - アーキテクチャの一貫性
6. **main.tsとdev.tsは共通のcore-runner.tsを使用（DRY原則）** - コードの重複排除
7. **実行前後でintegrity-checker.tsによる検証必須** - 整合性の保証
8. **要件定義にないファイル作成は自動拒否** - 仕様外ファイルの防止
9. **実行ログは必ず記録し、異常時は即座にロールバック** - 実行追跡と安全性

## 6. 禁止事項

### 絶対禁止リスト

**システム破壊防止**:
- ❌ ルートディレクトリへの出力
- ❌ Manager権限での実装作業（指示書作成例外を除く）
- ❌ 品質妥協・固定プロセス強制

**ハルシネーション防止**:
- ❌ 要件定義にないファイル・ディレクトリの作成
- ❌ src ディレクトリ内のファイル追加・変更（Manager ロール以外）
- ❌ 新しい collector/service の自動生成
- ❌ data/config/の設定ファイル自動追加

**データ品質保持**:
- ❌ モックデータ使用
- ❌ 実データ収集を避けるテストモード

## 7. コーディング標準

### TypeScript設定

**必須設定**:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### エラーハンドリング

**適切なtry-catch使用**:
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new CustomError('処理に失敗しました', error);
}
```

**エラーログの記録**:
- すべてのエラーを適切にログ記録
- エラーの文脈情報を含める
- ロールバック可能な状態を維持

### テスト要件

**単体テストの作成**:
- 全ての public メソッドのテスト
- エラーケースのテスト
- エッジケースのテスト

**統合テストの考慮**:
- コンポーネント間の連携テスト
- データフローのテスト
- エンドツーエンドシナリオのテスト

## 8. 権限管理

### Manager権限制限

**許可事項**:
- ✅ 指示書作成・Worker統率
- ✅ `tasks/{TIMESTAMP}/instructions/` 配下の指示書作成（Writeツール例外許可）

**禁止事項**:
- 🚫 プロダクションコード実装・編集は完全禁止

### Worker権限

**実装作業全般**:
- ✅ プロダクションコード実装
- ✅ テスト作成・実行
- ✅ デバッグ・修正作業

## 9. 品質保証

### コードレビュー基準

**必須チェック項目**:
- [ ] 命名規則の遵守
- [ ] 型安全性の確保
- [ ] エラーハンドリングの適切性
- [ ] テストカバレッジの十分性
- [ ] ドキュメントの更新

### 継続的改善

**品質向上のサイクル**:
1. コードメトリクスの測定
2. 問題点の特定
3. 改善策の実施
4. 効果の測定
5. ナレッジの共有

---

**重要**: このドキュメントは開発者のリファレンスとして機能し、新規開発者のオンボーディングに使用されます。不明な点があれば、このドキュメントを参照して適切な開発方針を確認してください。