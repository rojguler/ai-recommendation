// Movie Controller - Handles movie operations
const Movie = require('../models/Movie');
const GeminiService = require('../services/geminiService');
const TMDBService = require('../services/tmdbService');
const db = require('../config/database').promisePool;
const logger = require('../utils/logger');
const cache = require('../utils/cacheService');

// Get all movies - with caching for better performance
exports.getAllMovies = async (req, res) => {
  try {
    const cacheKey = 'movies:all';
    
    // Try to get from cache first
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info('Movies served from cache');
        return res.json(cached);
      }
    }

    // Fetch from database
    const movies = await Movie.findAll();
    
    // Cache for 1 hour (3600 seconds)
    if (cache.isEnabled()) {
      await cache.set(cacheKey, movies, 3600);
    }
    
    res.json(movies);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      error: 'Failed to get movies',
      message: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// Get movie by ID or TMDB ID - with caching
exports.getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `movie:${id}`;
    
    // Try to get from cache first (only for database movies, not TMDB)
    if (cache.isEnabled() && !id.startsWith('tmdb_')) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        // Check if user has favorited this movie (if authenticated)
        try {
          if (req.user && req.user.userId) {
            const isFavorited = await Movie.isFavorited(req.user.userId, id);
            cached.isFavorited = isFavorited;
          }
        } catch (err) {
          cached.isFavorited = false;
        }
        return res.json(cached);
      }
    }
    
    // Check if it's a TMDB ID (starts with "tmdb_")
    if (id.startsWith('tmdb_')) {
      const tmdbId = parseInt(id.replace('tmdb_', ''));
      
      // Get full movie details from TMDB
      const tmdbDetails = await TMDBService.getMovieDetails(tmdbId);
      
      if (!tmdbDetails) {
        return res.status(404).json({ error: 'Movie not found in TMDB' });
      }

      // Get title from TMDB details (now includes title)
      const title = tmdbDetails.title || 'Unknown Movie';
      const releaseYear = tmdbDetails.release_date 
        ? new Date(tmdbDetails.release_date).getFullYear() 
        : null;
      
      // Check if movie already exists in database
      let movie = await Movie.findByTitle(title);
      
      // Also try searching by partial title match
      if (!movie) {
        const [rows] = await db.execute(
          'SELECT * FROM movies WHERE title LIKE ? AND year = ? LIMIT 1',
          [`%${title}%`, releaseYear]
        );
        if (rows.length > 0) {
          movie = rows[0];
          if (movie.tags) {
            try {
              movie.tags = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
            } catch (e) {
              movie.tags = [];
            }
          }
        }
      }

      // If movie doesn't exist in database, create it
      if (!movie) {
        try {
          // Generate basic tags from genre
          const genre = tmdbDetails.genres && tmdbDetails.genres.length > 0 
            ? tmdbDetails.genres[0] 
            : 'Unknown';
          
          const tags = GeminiService.getFallbackTags(genre);
          
          const movieId = await Movie.create({
            title: title,
            genre: genre,
            year: releaseYear,
            description: tmdbDetails.overview || '',
            poster_url: tmdbDetails.poster_url,
            tagline: null,
            mini_scene: null,
            tags: tags
          });
          
          movie = await Movie.findById(movieId);
        } catch (createError) {
          logger.warn('Error creating movie from TMDB', { error: createError.message, title });
          // Return TMDB data directly if database creation fails
          return res.json({
            id: id,
            title: title,
            genre: tmdbDetails.genres && tmdbDetails.genres.length > 0 ? tmdbDetails.genres[0] : 'Unknown',
            year: releaseYear,
            description: tmdbDetails.overview || '',
            poster_url: tmdbDetails.poster_url,
            tagline: null,
            mini_scene: null,
            tags: [],
            isFromTMDB: true,
            isFavorited: false
          });
        }
      }

      // Update poster if missing
      if (movie && !movie.poster_url && tmdbDetails.poster_url) {
        await Movie.updatePoster(movie.id, tmdbDetails.poster_url);
        movie.poster_url = tmdbDetails.poster_url;
      }

      // Check if user has favorited this movie
      try {
        if (req.user && req.user.userId && movie.id) {
          const isFavorited = await Movie.isFavorited(req.user.userId, movie.id);
          movie.isFavorited = isFavorited;
        }
      } catch (err) {
        movie.isFavorited = false;
      }

      return res.json(movie);
    }

    // Normal database lookup
    const movie = await Movie.findById(id);
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Check if user has favorited this movie (if authenticated)
    try {
      if (req.user && req.user.userId) {
        const isFavorited = await Movie.isFavorited(req.user.userId, id);
        movie.isFavorited = isFavorited;
      }
    } catch (err) {
      movie.isFavorited = false;
    }

    // Cache for 30 minutes (1800 seconds) - only for database movies
    if (cache.isEnabled() && !id.startsWith('tmdb_')) {
      const movieToCache = { ...movie };
      delete movieToCache.isFavorited; // Don't cache user-specific data
      await cache.set(cacheKey, movieToCache, 1800);
    }

    res.json(movie);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get movie' });
  }
};

