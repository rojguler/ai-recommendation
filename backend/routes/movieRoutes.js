// Movie Routes
const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const authMiddleware = require('../middleware/authMiddleware');
const { movieIdParamValidator, searchMoviesValidator, trendingValidator } = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @swagger
 * /api/movies/favorites/list:
 *   get:
 *     summary: Get user's favorite movies
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 *       401:
 *         description: Unauthorized
 */
router.get('/favorites/list', authMiddleware, movieController.getFavorites);

/**
 * @swagger
 * /api/movies/favorites:
 *   post:
 *     summary: Add movie to favorites
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *             properties:
 *               movieId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Movie added to favorites
 *       400:
 *         description: Validation error or already favorited
 *       401:
 *         description: Unauthorized
 */
router.post('/favorites', authMiddleware, movieController.addToFavorites);

/**
 * @swagger
 * /api/movies/favorites/{movieId}:
 *   delete:
 *     summary: Remove movie from favorites
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Movie removed from favorites
 *       401:
 *         description: Unauthorized
 */
router.delete('/favorites/:movieId', authMiddleware, movieIdParamValidator, handleValidationErrors, movieController.removeFromFavorites);

/**
 * @swagger
 * /api/movies/search:
 *   get:
 *     summary: Search movies by query, genre, year, or tags
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (title or description)
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *       - in: query
 *         name: yearFrom
 *         schema:
 *           type: integer
 *         description: Filter by minimum year
 *       - in: query
 *         name: yearTo
 *         schema:
 *           type: integer
 *         description: Filter by maximum year
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags
 *     responses:
 *       200:
 *         description: List of matching movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
router.get('/search', searchMoviesValidator, handleValidationErrors, movieController.searchMovies);
router.get('/search/ai', movieController.searchMoviesAI); // AI-powered search
router.get('/search/autocomplete', movieController.getAutocomplete); // Autocomplete suggestions
router.get('/search/people', movieController.searchPeople); // Search people (actors/directors)
/**
 * @swagger
 * /api/movies/trending:
 *   get:
 *     summary: Get trending movies from TMDB
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: timeWindow
 *         schema:
 *           type: string
 *           enum: [day, week]
 *           default: week
 *         description: Time window for trending
 *     responses:
 *       200:
 *         description: List of trending movies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trending:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Movie'
 */
router.get('/trending', trendingValidator, handleValidationErrors, movieController.getTrending);

/**
 * @swagger
 * /api/movies/tags:
 *   get:
 *     summary: Get all available movie tags
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of all tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/tags', movieController.getAllTags);

/**
 * @swagger
 * /api/movies/genres:
 *   get:
 *     summary: Get all available genres
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of all genres
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/genres', movieController.getAllGenres);

/**
 * @swagger
 * /api/movies/trivia:
 *   get:
 *     summary: Get random movie trivia
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: Random movie trivia fact
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trivia:
 *                   type: string
 */
router.get('/trivia', movieController.getMovieTrivia);

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of all movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
router.get('/', movieController.getAllMovies);

/**
 * @swagger
 * /api/movies/{id}/spoilerfree:
 *   get:
 *     summary: Get spoiler-free summary for a movie
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Spoiler-free summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                 movieTitle:
 *                   type: string
 *       404:
 *         description: Movie not found
 */
router.get('/:id/spoilerfree', movieController.getSpoilerFreeSummary);

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Movie ID or TMDB ID (prefix with "tmdb_")
 *     responses:
 *       200:
 *         description: Movie details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       404:
 *         description: Movie not found
 */
router.get('/:id', movieController.getMovieById);

module.exports = router;

