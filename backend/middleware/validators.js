// Validators - Express-validator rules for different endpoints
const { body, param, query } = require('express-validator');

// Authentication validators
const registerValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
];

// User profile validators
const updateGenresValidator = [
  body('genres')
    .isArray().withMessage('Genres must be an array')
    .custom((genres) => {
      if (genres.length > 10) {
        throw new Error('Maximum 10 genres allowed');
      }
      return true;
    }),
  
  body('genres.*')
    .optional()
    .isString().withMessage('Each genre must be a string')
    .trim()
    .notEmpty().withMessage('Genre cannot be empty'),
];

const moviePreferenceValidator = [
  body('movieId')
    .notEmpty().withMessage('Movie ID is required')
    .custom((value) => {
      // Accept both integer IDs and TMDB IDs (tmdb_123 format)
      if (typeof value === 'number' && value > 0) {
        return true;
      }
      if (typeof value === 'string') {
        // Check if it's a valid integer string or TMDB ID format
        if (/^\d+$/.test(value) || /^tmdb_\d+$/.test(value)) {
          return true;
        }
      }
      throw new Error('Movie ID must be a positive integer or TMDB ID (tmdb_123 format)');
    }),
  
  body('preference')
    .notEmpty().withMessage('Preference is required')
    .isIn(['liked', 'disliked']).withMessage('Preference must be either "liked" or "disliked"'),
];

// Movie validators
const movieIdValidator = [
  param('id')
    .notEmpty().withMessage('Movie ID is required'),
];

const movieIdParamValidator = [
  param('movieId')
    .notEmpty().withMessage('Movie ID is required')
    .isInt({ min: 1 }).withMessage('Movie ID must be a positive integer'),
];

const searchMoviesValidator = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),
  
  query('genre')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Genre name is too long'),
  
  query('yearFrom')
    .optional()
    .isInt({ min: 1900, max: 2100 }).withMessage('Year must be between 1900 and 2100'),
  
  query('yearTo')
    .optional()
    .isInt({ min: 1900, max: 2100 }).withMessage('Year must be between 1900 and 2100'),
];

const customRecommendationValidator = [
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 3, max: 500 }).withMessage('Description must be between 3 and 500 characters'),
];

// Trending movies validator
const trendingValidator = [
  query('timeWindow')
    .optional()
    .isIn(['day', 'week']).withMessage('Time window must be either "day" or "week"'),
];

module.exports = {
  // Authentication
  registerValidator,
  loginValidator,
  
  // User profile
  updateGenresValidator,
  moviePreferenceValidator,
  
  // Movies
  movieIdValidator,
  movieIdParamValidator,
  searchMoviesValidator,
  customRecommendationValidator,
  trendingValidator,
};

