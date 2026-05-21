#!/usr/bin/env node
/**
 * Google OAuth Diagnostic Script
 * Helps verify configuration and identify OAuth issues
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         Google OAuth Configuration Diagnostic Check           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Check required environment variables
const required = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL',
  'JWT_SECRET',
];

const missing = [];
const configured = {};

required.forEach((key) => {
  const value = process.env[key];
  if (!value) {
    missing.push(key);
    console.log(`❌ ${key}: NOT CONFIGURED`);
  } else {
    configured[key] = value;
    // Mask sensitive values
    const masked = key.includes('SECRET') || key.includes('CLIENT_ID')
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`✅ ${key}: ${masked}`);
  }
});

console.log('\n─────────────────────────────────────────────────────────────────\n');

// Detailed validation
console.log('📋 Configuration Details:\n');

const callbackUrl = process.env.GOOGLE_CALLBACK_URL || '';
const frontendUrl = process.env.FRONTEND_URL || '';

console.log(`Backend Callback URL:  ${callbackUrl}`);
console.log(`Frontend Redirect URL: ${frontendUrl}/auth/callback`);
console.log(`\nOAuth Flow:`);
console.log(`  1. Frontend → ${callbackUrl}`);
console.log(`  2. Google Auth Service`);
console.log(`  3. Google → Backend ${callbackUrl}`);
console.log(`  4. Backend → Frontend ${frontendUrl}/auth/callback?token=...`);

console.log('\n─────────────────────────────────────────────────────────────────\n');

// Validation checks
console.log('🔍 Validation Checks:\n');

let issues = 0;

// Check 1: Callback URL format
if (!callbackUrl.includes('/api/v1/auth/google/callback')) {
  console.log('⚠️  ISSUE: Callback URL doesn\'t match expected format');
  console.log('   Expected: http://[IP/DOMAIN]:4000/api/v1/auth/google/callback');
  console.log(`   Got: ${callbackUrl}`);
  issues++;
}

// Check 2: Verify callback URL protocol
if (!callbackUrl.startsWith('http://') && !callbackUrl.startsWith('https://')) {
  console.log('⚠️  ISSUE: Callback URL must start with http:// or https://');
  console.log(`   Got: ${callbackUrl}`);
  issues++;
}

// Check 3: Frontend URL reachability
if (frontendUrl.includes('localhost') && callbackUrl.includes('192.168')) {
  console.log('⚠️  ISSUE: URL Mismatch - Frontend uses localhost but Backend uses IP');
  console.log(`   Frontend: ${frontendUrl}`);
  console.log(`   Backend:  ${callbackUrl}`);
  console.log('   → Both should use same addressing scheme (localhost or IP)');
  issues++;
}

// Check 4: Missing credentials
if (missing.length > 0) {
  console.log(`⚠️  ISSUE: Missing ${missing.length} required environment variables:`);
  missing.forEach((v) => console.log(`   - ${v}`));
  issues++;
}

console.log('\n─────────────────────────────────────────────────────────────────\n');

if (issues === 0) {
  console.log('✅ Configuration looks good! Next steps:');
  console.log('   1. Verify Google Cloud Console has callback URL registered');
  console.log('   2. Ensure Google+ API is enabled');
  console.log('   3. Check OAuth consent screen is configured');
  console.log('   4. Test sign-in from frontend');
} else {
  console.log(`❌ Found ${issues} issue(s) to fix!`);
  console.log('   Refer to GOOGLE_OAUTH_SETUP.md for detailed instructions');
}

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                    End of Diagnostic Report                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

process.exit(issues > 0 ? 1 : 0);
