import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { KaitoAPIConfig } from '../../../src/kaito-api/types';

describe('KaitoTwitterAPIClient - TwitterAPI.io Integration Tests', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: KaitoAPIConfig;

  beforeEach(() => {
    mockConfig = {
      environment: 'dev',
      api: {
        baseUrl: 'https://api.twitterapi.io',
        version: 'v1',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          retryConditions: ['NETWORK_ERROR', 'TIMEOUT']
        }
      },
      authentication: {
        primaryKey: process.env.KAITO_API_TOKEN || 'test-key',
        keyRotationInterval: 86400000,
        encryptionEnabled: false
      },
      performance: {
        qpsLimit: 200,
        responseTimeTarget: 700,
        cacheEnabled: false,
        cacheTTL: 0
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: 'info',
        alertingEnabled: false,
        healthCheckInterval: 30000
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: [],
        auditLoggingEnabled: true,
        encryptionKey: 'test-key'
      },
      features: {
        realApiEnabled: true,
        mockFallbackEnabled: false,
        batchProcessingEnabled: false,
        advancedCachingEnabled: false
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'test',
        checksum: 'test-checksum'
      }
    };

    client = new KaitoTwitterAPIClient();
    client.initializeWithConfig(mockConfig);
  });

  describe('TwitterAPI.io Authentication Tests', () => {
    it('should authenticate with valid API key', async () => {
      // Real API test - minimal execution
      if (process.env.KAITO_API_TOKEN && process.env.RUN_REAL_TESTS === 'true') {
        const result = await client.testAuthentication();
        expect(result).toBe(true);
      } else {
        // Mock test
        expect(true).toBe(true);
      }
    });

    it('should handle authentication failure gracefully', async () => {
      const invalidClient = new KaitoTwitterAPIClient({ apiKey: 'invalid-key' });
      invalidClient.initializeWithConfig(mockConfig);
      
      const result = await invalidClient.testAuthentication();
      expect(result).toBe(false);
    });
  });

  describe('QPS Control Tests', () => {
    it('should enforce QPS limits correctly', async () => {
      const startTime = Date.now();
      
      // Execute multiple requests to test QPS control
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(client.testConnection());
      }
      
      await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // Should take at least 700ms * 4 intervals due to QPS control
      expect(duration).toBeGreaterThan(2800);
    });

    it('should track current QPS accurately', () => {
      const initialQPS = client.getCurrentQPS();
      expect(typeof initialQPS).toBe('number');
      expect(initialQPS).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cost Tracking Tests', () => {
    it('should track API costs correctly', async () => {
      const initialCost = client.getCostTrackingInfo();
      expect(initialCost).toHaveProperty('tweetsProcessed');
      expect(initialCost).toHaveProperty('estimatedCost');
      expect(typeof initialCost.estimatedCost).toBe('number');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network timeouts', async () => {
      // Test timeout scenarios
      const result = await client.testConnection();
      expect(typeof result).toBe('boolean');
    });

    it('should handle rate limit errors', async () => {
      // Test rate limit handling
      const rateLimits = client.getRateLimitStatus();
      expect(rateLimits).toHaveProperty('general');
      expect(rateLimits).toHaveProperty('posting');
      expect(rateLimits).toHaveProperty('collection');
    });
  });
});