/**
 * KaitoAPI Config Types Unit Test
 * 
 * Config関連型定義の詳細テスト
 * - KaitoAPIConfig, EndpointConfig, ConfigValidationResult
 * - LoginCredentials, LoginResult, AuthStatus
 */

import { describe, test, expect } from 'vitest';
import type {
  KaitoAPIConfig,
  EndpointConfig,
  ConfigValidationResult,
  LoginCredentials,
  LoginResult,
  AuthStatus
} from '../../src/kaito-api/types';

describe('Config Types Unit Tests', () => {
  
  describe('KaitoAPIConfig Type Tests', () => {
    test('should accept valid KaitoAPIConfig with all nested structures', () => {
      const config: KaitoAPIConfig = {
        environment: 'prod',
        api: {
          baseUrl: 'https://api.kaito.example.com',
          version: 'v1',
          timeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            retryConditions: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT']
          }
        },
        authentication: {
          primaryKey: 'primary-api-key-12345',
          secondaryKey: 'secondary-api-key-67890',
          keyRotationInterval: 3600000,
          encryptionEnabled: true
        },
        performance: {
          qpsLimit: 10,
          responseTimeTarget: 500,
          cacheEnabled: true,
          cacheTTL: 300000
        },
        monitoring: {
          metricsEnabled: true,
          logLevel: 'info',
          alertingEnabled: true,
          healthCheckInterval: 60000
        },
        security: {
          rateLimitEnabled: true,
          ipWhitelist: ['192.168.1.1', '10.0.0.1'],
          auditLoggingEnabled: true,
          encryptionKey: 'encryption-key-abcdef'
        },
        features: {
          realApiEnabled: true,
          mockFallbackEnabled: false,
          batchProcessingEnabled: true,
          advancedCachingEnabled: false
        },
        metadata: {
          version: '1.0.0',
          lastUpdated: '2023-12-01T12:00:00.000Z',
          updatedBy: 'system-admin',
          checksum: 'sha256-abcdef123456'
        }
      };
      
      expect(config.environment).toBe('prod');
      expect(config.api.baseUrl).toBe('https://api.kaito.example.com');
      expect(config.authentication.primaryKey).toBe('primary-api-key-12345');
      expect(config.performance.qpsLimit).toBe(10);
      expect(config.monitoring.logLevel).toBe('info');
      expect(config.security.ipWhitelist).toHaveLength(2);
      expect(config.features.realApiEnabled).toBe(true);
      expect(config.metadata.version).toBe('1.0.0');
    });
    
    test('should enforce environment union type', () => {
      const environments: Array<'dev' | 'staging' | 'prod'> = ['dev', 'staging', 'prod'];
      
      environments.forEach(env => {
        const config: Pick<KaitoAPIConfig, 'environment'> = {
          environment: env
        };
        
        expect(config.environment).toBe(env);
      });
    });
    
    test('should enforce logLevel union type in monitoring', () => {
      const logLevels: Array<'error' | 'warn' | 'info' | 'debug'> = ['error', 'warn', 'info', 'debug'];
      
      logLevels.forEach(level => {
        const monitoring: KaitoAPIConfig['monitoring'] = {
          metricsEnabled: true,
          logLevel: level,
          alertingEnabled: true,
          healthCheckInterval: 30000
        };
        
        expect(monitoring.logLevel).toBe(level);
      });
    });
    
    test('should enforce nested object structures', () => {
      const config: KaitoAPIConfig = {
        environment: 'dev',
        api: {
          baseUrl: 'https://dev.api.kaito.com',
          version: 'v2',
          timeout: 15000,
          retryPolicy: {
            maxRetries: 5,
            backoffMs: 2000,
            retryConditions: ['NETWORK_ERROR']
          }
        },
        authentication: {
          primaryKey: 'dev-key',
          keyRotationInterval: 7200000,
          encryptionEnabled: false
        },
        performance: {
          qpsLimit: 5,
          responseTimeTarget: 1000,
          cacheEnabled: false,
          cacheTTL: 60000
        },
        monitoring: {
          metricsEnabled: false,
          logLevel: 'debug',
          alertingEnabled: false,
          healthCheckInterval: 120000
        },
        security: {
          rateLimitEnabled: false,
          ipWhitelist: [],
          auditLoggingEnabled: false,
          encryptionKey: 'dev-encryption-key'
        },
        features: {
          realApiEnabled: false,
          mockFallbackEnabled: true,
          batchProcessingEnabled: false,
          advancedCachingEnabled: false
        },
        metadata: {
          version: '0.1.0',
          lastUpdated: '2023-11-01T10:00:00.000Z',
          updatedBy: 'dev-team',
          checksum: 'sha256-dev123'
        }
      };
      
      // Test nested structure access
      expect(config.api.retryPolicy.maxRetries).toBe(5);
      expect(config.authentication.secondaryKey).toBeUndefined();
      expect(config.security.ipWhitelist).toHaveLength(0);
      expect(Array.isArray(config.api.retryPolicy.retryConditions)).toBe(true);
    });
    
    test('should enforce number types for numeric fields', () => {
      const config: KaitoAPIConfig = {
        environment: 'staging',
        api: {
          baseUrl: 'https://staging.api.kaito.com',
          version: 'v1',
          timeout: 20000,
          retryPolicy: {
            maxRetries: 2,
            backoffMs: 1500,
            retryConditions: ['TIMEOUT']
          }
        },
        authentication: {
          primaryKey: 'staging-key',
          keyRotationInterval: 1800000,
          encryptionEnabled: true
        },
        performance: {
          qpsLimit: 15,
          responseTimeTarget: 750,
          cacheEnabled: true,
          cacheTTL: 600000
        },
        monitoring: {
          metricsEnabled: true,
          logLevel: 'warn',
          alertingEnabled: true,
          healthCheckInterval: 90000
        },
        security: {
          rateLimitEnabled: true,
          ipWhitelist: ['192.168.0.0/16'],
          auditLoggingEnabled: true,
          encryptionKey: 'staging-encryption'
        },
        features: {
          realApiEnabled: true,
          mockFallbackEnabled: true,
          batchProcessingEnabled: true,
          advancedCachingEnabled: true
        },
        metadata: {
          version: '0.9.0',
          lastUpdated: '2023-11-15T14:30:00.000Z',
          updatedBy: 'staging-admin',
          checksum: 'sha256-staging456'
        }
      };
      
      expect(typeof config.api.timeout).toBe('number');
      expect(typeof config.api.retryPolicy.maxRetries).toBe('number');
      expect(typeof config.authentication.keyRotationInterval).toBe('number');
      expect(typeof config.performance.qpsLimit).toBe('number');
      expect(typeof config.monitoring.healthCheckInterval).toBe('number');
    });
  });
  
  describe('EndpointConfig Type Tests', () => {
    test('should accept valid EndpointConfig with all endpoint categories', () => {
      const endpoints: EndpointConfig = {
        user: {
          info: '/api/v1/users/{userId}',
          follow: '/api/v1/users/{userId}/follow',
          unfollow: '/api/v1/users/{userId}/unfollow',
          search: '/api/v1/users/search'
        },
        tweet: {
          create: '/api/v1/tweets',
          retweet: '/api/v1/tweets/{tweetId}/retweet',
          quote: '/api/v1/tweets/{tweetId}/quote',
          search: '/api/v1/tweets/search',
          delete: '/api/v1/tweets/{tweetId}'
        },
        engagement: {
          like: '/api/v1/tweets/{tweetId}/like',
          unlike: '/api/v1/tweets/{tweetId}/unlike',
          bookmark: '/api/v1/tweets/{tweetId}/bookmark',
          unbookmark: '/api/v1/tweets/{tweetId}/unbookmark'
        },
        auth: {
          verify: '/api/v1/auth/verify',
          refresh: '/api/v1/auth/refresh'
        },
        health: '/api/v1/health'
      };
      
      expect(endpoints.user.info).toBe('/api/v1/users/{userId}');
      expect(endpoints.tweet.create).toBe('/api/v1/tweets');
      expect(endpoints.engagement.like).toBe('/api/v1/tweets/{tweetId}/like');
      expect(endpoints.auth.verify).toBe('/api/v1/auth/verify');
      expect(endpoints.health).toBe('/api/v1/health');
    });
    
    test('should enforce string types for all endpoint URLs', () => {
      const endpoints: EndpointConfig = {
        user: {
          info: '/users/{id}',
          follow: '/users/{id}/follow',
          unfollow: '/users/{id}/unfollow',
          search: '/users/search'
        },
        tweet: {
          create: '/tweets',
          retweet: '/tweets/{id}/retweet',
          quote: '/tweets/{id}/quote',
          search: '/tweets/search',
          delete: '/tweets/{id}'
        },
        engagement: {
          like: '/tweets/{id}/like',
          unlike: '/tweets/{id}/unlike',
          bookmark: '/tweets/{id}/bookmark',
          unbookmark: '/tweets/{id}/unbookmark'
        },
        auth: {
          verify: '/auth/verify',
          refresh: '/auth/refresh'
        },
        health: '/health'
      };
      
      // Check all user endpoints are strings
      Object.values(endpoints.user).forEach(url => {
        expect(typeof url).toBe('string');
      });
      
      // Check all tweet endpoints are strings
      Object.values(endpoints.tweet).forEach(url => {
        expect(typeof url).toBe('string');
      });
      
      // Check all engagement endpoints are strings
      Object.values(endpoints.engagement).forEach(url => {
        expect(typeof url).toBe('string');
      });
      
      // Check auth endpoints are strings
      Object.values(endpoints.auth).forEach(url => {
        expect(typeof url).toBe('string');
      });
      
      expect(typeof endpoints.health).toBe('string');
    });
    
    test('should accept URL template patterns', () => {
      const endpoints: EndpointConfig = {
        user: {
          info: '/api/v2/users/{userId}',
          follow: '/api/v2/users/{userId}/follow',
          unfollow: '/api/v2/users/{userId}/unfollow',
          search: '/api/v2/users/search?q={query}'
        },
        tweet: {
          create: '/api/v2/tweets',
          retweet: '/api/v2/tweets/{tweetId}/retweet',
          quote: '/api/v2/tweets/{tweetId}/quote',
          search: '/api/v2/tweets/search?q={query}&max_results={maxResults}',
          delete: '/api/v2/tweets/{tweetId}'
        },
        engagement: {
          like: '/api/v2/tweets/{tweetId}/like',
          unlike: '/api/v2/tweets/{tweetId}/unlike',
          bookmark: '/api/v2/tweets/{tweetId}/bookmark',
          unbookmark: '/api/v2/tweets/{tweetId}/unbookmark'
        },
        auth: {
          verify: '/api/v2/auth/verify?token={token}',
          refresh: '/api/v2/auth/refresh'
        },
        health: '/api/v2/health/check'
      };
      
      expect(endpoints.user.info).toContain('{userId}');
      expect(endpoints.user.search).toContain('{query}');
      expect(endpoints.tweet.search).toContain('{query}');
      expect(endpoints.tweet.search).toContain('{maxResults}');
      expect(endpoints.auth.verify).toContain('{token}');
    });
  });
  
  describe('ConfigValidationResult Type Tests', () => {
    test('should accept successful ConfigValidationResult', () => {
      const validResult: ConfigValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Cache TTL is shorter than recommended'],
        validatedAt: '2023-12-01T12:00:00.000Z',
        environment: 'production'
      };
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.warnings).toHaveLength(1);
      expect(validResult.validatedAt).toBe('2023-12-01T12:00:00.000Z');
      expect(validResult.environment).toBe('production');
    });
    
    test('should accept failed ConfigValidationResult with errors', () => {
      const invalidResult: ConfigValidationResult = {
        isValid: false,
        errors: [
          'Missing required API key',
          'Invalid QPS limit: must be positive number',
          'Encryption key too short'
        ],
        warnings: [
          'Log level set to debug in production',
          'Rate limiting disabled'
        ],
        validatedAt: '2023-12-01T11:30:00.000Z',
        environment: 'staging'
      };
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
      expect(invalidResult.warnings).toHaveLength(2);
      expect(invalidResult.errors).toContain('Missing required API key');
      expect(invalidResult.warnings).toContain('Log level set to debug in production');
    });
    
    test('should enforce boolean type for isValid', () => {
      const result: ConfigValidationResult = {
        isValid: false,
        errors: ['Test error'],
        warnings: [],
        validatedAt: '2023-12-01T10:00:00.000Z',
        environment: 'development'
      };
      
      expect(typeof result.isValid).toBe('boolean');
    });
    
    test('should enforce array types for errors and warnings', () => {
      const result: ConfigValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Warning 1', 'Warning 2'],
        validatedAt: '2023-12-01T09:00:00.000Z',
        environment: 'test'
      };
      
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.warnings.every(w => typeof w === 'string')).toBe(true);
    });
  });
  
  describe('LoginCredentials Type Tests', () => {
    test('should accept valid LoginCredentials', () => {
      const credentials: LoginCredentials = {
        user_name: 'trading_expert',
        email: 'expert@trading.com',
        password: 'secure_password_123',
        totp_secret: 'JBSWY3DPEHPK3PXP',
        proxy: 'http://proxy.example.com:8080'
      };
      
      expect(credentials.user_name).toBe('trading_expert');
      expect(credentials.email).toBe('expert@trading.com');
      expect(credentials.password).toBe('secure_password_123');
      expect(credentials.totp_secret).toBe('JBSWY3DPEHPK3PXP');
      expect(credentials.proxy).toBe('http://proxy.example.com:8080');
    });
    
    test('should enforce string types for all credential fields', () => {
      const credentials: LoginCredentials = {
        user_name: 'testuser',
        email: 'test@example.com',
        password: 'testpass',
        totp_secret: 'TESTSECRET',
        proxy: 'http://test-proxy:3128'
      };
      
      expect(typeof credentials.user_name).toBe('string');
      expect(typeof credentials.email).toBe('string');
      expect(typeof credentials.password).toBe('string');
      expect(typeof credentials.totp_secret).toBe('string');
      expect(typeof credentials.proxy).toBe('string');
    });
  });
  
  describe('LoginResult Type Tests', () => {
    test('should accept successful LoginResult', () => {
      const successResult: LoginResult = {
        success: true,
        login_cookie: 'session_cookie_abcdef123456',
        session_expires: 1703001600000 // Unix timestamp
      };
      
      expect(successResult.success).toBe(true);
      expect(successResult.login_cookie).toBe('session_cookie_abcdef123456');
      expect(successResult.session_expires).toBe(1703001600000);
      expect(successResult.error).toBeUndefined();
    });
    
    test('should accept failed LoginResult with error', () => {
      const failedResult: LoginResult = {
        success: false,
        error: 'Invalid credentials provided'
      };
      
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('Invalid credentials provided');
      expect(failedResult.login_cookie).toBeUndefined();
      expect(failedResult.session_expires).toBeUndefined();
    });
    
    test('should enforce correct types for optional fields', () => {
      const result: LoginResult = {
        success: true,
        login_cookie: 'test_cookie',
        session_expires: 1703088000000
      };
      
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.login_cookie).toBe('string');
      expect(typeof result.session_expires).toBe('number');
    });
  });
  
  describe('AuthStatus Type Tests', () => {
    test('should accept valid AuthStatus with all capabilities', () => {
      const authStatus: AuthStatus = {
        apiKeyValid: true,
        userSessionValid: true,
        sessionExpiry: 1703001600000,
        canPerformUserActions: true
      };
      
      expect(authStatus.apiKeyValid).toBe(true);
      expect(authStatus.userSessionValid).toBe(true);
      expect(authStatus.sessionExpiry).toBe(1703001600000);
      expect(authStatus.canPerformUserActions).toBe(true);
    });
    
    test('should accept AuthStatus with limited capabilities', () => {
      const limitedAuth: AuthStatus = {
        apiKeyValid: true,
        userSessionValid: false,
        sessionExpiry: null,
        canPerformUserActions: false
      };
      
      expect(limitedAuth.apiKeyValid).toBe(true);
      expect(limitedAuth.userSessionValid).toBe(false);
      expect(limitedAuth.sessionExpiry).toBeNull();
      expect(limitedAuth.canPerformUserActions).toBe(false);
    });
    
    test('should enforce boolean types for status flags', () => {
      const authStatus: AuthStatus = {
        apiKeyValid: false,
        userSessionValid: false,
        sessionExpiry: null,
        canPerformUserActions: false
      };
      
      expect(typeof authStatus.apiKeyValid).toBe('boolean');
      expect(typeof authStatus.userSessionValid).toBe('boolean');
      expect(typeof authStatus.canPerformUserActions).toBe('boolean');
    });
    
    test('should accept sessionExpiry as number or null', () => {
      const withExpiry: AuthStatus = {
        apiKeyValid: true,
        userSessionValid: true,
        sessionExpiry: 1703088000000,
        canPerformUserActions: true
      };
      
      const withoutExpiry: AuthStatus = {
        apiKeyValid: true,
        userSessionValid: false,
        sessionExpiry: null,
        canPerformUserActions: false
      };
      
      expect(typeof withExpiry.sessionExpiry).toBe('number');
      expect(withoutExpiry.sessionExpiry).toBeNull();
    });
  });
});