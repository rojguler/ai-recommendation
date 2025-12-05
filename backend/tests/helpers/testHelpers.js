// Test Helpers - Utility functions for testing
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

/**
 * Generate a test JWT token for a user
 * @param {number} userId - User ID
 * @param {string} email - User email
 * @returns {string} JWT token
 */
function generateTestToken(userId = 1, email = 'test@example.com') {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '7d' }
  );
}

/**
 * Create a test user in the database
 * @param {object} userData - User data
 * @returns {Promise<number>} User ID
 */
async function createTestUser(userData = {}) {
  const defaultData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: await bcrypt.hash('TestPassword123', 10),
    ...userData,
  };
  
  return await User.create(defaultData);
}

/**
 * Clean up test data
 * @param {number} userId - User ID to delete
 */
async function cleanupTestUser(userId) {
  const db = require('../../config/database').promisePool;
  try {
    await db.execute('DELETE FROM user_movie_preferences WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM favorites WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Create test request with authentication
 * @param {object} options - Request options
 * @returns {object} Request options with auth header
 */
function authenticatedRequest(options = {}) {
  const token = generateTestToken();
  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}

module.exports = {
  generateTestToken,
  createTestUser,
  cleanupTestUser,
  authenticatedRequest,
};

