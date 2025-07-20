#!/usr/bin/env node

import { AutonomousExecutor } from '../core/autonomous-executor.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting Autonomous System...');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  const executor = new AutonomousExecutor();
  
  let iterationCount = 0;
  
  while (true) {
    iterationCount++;
    console.log(`\n🔄 Iteration ${iterationCount} starting...`);
    
    try {
      await executor.executeAutonomously();
      console.log(`✅ Iteration ${iterationCount} completed successfully`);
    } catch (error) {
      console.error(`❌ Iteration ${iterationCount} failed:`, error);
    }
    
    const waitTime = await executor.determineNextExecutionTime();
    const waitMinutes = Math.round(waitTime / 60000);
    console.log(`⏳ Waiting ${waitMinutes} minutes before next execution...`);
    
    await sleep(waitTime);
  }
}

process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down Autonomous System...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down Autonomous System...');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});