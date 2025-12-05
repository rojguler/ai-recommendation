// User Routes
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { updateGenresValidator, moviePreferenceValidator } = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validation');

// All user routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile with preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with liked/disliked movies
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     liked_movies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Movie'
 *                     disliked_movies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Movie'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/users/profile/genres:
 *   put:
 *     summary: Update user's favorite genres
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - genres
 *             properties:
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["Action", "Sci-Fi", "Thriller"]
 *     responses:
 *       200:
 *         description: Genres updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile/genres', updateGenresValidator, handleValidationErrors, userController.updateFavoriteGenres);

/**
 * @swagger
 * /api/users/preferences:
 *   post:
 *     summary: Add movie preference (like/dislike)
 *     tags: [Users]
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
 *               - preference
 *             properties:
 *               movieId:
 *                 type: integer
 *                 example: 1
 *               preference:
 *                 type: string
 *                 enum: [liked, disliked]
 *                 example: liked
 *     responses:
 *       200:
 *         description: Preference added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/preferences', moviePreferenceValidator, handleValidationErrors, userController.addMoviePreference);

/**
 * @swagger
 * /api/users/preferences:
 *   delete:
 *     summary: Remove movie preference
 *     tags: [Users]
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
 *         description: Preference removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.delete('/preferences', moviePreferenceValidator, handleValidationErrors, userController.removeMoviePreference);

module.exports = router;

