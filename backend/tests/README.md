# CineSense Backend Tests

This directory contains all test files for the CineSense backend API.

## Structure

```
tests/
├── setup.js                 # Test environment setup
├── helpers/
│   └── testHelpers.js      # Utility functions for tests
├── integration/            # Integration tests (API endpoints)
│   ├── auth.test.js
│   └── health.test.js
└── unit/                   # Unit tests (functions, models, services)
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only integration tests
npm run test:integration

# Run only unit tests
npm run test:unit

# Run with coverage
npm test -- --coverage
```

## Test Environment

Tests run with `NODE_ENV=test` which:
- Uses a separate test database (configured via `.env.test`)
- Disables Redis caching by default
- Uses test JWT secrets
- Suppresses console.log output (errors still shown)

## Writing Tests

### Integration Tests

Test API endpoints using Supertest:

```javascript
const request = require('supertest');
const app = require('../../server');

describe('GET /api/endpoint', () => {
  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
  });
});
```

### Unit Tests

Test individual functions or modules:

```javascript
const { myFunction } = require('../../services/myService');

describe('myFunction', () => {
  it('should process data correctly', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

## Test Helpers

The `testHelpers.js` file provides utilities:

- `generateTestToken(userId, email)` - Create JWT tokens for authenticated requests
- `createTestUser(userData)` - Create a test user in the database
- `cleanupTestUser(userId)` - Remove test user and related data
- `authenticatedRequest(options)` - Create request options with auth header

## Best Practices

1. **Clean up after tests**: Always clean up test data in `afterAll` hooks
2. **Use unique test data**: Use timestamps or random values to avoid conflicts
3. **Test edge cases**: Test both success and error scenarios
4. **Keep tests isolated**: Tests should not depend on each other
5. **Use descriptive test names**: Clear test descriptions help debugging

## Coverage

Aim for:
- 80%+ overall coverage
- 100% coverage for critical paths (auth, security)
- Test all error handling paths

View coverage report after running tests with coverage:
```
open coverage/lcov-report/index.html
```

