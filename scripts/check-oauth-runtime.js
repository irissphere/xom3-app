// Check OAuth credentials at runtime
// This will show what Next.js actually sees

console.log('\n🔍 Checking OAuth Environment Variables at Runtime\n');
console.log('This shows what Next.js can actually access:\n');

const required = {
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'TWITTER_CLIENT_ID': process.env.TWITTER_CLIENT_ID,
  'TWITTER_CLIENT_SECRET': process.env.TWITTER_CLIENT_SECRET,
  'META_APP_ID': process.env.META_APP_ID,
  'META_APP_SECRET': process.env.META_APP_SECRET,
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
};

let allSet = true;

Object.entries(required).forEach(([key, value]) => {
  if (value) {
    const preview = key.includes('SECRET') || key.includes('SECRET')
      ? '***SET***'
      : `${value.substring(0, 15)}...`;
    console.log(`✅ ${key.padEnd(25)} = ${preview}`);
  } else {
    console.log(`❌ ${key.padEnd(25)} = NOT SET`);
    allSet = false;
  }
});

console.log('\n' + '='.repeat(60));

if (allSet) {
  console.log('\n✅ All OAuth credentials are loaded!');
  console.log('\nIf social links still don\'t work:');
  console.log('  1. Check browser console for errors');
  console.log('  2. Visit: http://localhost:3000/api/oauth/debug');
  console.log('  3. Try: http://localhost:3000/social-connect');
} else {
  console.log('\n❌ Some credentials are missing!');
  console.log('\nTo fix:');
  console.log('  1. Add missing variables to .env.local');
  console.log('  2. NO QUOTES around values');
  console.log('  3. NO SPACES around = sign');
  console.log('  4. Restart dev server: npm run dev');
}

console.log('\n');









