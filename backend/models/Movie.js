// Movie model - Handles database operations for movies
const db = require('../config/database').promisePool;

class Movie {
  // Create a new movie
  static async create(movieData) {
    const { title, genre, year, description, poster_url, tagline, mini_scene, tags } = movieData;
    // Convert tags array to JSON string if it exists
    const tagsJson = tags ? JSON.stringify(tags) : null;
    const [result] = await db.execute(
      `INSERT INTO movies (title, genre, year, description, poster_url, tagline, mini_scene, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, genre, year, description, poster_url, tagline, mini_scene, tagsJson]
    );
    return result.insertId;
  }

  // Find movie by ID
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM movies WHERE id = ?',
      [id]
    );
    if (rows[0] && rows[0].tags) {
      // Parse JSON tags if they exist
      try {
        rows[0].tags = typeof rows[0].tags === 'string' ? JSON.parse(rows[0].tags) : rows[0].tags;
      } catch (e) {
        rows[0].tags = [];
      }
    }
    return rows[0];
  }

  // Find movie by title
  static async findByTitle(title) {
    const [rows] = await db.execute(
      'SELECT * FROM movies WHERE title = ?',
      [title]
    );
    if (rows[0] && rows[0].tags) {
      // Parse JSON tags if they exist
      try {
        rows[0].tags = typeof rows[0].tags === 'string' ? JSON.parse(rows[0].tags) : rows[0].tags;
      } catch (e) {
        rows[0].tags = [];
      }
    }
    return rows[0];
  }

  // Find multiple movies by titles (batch query to avoid N+1 problem)
  static async findByTitles(titles) {
    if (!titles || titles.length === 0) return [];
    
    // Create placeholders for IN clause
    const placeholders = titles.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT * FROM movies WHERE title IN (${placeholders})`,
      titles
    );
    
    // Parse JSON tags for all movies
    return rows.map(movie => {
      if (movie.tags) {
        try {
          movie.tags = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
        } catch (e) {
          movie.tags = [];
        }
      }
      return movie;
    });
  }

  // Batch update posters for multiple movies
  static async batchUpdatePosters(movieUpdates) {
    if (!movieUpdates || movieUpdates.length === 0) return;
    
    // Use Promise.all for parallel updates
    await Promise.all(
      movieUpdates.map(({ movieId, posterUrl }) =>
        db.execute('UPDATE movies SET poster_url = ? WHERE id = ?', [posterUrl, movieId])
      )
    );
  }

  // Get all movies
  static async findAll() {
    const [rows] = await db.execute('SELECT * FROM movies ORDER BY year DESC');
    // Parse JSON tags for all movies
    return rows.map(movie => {
      if (movie.tags) {
        try {
          movie.tags = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
        } catch (e) {
          movie.tags = [];
        }
      }
      return movie;
    });
  }

  // Get user's favorite movies - supports both database IDs and TMDB IDs
  static async getFavorites(userId) {
    // Get all favorites - movie_id can be integer (database ID) or string (TMDB ID like "tmdb_123")
    const [favoriteRows] = await db.execute(
      'SELECT movie_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    const favorites = [];
    const TMDBService = require('../services/tmdbService');
    
    for (const fav of favoriteRows) {
      const movieId = fav.movie_id;
      const movieIdStr = movieId ? movieId.toString() : '';
      
      if (movieIdStr.startsWith('tmdb_')) {
        // TMDB movie - fetch from TMDB API
        try {
          const tmdbId = parseInt(movieIdStr.replace('tmdb_', ''));
          const tmdbDetails = await TMDBService.getMovieDetails(tmdbId);
          
          if (tmdbDetails) {
            const genre = tmdbDetails.genres && tmdbDetails.genres.length > 0 
              ? (typeof tmdbDetails.genres[0] === 'string' ? tmdbDetails.genres[0] : tmdbDetails.genres[0].name)
              : 'Unknown';
            
            favorites.push({
              id: movieIdStr, // Keep tmdb_ format
              movie_id: movieIdStr,
              tmdb_id: tmdbId,
              title: tmdbDetails.title || 'Unknown',
              description: tmdbDetails.overview || '',
              genre: genre,
              year: tmdbDetails.release_date ? new Date(tmdbDetails.release_date).getFullYear() : null,
              poster_url: tmdbDetails.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}` : null,
              backdrop_url: tmdbDetails.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbDetails.backdrop_path}` : null,
              vote_average: tmdbDetails.vote_average,
              isFromTMDB: true
            });
          }
        } catch (tmdbError) {
          const logger = require('../utils/logger');
          logger.warn('Failed to fetch TMDB movie for favorite', { movieId: movieIdStr, error: tmdbError.message });
        }
      } else {
        // Database movie - fetch from database (try as integer first)
        try {
          const movieIdInt = parseInt(movieIdStr);
          const [movieRows] = await db.execute(
            'SELECT * FROM movies WHERE id = ?',
            [movieIdInt]
          );
          
          if (movieRows.length > 0) {
            const movie = movieRows[0];
            if (movie.tags) {
              try {
                movie.tags = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
              } catch (e) {
                movie.tags = [];
              }
            }
            favorites.push(movie);
          }
        } catch (dbError) {
          const logger = require('../utils/logger');
          logger.warn('Failed to fetch database movie for favorite', { movieId: movieIdStr, error: dbError.message });
        }
      }
    }
    
    return favorites;
  }

