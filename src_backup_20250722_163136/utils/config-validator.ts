/**
 * 設定バリデーションシステム
 * 各種YAML設定ファイルの構造検証と値検証を提供
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  expected?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * 基本バリデーションルール
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  enum?: any[];
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * 設定スキーマ定義
 */
export interface ConfigSchema {
  [key: string]: ValidationRule | ConfigSchema;
}

/**
 * 設定バリデーター
 */
export class ConfigValidator {
  private schemas = new Map<string, ConfigSchema>();

  /**
   * スキーマを登録
   */
  registerSchema(configType: string, schema: ConfigSchema): void {
    this.schemas.set(configType, schema);
  }

  /**
   * 設定を検証
   */
  async validateConfig(config: any, configType?: string, schema?: ConfigSchema): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    let validationSchema: ConfigSchema | undefined;

    if (schema) {
      validationSchema = schema;
    } else if (configType && this.schemas.has(configType)) {
      validationSchema = this.schemas.get(configType);
    } else {
      // 汎用検証を実行
      return this.performGenericValidation(config);
    }

    if (!validationSchema) {
      result.warnings.push({
        path: '',
        message: 'No validation schema found',
        suggestion: 'Register a schema for comprehensive validation'
      });
      return result;
    }

    this.validateObject(config, validationSchema, '', result);
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * YAML構文の検証
   */
  validateYamlSyntax(yamlContent: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const yaml = require('js-yaml');
      yaml.load(yamlContent);
    } catch (error: any) {
      result.isValid = false;
      result.errors.push({
        path: '',
        message: `YAML syntax error: ${error.message}`,
        value: yamlContent
      });
    }

    return result;
  }

  /**
   * 設定整合性の検証
   */
  async validateConfigIntegrity(configs: { [key: string]: any }): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // アカウント設定と戦略の整合性チェック
    if (configs.account && configs.strategy) {
      this.validateAccountStrategyConsistency(configs.account, configs.strategy, result);
    }

    // 自律実行設定とパフォーマンス目標の整合性チェック
    if (configs.autonomous && configs.targets) {
      this.validateAutonomousTargetConsistency(configs.autonomous, configs.targets, result);
    }

    // 多重設定の競合チェック
    this.validateConfigConflicts(configs, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  // プライベートメソッド
  private validateObject(obj: any, schema: ConfigSchema, path: string, result: ValidationResult): void {
    if (typeof obj !== 'object' || obj === null) {
      result.errors.push({
        path,
        message: 'Expected object',
        value: obj,
        expected: 'object'
      });
      return;
    }

    // スキーマのすべてのキーをチェック
    for (const [key, rule] of Object.entries(schema)) {
      const currentPath = path ? `${path}.${key}` : key;
      const value = obj[key];

      if (this.isValidationRule(rule)) {
        this.validateValue(value, rule, currentPath, result);
      } else {
        // ネストしたオブジェクト
        if (value !== undefined) {
          this.validateObject(value, rule as ConfigSchema, currentPath, result);
        } else if (rule.required) {
          result.errors.push({
            path: currentPath,
            message: 'Required field is missing',
            expected: 'object'
          });
        }
      }
    }

    // 未知のプロパティをチェック
    for (const key of Object.keys(obj)) {
      if (!(key in schema)) {
        result.warnings.push({
          path: path ? `${path}.${key}` : key,
          message: 'Unknown property',
          suggestion: 'Remove unused properties or update schema'
        });
      }
    }
  }

  private validateValue(value: any, rule: ValidationRule, path: string, result: ValidationResult): void {
    // 必須チェック
    if (rule.required && (value === undefined || value === null)) {
      result.errors.push({
        path,
        message: 'Required field is missing',
        expected: rule.type || 'any'
      });
      return;
    }

    if (value === undefined || value === null) {
      return; // オプションフィールドで値がない場合はスキップ
    }

    // 型チェック
    if (rule.type && !this.checkType(value, rule.type)) {
      result.errors.push({
        path,
        message: `Type mismatch`,
        value,
        expected: rule.type
      });
      return;
    }

    // 数値範囲チェック
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        result.errors.push({
          path,
          message: `Value is below minimum`,
          value,
          expected: `>= ${rule.min}`
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        result.errors.push({
          path,
          message: `Value is above maximum`,
          value,
          expected: `<= ${rule.max}`
        });
      }
    }

    // 文字列長チェック
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        result.errors.push({
          path,
          message: `String is too short`,
          value,
          expected: `>= ${rule.min} characters`
        });
      }
      if (rule.max !== undefined && value.length > rule.max) {
        result.errors.push({
          path,
          message: `String is too long`,
          value,
          expected: `<= ${rule.max} characters`
        });
      }
    }

    // 配列長チェック
    if (rule.type === 'array' && Array.isArray(value)) {
      if (rule.min !== undefined && value.length < rule.min) {
        result.errors.push({
          path,
          message: `Array has too few elements`,
          value: value.length,
          expected: `>= ${rule.min} elements`
        });
      }
      if (rule.max !== undefined && value.length > rule.max) {
        result.errors.push({
          path,
          message: `Array has too many elements`,
          value: value.length,
          expected: `<= ${rule.max} elements`
        });
      }
    }

    // 列挙値チェック
    if (rule.enum && !rule.enum.includes(value)) {
      result.errors.push({
        path,
        message: `Value is not in allowed list`,
        value,
        expected: `one of: ${rule.enum.join(', ')}`
      });
    }

    // パターンチェック
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      result.errors.push({
        path,
        message: `Value does not match required pattern`,
        value,
        expected: rule.pattern.source
      });
    }

    // カスタムバリデーション
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        result.errors.push({
          path,
          message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
          value
        });
      }
    }
  }

  private checkType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private isValidationRule(rule: any): rule is ValidationRule {
    return rule && typeof rule === 'object' && 
           (rule.type || rule.required !== undefined || rule.min !== undefined || 
            rule.max !== undefined || rule.enum || rule.pattern || rule.custom);
  }

  private performGenericValidation(config: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 基本的な構造チェック
    if (typeof config !== 'object' || config === null) {
      result.errors.push({
        path: '',
        message: 'Configuration must be an object',
        value: config,
        expected: 'object'
      });
      result.isValid = false;
      return result;
    }

    // 空オブジェクトチェック
    if (Object.keys(config).length === 0) {
      result.warnings.push({
        path: '',
        message: 'Configuration is empty',
        suggestion: 'Add configuration properties'
      });
    }

    return result;
  }

  private validateAccountStrategyConsistency(account: any, strategy: any, result: ValidationResult): void {
    // フォロワー数と戦略の整合性チェック
    if (account.current_metrics?.followers_count !== undefined && 
        strategy.growth_targets?.followers?.current !== undefined) {
      const accountFollowers = account.current_metrics.followers_count;
      const strategyFollowers = strategy.growth_targets.followers.current;
      
      if (Math.abs(accountFollowers - strategyFollowers) > 10) {
        result.warnings.push({
          path: 'account.current_metrics.followers_count',
          message: 'Account metrics and strategy targets are inconsistent',
          suggestion: `Update strategy targets to match current metrics (${accountFollowers})`
        });
      }
    }
  }

  private validateAutonomousTargetConsistency(autonomous: any, targets: any, result: ValidationResult): void {
    // 投稿間隔と成長目標の整合性チェック
    if (autonomous.execution?.posting_interval_minutes && targets.engagement) {
      const intervalMinutes = autonomous.execution.posting_interval_minutes;
      const dailyPosts = Math.floor(1440 / intervalMinutes); // 1日の投稿数
      
      if (dailyPosts > 20) {
        result.warnings.push({
          path: 'autonomous.execution.posting_interval_minutes',
          message: 'Posting interval may be too frequent',
          suggestion: 'Consider increasing interval to avoid spam detection'
        });
      }
    }
  }

  private validateConfigConflicts(configs: { [key: string]: any }, result: ValidationResult): void {
    // 実行モードの競合チェック
    const autonomousMode = configs.autonomous?.execution?.mode;
    const systemMode = configs.system?.mode;
    
    if (autonomousMode && systemMode && autonomousMode !== systemMode) {
      result.errors.push({
        path: 'mode_conflict',
        message: 'Execution mode conflict between autonomous and system configurations',
        value: { autonomous: autonomousMode, system: systemMode }
      });
    }
  }
}

