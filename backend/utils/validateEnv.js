// Environment Variables Validation - Ensures all required env vars are set
const logger = require('./logger');

// Required environment variables
const requiredEnvVars = {
  // Database
  DB_HOST: 'Database host',
  DB_USER: 'Database user',
  DB_PASSWORD: 'Database password',
  DB_NAME: 'Database name',
  
  // Security
  JWT_SECRET: 'JWT secret key',
  
  // API Keys
  GEMINI_API_KEY: 'Google Gemini API key',
  TMDB_API_KEY: 'TMDB API key (required for movie data)',
};

// Optional but recommended environment variables
const optionalEnvVars = {
  PORT: 'Server port (default: 5000)',
  NODE_ENV: 'Environment (development/production)',
  FRONTEND_URL: 'Frontend URL for CORS',
  LOG_LEVEL: 'Logging level (debug/info/warn/error)',
};

/**
 * Validate that all required environment variables are set
 * @returns {boolean} True if all required vars are present, false otherwise
 */
function validateRequiredEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push({ key, description });
    }
  }

  // Check optional but important variables
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    if (!process.env[key] && key !== 'PORT' && key !== 'NODE_ENV') {
      warnings.push({ key, description });
    }
  }

  // Log missing required variables
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', {
      missing: missing.map(m => `${m.key} (${m.description})`),
    });
    
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(({ key, description }) => {
      console.error(`  - ${key}: ${description}`);
    });
    console.error('\nPlease set these variables in your .env file.\n');
    
    return false;
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    logger.warn('Optional environment variables not set:', {
      warnings: warnings.map(w => `${w.key} (${w.description})`),
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.warn('\n⚠️  Optional environment variables not set:');
      warnings.forEach(({ key, description }) => {
        console.warn(`  - ${key}: ${description}`);
      });
      console.warn('');
    }
  }

  // Validate specific values
  validateSpecificValues();

  logger.info('Environment variables validation passed');
  return true;
}

/**
 * Validate specific environment variable values
 */
function validateSpecificValues() {
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is shorter than 32 characters. Consider using a longer secret for better security.');
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  JWT_SECRET should be at least 32 characters long for security.\n');
    }
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    logger.warn(`NODE_ENV is set to "${process.env.NODE_ENV}" but should be one of: development, production, test`);
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || '5000');
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error(`Invalid PORT value: ${process.env.PORT}. Using default: 5000`);
    process.env.PORT = '5000';
  }

  // Validate LOG_LEVEL
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL.toLowerCase())) {
    logger.warn(`Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Valid levels: ${validLogLevels.join(', ')}`);
  }
}

module.exports = {
  validateRequiredEnv,
  requiredEnvVars,
  optionalEnvVars,
};

