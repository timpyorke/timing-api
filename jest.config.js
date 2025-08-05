module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/config/**'
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  // Handle open handles gracefully
  forceExit: true,
  detectOpenHandles: false
};