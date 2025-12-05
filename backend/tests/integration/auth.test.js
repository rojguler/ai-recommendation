// Authentication Endpoint Tests
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const { createTestUser, cleanupTestUser, generateTestToken } = require('../helpers/testHelpers');

describe('POST /api/auth/register', () => {
  it('should register a new user successfully', async () => {
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('username', userData.username);
    expect(response.body.user).toHaveProperty('email', userData.email);

    // Cleanup
    if (response.body.user.id) {
      await cleanupTestUser(response.body.user.id);
    }
  });

  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPassword123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should reject short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'short',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login', () => {
  let testUserId;
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';

  beforeAll(async () => {
    // Create test user
    testUserId = await createTestUser({
      email: testEmail,
      password: await bcrypt.hash(testPassword, 10),
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testEmail);
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword123',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should reject non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'SomePassword123',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/auth/me', () => {
  let testUserId;
  const testEmail = `test_${Date.now()}@example.com`;

  beforeAll(async () => {
    testUserId = await createTestUser({ email: testEmail });
  });

  afterAll(async () => {
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  });

  it('should return user info with valid token', async () => {
    const token = generateTestToken(testUserId, testEmail);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
  });

  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

