// This will help capture your real LINE user ID
// Instructions:
// 1. Make sure your webhook URL is set to: https://yourdomain.com/api/line/webhook
// 2. Send ANY message to your bot @384spybg
// 3. Check the server logs - your real user ID will appear in the webhook logs

console.log('📱 To capture your real LINE user ID:');
console.log('');
console.log('1. Make sure webhook URL is configured in LINE Developer Console:');
console.log('   https://yourdomain.com/api/line/webhook');
console.log('');
console.log('2. Add bot as friend: @384spybg');
console.log('');
console.log('3. Send any message to the bot');
console.log('');
console.log('4. Check server logs (npm run dev) for entries like:');
console.log('   "Received LINE event: message from user: U1a2b3c4d..."');
console.log('');
console.log('5. That U1a2b3c4d... is your REAL user ID!');
console.log('');
console.log('Current fake IDs that need to be replaced:');
console.log('- YOUR_REAL_USER_ID_HERE');
console.log('- U1234567890abcdef1234567890abcdef');

// Let's also update the database to remove fake IDs
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

async function cleanupFakeIds() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Remove fake IDs
    await pool.query("DELETE FROM line_tokens WHERE line_user_id IN ('YOUR_REAL_USER_ID_HERE', 'U1234567890abcdef1234567890abcdef')");
    console.log('✅ Cleaned up fake user IDs from database');
    console.log('');
    console.log('Now when you send "register admin" to the bot, your real ID will be stored!');
  } catch (error) {
    console.log('❌ Error cleaning database:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupFakeIds();