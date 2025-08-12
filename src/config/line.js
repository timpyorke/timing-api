const { Client } = require('@line/bot-sdk');
require('dotenv').config();

let lineClient = null;

try {
  // Check if LINE credentials are properly configured
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_CHANNEL_SECRET) {
    console.warn('⚠️  LINE credentials not configured. LINE messaging will be disabled.');
    module.exports = { lineClient: null, channelSecret: null };
  } else {
    // Initialize LINE client
    const config = {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET
    };

    lineClient = new Client(config);
    
    console.log('✅ LINE client initialized successfully');
    module.exports = { 
      lineClient, 
      channelSecret: process.env.LINE_CHANNEL_SECRET 
    };
  }
} catch (error) {
  console.error('❌ Failed to initialize LINE client:', error.message);
  console.warn('⚠️  LINE messaging will be disabled.');
  module.exports = { lineClient: null, channelSecret: null };
}