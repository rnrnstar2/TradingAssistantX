# EMERGENCY-002: 指示書準拠への修正範囲縮小

## 🚨 **緊急度**: CRITICAL - 高優先度

**実行モード**: EMERGENCY-001完了後に実行  
**推定時間**: 45-60分  
**成功基準**: 修正ファイル数を指定の5ファイルのみに縮小

## 📋 **現状把握**

**問題**: 指示書で5ファイルのみ修正指定 → 実際は30ファイル以上修正  
**深刻度**: 指示書違反・MVP制約違反

## 🔧 **修正対象ファイル（指示書準拠）**

### **元の指示書で指定された5ファイルのみ**

1. `tests/kaito-api/endpoints/action-endpoints.test.ts`
2. `tests/kaito-api/integration/compatibility-integration.test.ts`
3. `tests/kaito-api/integration/error-recovery-integration.test.ts`
4. `tests/kaito-api/integration/full-stack-integration.test.ts`
5. `tests/kaito-api/integration/endpoints-integration.test.ts`

## 📝 **修正範囲縮小タスク**

### **Phase 1: 不要修正の巻き戻し**

```bash
# 指定外ファイルの変更を確認
git diff --name-only | grep -v -E "(action-endpoints|compatibility-integration|error-recovery-integration|full-stack-integration|endpoints-integration)\.test\.ts"

# 以下のファイルの変更を巻き戻し（例）
git checkout -- src/kaito-api/core/client.ts
git checkout -- src/kaito-api/endpoints/read-only/user-info.ts
git checkout -- src/kaito-api/endpoints/read-only/tweet-search.ts
# ... その他の指定外ファイル
```

### **Phase 2: 最小限の修正のみ実施**

**action-endpoints.test.ts**:
```typescript
// ActionEndpoints → EngagementManagementへの置き換えのみ
import { EngagementManagement } from '../../../src/kaito-api/endpoints/authenticated/engagement';
// 既存のテストケース構造は維持
```

**compatibility-integration.test.ts**:
```typescript
// ActionEndpoints, TweetEndpoints参照を削除
// KaitoTwitterAPIClientの統合テストに変更
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
```

**error-recovery-integration.test.ts**:
```typescript
// 削除されたクラス参照を新アーキテクチャに置き換え
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
```

**full-stack-integration.test.ts**:
```typescript
// 新エンドポイント構造への対応
import * as readOnly from '../../../src/kaito-api/endpoints/read-only';
import * as authenticated from '../../../src/kaito-api/endpoints/authenticated';
```

**endpoints-integration.test.ts**:
```typescript
// エンドポイント統合を新構造に対応
import * as readOnly from '../../../src/kaito-api/endpoints/read-only';
import * as authenticated from '../../../src/kaito-api/endpoints/authenticated';
```

### **Phase 3: MVP制約内への機能縮小**

**削除すべき過剰機能**:
- アカウント情報の詳細フィールド（likesCount, blueVerified等）
- 環境変数からのユーザー名取得機能
- TwitterAPI.io APIの実装詳細変更

**維持すべき基本機能**:
- 削除クラス参照の修正（最小限）
- 新アーキテクチャへの対応（import変更のみ）
- 既存テストケースの構造維持

## ⚠️ **厳格な制約**

### **絶対禁止事項**
1. **src/配下の修正**: プロダクションコードは一切触らない
2. **新機能追加**: MVP範囲外の機能は削除
3. **型定義拡張**: 必要最小限以外の型追加禁止
4. **ドキュメント作成**: 新規ドキュメント作成禁止

### **許可事項**
1. **import文の修正**: 削除クラスから新クラスへの置き換え
2. **最小限の型調整**: コンパイルエラー解消に必要な範囲のみ
3. **既存テスト構造維持**: テストケースの基本構造は変更しない

## 📊 **検証手順**

```bash
# 1. 修正ファイル数確認
git status --porcelain | grep -E "\.test\.ts$" | wc -l
# 期待値: 5

# 2. 指定5ファイルの動作確認
npm test tests/kaito-api/endpoints/action-endpoints.test.ts
npm test tests/kaito-api/integration/compatibility-integration.test.ts
npm test tests/kaito-api/integration/error-recovery-integration.test.ts
npm test tests/kaito-api/integration/full-stack-integration.test.ts
npm test tests/kaito-api/integration/endpoints-integration.test.ts

# 3. src/配下が変更されていないことを確認
git status --porcelain | grep "^M src/" | wc -l
# 期待値: 0
```

## ✅ **完了基準**

1. **修正ファイル数**: 指定の5ファイルのみ
2. **src/無変更**: プロダクションコード変更なし
3. **テスト通過**: 5ファイルのテストが正常動作
4. **MVP準拠**: 過剰機能の完全削除

---
**🔥 指示書準拠は絶対です。範囲外の修正は全て巻き戻してください。**