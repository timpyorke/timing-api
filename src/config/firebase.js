const admin = require('firebase-admin');
const { LOG_MESSAGES } = require('../utils/constants');
require('dotenv').config();

let messaging = null;

try {
  // Check if Firebase credentials are properly configured
  if (!process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY === 'PLACEHOLDER_KEY_NOT_SET') {
    console.warn(LOG_MESSAGES.FIREBASE_NOT_CONFIGURED_WARN);
    module.exports = { admin: null, messaging: null };
  } else {
    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }

    messaging = admin.messaging();
    console.log(LOG_MESSAGES.FIREBASE_INIT_SUCCESS);
    module.exports = { admin, messaging };
  }
} catch (error) {
  console.error(LOG_MESSAGES.FIREBASE_INIT_FAILED_PREFIX, error.message);
  console.warn(LOG_MESSAGES.FIREBASE_DISABLED_WARN);
  module.exports = { admin: null, messaging: null };
}
