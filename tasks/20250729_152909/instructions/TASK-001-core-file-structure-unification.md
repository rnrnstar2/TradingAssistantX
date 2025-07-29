# TASK-001: KaitoAPI Core File Structure Unification

## 🎯 **Mission Statement**
src/kaito-api/core のファイル構造を docs/directory-structure.md の期待構造に完全一致させる

## 📋 **Critical Requirements**

### **Priority 1: File Name Unification**
1. **session-manager.ts → session.ts**
   - ファイル名を `session-manager.ts` から `session.ts` に変更
   - 全インポート文の更新 (auth-manager.ts, index.ts等)
   - クラス名・機能は保持、ファイル名のみ変更

### **Priority 2: Authentication Architecture Consolidation**
2. **api-key-auth.ts の auth-manager.ts への統合**
   - `APIKeyAuth` クラスの機能を `AuthManager` クラス内に統合
   - APIキー認証メソッドの統合移行
   - api-key-auth.ts ファイルの削除

3. **v2-login-auth.ts の auth-manager.ts への統合**
   - `V2LoginAuth` クラスの機能を `AuthManager` クラス内に統合
   - V2ログイン認証メソッドの統合移行
   - v2-login-auth.ts ファイルの削除

### **Priority 3: Export Structure Update**
4. **index.ts の完全修正**
   - 削除ファイル (api-key-auth, v2-login-auth) のエクスポート除去
   - session.ts (旧session-manager.ts) のエクスポート修正
   - 期待構造に完全一致したエクスポート構成

## 🔧 **Implementation Guidelines**

### **File Consolidation Strategy**
1. **機能保持原則**: 既存機能の完全保持
2. **統合アーキテクチャ**: AuthManager中心の統一認証管理
3. **インターフェース維持**: 外部API互換性の保持

### **Expected Final Structure**
```
src/kaito-api/core/
├── auth-manager.ts    # 統合認証管理（APIKey + V2認証）
├── client.ts          # HTTPクライアント・API通信
├── config.ts          # 設定管理・環境変数
├── session.ts         # セッション・Cookie管理（旧session-manager.ts）
├── types.ts           # 認証・設定型のみ
└── index.ts           # coreエクスポート（修正済み）
```

### **Code Quality Requirements**
- **TypeScript Strict**: 厳密な型チェック通過必須
- **No Breaking Changes**: 外部インターフェース維持
- **Import Path Updates**: 全インポート文の完全更新
- **Error Handling**: 既存エラーハンドリングの保持

## 📊 **Integration Points**

### **AuthManager Enhancement**
```typescript
export class AuthManager {
  // 統合されたAPIキー認証メソッド（旧APIKeyAuth）
  private validateApiKey(): boolean { /* ... */ }
  private authenticatedRequest(): Promise<T> { /* ... */ }
  
  // 統合されたV2ログイン認証メソッド（旧V2LoginAuth）
  private executeV2Login(): Promise<LoginResult> { /* ... */ }
  private refreshV2Session(): Promise<boolean> { /* ... */ }
  
  // 既存の統合認証メソッド（保持）
  getAuthHeaders(): Record<string, string> { /* ... */ }
  getRequiredAuthLevel(): string { /* ... */ }
}
```

### **Import Update Requirements**
- **auth-manager.ts**: session-manager → session インポート更新
- **他ファイル**: api-key-auth, v2-login-auth インポート除去
- **tests/**: 該当インポートパスの完全更新

## ⚠️ **Critical Constraints**

### **MVP Compliance**
- **機能削減禁止**: 既存機能の一切の削減・削除は禁止
- **パフォーマンス維持**: 統合による性能劣化防止
- **テスト通過**: 既存テストの完全通過

### **REQUIREMENTS.md Adherence**
- ドキュメント構造への完全準拠
- 疎結合アーキテクチャの維持
- 2層認証システムの機能保持

## 🧪 **Validation Requirements**

### **Functional Testing**
1. **APIキー認証**: testConnection() メソッド正常動作
2. **V2ログイン認証**: login() メソッド正常動作
3. **統合認証**: getAuthHeaders() 正常動作
4. **セッション管理**: session.ts クラス正常動作

### **Import Verification**
```bash
# 全インポートエラーなし確認
npm run build
npm run typecheck
```

### **File Structure Validation**
```bash
# 期待構造の完全一致確認
ls -la src/kaito-api/core/
# Expected: auth-manager.ts, client.ts, config.ts, session.ts, types.ts, index.ts
```

## 📤 **Deliverables**

### **Implementation Completion**
1. ✅ session-manager.ts → session.ts リネーム完了
2. ✅ api-key-auth.ts 機能の auth-manager.ts 統合完了
3. ✅ v2-login-auth.ts 機能の auth-manager.ts 統合完了
4. ✅ index.ts エクスポート構造修正完了
5. ✅ 全インポートパス更新完了
6. ✅ TypeScript/lint エラーゼロ達成

### **Testing Verification**
- [ ] APIキー認証テスト通過
- [ ] V2ログイン認証テスト通過  
- [ ] 統合認証フローテスト通過
- [ ] セッション管理テスト通過

## 🚨 **Success Criteria**
1. **docs/directory-structure.md 完全準拠**: 期待構造との100%一致
2. **機能完全性**: 既存機能の一切の劣化・削除なし
3. **型安全性**: TypeScript strict モード完全通過
4. **統合品質**: 認証フロー統合による品質向上

**📋 完了報告**: tasks/20250729_152909/reports/REPORT-001-core-file-structure-unification.md