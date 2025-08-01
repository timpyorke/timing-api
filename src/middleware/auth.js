const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // First try JWT token (for admin login)
    try {
      // Try to decode without verification first to check algorithm
      const decoded = jwt.decode(token, { complete: true });
      console.log('🔐 Token algorithm detected:', decoded?.header?.alg);
      
      if (decoded && decoded.header && decoded.header.alg) {
        const algorithm = decoded.header.alg;
        
        // Skip RS256 tokens if we don't have the public key
        if (algorithm === 'RS256' && !process.env.JWT_PUBLIC_KEY) {
          console.log('🔐 RS256 token detected but no JWT_PUBLIC_KEY provided, skipping to Firebase');
          throw new Error('RS256 requires public key');
        }
        
        let secret = process.env.JWT_SECRET || '+u2ciMTO4QgMOtQeKUCe1AbOisCHDnHCuX59v+Aofgg=';
        
        // Handle different algorithms
        if (algorithm === 'RS256') {
          secret = process.env.JWT_PUBLIC_KEY;
        }
        
        const verifiedToken = jwt.verify(token, secret, { algorithm });
        req.user = verifiedToken;
        return next();
      }
    } catch (jwtError) {
      // If JWT fails, try Firebase token
      console.log('🔐 JWT failed, trying Firebase token verification:', jwtError.message);
    }
    
    console.log('🔐 Firebase token verification attempt:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Verify Firebase JWT token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    console.log('✅ Firebase token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      exp: decodedToken.exp,
      iat: decodedToken.iat
    });
    
    // Extract user information from Firebase token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.debug('my token:', token);
    console.error('❌ Token verification error:', {
      errorCode: error.code,
      errorMessage: error.message,
      tokenLength: token ? token.length : 'undefined',
      timestamp: new Date().toISOString()
    });
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const generateToken = (payload) => {
  // Use RS256 if private key is available, otherwise fall back to HS256
  if (process.env.JWT_PRIVATE_KEY) {
    return jwt.sign(payload, process.env.JWT_PRIVATE_KEY, {
      expiresIn: '24h',
      algorithm: 'RS256'
    });
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET || '+u2ciMTO4QgMOtQeKUCe1AbOisCHDnHCuX59v+Aofgg=', {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
};

module.exports = {
  authenticateToken,
  generateToken
};