// User Controller - Handles user profile operations
const User = require('../models/User');
const Movie = require('../models/Movie');
const logger = require('../utils/logger');

// Get user profile with preferences
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await User.getProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(profile);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update favorite genres
exports.updateFavoriteGenres = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { genres } = req.body;

    if (!Array.isArray(genres)) {
      return res.status(400).json({ error: 'Genres must be an array' });
    }

    await User.updateFavoriteGenres(userId, genres);
    res.json({ message: 'Favorite genres updated successfully', genres });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to update favorite genres' });
  }
};

// Add movie preference (like/dislike)
exports.addMoviePreference = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { movieId, preference } = req.body;

    if (!movieId || !preference) {
      return res.status(400).json({ error: 'Movie ID and preference are required' });
    }

    if (!['liked', 'disliked'].includes(preference)) {
      return res.status(400).json({ error: 'Preference must be "liked" or "disliked"' });
    }

    // Handle both database IDs and TMDB IDs (tmdb_123 format)
    const movieIdToUse = movieId.toString();

    await Movie.addPreference(userId, movieIdToUse, preference);
    res.json({ message: 'Movie preference added successfully' });
  } catch (error) {
    logger.logError(error, req);
    logger.error('Add preference error details:', { 
      userId, 
      movieId: movieIdToUse, 
      preference,
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ 
      error: 'Failed to add movie preference',
      message: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// Remove movie preference
exports.removeMoviePreference = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: 'Movie ID is required' });
    }

    await Movie.removePreference(userId, movieId);
    res.json({ message: 'Movie preference removed successfully' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to remove movie preference' });
  }
};

