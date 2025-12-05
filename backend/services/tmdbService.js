// TMDB Service - Fetches movie posters and additional information from The Movie Database API
const axios = require('axios');
const logger = require('../utils/logger');
const cache = require('../utils/cacheService');
require('dotenv').config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

class TMDBService {
  // Search for a movie by title and get poster URL
  static async getMoviePoster(title, year = null) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, returning null poster');
      return { poster_url: null, backdrop_url: null };
    }

    const normalizedTitle = (title || '').toLowerCase().trim();
    const cacheKey = `tmdb:poster:${normalizedTitle}:${year || 'any'}`;
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const searchUrl = `${TMDB_BASE_URL}/search/movie`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        query: title,
        language: 'en-US'
      };

      if (year) {
        params.year = year;
      }

      const response = await axios.get(searchUrl, { params });
      
      if (response.data.results && response.data.results.length > 0) {
        const movie = response.data.results[0];
        return {
          poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
          backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
          tmdb_id: movie.id,
          overview: movie.overview,
          release_date: movie.release_date
        };
      }
      
      const fallback = { poster_url: null, backdrop_url: null };
      if (cache.isEnabled()) {
        await cache.set(cacheKey, fallback, 60 * 60);
      }
      return fallback;
    } catch (error) {
      logger.error('TMDB getMoviePoster error', { error: error.message, title, year });
      return { poster_url: null, backdrop_url: null };
    }
  }

  // Get movie details by TMDB ID
  static async getMovieDetails(tmdbId) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot fetch movie details');
      return null;
    }

    const cacheKey = `tmdb:details:${tmdbId}`;
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    try {
      const url = `${TMDB_BASE_URL}/movie/${tmdbId}`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        language: 'en-US'
      };

      const response = await axios.get(url, { params });
      const movie = response.data;

      const result = {
        title: movie.title,
        poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
        backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
        overview: movie.overview,
        release_date: movie.release_date,
        runtime: movie.runtime,
        vote_average: movie.vote_average,
        genres: movie.genres?.map(g => g.name) || []
      };
      if (cache.isEnabled()) {
        await cache.set(cacheKey, result, 60 * 60 * 24);
      }
      return result;
    } catch (error) {
      logger.error('TMDB getMovieDetails error', { error: error.message, tmdbId });
      return null;
    }
  }

  // Enhance movie recommendation with TMDB poster
  static async enhanceMovieWithPoster(movieData) {
    const tmdbInfo = await this.getMoviePoster(movieData.title, movieData.year);
    
    return {
      ...movieData,
      poster_url: tmdbInfo.poster_url || movieData.poster_url,
      backdrop_url: tmdbInfo.backdrop_url,
      tmdb_id: tmdbInfo.tmdb_id,
      // Use TMDB overview if available and description is missing
      description: movieData.description || tmdbInfo.overview || movieData.description
    };
  }

  // Get full movie details from TMDB by title (searches and gets full details)
  static async getFullMovieDetailsByTitle(title, year = null) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot fetch full movie details');
      return null;
    }

    const normalizedTitle = (title || '').toLowerCase().trim();
    const cacheKey = `tmdb:full:${normalizedTitle}:${year || 'any'}`;
    
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // First, search for the movie
      const searchUrl = `${TMDB_BASE_URL}/search/movie`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        query: title,
        language: 'en-US'
      };

      if (year) {
        params.year = year;
      }

      const searchResponse = await axios.get(searchUrl, { params });
      
      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        logger.warn('Movie not found in TMDB search', { title, year });
        return null;
      }

      // Get the first result (best match)
      const searchResult = searchResponse.data.results[0];
      const tmdbId = searchResult.id;

      // Now get full details using the TMDB ID
      const fullDetails = await this.getMovieDetails(tmdbId);
      
      if (!fullDetails) {
        return null;
      }

      // Extract year from release_date
      const releaseYear = fullDetails.release_date 
        ? new Date(fullDetails.release_date).getFullYear() 
        : null;

      // Get primary genre
      const genre = fullDetails.genres && fullDetails.genres.length > 0 
        ? fullDetails.genres[0] 
        : 'Unknown';

      const result = {
        title: fullDetails.title || title,
        genre: genre,
        year: releaseYear,
        description: fullDetails.overview || '',
        poster_url: fullDetails.poster_url,
        backdrop_url: fullDetails.backdrop_url,
        tmdb_id: tmdbId,
        release_date: fullDetails.release_date,
        vote_average: fullDetails.vote_average,
        runtime: fullDetails.runtime
      };

      // Cache for 24 hours
      if (cache.isEnabled()) {
        await cache.set(cacheKey, result, 60 * 60 * 24);
      }

      return result;
    } catch (error) {
      logger.error('TMDB getFullMovieDetailsByTitle error', { 
        error: error.message, 
        title, 
        year 
      });
      return null;
    }
  }

  // Search movies from TMDB API - returns multiple results
  static async searchMovies(query, limit = 20) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot search movies');
      return [];
    }

    const cacheKey = query
      ? `tmdb:search:${query.toLowerCase().trim()}:${limit}`
      : null;

    if (cache.isEnabled() && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const searchUrl = `${TMDB_BASE_URL}/search/movie`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        query: query,
        language: 'en-US',
        page: 1
      };

      const response = await axios.get(searchUrl, { params });
      
      if (response.data.results && response.data.results.length > 0) {
        const results = response.data.results.slice(0, limit).map(movie => {
          // Extract year from release_date
          const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
          
          // Get primary genre (TMDB returns genre IDs, we'll use the first genre name if available)
          const genre = movie.genre_ids && movie.genre_ids.length > 0 
            ? this.mapGenreIdToName(movie.genre_ids[0]) 
            : 'Unknown';

          return {
            title: movie.title,
            genre: genre,
            year: year,
            description: movie.overview || '',
            poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
            tagline: null,
            mini_scene: null,
            tags: [],
            tmdb_id: movie.id,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            isFromTMDB: true // Flag to indicate this is from TMDB, not database
          };
        });

        if (cache.isEnabled() && cacheKey) {
          await cache.set(cacheKey, results, 60 * 30); // 30 minutes
        }
        return results;
      }
      
      return [];
    } catch (error) {
      logger.error('TMDB searchMovies error', { error: error.message, query, limit });
      return [];
    }
  }

  // Search for a person (actor/director) by name
  static async searchPerson(query) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot search person');
      return null;
    }

    const normalized = (query || '').toLowerCase().trim();
    const cacheKey = normalized ? `tmdb:person:${normalized}` : null;
    if (cache.isEnabled() && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const searchUrl = `${TMDB_BASE_URL}/search/person`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        query: query,
        language: 'en-US',
        page: 1
      };

      const response = await axios.get(searchUrl, { params });
      
      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0]; // Return first match
        if (cache.isEnabled() && cacheKey) {
          await cache.set(cacheKey, result, 60 * 60 * 6); // 6 hours
        }
        return result;
      }
      
      return null;
    } catch (error) {
      logger.error('TMDB searchPerson error', { error: error.message, query });
      return null;
    }
  }

  // Get movies by actor or director
  static async getMoviesByPerson(personId, personType = 'cast', limit = 10) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot get movies by person');
      return [];
    }

    const cacheKey = `tmdb:personMovies:${personId}:${personType}:${limit}`;
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const url = `${TMDB_BASE_URL}/person/${personId}/movie_credits`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        language: 'en-US'
      };

      const response = await axios.get(url, { params });
      
      if (!response.data) {
        return [];
      }

      // personType: 'cast' for actor, 'crew' for director/crew
      const credits = personType === 'cast' 
        ? (response.data.cast || [])
        : (response.data.crew || []).filter(credit => credit.job === 'Director');

      // Sort by popularity or release date, get most popular/recent
      const sortedCredits = credits
        .filter(movie => movie.release_date && movie.media_type !== 'tv') // Only movies, not TV shows
        .sort((a, b) => {
          // Sort by popularity or vote average
          if (b.popularity && a.popularity) return b.popularity - a.popularity;
          if (b.vote_average && a.vote_average) return b.vote_average - a.vote_average;
          // Or by release date (newest first)
          if (b.release_date && a.release_date) {
            return new Date(b.release_date) - new Date(a.release_date);
          }
          return 0;
        })
        .slice(0, limit);

      const movies = sortedCredits.map(movie => {
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
        const genre = movie.genre_ids && movie.genre_ids.length > 0 
          ? this.mapGenreIdToName(movie.genre_ids[0]) 
          : 'Unknown';

        return {
          title: movie.title,
          genre: genre,
          year: year,
          description: movie.overview || '',
          poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
          tagline: null,
          mini_scene: null,
          tags: [],
          tmdb_id: movie.id,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          isFromTMDB: true
        };
      });

      if (cache.isEnabled()) {
        await cache.set(cacheKey, movies, 60 * 60 * 6);
      }
      return movies;
    } catch (error) {
      logger.error('TMDB getMoviesByPerson error', {
        error: error.message,
        personId,
        personType,
        limit
      });
      return [];
    }
  }

  // Discover movies by actor or director using movie_credits (more reliable)
  static async discoverMoviesByPerson(personName, isDirector = false, limit = 10) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot discover movies by person');
      return [];
    }

    const normalizedName = (personName || '').toLowerCase().trim();
    const cacheKey = normalizedName
      ? `tmdb:discover:${normalizedName}:${isDirector ? 'director' : 'cast'}:${limit}`
      : null;

    if (cache.isEnabled() && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // First search for the person
      const person = await this.searchPerson(personName);
      if (!person || !person.id) {
        logger.warn('TMDB person not found', { personName });
        return [];
      }

      logger.info('TMDB person found', { name: person.name, id: person.id });

      // Get movies by person using movie_credits endpoint
      const movies = await this.getMoviesByPerson(person.id, isDirector ? 'crew' : 'cast', limit);
      
      if (movies && movies.length > 0) {
        if (cache.isEnabled() && cacheKey) {
          await cache.set(cacheKey, movies, 60 * 60 * 6);
        }
        return movies;
      }

      // Fallback: Try discover API if movie_credits doesn't work well
      try {
        const discoverUrl = `${TMDB_BASE_URL}/discover/movie`;
        const params = {
          api_key: process.env.TMDB_API_KEY,
          sort_by: 'popularity.desc',
          language: 'en-US',
          page: 1
        };

        if (isDirector) {
          // For directors, use with_crew parameter
          params.with_crew = person.id.toString();
        } else {
          // For actors, use with_cast parameter
          params.with_cast = person.id.toString();
        }

        const response = await axios.get(discoverUrl, { params });
        
        if (response.data.results && response.data.results.length > 0) {
          const fallback = response.data.results.slice(0, limit).map(movie => {
            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
            const genre = movie.genre_ids && movie.genre_ids.length > 0 
              ? this.mapGenreIdToName(movie.genre_ids[0]) 
              : 'Unknown';

            return {
              title: movie.title,
              genre: genre,
              year: year,
              description: movie.overview || '',
              poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
              tagline: null,
              mini_scene: null,
              tags: [],
              tmdb_id: movie.id,
              release_date: movie.release_date,
              vote_average: movie.vote_average,
              isFromTMDB: true
            };
          });
          if (cache.isEnabled() && cacheKey) {
            await cache.set(cacheKey, fallback, 60 * 60 * 6);
          }
          return fallback;
        }
      } catch (discoverError) {
        logger.error('TMDB Discover API error', { error: discoverError.message });
      }

      return [];
    } catch (error) {
      logger.error('TMDB discoverMoviesByPerson error', {
        error: error.message,
        personName,
        isDirector,
        limit
      });
      return [];
    }
  }

  // Search for people (actors, directors) - returns multiple results
  static async searchPeople(query, limit = 10) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot search people');
      return [];
    }

    const normalized = (query || '').toLowerCase().trim();
    const cacheKey = normalized ? `tmdb:people:${normalized}:${limit}` : null;
    if (cache.isEnabled() && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const searchUrl = `${TMDB_BASE_URL}/search/person`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        query: query,
        language: 'en-US',
        page: 1
      };

      const response = await axios.get(searchUrl, { params });
      
      if (response.data.results && response.data.results.length > 0) {
        const results = response.data.results.slice(0, limit).map(person => ({
          id: person.id,
          name: person.name,
          profile_path: person.profile_path ? `${TMDB_IMAGE_BASE_URL}${person.profile_path}` : null,
          known_for_department: person.known_for_department,
          known_for: person.known_for?.slice(0, 3).map(movie => ({
            title: movie.title || movie.name,
            poster_path: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null
          })) || []
        }));

        if (cache.isEnabled() && cacheKey) {
          await cache.set(cacheKey, results, 60 * 60);
        }
        return results;
      }
      
      return [];
    } catch (error) {
      logger.error('TMDB searchPeople error', { error: error.message, query, limit });
      return [];
    }
  }

  // Get trending movies
  static async getTrending(timeWindow = 'week', limit = 20) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot get trending movies');
      return [];
    }

    const cacheKey = `tmdb:trending:${timeWindow}:${limit}`;
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const url = `${TMDB_BASE_URL}/trending/movie/${timeWindow}`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        language: 'en-US'
      };

      const response = await axios.get(url, { params });
      
      if (response.data.results && response.data.results.length > 0) {
        const results = response.data.results.slice(0, limit).map(movie => {
          const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
          const genre = movie.genre_ids && movie.genre_ids.length > 0 
            ? this.mapGenreIdToName(movie.genre_ids[0]) 
            : 'Unknown';

          return {
            title: movie.title,
            genre: genre,
            year: year,
            description: movie.overview || '',
            poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
            tagline: null,
            mini_scene: null,
            tags: [],
            tmdb_id: movie.id,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            popularity: movie.popularity,
            isFromTMDB: true
          };
        });

        if (cache.isEnabled()) {
          await cache.set(cacheKey, results, 60 * 10); // 10 minutes
        }
        return results;
      }
      
      return [];
    } catch (error) {
      logger.error('TMDB Trending API Error', { error: error.message, timeWindow, limit });
      return [];
    }
  }

  // Map TMDB genre ID to genre name
  static mapGenreIdToName(genreId) {
    const genreMap = {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Musical',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Sci-Fi',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western'
    };
    return genreMap[genreId] || 'Unknown';
  }

  // Map genre name to TMDB genre ID
  static mapGenreNameToId(genreName) {
    const genreMap = {
      'action': 28,
      'adventure': 12,
      'animation': 16,
      'comedy': 35,
      'crime': 80,
      'documentary': 99,
      'drama': 18,
      'family': 10751,
      'fantasy': 14,
      'history': 36,
      'horror': 27,
      'musical': 10402,
      'mystery': 9648,
      'romance': 10749,
      'sci-fi': 878,
      'science fiction': 878,
      'scifi': 878,
      'tv movie': 10770,
      'thriller': 53,
      'war': 10752,
      'western': 37
    };
    return genreMap[genreName.toLowerCase().trim()] || null;
  }

  // Discover movies by genre using TMDB Discover API
  static async discoverMoviesByGenre(genreName, limit = 20, yearFrom = null, yearTo = null) {
    if (!process.env.TMDB_API_KEY) {
      logger.warn('TMDB_API_KEY not set, cannot discover movies by genre');
      return [];
    }

    const genreId = this.mapGenreNameToId(genreName);
    if (!genreId) {
      logger.warn('Invalid genre name for TMDB discover', { genreName });
      return [];
    }

    const cacheKey = `tmdb:discover:genre:${genreId}:${yearFrom || 'any'}:${yearTo || 'any'}:${limit}`;
    if (cache.isEnabled()) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const discoverUrl = `${TMDB_BASE_URL}/discover/movie`;
      const params = {
        api_key: process.env.TMDB_API_KEY,
        with_genres: genreId,
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: 1
      };

      if (yearFrom) {
        params['primary_release_date.gte'] = `${yearFrom}-01-01`;
      }
      if (yearTo) {
        params['primary_release_date.lte'] = `${yearTo}-12-31`;
      }

      const response = await axios.get(discoverUrl, { params });
      
      if (response.data.results && response.data.results.length > 0) {
        const results = response.data.results.slice(0, limit).map(movie => {
          const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
          const genre = movie.genre_ids && movie.genre_ids.length > 0 
            ? this.mapGenreIdToName(movie.genre_ids[0]) 
            : genreName; // Use the searched genre name as fallback

          return {
            title: movie.title,
            genre: genre,
            year: year,
            description: movie.overview || '',
            poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
            tagline: null,
            mini_scene: null,
            tags: [],
            tmdb_id: movie.id,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            popularity: movie.popularity,
            isFromTMDB: true
          };
        });

        if (cache.isEnabled()) {
          await cache.set(cacheKey, results, 60 * 30); // 30 minutes
        }
        return results;
      }
      
      return [];
    } catch (error) {
      logger.error('TMDB discoverMoviesByGenre error', { error: error.message, genreName, limit });
      return [];
    }
  }
}

module.exports = TMDBService;

