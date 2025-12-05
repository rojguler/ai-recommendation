// Recommendation Controller - Handles AI-powered movie recommendations
const GeminiService = require('../services/geminiService');
const TMDBService = require('../services/tmdbService');
const User = require('../models/User');
const Movie = require('../models/Movie');
const logger = require('../utils/logger');
const cache = require('../utils/cacheService');

// Helper function to save and enhance movies (Optimized to avoid N+1 queries)
const saveAndEnhanceMovies = async (recommendations) => {
  if (!recommendations || recommendations.length === 0) {
    return [];
  }

  // Step 1: Batch fetch existing movies to avoid N+1 queries
  const titles = recommendations.map(rec => rec.title);
  const existingMoviesMap = new Map();
  const existingMovies = await Movie.findByTitles(titles);
  existingMovies.forEach(movie => {
    existingMoviesMap.set(movie.title.toLowerCase(), movie);
  });

  // Step 2: Get full movie details from TMDB for all recommendations in parallel
  // AI only provides titles, we get all details from TMDB
  const enhancedMovies = await Promise.all(
    recommendations.map(async (rec) => {
      // Try to get full details from TMDB
      const tmdbDetails = await TMDBService.getFullMovieDetailsByTitle(rec.title, rec.year);
      
      if (tmdbDetails) {
        // Use TMDB data as primary source, but keep AI-generated fields (reason, tagline, mini_scene)
        return {
          title: tmdbDetails.title,
          genre: tmdbDetails.genre,
          year: tmdbDetails.year,
          description: tmdbDetails.description || rec.description || '',
          poster_url: tmdbDetails.poster_url,
          backdrop_url: tmdbDetails.backdrop_url,
          tmdb_id: tmdbDetails.tmdb_id,
          // Keep AI-generated content
          reason: rec.reason,
          tagline: rec.tagline,
          mini_scene: rec.mini_scene
        };
      } else {
        // Fallback: if TMDB doesn't have it, use AI data and try to get at least poster
        logger.warn('Movie not found in TMDB, using AI data', { title: rec.title });
        const posterInfo = await TMDBService.getMoviePoster(rec.title, rec.year);
        return {
          ...rec,
          poster_url: posterInfo.poster_url || rec.poster_url,
          backdrop_url: posterInfo.backdrop_url,
          tmdb_id: posterInfo.tmdb_id,
          description: rec.description || posterInfo.overview || ''
        };
      }
    })
  );

  // Step 3: Process movies that need to be created
  const moviesToCreate = [];
  const moviesToUpdate = [];
  const savedMovies = [];

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const enhancedMovie = enhancedMovies[i];
    const normalizedTitle = rec.title.toLowerCase();
    let movie = existingMoviesMap.get(normalizedTitle);

    if (!movie) {
      // Movie doesn't exist, prepare for creation
      moviesToCreate.push({
        rec,
        enhancedMovie,
        index: i
      });
    } else {
      // Movie exists, check if poster needs updating
      if (!movie.poster_url && enhancedMovie.poster_url) {
        moviesToUpdate.push({
          movieId: movie.id,
          posterUrl: enhancedMovie.poster_url
        });
        movie.poster_url = enhancedMovie.poster_url;
      }

      savedMovies[i] = {
        ...movie,
        poster_url: movie.poster_url || enhancedMovie.poster_url || null,
        reason: rec.reason,
        tagline: rec.tagline || movie.tagline,
        mini_scene: rec.mini_scene || movie.mini_scene
      };
    }
  }

  // Step 4: Batch create new movies with tags in parallel
  if (moviesToCreate.length > 0) {
    const newMovies = await Promise.all(
      moviesToCreate.map(async ({ rec, enhancedMovie, index }) => {
        // Generate AI tags for the movie
        let tags = [];
        try {
          tags = await GeminiService.generateMovieTags(
            enhancedMovie.title || rec.title,
            enhancedMovie.description || rec.description,
            enhancedMovie.genre || rec.genre
          );
        } catch (tagError) {
          logger.warn('Error generating tags for movie', { 
            title: enhancedMovie.title || rec.title,
            error: tagError.message 
          });
          tags = GeminiService.getFallbackTags(enhancedMovie.genre || rec.genre);
        }

        // Create new movie entry
        const movieId = await Movie.create({
          title: enhancedMovie.title,
          genre: enhancedMovie.genre,
          year: enhancedMovie.year,
          description: enhancedMovie.description || rec.description,
          poster_url: enhancedMovie.poster_url || null,
          tagline: enhancedMovie.tagline || rec.tagline,
          mini_scene: enhancedMovie.mini_scene || rec.mini_scene,
          tags: tags
        });

        const newMovie = await Movie.findById(movieId);
        return { movie: newMovie, index };
      })
    );

    // Add newly created movies to savedMovies array at correct positions
    newMovies.forEach(({ movie, index }) => {
      const rec = recommendations[index];
      savedMovies[index] = {
        ...movie,
        poster_url: movie.poster_url || enhancedMovies[index].poster_url || null,
        reason: rec.reason,
        tagline: rec.tagline || movie.tagline,
        mini_scene: rec.mini_scene || movie.mini_scene
      };
    });
  }

  // Step 5: Batch update posters
  if (moviesToUpdate.length > 0) {
    await Movie.batchUpdatePosters(moviesToUpdate);
  }

  return savedMovies;
};

