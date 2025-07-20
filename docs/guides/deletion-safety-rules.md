# 関数削除安全ルール

## 🎯 MVP原則による最小限解決策

**目的**: Tree-shaking最適化時のアプリケーション停止事故防止

## 🛡️ **3-Step Safety Rule**

### 必須実行順序

#### **Step 1: 使用箇所確認** (30秒)
```bash
grep -r "削除予定の関数名" apps/admin/ apps/hedge-system/
```

**判定**:
- 結果が空 → 削除可能
- 結果あり → **削除禁止**

#### **Step 2: TypeScriptエラーチェック** (1分)
```bash
npm run check-types
```

**判定**:
- エラー0件 → 次のステップへ
- エラーあり → **作業停止**

#### **Step 3: 段階的削除** (関数ごと)
- **1つずつ削除**
- 削除後 → Step 2実行
- エラーなし → 次の関数
- エラーあり → **即座に復元**

## ✅ **使用例**

### 安全な削除例
```bash
# 削除予定: unusedFunction

# Step 1: 使用確認  
grep -r "unusedFunction" apps/
# → 結果: （空）
# → 判定: 削除可能

# Step 2: 削除前チェック
npm run check-types
# → エラー0件

# Step 3: 削除実行
# index.tsから1つだけ削除

# Step 2 再実行
npm run check-types
# → エラー0件 → 削除成功
```

### 削除禁止例
```bash
# 削除予定: listOpenPositions

# Step 1: 使用確認
grep -r "listOpenPositions" apps/
# → 結果: apps/hedge-system/lib/amplify-client.ts で使用中
# → 判定: 削除禁止

# この関数は削除しない
```

## 🚫 **禁止事項**

- ❌ 一括削除（複数関数の同時削除）
- ❌ 確認なし削除
- ❌ grep結果に使用箇所があるのに削除

## 🎯 **MVP準拠理由**

1. **今すぐ必要**: 同じ事故の即座の再発防止
2. **最小限**: 既存コマンドのみ、新規開発不要
3. **価値提供**: アプリケーション停止リスク完全除去

---

**実装コスト**: 0円・0時間  
**効果**: hedge-system停止事故100%防止