// Get user's favorite movies - with caching
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `favorites:${userId}`;
    
    // Try to get from cache first
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const favorites = await Movie.getFavorites(userId);
    
    // Cache for 5 minutes (300 seconds) - user-specific data
    if (cache.isEnabled()) {
      await cache.set(cacheKey, favorites, 300);
    }
    
    res.json(favorites);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ 
      error: 'Failed to get favorites',
      message: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// Add movie to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: 'Movie ID is required' });
    }

    // Handle TMDB IDs (format: "tmdb_123")
    // Store as string in database to support both database IDs and TMDB IDs
    const movieIdToStore = movieId.toString(); // Convert to string to handle both formats

    // Check if already favorited
    const isFavorited = await Movie.isFavorited(userId, movieIdToStore);
    if (isFavorited) {
      return res.status(400).json({ error: 'Movie already in favorites' });
    }

    await Movie.addToFavorites(userId, movieIdToStore);
    
    // Invalidate favorites cache for this user
    if (cache.isEnabled()) {
      await cache.del(`favorites:${userId}`);
    }
    
    res.json({ message: 'Movie added to favorites' });
  } catch (error) {
    logger.logError(error, req);
    logger.error('Add to favorites error details:', { 
      userId: req.user?.userId, 
      movieId, 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ 
      error: 'Failed to add to favorites',
      message: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// Remove movie from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { movieId } = req.params;

    // Decode URL-encoded movieId (handles tmdb_123 format)
    movieId = decodeURIComponent(movieId);
    
    // Handle TMDB IDs - store as string to support both formats
    const movieIdToUse = movieId.toString();

    await Movie.removeFromFavorites(userId, movieIdToUse);
    
    // Invalidate favorites cache for this user
    if (cache.isEnabled()) {
      await cache.del(`favorites:${userId}`);
    }
    
    res.json({ message: 'Movie removed from favorites' });
  } catch (error) {
    logger.logError(error, req);
    logger.error('Remove from favorites error details:', { 
      userId: req.user?.userId, 
      movieId: movieIdToUse, 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ 
      error: 'Failed to remove from favorites',
      message: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// Search movies - searches database first, then TMDB API if no results found - with caching
exports.searchMovies = async (req, res) => {
  try {
    const { q, genre, yearFrom, yearTo, tags } = req.query;
    
    const filters = {};
    if (genre) filters.genre = genre;
    if (yearFrom) filters.yearFrom = parseInt(yearFrom);
    if (yearTo) filters.yearTo = parseInt(yearTo);
    if (tags) {
      // Tags can be comma-separated or array
      filters.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }

    // Check if the query is a genre name
    let isGenreSearch = false;
    let searchGenre = null;
    if (q && q.trim()) {
      // Get all available genres from database
      const availableGenres = await Movie.getAllGenres();
      const normalizedQuery = q.trim().toLowerCase();
      
      // Check if query matches any genre (case-insensitive)
      const matchedGenre = availableGenres.find(g => g.toLowerCase() === normalizedQuery);
      if (matchedGenre) {
        isGenreSearch = true;
        searchGenre = matchedGenre;
        // Also check TMDB genre mapping
        const tmdbGenreId = TMDBService.mapGenreNameToId(normalizedQuery);
        if (tmdbGenreId) {
          isGenreSearch = true;
          searchGenre = normalizedQuery;
        }
      } else {
        // Check against common genre names (including variations)
        const genreVariations = {
          'action': 'Action',
          'adventure': 'Adventure',
          'animation': 'Animation',
          'comedy': 'Comedy',
          'crime': 'Crime',
          'documentary': 'Documentary',
          'drama': 'Drama',
          'family': 'Family',
          'fantasy': 'Fantasy',
          'history': 'History',
          'horror': 'Horror',
          'musical': 'Musical',
          'mystery': 'Mystery',
          'romance': 'Romance',
          'sci-fi': 'Sci-Fi',
          'science fiction': 'Sci-Fi',
          'scifi': 'Sci-Fi',
          'thriller': 'Thriller',
          'war': 'War',
          'western': 'Western'
        };
        
        if (genreVariations[normalizedQuery]) {
          isGenreSearch = true;
          searchGenre = genreVariations[normalizedQuery];
        }
      }
    }

    // If genre filter is provided, use it
    if (genre && !isGenreSearch) {
      searchGenre = genre;
      isGenreSearch = true;
    }

    // Create cache key from search parameters
    const searchParams = JSON.stringify({ q, filters, isGenreSearch, searchGenre });
    const cacheKey = `search:${Buffer.from(searchParams).toString('base64').substring(0, 30)}`;

    // Try to get from cache first (cache for 15 minutes)
    if (cache.isEnabled() && q) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info('Search results served from cache', { query: q, isGenreSearch });
        return res.json(cached);
      }
    }

    let movies = [];

    // If searching by genre, search database by genre
    if (isGenreSearch && searchGenre) {
      filters.genre = searchGenre;
      // Search database by genre (no title query)
      movies = await Movie.search(null, filters);
      logger.info(`Found ${movies.length} movies in database for genre: ${searchGenre}`);
    } else if (q && q.trim()) {
      // Regular search by title/description
      movies = await Movie.search(q, filters);
    }

    // If no results found and we have a query, search TMDB API
    if (movies.length === 0 && q && q.trim()) {
      try {
        if (isGenreSearch && searchGenre) {
          // Use TMDB discover API for genre search
          logger.info('No results in database, searching TMDB by genre', { genre: searchGenre });
          const tmdbResults = await TMDBService.discoverMoviesByGenre(
            searchGenre, 
            20, 
            yearFrom ? parseInt(yearFrom) : null, 
            yearTo ? parseInt(yearTo) : null
          );
          
          if (tmdbResults.length > 0) {
            movies = tmdbResults;
            logger.info(`Found ${movies.length} movies from TMDB by genre: ${searchGenre}`);
          }
        } else {
          // Regular TMDB search by title
        logger.info('No results in database, searching TMDB API', { query: q });
        const tmdbResults = await TMDBService.searchMovies(q.trim(), 20);
        
        if (tmdbResults.length > 0) {
          // Apply filters to TMDB results if specified
          let filteredResults = tmdbResults;
          
          if (genre) {
            filteredResults = filteredResults.filter(m => 
                m.genre && m.genre.toLowerCase() === genre.toLowerCase()
            );
          }
          
          if (yearFrom) {
            filteredResults = filteredResults.filter(m => m.year >= yearFrom);
          }
          
          if (yearTo) {
            filteredResults = filteredResults.filter(m => m.year <= yearTo);
          }

          movies = filteredResults;
          logger.info(`Found ${movies.length} movies from TMDB API`, { query: q });
          }
        }
      } catch (tmdbError) {
        logger.warn('TMDB search error', { error: tmdbError.message, query: q, isGenreSearch });
        // Try alternative: if genre search failed, try regular search
        if (isGenreSearch && searchGenre && movies.length === 0) {
          try {
            logger.info('Genre search failed, trying regular TMDB search as fallback', { query: q });
            const fallbackResults = await TMDBService.searchMovies(q.trim(), 20);
            if (fallbackResults.length > 0) {
              movies = fallbackResults;
            }
          } catch (fallbackError) {
            logger.warn('Fallback search also failed', { error: fallbackError.message });
          }
        }
      }
    }

    // Final fallback: if still no results, return trending movies
    if (movies.length === 0 && q && q.trim()) {
      try {
        logger.info('No results found, returning trending movies as final fallback', { query: q });
        const trending = await TMDBService.getTrending('week', 10);
        if (trending.length > 0) {
          movies = trending;
        }
      } catch (trendingError) {
        logger.warn('Trending fallback failed', { error: trendingError.message });
      }
    }

    // Cache search results for 15 minutes (900 seconds)
    if (cache.isEnabled() && q && movies.length > 0) {
      await cache.set(cacheKey, movies, 900);
    }

    // Always return results, even if empty (never fail completely)
    res.json(movies || []);
  } catch (error) {
    logger.logError(error, req);
    // Even on error, try to return something useful
    try {
      // Last resort: return trending movies
      const trending = await TMDBService.getTrending('week', 10);
      return res.json(trending || []);
    } catch (fallbackError) {
      logger.error('Complete search failure, returning empty array', { 
        originalError: error.message, 
        fallbackError: fallbackError.message 
      });
      // Return empty array instead of error - better UX
      res.json([]);
    }
  }
};

// Get all available tags
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Movie.getAllTags();
    res.json(tags);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get tags' });
  }
};

// Get all available genres
exports.getAllGenres = async (req, res) => {
  try {
    const genres = await Movie.getAllGenres();
    res.json(genres);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get genres' });
  }
};

// Get random movie trivia
exports.getMovieTrivia = async (req, res) => {
  try {
    const trivia = await GeminiService.generateMovieTrivia();
    res.json({ trivia });
  } catch (error) {
    logger.warn('Get movie trivia error, using fallback', { error: error.message });
    // Return fallback trivia on error
    const fallbackTrivia = GeminiService.getFallbackTrivia();
    res.json({ trivia: fallbackTrivia });
  }
};

// Get spoiler-free summary for a movie
exports.getSpoilerFreeSummary = async (req, res) => {
  const { id } = req.params;
  
  try {
    let movie;
    
    // Check if it's a TMDB ID (starts with "tmdb_")
    if (id.startsWith('tmdb_')) {
      const tmdbId = parseInt(id.replace('tmdb_', ''));
      
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
            ? (typeof tmdbDetails.genres[0] === 'string' ? tmdbDetails.genres[0] : tmdbDetails.genres[0].name || 'Unknown')
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
          : null
      };
    } else {
      // Regular database movie
      movie = await Movie.findById(id);
      
      if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
      }
    }

    // Generate spoiler-free summary using Gemini AI
    // This will always return a string (either from AI or fallback)
    let summary;
    try {
      const movieTitle = movie.title || 'Unknown Movie';
      const movieDescription = movie.description || movie.overview || '';
      
      summary = await GeminiService.getSpoilerFreeSummary(movieTitle, movieDescription);
    } catch (summaryError) {
      logger.warn('Error in getSpoilerFreeSummary, using fallback', { 
        error: summaryError.message,
        movieId: id,
        movieTitle: movie.title 
      });
      // Even if GeminiService fails, use fallback
      summary = GeminiService.getFallbackSummary(
        movie.title || 'Unknown Movie',
        movie.description || movie.overview || ''
      );
    }

    // Ensure we have a summary
    if (!summary || summary.trim().length === 0) {
      summary = GeminiService.getFallbackSummary(
        movie.title || 'Unknown Movie',
        movie.description || movie.overview || ''
      );
    }

    res.json({ 
      summary,
      movieTitle: movie.title 
    });
  } catch (error) {
    logger.logError(error, req);
    // Even on error, ALWAYS try to return a fallback summary
    try {
      let movie;
      if (id.startsWith('tmdb_')) {
        const tmdbId = parseInt(id.replace('tmdb_', ''));
        const tmdbDetails = await TMDBService.getMovieDetails(tmdbId);
        if (tmdbDetails) {
          // Handle genre - it can be a string or array
          let genre = 'Unknown';
          if (tmdbDetails.genres) {
            if (Array.isArray(tmdbDetails.genres)) {
              genre = tmdbDetails.genres.length > 0 
                ? (typeof tmdbDetails.genres[0] === 'string' ? tmdbDetails.genres[0] : tmdbDetails.genres[0].name || 'Unknown')
                : 'Unknown';
            } else if (typeof tmdbDetails.genres === 'string') {
              genre = tmdbDetails.genres;
            }
          }
          
          movie = {
            title: tmdbDetails.title || 'Unknown Movie',
            description: tmdbDetails.overview || '',
            genre: genre
          };
        }
      } else {
        movie = await Movie.findById(id);
      }
      
      if (movie) {
        const fallbackSummary = GeminiService.getFallbackSummary(
          movie.title || 'Unknown Movie',
          movie.description || movie.overview || ''
        );
        return res.json({ 
          summary: fallbackSummary,
          movieTitle: movie.title 
        });
      }
    } catch (fallbackError) {
      logger.error('Fallback summary error', { error: fallbackError.message, movieId: id });
    }
    
    // Ultimate fallback - always return something
    const ultimateFallback = `${id.startsWith('tmdb_') ? 'This movie' : 'The movie'} is a compelling film that explores themes through its unique narrative and characters. The story unfolds with engaging storytelling that keeps viewers invested.`;
    return res.json({ 
      summary: ultimateFallback,
      movieTitle: 'Movie'
    });
  }
};

