// Test setup file
process.env.NODE_ENV = 'test';

// Mock Firebase Admin SDK for tests
jest.mock('../src/config/firebase', () => ({
  messaging: {
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 })
  }
}));

// Set test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  try {
    const pool = require('../src/config/database');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
  
  // Give Jest a moment to clean up
  await new Promise(resolve => setTimeout(resolve, 100));
});