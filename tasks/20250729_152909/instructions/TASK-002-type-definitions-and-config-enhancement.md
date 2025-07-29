# TASK-002: Type Definitions Consistency and Configuration Enhancement

## 🎯 **Mission Statement**
src/kaito-api/core の型定義整合性と設定管理を完璧化し、docs仕様書との完全一致を実現する

## 📋 **Critical Requirements**

### **Priority 1: Type Definition Consistency**
1. **core/types.ts と utils/types.ts の重複解消**
   - 重複する型定義の特定・統合
   - core/types.ts は「認証・設定型のみ」に厳密限定
   - utils/types.ts は「API応答・エンドポイント型」に特化
   - 型インポートパスの最適化

2. **型定義の責任分離明確化**
   ```typescript
   // core/types.ts - 認証・設定専用
   interface LoginCredentials { /* ... */ }
   interface AuthStatus { /* ... */ }
   interface KaitoAPIConfig { /* ... */ }
   
   // utils/types.ts - API・エンドポイント専用  
   interface TweetData { /* ... */ }
   interface UserData { /* ... */ }
   interface TwitterAPIResponse<T> { /* ... */ }
   ```

### **Priority 2: Configuration Management Enhancement**
3. **config.ts の環境変数バリデーション強化**
   - `validateEnvironmentVariables()` 関数の完全性向上
   - X認証環境変数の厳密検証 (X_USERNAME, X_PASSWORD, X_EMAIL, X_PROXY)
   - エラーメッセージの明確化・ユーザビリティ向上
   - バリデーション結果のログ出力改善

4. **設定生成機能の強化**
   - `KaitoAPIConfigManager` の環境別設定生成最適化
   - dev/staging/prod 環境の設定差異明確化
   - セキュリティ設定の強化（APIキー暗号化等）

### **Priority 3: Type Safety Enhancement**
5. **型安全性の向上**
   - strict TypeScript設定での完全通過
   - any型の撲滅・具体的型指定
   - 型ガードの追加・強化
   - ジェネリクス活用による型安全性向上

## 🔧 **Implementation Guidelines**

### **Type Separation Strategy**
1. **明確な責任分離**: 認証型 vs API型の完全分離
2. **重複排除**: 同一型定義の一元管理
3. **インポート最適化**: 必要最小限のインポート
4. **型階層整理**: 基底型から派生型への体系化

### **Configuration Enhancement Strategy**
1. **バリデーション強化**: 実行前の完全検証
2. **エラー情報改善**: デバッグ容易性の向上
3. **環境別最適化**: 各環境に特化した設定
4. **セキュリティ向上**: 機密情報の適切な管理

## 📊 **Expected Type Structure**

### **core/types.ts (認証・設定専用)**
```typescript
// ============================================================================
// 認証関連型 - Core専用
// ============================================================================
export interface LoginCredentials {
  username: string;
  email: string;
  password: string;
  proxy: string;
}

export interface AuthStatus {
  apiKeyValid: boolean;
  userSessionValid: boolean;
  v2SessionValid?: boolean;
  // ...認証状態の詳細
}

export interface KaitoAPIConfig {
  apiKey: string;
  baseUrl: string;
  environment: 'production' | 'development' | 'testing';
  // ...API設定の詳細
}

// ============================================================================
// 設定関連型 - Core専用
// ============================================================================
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
```

### **Enhanced config.ts Features**
```typescript
/**
 * 強化された環境変数バリデーション
 */
export function validateEnvironmentVariables(): EnvironmentValidationResult {
  const requiredVariables = ['X_USERNAME', 'X_PASSWORD', 'X_EMAIL', 'X_PROXY'];
  const validation = {
    isValid: true,
    missingVariables: [] as string[],
    invalidVariables: [] as string[],
    validatedAt: new Date().toISOString()
  };
  
  // 詳細なバリデーションロジック
  for (const variable of requiredVariables) {
    const value = process.env[variable];
    
    if (!value || value.trim() === '') {
      validation.missingVariables.push(variable);
      validation.isValid = false;
    } else {
      // 値の形式チェック（プロキシURL形式等）
      if (variable === 'X_PROXY' && !isValidProxyUrl(value)) {
        validation.invalidVariables.push(variable);
        validation.isValid = false;
      }
    }
  }
  
  return validation;
}
```

## ⚠️ **Critical Constraints**

### **Type Definition Rules**
- **No Circular Dependencies**: 型定義の循環参照禁止
- **Strict Separation**: core vs utils の責任完全分離
- **Backward Compatibility**: 既存インポートの互換性維持
- **Performance First**: 型チェック時間の最適化

### **Configuration Rules**
- **Security Priority**: 機密情報の適切な扱い
- **Environment Specific**: 環境固有設定の明確化
- **Validation First**: 設定検証の事前実行必須
- **Error Clarity**: エラーメッセージの明確性

## 🧪 **Validation Requirements**

### **Type System Testing**
1. **型チェック通過**: `npm run typecheck` エラーゼロ
2. **重複型検出**: 同一型定義の完全排除確認
3. **インポート検証**: 不要インポートの完全除去
4. **型安全性**: any型使用の最小化確認

### **Configuration Testing**
```typescript
// 環境変数バリデーションテスト
describe('Environment Variable Validation', () => {
  it('should validate all required X authentication variables', () => {
    const result = validateEnvironmentVariables();
    expect(result.isValid).toBe(true);
    expect(result.missingVariables).toHaveLength(0);
  });
  
  it('should detect missing environment variables', () => {
    delete process.env.X_USERNAME;
    const result = validateEnvironmentVariables();
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toContain('X_USERNAME');
  });
});
```

### **Integration Verification**
```bash
# 型定義整合性確認
npm run build
npm run lint
npm run typecheck

# 設定管理テスト
npm test -- --grep="configuration"
```

## 📊 **Type Definition Mapping**

### **Migration Plan**
1. **分析フェーズ**: 現在の型重複・不整合の完全把握
2. **分離フェーズ**: core/types.ts と utils/types.ts の責任分離
3. **統合フェーズ**: 重複型の一元化・インポート最適化  
4. **検証フェーズ**: 型安全性・パフォーマンスの確認

### **Quality Metrics**
- **Type Coverage**: 95%以上の型カバレッジ
- **Import Efficiency**: 不要インポート0件
- **Build Performance**: 型チェック時間10%向上
- **Error Clarity**: バリデーションエラーの明確性向上

## 📤 **Deliverables**

### **Type System Enhancement**
1. ✅ core/types.ts の認証・設定型への限定完了
2. ✅ utils/types.ts の API型への特化完了
3. ✅ 重複型定義の完全排除
4. ✅ 型インポートパスの最適化
5. ✅ TypeScript strict モード対応

### **Configuration Enhancement**
1. ✅ 環境変数バリデーション強化完了
2. ✅ エラーメッセージ改善完了
3. ✅ 環境別設定最適化完了
4. ✅ セキュリティ設定強化完了

### **Quality Assurance**
- [ ] 型チェック完全通過
- [ ] 重複型0件確認
- [ ] 環境変数バリデーション100%通過
- [ ] 設定管理テスト完全通過

## 🚨 **Success Criteria**
1. **型定義完全分離**: core vs utils の責任明確化達成
2. **設定管理強化**: 環境変数バリデーション完璧化
3. **型安全性向上**: strict TypeScript完全対応
4. **品質向上**: エラー検出・デバッグ容易性向上

**📋 完了報告**: tasks/20250729_152909/reports/REPORT-002-type-definitions-and-config-enhancement.md