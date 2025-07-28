#!/usr/bin/env tsx
/**
 * Test script to verify OAuth2 token loading from environment variables
 */

import * as dotenv from 'dotenv';
import { SimpleXClient } from '../../../src/lib/x-client.js';

// Load environment variables from .env file
dotenv.config();

console.log('🔍 Testing OAuth2 token loading...');

// First, verify environment variables are set
console.log('\n🔍 Environment Variables Check:');
console.log(`X_OAUTH2_ACCESS_TOKEN: ${process.env.X_OAUTH2_ACCESS_TOKEN ? '✅ Set' : '❌ Not Set'}`);
console.log(`X_OAUTH2_REFRESH_TOKEN: ${process.env.X_OAUTH2_REFRESH_TOKEN ? '✅ Set' : '❌ Not Set'}`);
console.log(`X_OAUTH2_EXPIRES_AT: ${process.env.X_OAUTH2_EXPIRES_AT ? '✅ Set' : '❌ Not Set'}`);

console.log('\n🔍 Creating SimpleXClient instance...');

try {
  // Create an instance of SimpleXClient which should trigger token loading
  const client = new SimpleXClient();
  console.log('✅ SimpleXClient instance created successfully');
  
  // Access the private oauth2Tokens property through reflection to verify it's loaded
  const oauth2Tokens = (client as any).oauth2Tokens;
  if (oauth2Tokens) {
    console.log('✅ OAuth2 tokens loaded successfully');
    console.log(`   Access token: ${oauth2Tokens.access_token ? oauth2Tokens.access_token.substring(0, 20) + '...' : 'Not set'}`);
    console.log(`   Expires at: ${oauth2Tokens.expires_at ? new Date(oauth2Tokens.expires_at).toISOString() : 'Not set'}`);
  } else {
    console.log('❌ OAuth2 tokens not loaded');
  }
} catch (error) {
  console.error('❌ Error creating SimpleXClient:', error);
}