// Get movie recommendations based on user preferences - with caching
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user profile with preferences
    const userProfile = await User.getProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user profile could not be found. Please try logging in again.'
      });
    }

    // Prepare user preferences for AI
    const userPreferences = {
      favorite_genres: userProfile.favorite_genres || [],
      liked_movies: userProfile.liked_movies || [],
      disliked_movies: userProfile.disliked_movies || []
    };

    // Create cache key based on user preferences (hash for uniqueness)
    const prefsHash = JSON.stringify(userPreferences);
    const cacheKey = `recommendations:${userId}:${Buffer.from(prefsHash).toString('base64').substring(0, 20)}`;

    // Try to get from cache first (cache for 1 hour)
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info('Recommendations served from cache', { userId });
        return res.json({
          recommendations: cached,
          cached: true
        });
      }
    }

    // Get recommendations from Gemini API
    const recommendations = await GeminiService.getRecommendations(userPreferences);

    // Save recommended movies to database (if they don't exist) and enhance with TMDB posters
    const savedMovies = await saveAndEnhanceMovies(recommendations);

    // Cache recommendations for 1 hour (3600 seconds)
    if (cache.isEnabled() && savedMovies.length > 0) {
      await cache.set(cacheKey, savedMovies, 3600);
    }

    res.json({
      recommendations: savedMovies,
      cached: false
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Failed to get recommendations. Please try again later.' 
        : 'Failed to get recommendations: ' + error.message,
      details: process.env.NODE_ENV !== 'production' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
};

// Get custom recommendations based on user's text description
exports.getCustomRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Get user profile for context
    const userProfile = await User.getProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare user preferences for context
    const userPreferences = {
      favorite_genres: userProfile.favorite_genres || [],
      liked_movies: userProfile.liked_movies || [],
      disliked_movies: userProfile.disliked_movies || []
    };

    // Get custom recommendations from Gemini API
    const recommendations = await GeminiService.getCustomRecommendations(
      description.trim(),
      userPreferences
    );

    // Save recommended movies to database and enhance with TMDB posters
    const savedMovies = await saveAndEnhanceMovies(recommendations);

    res.json({
      recommendations: savedMovies,
      customRequest: description.trim()
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Failed to get custom recommendations. Please try again later.' 
        : 'Failed to get custom recommendations: ' + error.message 
    });
  }
};

