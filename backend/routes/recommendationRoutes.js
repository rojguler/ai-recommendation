// Recommendation Routes - AI-powered movie recommendations
const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/authMiddleware');
const { recommendationLimiter } = require('../middleware/rateLimiter');
const { customRecommendationValidator, movieIdValidator } = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validation');

// All recommendation routes require authentication
router.use(authMiddleware);

// Apply rate limiting to all recommendation endpoints (AI API costs)
router.use(recommendationLimiter);

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get personalized movie recommendations based on user profile
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of personalized movie recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recommendation'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', recommendationController.getRecommendations);

/**
 * @swagger
 * /api/recommendations/custom:
 *   post:
 *     summary: Get custom movie recommendations based on text description
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 example: "mind-bending sci-fi thriller"
 *     responses:
 *       200:
 *         description: Custom movie recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recommendation'
 *                 customRequest:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/custom', customRecommendationValidator, handleValidationErrors, recommendationController.getCustomRecommendations);

/**
 * @swagger
 * /api/recommendations/similar/{movieId}:
 *   get:
 *     summary: Get movies similar to a specific movie
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the movie
 *     responses:
 *       200:
 *         description: Similar movies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recommendation'
 *                 originalMovie:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     id:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movie not found
 *       500:
 *         description: Server error
 */
router.get('/similar/:movieId', (req, res, next) => {
  // Custom validator for movieId that accepts both numeric IDs and tmdb_ prefixed IDs
  const { movieId } = req.params;
  if (!movieId || movieId.trim().length === 0) {
    return res.status(400).json({ error: 'Movie ID is required' });
  }
  next();
}, recommendationController.getSimilarMovies);

module.exports = router;

