// Test setup file - Runs before all tests
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-min-32-chars';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-key';
process.env.TMDB_API_KEY = process.env.TMDB_API_KEY || 'test-tmdb-key';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'cinesense_test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.REDIS_DISABLED = 'true'; // Disable Redis in tests unless explicitly enabled

// Suppress console.log during tests (but keep errors)
const originalLog = console.log;
console.log = () => {};

// Restore console.log after tests
afterAll(() => {
  console.log = originalLog;
});

