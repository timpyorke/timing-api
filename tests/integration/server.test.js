const request = require('supertest');
const app = require('../../src/server');

describe('Server Health Checks', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/menu should return menu data', async () => {
    const response = await request(app)
      .get('/api/menu')
      .expect(200);
    
    // The response should be an array or an object with categories
    expect(response.body).toBeDefined();
    expect(typeof response.body).toBe('object');
  });
});