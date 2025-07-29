# TASK-004: ドキュメント整合性修正

## 概要
docs/directory-structure.mdの記載内容を実際のkaito-api実装に合わせて更新し、完全な整合性を確保する。

## 要件定義書参照
- 実際のsrc/kaito-api/構造（現状の実装）
- REQUIREMENTS.md: MVP要件

## 問題の特定

### 現在の乖離状況
| ドキュメント記載 | 実際の実装 | 対応 |
|-----------------|-----------|------|
| `session.ts` | `session-manager.ts` | ファイル名修正 |
| 記載なし | `api-key-auth.ts` | 追加記載 |
| 記載なし | `v2-login-auth.ts` | 追加記載 |
| 記載なし | `normalizer.ts` | 追加記載 |
| 記載なし | `type-checker.ts` | 追加記載 |

## 修正対象ファイル
`/Users/rnrnstar/github/TradingAssistantX/docs/directory-structure.md`

## 修正内容

### 1. kaito-api/core/セクション更新
**修正前**:
```
├── core/                  # 認証システム（最小構成）
│   ├── auth-manager.ts          # 統合認証管理
│   ├── client.ts                # HTTPクライアント・API通信
│   ├── config.ts                # 設定管理・環境変数
│   ├── session.ts               # セッション・Cookie管理
│   └── index.ts                 # coreエクスポート
```

**修正後**:
```
├── core/                  # 認証システム（V2標準）
│   ├── auth-manager.ts          # 統合認証管理（V2標準化済み）
│   ├── client.ts                # HTTPクライアント・API通信
│   ├── config.ts                # 設定管理・環境変数
│   ├── api-key-auth.ts          # APIキー認証クラス
│   ├── v2-login-auth.ts         # V2ログイン認証クラス
│   ├── session-manager.ts       # セッション・Cookie管理
│   └── index.ts                 # coreエクスポート
```

### 2. kaito-api/utils/セクション更新
**修正前**:
```
├── utils/                 # ユーティリティ
│   ├── types.ts                 # 全型定義
│   ├── constants.ts             # API URL・レート制限値等の定数
│   ├── errors.ts                # Twitter API特有のエラークラス
│   ├── response-handler.ts      # レスポンス処理・正規化
│   ├── validator.ts             # 入力検証
│   └── index.ts                 # utilsエクスポート
```

**修正後**:
```
├── utils/                 # ユーティリティ
│   ├── types.ts                 # 全型定義（統合済み）
│   ├── constants.ts             # API URL・レート制限値等の定数
│   ├── errors.ts                # Twitter API特有のエラークラス
│   ├── response-handler.ts      # レスポンス処理・正規化
│   ├── validator.ts             # 入力検証（validation.tsからリネーム）
│   ├── normalizer.ts            # データ正規化
│   ├── type-checker.ts          # 型チェック
│   └── index.ts                 # utilsエクスポート
```

### 3. 実装状況の更新

#### アーキテクチャ設計原則セクション
**追加情報**:
```
### V2標準化完了状況（2025-07-29更新）
- ✅ **V1認証削除**: 完全削除、V2標準化完了
- ✅ **型定義統合**: types/ディレクトリ → utils/types.ts統合完了
- ✅ **エンドポイント再構成**: read-only/authenticated構造実装完了
- ✅ **X_2FA_SECRET削除**: 廃止された認証要素の完全削除完了
```

#### 基本設計原則の更新
```
### V2標準アーキテクチャの特徴
- **2層認証構造**: APIキー認証（読み取り）+ V2ログイン認証（投稿）
- **認証クラス分離**: APIKeyAuth, V2LoginAuth, SessionManagerの役割分離
- **型定義統合**: 40+の型定義をutils/types.tsに一元化
- **プロキシ対応**: V2認証での必須プロキシ設定対応
```

### 4. 削除済みファイルの記載削除
以下の記載を削除：
- V1認証関連の記述
- types/ディレクトリの記述
- public/ディレクトリの記述
- 旧エンドポイントファイルの記述

## 追加説明の実装

### kaito-api実装完了マーカー
```
## 📊 kaito-api実装状況（2025-07-29最終更新）

### ✅ 完了項目
- **V2標準認証**: 2層認証アーキテクチャ完全実装
- **エンドポイント分離**: read-only/authenticated構造実装
- **型定義統合**: utils/types.tsに40+型定義統合
- **品質基準**: TypeScript strict mode対応（修正中）
- **ドキュメント整合性**: 実装とドキュメントの完全一致

### 🔧 継続作業
- TypeScriptコンパイルエラー修正
- 最終品質確認・統合テスト
```

## 実装手順

### 1. 現状確認
```bash
# 実際の構造確認
ls -la src/kaito-api/core/
ls -la src/kaito-api/utils/
```

### 2. ドキュメント修正
- docs/directory-structure.mdの該当セクション更新
- 実装実態との完全一致確保

### 3. 整合性確認
- 記載内容と実際のファイル構造の照合
- 説明文の正確性確認

### 4. 完了マーカー追加
- 実装完了状況の明記
- 継続作業項目の整理

## 品質基準
- ドキュメント記載と実装の100%一致
- 実装完了項目の正確な反映
- 継続作業項目の明確化
- 読みやすさと理解しやすさの確保

## 注意事項
- 実装の実態を正確に反映
- 将来の変更予定は記載しない
- 現在の状況のみを正確に記述
- 技術的正確性を最優先

## 成果物
- 更新されたdocs/directory-structure.md
- ドキュメント整合性確認書
- 報告書: `tasks/20250729_131622_kaito_api_quality_fix/reports/REPORT-004-document-sync.md`