// 事前定義スキーマ
export const PREDEFINED_SCHEMAS = {
  autonomous: {
    claude_autonomous: {
      enabled: { type: 'boolean', required: true },
      max_context_size: { type: 'number', min: 1000, max: 100000 },
      decision_mode: { type: 'string', enum: ['autonomous', 'guided', 'manual'] }
    },
    execution: {
      mode: { type: 'string', required: true },
      quality_priority: { type: 'boolean' }
    },
    data_management: {
      minimal_history: { type: 'boolean' },
      real_time_focus: { type: 'boolean' }
    }
  } as ConfigSchema,

  account: {
    version: { type: 'string', required: true },
    account: {
      username: { type: 'string', required: true, min: 1 },
      verified: { type: 'boolean' }
    },
    current_metrics: {
      followers_count: { type: 'number', min: 0 },
      following_count: { type: 'number', min: 0 },
      tweet_count: { type: 'number', min: 0 }
    },
    growth_targets: {
      followers: {
        current: { type: 'number', min: 0 },
        daily: { type: 'number', min: 0, max: 100 },
        weekly: { type: 'number', min: 0 },
        monthly: { type: 'number', min: 0 },
        quarterly: { type: 'number', min: 0 }
      }
    }
  } as ConfigSchema,

  multiSource: {
    version: { type: 'string', required: true },
    rss: {
      sources: { type: 'object', required: true }
    },
    apis: {
      type: 'object'
    },
    community: {
      type: 'object'
    },
    rateLimiting: {
      global: {
        max_concurrent: { type: 'number', min: 1, max: 50 },
        max_retries: { type: 'number', min: 0, max: 10 }
      }
    },
    caching: {
      enabled: { type: 'boolean' },
      ttl: { type: 'object' },
      max_size: { type: 'number', min: 1 }
    }
  } as ConfigSchema
};

// デフォルトインスタンスをエクスポート
export const defaultValidator = new ConfigValidator();

// 事前定義スキーマを登録
Object.entries(PREDEFINED_SCHEMAS).forEach(([type, schema]) => {
  defaultValidator.registerSchema(type, schema);
});