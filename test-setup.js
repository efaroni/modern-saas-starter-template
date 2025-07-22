// Quick test script to verify your setup
const { config } = require('dotenv');
config({ path: '.env.local' });

console.log('🔍 Checking your setup...\n');

// Database
console.log('📊 Database:');
// Check database configuration using centralized config
let dbConfigured = false;
try {
  const { getDatabaseUrl } = require('./lib/db/config');
  getDatabaseUrl();
  dbConfigured = true;
} catch (error) {
  dbConfigured = false;
}
console.log(
  `  PostgreSQL: ${dbConfigured ? '✅ Configured' : '❌ Not configured'}`,
);

// Auth
console.log('\n🔐 Authentication:');
console.log(
  `  Auth Secret: ${process.env.AUTH_SECRET ? '✅ Set' : '❌ Missing'}`,
);
console.log(
  `  GitHub OAuth: ${process.env.GITHUB_ID ? '✅ Configured' : '⚪ Optional - Not set'}`,
);
console.log(
  `  Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '⚪ Optional - Not set'}`,
);

// Stripe
console.log('\n💳 Stripe:');
const stripeMock = process.env.STRIPE_SECRET_KEY?.includes('mock');
console.log(
  `  Secret Key: ${process.env.STRIPE_SECRET_KEY ? (stripeMock ? '🟡 Mock key' : '✅ Real test key') : '❌ Missing'}`,
);
console.log(
  `  Public Key: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (stripeMock ? '🟡 Mock key' : '✅ Real test key') : '❌ Missing'}`,
);
console.log(
  `  Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '⚪ Optional - Not set'}`,
);

// Resend
console.log('\n📧 Resend:');
const resendMock = process.env.RESEND_API_KEY?.includes('mock');
console.log(
  `  API Key: ${process.env.RESEND_API_KEY ? (resendMock ? '🟡 Mock key' : '✅ Real key') : '❌ Missing'}`,
);
console.log(`  From Email: ${process.env.RESEND_FROM_EMAIL || '❌ Not set'}`);

// OpenAI
console.log('\n🤖 OpenAI:');
const openaiMock = process.env.OPENAI_API_KEY?.includes('mock');
console.log(
  `  API Key: ${process.env.OPENAI_API_KEY ? (openaiMock ? '🟡 Mock key' : '✅ Real key') : '❌ Missing'}`,
);

// Optional services
console.log('\n☁️  Optional Services:');
console.log(
  `  Cloudflare R2: ${process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? '✅ Configured' : '⚪ Not configured'}`,
);
console.log(
  `  Upstash Redis: ${process.env.UPSTASH_REDIS_REST_URL ? '✅ Configured' : '⚪ Not configured'}`,
);

console.log('\n📝 Summary:');
console.log('  ✅ = Ready to use');
console.log('  🟡 = Mock mode (UI testing only)');
console.log('  ⚪ = Optional, not configured');
console.log('  ❌ = Required but missing');

console.log('\n🚀 Next steps:');
console.log('  1. Run: npm run dev');
console.log('  2. Visit: http://localhost:3000/dev');
console.log("  3. Test Section 1 (Configuration) - it's ready!");
console.log('  4. Get real API keys when needed (see SETUP_GUIDE.md)');
