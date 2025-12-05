// Rate Limiting Middleware - Prevents brute force attacks and API abuse
const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for authentication endpoints - More lenient for development
// In development, you can disable rate limiting by setting DISABLE_RATE_LIMIT=true
const authLimiter = process.env.DISABLE_RATE_LIMIT === 'true' 
  ? (req, res, next) => next() // Skip rate limiting if disabled
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 10 : 100, // Much more lenient in development (100 attempts per 15 min)
      message: {
        error: 'Too many authentication attempts, please try again after 15 minutes.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful requests - only failed ones count
      skipFailedRequests: false, // Count failed requests
      // In development, provide better error message
      ...(process.env.NODE_ENV !== 'production' && {
        handler: (req, res) => {
          res.status(429).json({
            error: 'Too many authentication attempts. Please wait a few minutes and try again, or restart the backend server to reset the limit.',
            retryAfter: Math.ceil(15 * 60) // seconds
          });
        }
      })
    });

// Recommendation API rate limiter - 20 requests per hour (AI API costs)
const recommendationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 recommendation requests per hour
  message: {
    error: 'Too many recommendation requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  recommendationLimiter
};

