/**
 * KaitoAPI 共通バリデーションユーティリティ
 * 全エンドポイントで使用される共通バリデーション機能
 * 
 * 機能概要:
 * - Twitter ID・ユーザー名・メディアIDの形式検証
 * - セキュリティパターン検出
 * - 入力サニタイゼーション
 * - TwitterAPI.io制限値準拠チェック
 */

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SecurityCheckResult {
  isSafe: boolean;
  issues: string[];
}

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * TwitterユーザーIDの検証
 * @param userId - 検証対象のユーザーID
 * @returns ValidationResult
 */
export function validateTwitterUserId(userId: string): ValidationResult {
  const errors: string[] = [];

  if (!userId?.trim()) {
    errors.push('User ID is required');
  } else {
    const trimmedId = userId.trim();
    
    // Twitter IDは数値文字列（1-20桁）
    if (!/^\d{1,20}$/.test(trimmedId)) {
      errors.push('Invalid Twitter user ID format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Twitterユーザー名の検証
 * @param username - 検証対象のユーザー名
 * @returns ValidationResult
 */
export function validateTwitterUsername(username: string): ValidationResult {
  const errors: string[] = [];

  if (!username?.trim()) {
    errors.push('Username is required');
  } else {
    const cleanUsername = username.replace(/^@/, '').trim();
    
    // Twitterユーザー名は英数字とアンダースコア（1-15文字）
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername)) {
      errors.push('Invalid Twitter username format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * TwitterツイートIDの検証
 * @param tweetId - 検証対象のツイートID
 * @returns ValidationResult
 */
export function validateTwitterTweetId(tweetId: string): ValidationResult {
  const errors: string[] = [];

  if (!tweetId?.trim()) {
    errors.push('Tweet ID is required');
  } else {
    const trimmedId = tweetId.trim();
    
    // Twitter ツイートIDは数値文字列（1-19桁）
    if (!/^\d{1,19}$/.test(trimmedId)) {
      errors.push('Invalid Twitter tweet ID format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * メディアIDの検証
 * @param mediaId - 検証対象のメディアID
 * @returns ValidationResult
 */
export function validateMediaId(mediaId: string): ValidationResult {
  const errors: string[] = [];

  if (!mediaId?.trim()) {
    errors.push('Media ID is required');
  } else {
    const trimmedId = mediaId.trim();
    
    // メディアIDの基本的な形式チェック
    if (!/^(media_\d+|\d+_\d+)$/.test(trimmedId)) {
      errors.push('Invalid media ID format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ツイートテキストの検証
 * @param text - 検証対象のテキスト
 * @returns ValidationResult
 */
export function validateTweetText(text: string): ValidationResult {
  const errors: string[] = [];

  if (!text?.trim()) {
    errors.push('Tweet text is required');
  } else {
    const trimmedText = text.trim();
    
    if (trimmedText.length > 280) {
      errors.push('Tweet text exceeds 280 character limit');
    }
    
    if (trimmedText.length === 0) {
      errors.push('Tweet text cannot be empty');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 検索クエリの検証
 * @param query - 検証対象のクエリ
 * @param minLength - 最小長（デフォルト: 1）
 * @param maxLength - 最大長（デフォルト: 500）
 * @returns ValidationResult
 */
export function validateSearchQuery(
  query: string, 
  minLength: number = 1, 
  maxLength: number = 500
): ValidationResult {
  const errors: string[] = [];

  if (!query?.trim()) {
    errors.push('Search query is required');
  } else {
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < minLength) {
      errors.push(`Query too short (min ${minLength} characters)`);
    }
    
    if (trimmedQuery.length > maxLength) {
      errors.push(`Query too long (max ${maxLength} characters)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * URLの検証
 * @param url - 検証対象のURL
 * @returns ValidationResult
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url?.trim()) {
    errors.push('URL is required');
  } else {
    try {
      const urlObj = new URL(url);
      
      // HTTPS/HTTPのみ許可
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid URL format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// SECURITY VALIDATION FUNCTIONS
// ============================================================================

/**
 * 包括的セキュリティチェック
 * @param input - 検証対象の入力
 * @returns SecurityCheckResult
 */
export function performSecurityCheck(input: string): SecurityCheckResult {
  const issues: string[] = [];

  if (detectMaliciousPatterns(input)) {
    issues.push('Input contains potentially malicious patterns');
  }

  if (detectSQLInjection(input)) {
    issues.push('Potential SQL injection detected');
  }

  if (detectXSSAttempt(input)) {
    issues.push('Potential XSS attempt detected');
  }

  if (detectScriptInjection(input)) {
    issues.push('Potential script injection detected');
  }

  return {
    isSafe: issues.length === 0,
    issues
  };
}

/**
 * 悪意のあるパターンの検出
 * @param input - 検証対象の入力
 * @returns boolean
 */
export function detectMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\beval\b/i,
    /\bdocument\./i,
    /\bwindow\./i,
    /\balert\s*\(/i,
    /\bconfirm\s*\(/i,
    /\bprompt\s*\(/i
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

/**
 * SQLインジェクションの検出
 * @param input - 検証対象の入力
 * @returns boolean
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /\bUNION\b.*\bSELECT\b/i,
    /\bDROP\b.*\bTABLE\b/i,
    /\bINSERT\b.*\bINTO\b/i,
    /\bDELETE\b.*\bFROM\b/i,
    /\bUPDATE\b.*\bSET\b/i,
    /'\s*(OR|AND)\s*'\d+\s*'\s*=\s*'\d+/i,
    /;\s*(DROP|DELETE|UPDATE|INSERT)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS攻撃の検出
 * @param input - 検証対象の入力
 * @returns boolean
 */
export function detectXSSAttempt(input: string): boolean {
  const xssPatterns = [
    /<[^>]*>/,
    /javascript:/i,
    /on\w+\s*=/i,
    /\balert\s*\(/i,
    /\bconfirm\s*\(/i,
    /\bprompt\s*\(/i,
    /<img[^>]*src[^>]*>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * スクリプトインジェクションの検出
 * @param input - 検証対象の入力
 * @returns boolean
 */
export function detectScriptInjection(input: string): boolean {
  const scriptPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /\beval\s*\(/i,
    /\bFunction\s*\(/i,
    /\bsetTimeout\s*\(/i,
    /\bsetInterval\s*\(/i,
    /\bexecScript\s*\(/i
  ];

  return scriptPatterns.some(pattern => pattern.test(input));
}

// ============================================================================
// CONTENT VALIDATION FUNCTIONS
// ============================================================================

/**
 * 禁止コンテンツの検出
 * @param content - 検証対象のコンテンツ
 * @returns boolean
 */
export function containsProhibitedContent(content: string): boolean {
  // 韓国語チェック（指示書に従い）
  const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
  if (koreanRegex.test(content)) return true;

  // 禁止キーワードパターン
  const prohibitedPatterns = [
    /spam/i,
    /scam/i,
    /crypto.*pump/i,
    /guaranteed.*profit/i,
    /click.*here/i,
    /free.*money/i,
    /get.*rich.*quick/i,
    /investment.*guarantee/i
  ];

  return prohibitedPatterns.some(pattern => pattern.test(content));
}

/**
 * スパムパターンの検出
 * @param content - 検証対象のコンテンツ
 * @returns boolean
 */
export function detectSpamPatterns(content: string): boolean {
  // 過度な繰り返し文字
  if (/(..\1{4,})/.test(content)) return true;
  
  // 過度な大文字
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.7) return true;
  
  // 過度な絵文字
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
  const emojiCount = (content.match(emojiRegex) || []).length;
  if (emojiCount > content.length * 0.3) return true;

  // 過度な数字・記号
  const symbolCount = (content.match(/[0-9!@#$%^&*()]/g) || []).length;
  if (symbolCount > content.length * 0.5) return true;

  return false;
}

/**
 * 不適切な文字の検出
 * @param content - 検証対象のコンテンツ
 * @returns boolean
 */
export function containsInappropriateCharacters(content: string): boolean {
  // 制御文字チェック
  const controlCharRegex = /[\x00-\x1F\x7F-\x9F]/;
  return controlCharRegex.test(content);
}

// ============================================================================
// RANGE VALIDATION FUNCTIONS
// ============================================================================

/**
 * 数値範囲の検証
 * @param value - 検証対象の数値
 * @param min - 最小値
 * @param max - 最大値
 * @param fieldName - フィールド名
 * @returns ValidationResult
 */
export function validateNumberRange(
  value: number, 
  min: number, 
  max: number, 
  fieldName: string = 'Value'
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
  } else {
    if (value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }
    
    if (value > max) {
      errors.push(`${fieldName} must be at most ${max}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 文字列長の検証
 * @param value - 検証対象の文字列
 * @param min - 最小長
 * @param max - 最大長
 * @param fieldName - フィールド名
 * @returns ValidationResult
 */
export function validateStringLength(
  value: string, 
  min: number, 
  max: number, 
  fieldName: string = 'Field'
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
  } else {
    const length = value.length;
    
    if (length < min) {
      errors.push(`${fieldName} must be at least ${min} characters`);
    }
    
    if (length > max) {
      errors.push(`${fieldName} must be at most ${max} characters`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// TWITTER-SPECIFIC VALIDATION FUNCTIONS
// ============================================================================

/**
 * WOEID（Where On Earth ID）の検証
 * @param woeid - 検証対象のWOEID
 * @returns ValidationResult
 */
export function validateWOEID(woeid: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(woeid)) {
    errors.push('WOEID must be an integer');
  } else {
    if (woeid < 1 || woeid > 99999999) {
      errors.push('WOEID must be between 1 and 99999999');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Twitterの制限値チェック
 * @param type - 制限の種類
 * @param value - チェック対象の値
 * @returns ValidationResult
 */
export function validateTwitterLimits(type: string, value: number): ValidationResult {
  const limits = {
    'max_results': { min: 10, max: 100 },
    'tweet_length': { min: 1, max: 280 },
    'media_count': { min: 0, max: 4 }, 
    'poll_options': { min: 2, max: 4 },
    'poll_duration': { min: 5, max: 10080 } // minutes
  };

  const limit = limits[type as keyof typeof limits];
  if (!limit) {
    return {
      isValid: false,
      errors: [`Unknown limit type: ${type}`]
    };
  }

  return validateNumberRange(value, limit.min, limit.max, type);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * 複数のバリデーション結果をマージ
 * @param results - バリデーション結果の配列
 * @returns 統合されたValidationResult
 */
export function mergeValidationResults(results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(result => result.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * バリデーションエラーの整形
 * @param result - バリデーション結果
 * @returns 整形されたエラーメッセージ
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) return '';
  
  return `Validation failed: ${result.errors.join(', ')}`;
}