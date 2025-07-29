// ============================================================================
// KaitoTwitterAPI エラークラス定義
// ============================================================================

// Base error class
export class KaitoAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'KaitoAPIError';
  }
}

// Authentication errors
export class AuthenticationError extends KaitoAPIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor() {
    super('Session has expired, please login again');
    this.name = 'SessionExpiredError';
  }
}

// Rate limit errors
export class RateLimitError extends KaitoAPIError {
  constructor(
    public endpoint: string,
    public resetTime: number,
    public limit: number
  ) {
    super(
      `Rate limit exceeded for ${endpoint}. Reset at ${new Date(resetTime).toISOString()}`,
      'RATE_LIMIT',
      429
    );
    this.name = 'RateLimitError';
  }
}

// Validation errors
export class ValidationError extends KaitoAPIError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// API response errors
export class APIResponseError extends KaitoAPIError {
  constructor(
    message: string,
    statusCode: number,
    public response?: Record<string, unknown>
  ) {
    super(message, 'API_ERROR', statusCode, response);
    this.name = 'APIResponseError';
  }
}

// Network errors
export class NetworkError extends KaitoAPIError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// Cost limit errors
export class CostLimitError extends KaitoAPIError {
  constructor(public currentCost: number, public threshold: number) {
    super(
      `Cost limit exceeded: $${currentCost.toFixed(2)} > $${threshold}`,
      'COST_LIMIT',
      402
    );
    this.name = 'CostLimitError';
  }
}