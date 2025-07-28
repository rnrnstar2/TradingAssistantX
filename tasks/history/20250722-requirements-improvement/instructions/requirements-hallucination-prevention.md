# REQUIREMENTS.md改良指示書：ハルシネーション防止機構

## 🚨 問題認識
定期実行の繰り返しによるハルシネーション発生リスク：
- 要件定義にない余計なファイル作成
- 本来の構造からの逸脱
- システムの複雑化・肥大化

## 🛡️ 防止機構の設計

### 1. ファイル構造検証システム（新規追加）
**追加場所**: 「📁 ディレクトリ・ファイル構造」セクション後

```markdown
## 🔒 ハルシネーション防止機構

### ファイル構造整合性チェック
実行前後で以下を厳格に検証し、要件定義との整合性を保証する。

#### 許可された出力先（厳格制限）
```yaml
# 書き込み許可ディレクトリ
allowed_write_paths:
  - data/current/         # 現在状態のみ
  - data/learning/        # 学習データ
  - data/archives/        # アーカイブ
  - tasks/outputs/        # 実行結果出力
  
# 書き込み禁止（読み取り専用）
readonly_paths:
  - src/                  # ソースコード
  - data/config/          # 設定ファイル
  - tests/                # テストコード
  - docs/                 # ドキュメント
  - REQUIREMENTS.md       # この要件定義書
```

#### 実行前チェックリスト
1. **構造検証**: 要件定義のディレクトリ構造と完全一致確認
2. **ファイル数制限**: data/current/は最大10ファイルまで
3. **サイズ制限**: 各YAMLファイルは最大100KB
4. **命名規則**: 要件定義に記載された名前のみ使用可

#### 実行後検証
```typescript
// 必須実装：src/utils/integrity-checker.ts
interface IntegrityCheck {
  validateBeforeExecution(): boolean;
  validateAfterExecution(): boolean;
  rollbackOnViolation(): void;
}
```
```

### 2. 要件定義準拠の強制（既存セクション改修）
**改修場所**: 「🚨 MVP構成」セクションの後

```markdown
### 🔐 要件定義準拠の絶対ルール

#### ファイル作成時の検証フロー
1. **作成前確認**: 要件定義に記載されたファイル名か？
2. **ディレクトリ確認**: 許可されたディレクトリか？
3. **重複確認**: 同名ファイルが既に存在しないか？
4. **サイズ確認**: 制限値以内か？

#### 禁止事項（ハルシネーション防止）
- ❌ 要件定義にないファイル・ディレクトリの作成
- ❌ srcディレクトリ内のファイル追加・変更
- ❌ 新しいcollector/serviceの自動生成
- ❌ data/config/の設定ファイル自動追加
- ❌ ルートディレクトリへの直接ファイル作成

#### 実行ログ必須記録
```yaml
# data/current/execution-log.yaml
execution_log:
  - timestamp: "2024-01-22T10:00:00Z"
    files_created: ["data/current/today-posts.yaml"]
    files_updated: ["data/current/account-status.yaml"]
    files_deleted: []
    validation_passed: true
```
```

### 3. データクレンジング強化（既存セクション拡張）
**改修場所**: 「自律ループシステム」内の動的データクレンジング

```markdown
### 動的データクレンジング（強化版）
- **定期検証**: 実行毎に全ファイルを要件定義と照合
- **自動削除**: 要件定義にないファイルは即座に削除
- **サイズ管理**: data/全体で10MB上限、超過時は古いデータから削除
- **構造保持**: 要件定義の構造から逸脱したファイルは作成不可
```

### 4. 実装必須コンポーネント追加
**追加場所**: 「/src ディレクトリ構造」内

```markdown
├── utils/                  # ユーティリティ
│   ├── yaml-manager.ts          # YAML読み書き
│   ├── context-compressor.ts    # コンテキスト圧縮
│   └── integrity-checker.ts     # 🆕 整合性検証（必須）
```

### 5. 自律実行エンジンへの組み込み
**改修ファイル**: `src/core/autonomous-executor.ts`

```typescript
// 必須実装パターン
class AutonomousExecutor {
  async execute() {
    // 1. 実行前検証
    const preCheck = await integrityChecker.validateBeforeExecution();
    if (!preCheck) {
      throw new Error("Pre-execution validation failed");
    }
    
    // 2. 通常実行
    await this.runMainLogic();
    
    // 3. 実行後検証
    const postCheck = await integrityChecker.validateAfterExecution();
    if (!postCheck) {
      await integrityChecker.rollbackOnViolation();
      throw new Error("Post-execution validation failed");
    }
  }
}
```

## 📋 実装チェックリスト

### integrity-checker.ts の必須機能
- [ ] 要件定義との構造比較
- [ ] ファイル作成前の事前検証
- [ ] 実行後の差分検証
- [ ] 違反時の自動ロールバック
- [ ] 実行ログの記録

### YAMLマネージャーの拡張
- [ ] ファイル作成時の要件定義チェック
- [ ] 許可リスト外への書き込み拒否
- [ ] サイズ制限の適用

### 定期実行での検証
- [ ] 毎回の実行前後で整合性確認
- [ ] 不明ファイルの自動削除
- [ ] 実行ログの保持（最新100件）

## 🎯 期待効果

### 即効性
- 余計なファイル作成の完全防止
- 要件定義からの逸脱検知
- システムの健全性維持

### 長期的効果
- ハルシネーションによる肥大化防止
- 保守性の向上
- 予測可能な動作の保証

## ⚠️ 重要注意事項

1. **この仕組み自体が要件定義の一部**となるため、慎重に実装
2. **検証ロジックは単純明快**に保ち、複雑化を避ける
3. **ロールバック機能**は必須（git使用も検討）
4. **実行ログ**は必ず残し、問題発生時の原因特定を可能に

## 🔄 段階的実装

1. **Phase 1**: integrity-checker.tsの基本実装
2. **Phase 2**: 実行前後の検証統合
3. **Phase 3**: 自動ロールバック機能
4. **Phase 4**: 実行ログ分析による改善