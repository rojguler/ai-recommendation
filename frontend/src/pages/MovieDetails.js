// Movie Details Page - Shows detailed information about a movie with AI features
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import MovieCard from '../components/MovieCard';
import { FaHeart, FaRegHeart, FaThumbsUp, FaThumbsDown, FaTheaterMasks, FaBook, FaHome, FaShieldAlt, FaTag, FaMagic } from 'react-icons/fa';
import { MdMovie, MdRecommend } from 'react-icons/md';
import palette, { gradients } from '../theme/colors';
import logger from '../utils/logger';
import './MovieDetails.css';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [toast, setToast] = useState(null);
  const [spoilerFreeSummary, setSpoilerFreeSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    fetchMovie();
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [id, isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/movies/favorites/list');
      // Handle both database IDs and TMDB IDs
      const favoriteIds = new Set(response.data.map(m => {
        // If movie has tmdb_id, use tmdb_ prefix format, otherwise use regular id
        return m.tmdb_id ? `tmdb_${m.tmdb_id}` : (m.id || m.movie_id);
      }));
      setFavorites(favoriteIds);
      
      // Check if current movie is favorited
      const currentMovieId = id;
      setIsFavorited(favoriteIds.has(currentMovieId));
    } catch (error) {
      logger.error('Failed to fetch favorites:', error);
    }
  };

  const fetchMovie = async () => {
    try {
      const response = await api.get(`/movies/${id}`);
      setMovie(response.data);
      setIsFavorited(response.data.isFavorited || false);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch movie details');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      // Handle both database IDs and TMDB IDs
      const movieIdToUse = id; // Keep the original ID format (tmdb_123 or regular ID)
      
      if (isFavorited) {
        await api.delete(`/movies/favorites/${encodeURIComponent(movieIdToUse)}`);
        setIsFavorited(false);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(movieIdToUse);
          return newSet;
        });
        setToast({ message: 'Removed from favorites', type: 'info' });
      } else {
        await api.post('/movies/favorites', { movieId: movieIdToUse });
        setIsFavorited(true);
        setFavorites(prev => new Set([...prev, movieIdToUse]));
        setToast({ message: 'Added to favorites!', type: 'success' });
      }
    } catch (error) {
      logger.error('Favorite toggle error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update favorite';
      setToast({ message: errorMsg, type: 'danger' });
    }
  };

  const handlePreference = async (preference) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      // Handle both database IDs and TMDB IDs
      const movieIdToUse = id; // Keep the original ID format
      
      await api.post('/users/preferences', { movieId: movieIdToUse, preference });
      if (preference === 'liked') {
        setLiked(true);
        setDisliked(false);
        setToast({ message: 'Movie marked as liked!', type: 'success' });
      } else {
        setDisliked(true);
        setLiked(false);
        setToast({ message: 'Movie marked as disliked', type: 'info' });
      }
    } catch (error) {
      logger.error('Preference error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to save preference';
      setToast({ message: errorMsg, type: 'danger' });
    }
  };

  const handleGetSpoilerFreeSummary = async () => {
    setLoadingSummary(true);
    setSpoilerFreeSummary(null);
    try {
      logger.info('Requesting spoiler-free summary for:', id);
      const response = await api.get(`/movies/${id}/spoilerfree`);
      
      logger.info('Spoiler-free summary response:', response.data);
      
      if (response.data && response.data.summary) {
      setSpoilerFreeSummary(response.data.summary);
      setToast({ message: 'Spoiler-free summary generated successfully!', type: 'success' });
      } else {
        throw new Error('No summary received from server');
      }
    } catch (error) {
      logger.error('Spoiler-free summary error:', error);
      
      // Log detailed error info
      if (error.response) {
        logger.error('Spoiler-free summary API error:', {
          status: error.response.status,
          data: error.response.data,
          movieId: id
        });
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate spoiler-free summary';
      setToast({ message: errorMessage, type: 'danger' });
      
      // Always try to use fallback - show movie description if available
      if (movie && (movie.description || movie.overview)) {
        const description = movie.description || movie.overview || '';
        const fallbackSummary = description.length > 300 
          ? description.substring(0, 300) + '...'
          : description;
        setSpoilerFreeSummary(fallbackSummary);
        setToast({ message: 'Showing movie description as fallback', type: 'info' });
      } else {
        // Ultimate fallback
        setSpoilerFreeSummary(`${movie?.title || 'This movie'} is a compelling film that explores themes through its unique narrative and characters.`);
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGetSimilarMovies = async () => {
    if (!movie || !isAuthenticated) {
      setToast({ message: 'Please login to use AI features', type: 'warning' });
      return;
    }

    setLoadingSimilar(true);
    setSimilarMovies([]);
    try {
      const response = await api.get(`/recommendations/similar/${id}`);
      const recommendations = response.data.recommendations || [];
      setSimilarMovies(recommendations);
      
      if (recommendations.length > 0) {
        setToast({ message: `Found ${recommendations.length} similar movies!`, type: 'success' });
      } else {
        setToast({ message: 'No similar movies found. Try again later.', type: 'warning' });
      }
    } catch (error) {
      logger.error('Similar movies error:', error);
      
      // Better error handling with more specific messages
      let errorMessage = 'Failed to get similar movies';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
        
        if (error.response.status === 401) {
          errorMessage = 'Please login to use this feature';
        } else if (error.response.status === 404) {
          errorMessage = 'Movie not found';
        } else if (error.response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
      } else {
        // Error setting up request
        errorMessage = error.message || errorMessage;
      }
      
      setToast({ message: errorMessage, type: 'danger' });
      
      // Log more details for debugging
      if (error.response) {
        logger.error('Similar movies API error:', {
          status: error.response.status,
          data: error.response.data,
          movieId: id
        });
      }
      
      // Even on error, try to show empty state gracefully
      setSimilarMovies([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleSimilarMovieFavoriteToggle = async (movieId, isFavorited) => {
    try {
      // Handle both database IDs and TMDB IDs
      const actualMovieId = movieId.startsWith('tmdb_') ? movieId : movieId;
      
      if (isFavorited) {
        await api.post('/movies/favorites', { movieId: actualMovieId });
        setFavorites(prev => new Set([...prev, actualMovieId]));
        setToast({ message: 'Movie added to favorites!', type: 'success' });
      } else {
        await api.delete(`/movies/favorites/${actualMovieId}`);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(actualMovieId);
          return newSet;
        });
        setToast({ message: 'Movie removed from favorites', type: 'info' });
      }
    } catch (error) {
      logger.error('Favorite toggle error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update favorite';
      setToast({ message: errorMsg, type: 'danger' });
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !movie) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="d-flex align-items-center">
          <span className="me-2">⚠️</span>
          {error || 'Movie not found'}
        </Alert>
        <Button onClick={() => navigate('/')} className="mt-3 d-flex align-items-center">
          <FaHome className="me-2" />
          Go Home
        </Button>
      </Container>
    );
  }

  return (
    <div className="movie-details-page">
      <Container className="page-transition">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <Row>
          <Col md={4} className="mb-4 mb-md-0">
            {movie.poster_url ? (
              <div className="movie-poster-container">
                <img 
                  src={movie.poster_url} 
                  alt={movie.title} 
                  className="movie-poster"
                />
              </div>
            ) : (
              <div 
                className="movie-poster-container"
                style={{ 
                  minHeight: '500px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: `linear-gradient(135deg, ${palette.deepBlue} 0%, ${palette.olives} 100%)`,
                  color: 'white'
                }}
              >
                <h3 className="fw-bold">{movie.title}</h3>
                <p className="mb-0 opacity-90">{movie.year}</p>
              </div>
            )}
          </Col>
          <Col md={8}>
            <div className="movie-info-section">
              {/* Title and Metadata Section */}
              <div className="mb-4">
                <h1 className="movie-title">
                  {movie.title}
                </h1>
                <div className="movie-meta">
                  <span className="movie-badge genre">
                    {movie.genre}
                  </span>
                  <span className="movie-badge year">
                    {movie.year}
                  </span>
                </div>
            
                {/* Tags Section - Apple style */}
                {movie.tags && movie.tags.length > 0 && (
                  <div className="movie-tags">
                    {movie.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="movie-tag"
                        onClick={() => navigate(`/search?tags=${encodeURIComponent(tag)}`)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
            
                {/* Tagline - Apple style */}
                {movie.tagline && (
                  <p 
                    className="movie-tagline"
                    style={{ 
                      fontSize: '1.2rem',
                      color: palette.textMedium,
                      background: `linear-gradient(135deg, ${palette.creamLight} 0%, ${palette.creamWarm} 100%)`,
                      borderLeft: `4px solid ${palette.orangeWine}`,
                      padding: '1.5rem',
                      borderRadius: '16px',
                      lineHeight: '1.6',
                      fontStyle: 'italic',
                      marginBottom: '2rem'
                    }}
                  >
                    "{movie.tagline}"
                  </p>
                )}
              </div>
              
              {/* Description Section - Apple style */}
              <div className="movie-detail-card mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 d-flex align-items-center fw-bold" style={{ fontSize: '1.3rem', color: palette.textDark }}>
                    <FaBook className="me-2" style={{ color: palette.deepBlue }} size={20} />
                    Description
                  </h5>
                  <button
                    onClick={handleGetSpoilerFreeSummary}
                    disabled={loadingSummary}
                    className="movie-action-btn"
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                  >
                    {loadingSummary ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FaShieldAlt className="me-2" />
                        Summarize Without Spoilers
                      </>
                    )}
                  </button>
                </div>
                <p className="movie-description">
                  {movie.description}
                </p>
              
                {/* Spoiler-Free Summary Card - Apple style */}
                {spoilerFreeSummary && (
                  <div 
                    className="movie-detail-card mt-4"
                    style={{ 
                      background: `linear-gradient(135deg, ${palette.creamLight} 0%, ${palette.softMint} 100%)`,
                      border: `1px solid ${palette.olives}40`
                    }}
                  >
                    <h6 className="mb-3 d-flex align-items-center fw-bold" style={{ color: palette.olives, fontSize: '1.1rem' }}>
                      <div 
                        className="rounded-circle p-2 me-3"
                        style={{
                          background: `${palette.olives}20`
                        }}
                      >
                        <FaShieldAlt size={20} style={{ color: palette.olives }} />
                      </div>
                      Spoiler-Free Summary
                    </h6>
                    <p style={{ lineHeight: '1.9', whiteSpace: 'pre-wrap', fontSize: '1.05rem', color: palette.textMedium, margin: 0 }}>
                      {spoilerFreeSummary}
                    </p>
                  </div>
                )}
              </div>
          
              {/* Mini Scene Card - Apple style */}
              {movie.mini_scene && (
                <div className="movie-detail-card mb-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${palette.creamLight} 0%, ${palette.softLavender} 100%)`,
                    border: `1px solid ${palette.deepBlue}40`
                  }}
                >
                  <h6 className="mb-3 d-flex align-items-center fw-bold" style={{ color: palette.deepBlue, fontSize: '1.1rem' }}>
                    <div 
                      className="rounded-circle p-2 me-3"
                      style={{
                        background: `${palette.deepBlue}20`
                      }}
                    >
                      <FaTheaterMasks size={20} style={{ color: palette.deepBlue }} />
                    </div>
                    Mini Scene
                  </h6>
                  <p className="mb-0" style={{ lineHeight: '1.8', fontSize: '1.05rem', color: palette.textMedium }}>
                    {movie.mini_scene}
                  </p>
                </div>
              )}
              
              {/* Action Buttons - Apple style */}
              {isAuthenticated && (
                <div className="movie-actions">
                  <button
                    onClick={handleFavoriteToggle}
                    className={`movie-action-btn ${isFavorited ? 'favorite' : ''}`}
                  >
                    {isFavorited ? (
                      <>
                        <FaHeart />
                        Favorited
                      </>
                    ) : (
                      <>
                        <FaRegHeart />
                        Add to Favorites
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handlePreference('liked')}
                    className={`movie-action-btn ${liked ? 'primary' : ''}`}
                  >
                    <FaThumbsUp />
                    Like
                  </button>
                  <button
                    onClick={() => handlePreference('disliked')}
                    className="movie-action-btn"
                  >
                    <FaThumbsDown />
                    Dislike
                  </button>
                </div>
              )}

              {/* AI Similar Movies Section - Apple style */}
              {isAuthenticated && (
                <div className="similar-movies-section">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center">
                      <div 
                        className="rounded-circle p-2 me-3"
                        style={{
                          background: `${palette.deepBlue}20`
                        }}
                      >
                        <FaMagic size={20} style={{ color: palette.deepBlue }} />
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold" style={{ fontSize: '1.3rem', color: palette.textDark }}>
                          Similar Movies
                        </h5>
                        <p className="text-muted mb-0 small">AI-powered recommendations</p>
                      </div>
                    </div>
                    <button
                      onClick={handleGetSimilarMovies}
                      disabled={loadingSimilar}
                      className="movie-action-btn primary"
                    >
                      {loadingSimilar ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Finding...
                        </>
                      ) : (
                        <>
                          <MdRecommend className="me-2" size={18} />
                          Find Similar
                        </>
                      )}
                    </button>
                  </div>

                  {similarMovies.length > 0 && (
                    <div className="similar-movies-grid">
                      {similarMovies.map((similarMovie, index) => {
                        // Handle both database IDs and TMDB IDs
                        const movieId = similarMovie.id || (similarMovie.tmdb_id ? `tmdb_${similarMovie.tmdb_id}` : `similar_${index}`);
                        const favoriteId = similarMovie.id || (similarMovie.tmdb_id ? `tmdb_${similarMovie.tmdb_id}` : null);
                        
                        return (
                          <MovieCard
                            key={movieId}
                            movie={similarMovie}
                            showFavoriteButton={isAuthenticated}
                            onFavoriteToggle={handleSimilarMovieFavoriteToggle}
                            isFavorited={favoriteId ? favorites.has(favoriteId) : false}
                          />
                        );
                      })}
                    </div>
                  )}

                  {similarMovies.length === 0 && !loadingSimilar && (
                    <p className="text-muted mb-0 small" style={{ fontSize: '0.9rem' }}>
                      Click "Find Similar" to discover movies similar to this one using AI
                    </p>
                  )}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default MovieDetails;

