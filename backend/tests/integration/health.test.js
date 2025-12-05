// Health Check Endpoint Tests
const request = require('supertest');
const app = require('../../server');

describe('GET /api/health', () => {
  it('should return 200 and OK status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message');
  });
});

