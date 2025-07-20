# 要件定義書

## 概要

このディレクトリには、Hedge Systemの要件定義書が格納されています。要件定義は機能要件と非機能要件に分類され、システムの目的・制約・期待される動作を明確に定義しています。

## ファイル構成

```
requirements/
├── README.md                    # このファイル
├── system-overview.md           # システム概要・目的・基本方針
├── functional-requirements.md   # 機能要件
├── non-functional-requirements.md  # 非機能要件
└── realtime-architecture.md    # リアルタイムアーキテクチャ要件
```

## 読む順序

要件定義書を理解するための推奨読書順序：

1. **system-overview.md** - システムの全体像を把握
2. **functional-requirements.md** - 実装すべき機能を理解
3. **non-functional-requirements.md** - 性能・品質要件を確認
4. **realtime-architecture.md** - リアルタイム処理の要件を確認

## MVP制約との関係

要件定義書は以下のMVP制約と連携しています：

- `../mvp-constraints/mvp-principles.md` - 実装時の制約原則
- `../mvp-constraints/README.md` - 過剰実装防止ガイド

## 更新ルール

### 要件変更時の手順
1. 関連するrequirementsファイルを更新
2. MVP制約に抵触していないか確認
3. design/ディレクトリの設計書との整合性を確認
4. 変更理由をコミットメッセージに明記

### 承認プロセス
- 機能要件の変更: プロダクトオーナー承認必須
- 非機能要件の変更: アーキテクト承認必須
- システム概要の変更: ステークホルダー全員承認必須

## トレーサビリティ

要件と実装の対応関係：

| 要件カテゴリ | 対応する設計書 | 実装場所 |
|-------------|--------------|---------|
| 口座管理機能 | `../design/database-design.md` | `apps/hedge-system/lib/account-manager.ts` |
| ポジション管理 | `../design/api-design.md` | `apps/hedge-system/lib/position-execution.ts` |
| リアルタイム通信 | `../design/named-pipe-design.md` | `apps/hedge-system/lib/ea-handler.ts` |
| 認証・認可 | `../design/api-design.md` | AWS Amplify設定 |

## 参照

- 設計書: `../design/README.md`
- MVP制約: `../mvp-constraints/README.md`
- 開発ガイド: `../guides/README.md`