  // Add movie to favorites
  static async addToFavorites(userId, movieId) {
    const [result] = await db.execute(
      'INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)',
      [userId, movieId]
    );
    return result.insertId;
  }

  // Remove movie from favorites
  static async removeFromFavorites(userId, movieId) {
    await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );
  }

  // Check if movie is favorited
  static async isFavorited(userId, movieId) {
    const [rows] = await db.execute(
      'SELECT * FROM favorites WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );
    return rows.length > 0;
  }

  // Add user movie preference (liked/disliked) - supports both integer and string IDs
  static async addPreference(userId, movieId, preference) {
    // Convert to string to handle both integer and string formats
    const movieIdStr = movieId.toString();
    
    // Check if preference already exists
    const [existing] = await db.execute(
      'SELECT * FROM user_movie_preferences WHERE user_id = ? AND movie_id = ?',
      [userId, movieIdStr]
    );

    if (existing.length > 0) {
      // Update existing preference
      await db.execute(
        'UPDATE user_movie_preferences SET preference = ? WHERE user_id = ? AND movie_id = ?',
        [preference, userId, movieIdStr]
      );
    } else {
      // Insert new preference
      await db.execute(
        'INSERT INTO user_movie_preferences (user_id, movie_id, preference) VALUES (?, ?, ?)',
        [userId, movieIdStr, preference]
      );
    }
  }

  // Remove user movie preference
  static async removePreference(userId, movieId) {
    await db.execute(
      'DELETE FROM user_movie_preferences WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );
  }

  // Update movie poster URL
  static async updatePoster(movieId, posterUrl) {
    await db.execute(
      'UPDATE movies SET poster_url = ? WHERE id = ?',
      [posterUrl, movieId]
    );
  }

  // Search movies by title, genre, or tags - optimized with LIMIT
  static async search(query, filters = {}) {
    let sql = 'SELECT * FROM movies WHERE 1=1';
    const params = [];
    const limit = filters.limit || 50; // Default limit to prevent large result sets

    // Search by title - use full-text search if available, otherwise LIKE
    if (query && query.trim()) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${query.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter by genre (case-insensitive)
    if (filters.genre) {
      sql += ' AND LOWER(genre) = LOWER(?)';
      params.push(filters.genre);
    }

    // Filter by year range
    if (filters.yearFrom) {
      sql += ' AND year >= ?';
      params.push(filters.yearFrom);
    }
    if (filters.yearTo) {
      sql += ' AND year <= ?';
      params.push(filters.yearTo);
    }

    // Filter by tags (JSON search)
    if (filters.tags && filters.tags.length > 0) {
      // For each tag, check if it exists in the JSON array
      const tagConditions = filters.tags.map(() => {
        return 'JSON_SEARCH(tags, "one", ?) IS NOT NULL';
      });
      sql += ` AND (${tagConditions.join(' OR ')})`;
      params.push(...filters.tags);
    }

    sql += ' ORDER BY year DESC, title ASC LIMIT ?';
    params.push(limit);

    const [rows] = await db.execute(sql, params);
    
    // Parse JSON tags for all movies
    return rows.map(movie => {
      if (movie.tags) {
        try {
          movie.tags = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
        } catch (e) {
          movie.tags = [];
        }
      }
      return movie;
    });
  }

  // Get all unique tags from movies
  static async getAllTags() {
    const [rows] = await db.execute('SELECT tags FROM movies WHERE tags IS NOT NULL');
    const allTags = new Set();
    
    rows.forEach(movie => {
      if (movie.tags) {
        try {
          const tags = typeof movie.tags === 'string' ? JSON.parse(movie.tags) : movie.tags;
          if (Array.isArray(tags)) {
            tags.forEach(tag => allTags.add(tag));
          }
        } catch (e) {
          // Skip invalid tags
        }
      }
    });
    
    return Array.from(allTags).sort();
  }

  // Get all unique genres
  static async getAllGenres() {
    const [rows] = await db.execute('SELECT DISTINCT genre FROM movies WHERE genre IS NOT NULL ORDER BY genre');
    return rows.map(row => row.genre);
  }
}

module.exports = Movie;

