const { createConfiguration, DefaultApi } = require('@onesignal/node-onesignal');
require('dotenv').config();

let onesignalClient = null;

try {
  // Check if OneSignal credentials are properly configured
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn('⚠️  OneSignal credentials not configured. Push notifications will be disabled.');
    module.exports = { onesignalClient: null, appId: null };
  } else {
    // Initialize OneSignal client
    const configuration = createConfiguration({
      restApiKey: process.env.ONESIGNAL_REST_API_KEY,
    });

    onesignalClient = new DefaultApi(configuration);
    
    console.log('✅ OneSignal client initialized successfully');
    module.exports = { 
      onesignalClient, 
      appId: process.env.ONESIGNAL_APP_ID 
    };
  }
} catch (error) {
  console.error('❌ Failed to initialize OneSignal:', error.message);
  console.warn('⚠️  OneSignal will be disabled. Push notifications will not work.');
  module.exports = { onesignalClient: null, appId: null };
}