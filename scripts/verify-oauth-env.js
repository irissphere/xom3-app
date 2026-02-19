// Verify OAuth Environment Variables
// Run: node scripts/verify-oauth-env.js

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

console.log('🔍 OAuth Environment Variable Verification\n');
console.log(`Checking: ${envPath}\n`);

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.log('\nCreate it by copying ENV_LOCAL.template');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

const requiredVars = {
  'GOOGLE_CLIENT_ID': 'YouTube/Google OAuth',
  'GOOGLE_CLIENT_SECRET': 'YouTube/Google OAuth',
  'TWITTER_CLIENT_ID': 'Twitter/X OAuth',
  'TWITTER_CLIENT_SECRET': 'Twitter/X OAuth',
  'META_APP_ID': 'Instagram/Facebook OAuth',
  'META_APP_SECRET': 'Instagram/Facebook OAuth',
  'TIKTOK_CLIENT_KEY': 'TikTok OAuth',
  'TIKTOK_CLIENT_SECRET': 'TikTok OAuth',
  'LINKEDIN_CLIENT_ID': 'LinkedIn OAuth',
  'LINKEDIN_CLIENT_SECRET': 'LinkedIn OAuth',
  'NEXT_PUBLIC_APP_URL': 'OAuth Redirect URLs',
};

const found = {};
const issues = [];

lines.forEach((line, index) => {
  const trimmed = line.trim();
  
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) return;
  
  // Check for = sign
  if (!trimmed.includes('=')) {
    issues.push(`Line ${index + 1}: Missing = sign: ${trimmed.substring(0, 50)}`);
    return;
  }
  
  const [key, ...valueParts] = trimmed.split('=');
  const envKey = key.trim();
  const envValue = valueParts.join('=').trim();
  
  // Check for spaces around =
  if (key !== key.trim() || (valueParts[0] && valueParts[0].startsWith(' '))) {
    issues.push(`Line ${index + 1}: Spaces around = sign: ${trimmed.substring(0, 50)}`);
  }
  
  // Check for quotes (should not be quoted)
  if (envValue.startsWith('"') && envValue.endsWith('"')) {
    issues.push(`Line ${index + 1}: Value is quoted (remove quotes): ${envKey}`);
  }
  
  if (envValue.startsWith("'") && envValue.endsWith("'")) {
    issues.push(`Line ${index + 1}: Value is quoted (remove quotes): ${envKey}`);
  }
  
  // Check if empty
  if (envValue.length === 0) {
    issues.push(`Line ${index + 1}: Empty value for ${envKey}`);
  }
  
  found[envKey] = {
    hasValue: envValue.length > 0,
    valueLength: envValue.length,
    preview: envValue.length > 0 ? `${envValue.substring(0, 10)}...` : 'EMPTY',
  };
});

console.log('📋 Required Variables:\n');
Object.entries(requiredVars).forEach(([key, description]) => {
  const status = found[key];
  if (status && status.hasValue) {
    console.log(`✅ ${key.padEnd(25)} ${description.padEnd(30)} (${status.valueLength} chars)`);
  } else {
    console.log(`❌ ${key.padEnd(25)} ${description.padEnd(30)} MISSING`);
  }
});

if (issues.length > 0) {
  console.log(`\n⚠️  Found ${issues.length} issue(s):\n`);
  issues.forEach(issue => console.log(`   ${issue}`));
} else {
  console.log('\n✅ No formatting issues found!');
}

const missing = Object.keys(requiredVars).filter(key => !found[key] || !found[key].hasValue);
if (missing.length > 0) {
  console.log(`\n❌ Missing ${missing.length} required variable(s):`);
  missing.forEach(key => console.log(`   - ${key}`));
  console.log('\n💡 Add these to your .env.local file');
} else {
  console.log('\n✅ All required variables are set!');
  console.log('\n🔄 Next steps:');
  console.log('   1. Restart your dev server: npm run dev');
  console.log('   2. Visit: http://localhost:3000/api/oauth/debug');
  console.log('   3. Test OAuth: http://localhost:3000/social-connect');
}

console.log('');