// Get similar movies to a specific movie
exports.getSimilarMovies = async (req, res) => {
  try {
    const { movieId } = req.params;
    const TMDBService = require('../services/tmdbService');

    let movie;
    
    // Check if it's a TMDB ID (starts with "tmdb_")
    if (movieId.startsWith('tmdb_')) {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''));
      
      // Get full movie details from TMDB
      const tmdbDetails = await TMDBService.getMovieDetails(tmdbId);
      
      if (!tmdbDetails) {
        return res.status(404).json({ error: 'Movie not found in TMDB' });
      }

      // Create a movie object from TMDB data
      // Handle genre - it can be a string or array
      let genre = 'Unknown';
      if (tmdbDetails.genres) {
        if (Array.isArray(tmdbDetails.genres)) {
          genre = tmdbDetails.genres.length > 0 
            ? (typeof tmdbDetails.genres[0] === 'string' ? tmdbDetails.genres[0] : (tmdbDetails.genres[0].name || 'Unknown'))
            : 'Unknown';
        } else if (typeof tmdbDetails.genres === 'string') {
          genre = tmdbDetails.genres;
        }
      }
      
      movie = {
        title: tmdbDetails.title || 'Unknown Movie',
        description: tmdbDetails.overview || tmdbDetails.description || '',
        genre: genre,
        year: tmdbDetails.release_date 
          ? new Date(tmdbDetails.release_date).getFullYear() 
          : null,
        id: movieId // Use the tmdb_ prefixed ID
      };
    } else {
      // Regular database movie
      movie = await Movie.findById(movieId);
      if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
      }
    }

    // Get similar movies from Gemini API
    const movieTitle = movie.title || 'Unknown Movie';
    const movieDescription = movie.description || movie.overview || '';
    const movieGenre = movie.genre || 'Unknown';
    
    let recommendations = [];
    try {
      logger.info('Getting similar movies from Gemini', { movieId, movieTitle, movieGenre });
      recommendations = await GeminiService.getSimilarMovies(
        movieTitle,
        movieDescription,
        movieGenre
      );
      
      if (!recommendations || recommendations.length === 0) {
        logger.warn('Gemini returned no similar movies, will try fallback', { movieId, movieTitle });
      } else {
        logger.info('Got similar movies from Gemini', { count: recommendations.length, movieTitle });
      }
    } catch (similarError) {
      logger.error('Error getting similar movies from Gemini', { 
        error: similarError.message,
        stack: similarError.stack,
        movieId: movieId,
        movieTitle: movieTitle 
      });
      // Continue to fallback instead of returning empty
      recommendations = [];
    }
    
    // If no recommendations, try to get fallback recommendations
    if (!recommendations || recommendations.length === 0) {
      logger.warn('No similar movies found from Gemini, trying fallback', { movieId, movieTitle, movieGenre });
      
      // Try to get fallback recommendations based on genre
      try {
        const fallbackRecs = await GeminiService.getFallbackRecommendations(
          [movieGenre],
          [],
          []
        );
        if (fallbackRecs && fallbackRecs.length > 0) {
          recommendations = fallbackRecs.slice(0, 3);
        }
      } catch (fallbackError) {
        logger.error('Fallback recommendations also failed', { error: fallbackError.message });
      }
      
      // If still no recommendations, return empty
      if (!recommendations || recommendations.length === 0) {
        return res.json({
          recommendations: [],
          originalMovie: {
            title: movieTitle,
            id: movie.id || movieId
          }
        });
      }
    }
    
    // Save recommended movies to database and enhance with TMDB posters
    const savedMovies = await saveAndEnhanceMovies(recommendations);

    res.json({
      recommendations: savedMovies,
      originalMovie: {
        title: movieTitle,
        id: movie.id || movieId
      }
    });
  } catch (error) {
    logger.logError(error, req);
    
    // Try to get at least some fallback recommendations
    try {
      const movieGenre = movie?.genre || 'Unknown';
      const fallbackRecs = await GeminiService.getFallbackRecommendations(
        [movieGenre],
        [],
        []
      );
      
      if (fallbackRecs && fallbackRecs.length > 0) {
        const savedFallback = await saveAndEnhanceMovies(fallbackRecs.slice(0, 3));
        return res.json({
          recommendations: savedFallback,
          originalMovie: {
            title: movie?.title || 'Unknown',
            id: movie?.id || movieId
          }
        });
      }
    } catch (fallbackError) {
      logger.error('Fallback recommendations failed', { error: fallbackError.message });
    }
    
    // If everything fails, return empty array with success status (don't fail the request)
    res.json({
      recommendations: [],
      originalMovie: {
        title: movie?.title || 'Unknown',
        id: movie?.id || movieId
      }
    });
  }
};

