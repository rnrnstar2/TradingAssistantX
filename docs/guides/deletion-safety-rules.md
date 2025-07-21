# 関数削除安全ルール

## 🛡️ 3-Step Safety Rule

### Step 1: 使用箇所確認
```bash
grep -r "関数名" src/
```

### Step 2: TypeScriptエラーチェック  
```bash
npm run check-types
```

### Step 3: 段階的削除
1つずつ削除し、各回Step 2でチェック

エラー発生時は即座に復元