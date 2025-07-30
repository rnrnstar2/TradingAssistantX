# TASK-002: SessionManagerパス変更とtwitter-session.yaml移動

## 🎯 タスク概要

KaitoAPIのSessionManagerでtwitter-session.yamlのパスを変更し、実際のファイルを新しい場所に移動します。24時間有効な認証情報は設定ファイルとして`data/config/`に配置されるべきです。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様
- `docs/kaito-api.md` - KaitoAPI仕様書
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. SessionManagerのパス変更

対象ファイル: `src/kaito-api/core/session.ts`

#### 変更前:
```typescript
private readonly SESSION_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "current",
  "twitter-session.yaml"
);
```

#### 変更後:
```typescript
private readonly SESSION_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "config",
  "twitter-session.yaml"
);
```

### 2. 既存ファイルの移動

#### 移動元: 
`data/current/twitter-session.yaml`

#### 移動先:
`data/config/twitter-session.yaml`

### 3. ディレクトリ作成確認

`data/config/`ディレクトリが存在しない場合は作成してください。

### 4. 移動手順

```bash
# 1. ディレクトリ確認・作成
mkdir -p data/config

# 2. ファイル存在確認
if [ -f "data/current/twitter-session.yaml" ]; then
  # 3. ファイル移動
  mv data/current/twitter-session.yaml data/config/twitter-session.yaml
  echo "✅ twitter-session.yaml moved to data/config/"
else
  echo "📝 twitter-session.yaml not found in data/current/"
fi
```

## 🚨 重要な制約事項

### 設計原則遵守
- **認証情報の適切な配置**: 24時間有効な認証情報は設定ファイルとして扱う
- **パス変更のみ**: SessionManagerの他の機能は変更しない
- **既存機能維持**: 認証機能に影響を与えない

### TypeScript品質要件
- **型安全性**: strict mode遵守
- **エラーハンドリング**: 適切なエラー処理維持
- **コメント不要**: 新しいコメントは追加しない

## 📝 実装手順

1. **ドキュメント読込み**: 必須ドキュメントの確認
2. **現在のファイル確認**: existing twitter-session.yamlの存在確認
3. **ディレクトリ作成**: data/config/ディレクトリの確保
4. **パス変更**: SessionManager内のSESSION_FILE_PATHを変更
5. **ファイル移動**: 既存ファイルをdata/config/に移動
6. **動作確認**: TypeScriptコンパイルと基本動作確認

## ✅ 完了条件

- [ ] `src/kaito-api/core/session.ts`のSESSION_FILE_PATHが`data/config/twitter-session.yaml`に変更されている
- [ ] `data/config/`ディレクトリが存在する
- [ ] 既存の`twitter-session.yaml`が`data/config/`に移動されている（存在する場合）
- [ ] TypeScriptエラーが発生しない
- [ ] SessionManagerの他の機能に影響がない

## 📋 注意事項

### ファイル移動の注意点
- **ファイル存在確認**: 移動前に必ずファイルの存在を確認
- **バックアップ不要**: 移動のみで十分（認証情報は再生成可能）
- **権限維持**: ファイル権限の維持

### 実装上の注意
- **最小限の変更**: パス定数の変更のみに留める
- **他ファイルへの影響なし**: この変更は独立している
- **出力先制限**: tasks/20250730_180627/reports/REPORT-002-session-path-migration.md にのみ報告書を出力

## 🎯 期待される効果

- 設定ファイルの適切な配置
- ディレクトリ構造の整合性向上
- 認証情報管理の明確化
- 新しいアーキテクチャへの対応完了

## 🔧 テスト確認項目

1. **コンパイル確認**: `npm run build` またはTypeScriptコンパイルが成功する
2. **パス確認**: SESSION_FILE_PATHが正しく変更されている
3. **ファイル配置**: twitter-session.yamlが適切な場所に配置されている
4. **機能維持**: SessionManagerの既存機能が正常動作する