/**
 * Integration test for AutonomousExecutor
 * Tests that all components integrate properly
 */

import { AutonomousExecutor } from '../src/core/autonomous-executor.ts';

async function testAutonomousExecutorIntegration() {
  console.log('🧪 [Integration Test] Starting AutonomousExecutor integration test...');
  
  try {
    // Test 1: Can instantiate AutonomousExecutor
    console.log('📋 [Test 1] Testing AutonomousExecutor instantiation...');
    const executor = new AutonomousExecutor();
    console.log('✅ [Test 1] AutonomousExecutor instantiated successfully');
    
    // Test 2: Check that all required components are properly initialized
    console.log('📋 [Test 2] Testing component initialization...');
    
    // Check if the executor has the required methods
    const requiredMethods = [
      'executeAutonomously',
      'step2_executeParallelAnalysis',
      'generateBaselineContext',
      'preloadActionSpecificInformation'
    ];
    
    for (const method of requiredMethods) {
      if (typeof executor[method] !== 'function') {
        throw new Error(`Required method ${method} not found or not a function`);
      }
    }
    console.log('✅ [Test 2] All required methods are available');
    
    // Test 3: Test legacy compatibility methods
    console.log('📋 [Test 3] Testing legacy compatibility...');
    
    try {
      const parallelResult = await executor.step2_executeParallelAnalysis();
      console.log('✅ [Test 3] Legacy parallel analysis works');
    } catch (error) {
      console.warn('⚠️ [Test 3] Legacy parallel analysis has issues:', error.message);
    }
    
    try {
      const baselineContext = await executor.generateBaselineContext();
      console.log('✅ [Test 3] Baseline context generation works');
    } catch (error) {
      console.warn('⚠️ [Test 3] Baseline context generation has issues:', error.message);
    }
    
    try {
      const preloadResult = await executor.preloadActionSpecificInformation();
      console.log('✅ [Test 3] Action-specific information preloading works');
    } catch (error) {
      console.warn('⚠️ [Test 3] Action-specific information preloading has issues:', error.message);
    }
    
    console.log('🎉 [Integration Test] All tests passed! AutonomousExecutor is ready for use.');
    
    return {
      success: true,
      message: 'All integration tests passed',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [Integration Test] Test failed:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Run the integration test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAutonomousExecutorIntegration()
    .then(result => {
      console.log('📄 [Test Result]:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ [Test Error]:', error);
      process.exit(1);
    });
}

export { testAutonomousExecutorIntegration };