// AI-powered search - with comprehensive fallback to ensure results are always returned
exports.searchMoviesAI = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let movies = [];
    let genreSuggestions = [];
    let aiTags = [];

    try {
    // Get user preferences if authenticated
    let userPreferences = {};
    if (req.user) {
        try {
      const User = require('../models/User');
      const profile = await User.getProfile(req.user.userId);
      if (profile) {
        userPreferences = {
          favorite_genres: profile.favorite_genres || [],
          liked_movies: profile.liked_movies || [],
          disliked_movies: profile.disliked_movies || []
        };
          }
        } catch (profileError) {
          logger.warn('Failed to get user profile for AI search', { error: profileError.message });
          // Continue without user preferences
      }
    }

      // Try AI-powered search first
      try {
    const recommendations = await GeminiService.getCustomRecommendations(q.trim(), userPreferences);
    
        // Enhance with TMDB posters (with error handling for each movie)
    for (const rec of recommendations) {
          try {
      const enhanced = await TMDBService.enhanceMovieWithPoster(rec);
            movies.push({
        ...rec,
        poster_url: enhanced.poster_url || rec.poster_url,
        backdrop_url: enhanced.backdrop_url,
        tmdb_id: enhanced.tmdb_id
      });
          } catch (enhanceError) {
            // If enhancement fails, still add the movie without TMDB data
            logger.warn('Failed to enhance movie with TMDB', { title: rec.title, error: enhanceError.message });
            movies.push(rec);
          }
    }

        // Get genre suggestions and AI tags (with fallback)
        try {
          [genreSuggestions, aiTags] = await Promise.all([
      GeminiService.generateGenreSuggestions(q.trim()),
      GeminiService.generateAITags(q.trim())
    ]);
        } catch (suggestionError) {
          logger.warn('Failed to get AI suggestions', { error: suggestionError.message });
          // Continue with empty arrays
        }
      } catch (aiError) {
        logger.warn('AI search failed, falling back to regular search', { error: aiError.message, query: q });
        // Fallback to regular search if AI fails
        try {
          const regularResults = await TMDBService.searchMovies(q.trim(), 20);
          movies = regularResults;
        } catch (searchError) {
          logger.warn('Regular search also failed', { error: searchError.message });
        }
      }

      // If still no results, try genre-based search as last resort
      if (movies.length === 0) {
        try {
          // Check if query might be a genre
          const genreId = TMDBService.mapGenreNameToId(q.trim());
          if (genreId) {
            logger.info('No AI results, trying genre-based search', { query: q });
            const genreResults = await TMDBService.discoverMoviesByGenre(q.trim(), 20);
            movies = genreResults;
          }
        } catch (genreError) {
          logger.warn('Genre search fallback failed', { error: genreError.message });
        }
      }

      // Final fallback: return trending movies if everything fails
      if (movies.length === 0) {
        logger.info('All search methods failed, returning trending movies as fallback', { query: q });
        try {
          const trending = await TMDBService.getTrending('week', 10);
          movies = trending;
        } catch (trendingError) {
          logger.error('Even trending fallback failed', { error: trendingError.message });
        }
      }

      // Always return a response, even if empty
      res.json({
        movies: movies || [],
        genreSuggestions: genreSuggestions || [],
        aiTags: aiTags || [],
        query: q.trim()
      });
    } catch (innerError) {
      logger.error('Unexpected error in AI search', { error: innerError.message, query: q });
      // Last resort: return empty arrays but don't fail
    res.json({
        movies: [],
        genreSuggestions: [],
        aiTags: [],
      query: q.trim()
    });
    }
  } catch (error) {
    logger.logError(error, req);
    // Always return a valid response, never fail completely
    res.json({
      movies: [],
      genreSuggestions: [],
      aiTags: [],
      query: req.query?.q || ''
    });
  }
};

