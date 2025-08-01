const admin = require('firebase-admin');

// Fix Firebase private key formatting
const formatFirebasePrivateKey = (key) => {
  if (!key) return "";
  
  // Replace literal \n with actual newlines
  let formattedKey = key.replace(/\\n/g, '\n');
  
  // Ensure proper header/footer format
  if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = '-----BEGIN PRIVATE KEY-----\n' + formattedKey;
  }
  if (!formattedKey.endsWith('-----END PRIVATE KEY-----')) {
    formattedKey = formattedKey + '\n-----END PRIVATE KEY-----';
  }
  
  return formattedKey;
};

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: formatFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Validate required Firebase environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required Firebase environment variables:', missingVars);
  console.error('📋 Please ensure all Firebase credentials are properly set in your environment');
}

// Validate private key format
if (process.env.FIREBASE_PRIVATE_KEY) {
  const formattedKey = formatFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  console.log('🔑 Firebase private key format check:');
  console.log('- Key length:', formattedKey.length);
  console.log('- Starts correctly:', formattedKey.startsWith('-----BEGIN PRIVATE KEY-----'));
  console.log('- Ends correctly:', formattedKey.endsWith('-----END PRIVATE KEY-----'));
  console.log('- First 50 chars:', formattedKey.substring(0, 50));
  
  if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
    console.error('❌ FIREBASE_PRIVATE_KEY appears to be in wrong format');
  }
} else {
  console.error('❌ FIREBASE_PRIVATE_KEY is missing');
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.error('🔧 Check your Firebase credentials in environment variables');
  }
}

const messaging = admin.messaging();

module.exports = { admin, messaging };