// Autocomplete suggestions - with fallback to ensure results
exports.getAutocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ movies: [], genres: [], aiSuggestions: [] });
    }

    try {
    const suggestions = await GeminiService.getAutocompletesuggestions(q.trim());
      // Always return valid structure
      res.json({
        movies: suggestions?.movies || [],
        genres: suggestions?.genres || [],
        aiSuggestions: suggestions?.aiSuggestions || []
      });
    } catch (aiError) {
      logger.warn('AI autocomplete failed, using fallback', { error: aiError.message });
      // Fallback: try TMDB search for quick suggestions
      try {
        const tmdbResults = await TMDBService.searchMovies(q.trim(), 5);
        const movies = tmdbResults.map(m => ({
          title: m.title,
          year: m.year,
          poster: m.poster_url
        }));
        res.json({
          movies: movies || [],
          genres: [],
          aiSuggestions: []
        });
      } catch (fallbackError) {
        logger.warn('Autocomplete fallback also failed', { error: fallbackError.message });
        // Return empty but valid structure
        res.json({ movies: [], genres: [], aiSuggestions: [] });
      }
    }
  } catch (error) {
    logger.logError(error, req);
    // Always return valid structure, never fail
    res.json({ movies: [], genres: [], aiSuggestions: [] });
  }
};

// Search people (actors, directors)
exports.searchPeople = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.json({ people: [] });
    }

    // Search TMDB for people
    const people = await TMDBService.searchPeople(q.trim());
    res.json({ people });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to search people' });
  }
};

// Get trending movies
exports.getTrending = async (req, res) => {
  try {
    const { timeWindow = 'week' } = req.query; // 'day' or 'week'
    
    const trending = await TMDBService.getTrending(timeWindow);
    res.json({ trending });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get trending movies' });
  }
};

