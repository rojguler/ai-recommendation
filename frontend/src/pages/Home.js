// Home Page - Soft Minimal Pastel Theme
import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import { 
  FaSearch, FaGithub, FaTwitter, FaInstagram, FaMoon, FaSun,
  FaHeart, FaCloudRain, FaGhost, FaBrain, FaTheaterMasks,
  FaSadTear, FaStar, FaRocket, FaLaugh, FaFire,
  FaHome
} from 'react-icons/fa';
import { MdSmartToy, MdMovie, MdAutoAwesome } from 'react-icons/md';
import './Home.css';
import palette from '../theme/colors';
import logger from '../utils/logger';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPicks, setAiPicks] = useState([]);
  const [personalizedPicks, setPersonalizedPicks] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true); // Track trending movies loading
  const [darkMode, setDarkMode] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Vibe tags - expanded with better prompts (15 tags) - using icons instead of emojis
  const vibeTags = [
    { icon: FaHeart, label: 'Romance', prompt: 'romantic feel-good love story with emotional depth' },
    { icon: FaCloudRain, label: 'Rainy Vibe', prompt: 'rainy cozy atmospheric melancholic movie perfect for a rainy day' },
    { icon: FaGhost, label: 'Horror', prompt: 'horror psychological thriller with atmosphere and tension' },
    { icon: FaBrain, label: 'Mind-bending', prompt: 'mind-bending plot twist complex narrative that makes you think' },
    { icon: FaTheaterMasks, label: 'Psychological', prompt: 'psychological thriller dark and thought-provoking' },
    { icon: FaSadTear, label: 'Crying but beautiful', prompt: 'emotional heartbreaking beautiful story that makes you cry' },
    { icon: FaStar, label: 'Aesthetic', prompt: 'aesthetic visually stunning cinematography with beautiful visuals' },
    { icon: FaRocket, label: 'Sci-fi', prompt: 'science fiction futuristic space exploration with deep themes' },
    { icon: FaLaugh, label: 'Comedy', prompt: 'comedy funny lighthearted feel-good movie' },
    { icon: FaFire, label: 'Intense', prompt: 'intense action fast-paced thriller with high stakes' },
    { icon: FaMoon, label: 'Dark & Moody', prompt: 'dark moody atmospheric film with complex characters' },
    { icon: FaStar, label: 'Classic Cinema', prompt: 'classic cinema timeless masterpiece with great storytelling' },
    { icon: FaHeart, label: 'Feel-Good', prompt: 'feel-good uplifting heartwarming movie that makes you happy' },
    { icon: FaBrain, label: 'Thought-Provoking', prompt: 'thought-provoking philosophical movie that challenges your perspective' },
    { icon: FaTheaterMasks, label: 'Character-Driven', prompt: 'character-driven drama with deep emotional development' }
  ];

  // Mood sections (3 big boxes) - using icons instead of emojis
  const moodSections = [
    {
      icon: FaHome,
      title: 'Cozy Night',
      description: 'Soft, warm, comforting films for a quiet evening at home.',
      prompt: 'cozy warm comforting quiet evening',
      className: 'cozy'
    },
    {
      icon: FaMoon,
      title: 'Sad Girl Cinema',
      description: 'Melancholic, beautiful, emotionally raw stories.',
      prompt: 'melancholic emotional raw beautiful sad',
      className: 'sad'
    },
    {
      icon: FaFire,
      title: 'Chaotic Energy',
      description: 'Wild, unpredictable, intense movies that keep you on edge.',
      prompt: 'chaotic intense wild unpredictable action',
      className: 'chaotic'
    }
  ];

  // Fetch data on mount
  useEffect(() => {
    loadTrendingMovies();
    if (isAuthenticated) {
      loadAIPicks();
      loadPersonalizedPicks();
      fetchFavorites();
    }
  }, [isAuthenticated]);

  // Reset carousel index when movies change
  useEffect(() => {
    setCarouselIndex(0);
  }, [trendingMovies.length]);

  // Auto-rotate carousel
  useEffect(() => {
    const slideCount = Math.min(trendingMovies.length, 5);
    if (slideCount > 1) {
      const interval = setInterval(() => {
        setCarouselIndex((prev) => {
          const next = (prev + 1) % slideCount;
          return next;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [trendingMovies]);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/movies/favorites/list');
      const favoriteIds = new Set(response.data.map(m => m.id));
      setFavorites(favoriteIds);
    } catch (error) {
      logger.error('Failed to fetch favorites:', error);
    }
  };

  const loadTrendingMovies = async () => {
    setLoadingTrending(true);
    try {
      // Try trending endpoint first
      const response = await api.get('/movies/trending');
      const movies = response.data.trending || response.data || [];
      
      if (movies && movies.length > 0) {
        // Take first 5 movies for carousel
        setTrendingMovies(movies.slice(0, 5));
        logger.info('Trending movies loaded', { count: movies.length });
      } else {
        logger.warn('Trending movies endpoint returned empty array, trying fallback');
        // Fallback: try regular movies endpoint
        try {
          const fallbackResponse = await api.get('/movies');
          const fallbackMovies = fallbackResponse.data.movies || fallbackResponse.data || [];
          if (fallbackMovies && fallbackMovies.length > 0) {
            setTrendingMovies(fallbackMovies.slice(0, 5));
            logger.info('Fallback movies loaded', { count: fallbackMovies.length });
          } else {
            logger.warn('Both endpoints returned empty, keeping empty state');
            setTrendingMovies([]);
          }
        } catch (fallbackError) {
          logger.error('Failed to load movies:', fallbackError);
          setTrendingMovies([]);
        }
      }
    } catch (error) {
      logger.error('Failed to load trending movies:', error);
      // Fallback: try regular movies endpoint
      try {
        const fallbackResponse = await api.get('/movies');
        const movies = fallbackResponse.data.movies || fallbackResponse.data || [];
        if (movies && movies.length > 0) {
          setTrendingMovies(movies.slice(0, 5));
          logger.info('Fallback movies loaded after error', { count: movies.length });
        } else {
          setTrendingMovies([]);
        }
      } catch (fallbackError) {
        logger.error('Failed to load movies:', fallbackError);
        setTrendingMovies([]);
      }
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadAIPicks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/recommendations');
      const recs = response.data.recommendations || [];
      setAiPicks(recs.slice(0, 3)); // Only 3 picks
    } catch (error) {
      logger.error('Failed to load AI picks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalizedPicks = async () => {
    try {
      const response = await api.get('/recommendations');
      const recs = response.data.recommendations || [];
      setPersonalizedPicks(recs.slice(0, 2)); // Only 2 for welcome section
    } catch (error) {
      logger.error('Failed to load personalized picks:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (isAuthenticated) {
        navigate('/recommendations', { 
          state: { customSearch: searchQuery.trim() } 
        });
      } else {
        navigate('/login', { 
          state: { redirectTo: '/recommendations', customSearch: searchQuery.trim() } 
        });
      }
    }
  };

  const handleVibeClick = (prompt) => {
    try {
      if (isAuthenticated) {
        navigate('/recommendations', { 
          state: { customSearch: prompt } 
        });
      } else {
        navigate('/login', { 
          state: { redirectTo: '/recommendations', customSearch: prompt } 
        });
      }
    } catch (error) {
      logger.error('Vibe click error:', error);
      // Fallback: direct navigation
      window.location.href = isAuthenticated ? '/recommendations' : '/login';
    }
  };

  const handleMoodClick = (prompt) => {
    try {
      if (isAuthenticated) {
        navigate('/recommendations', { 
          state: { customSearch: prompt } 
        });
      } else {
        navigate('/login', { 
          state: { redirectTo: '/recommendations', customSearch: prompt } 
        });
      }
    } catch (error) {
      logger.error('Mood click error:', error);
      // Fallback: direct navigation
      window.location.href = isAuthenticated ? '/recommendations' : '/login';
    }
  };

  const handleFavoriteToggle = async (movieId, isFavorited) => {
    try {
      // Handle both database IDs and TMDB IDs
      const movieIdToUse = movieId.toString();
      
      if (isFavorited) {
        await api.post('/movies/favorites', { movieId: movieIdToUse });
        setFavorites(prev => new Set([...prev, movieIdToUse]));
      } else {
        await api.delete(`/movies/favorites/${encodeURIComponent(movieIdToUse)}`);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(movieIdToUse);
          return newSet;
        });
      }
    } catch (error) {
      logger.error('Favorite toggle error:', error);
      // Show error toast if available
      if (error.response?.data?.error) {
        console.error('Favorite error:', error.response.data.error);
      }
    }
  };

  return (
    <div className="home-page-minimal">
      {/* Hero Carousel */}
      <section className="hero-carousel-section">
        {loadingTrending ? (
          // Show loading state while fetching trending movies
          <div className="hero-carousel-loading">
            <Container>
              <div className="text-center" style={{ padding: '4rem 0' }}>
                <Spinner animation="border" role="status" style={{ color: palette.greenPrimary }}>
                  <span className="visually-hidden">Loading trending movies...</span>
                </Spinner>
              </div>
            </Container>
          </div>
        ) : trendingMovies.length > 0 ? (
          <div className="hero-carousel">
            <div 
              className="hero-carousel-slides"
              style={{ 
                transform: `translateX(calc(-${carouselIndex} * 100%))`
              }}
            >
              {trendingMovies.slice(0, 5).map((movie, index) => (
                <div key={movie.tmdb_id || movie.id || index} className="hero-carousel-slide">
                  <div className="hero-slide-background">
                    {movie.poster_url && (
                      <img 
                        src={movie.poster_url} 
                        alt={movie.title}
                        className="hero-slide-image"
                      />
                    )}
                    <div className="hero-slide-overlay"></div>
                  </div>
                  <Container>
                    <div className="hero-slide-content">
                      {/* Movie Info Badges */}
                      <div className="hero-slide-badges">
                        {movie.genre && (
                          <span className="hero-slide-badge genre">{movie.genre}</span>
                        )}
                        {movie.year && (
                          <span className="hero-slide-badge year">{movie.year}</span>
                        )}
                        {movie.vote_average && (
                          <span className="hero-slide-badge rating">
                            <FaStar style={{ marginRight: '4px', fontSize: '0.9em' }} />
                            {movie.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      
                      <h1 className="hero-slide-title">{movie.title}</h1>
                      
                      {/* Movie Description */}
                      {movie.description && (
                        <p className="hero-slide-description">
                          {movie.description.length > 150 
                            ? `${movie.description.substring(0, 150)}...` 
                            : movie.description}
                        </p>
                      )}
                      
                      <div className="hero-slide-actions">
                        <Link 
                          to={`/movie/${movie.tmdb_id ? `tmdb_${movie.tmdb_id}` : movie.id || 'unknown'}`}
                          className="hero-slide-btn primary"
                        >
                          View Details
                        </Link>
                        {isAuthenticated && (
                          <button
                            className="hero-slide-btn secondary"
                            onClick={() => {
                              const movieId = movie.id || (movie.tmdb_id ? `tmdb_${movie.tmdb_id}` : null);
                              if (movieId) {
                                handleFavoriteToggle(movieId, !favorites.has(movieId));
                              }
                            }}
                          >
                            <FaHeart 
                              size={18} 
                              style={{ 
                                color: (movie.id && favorites.has(movie.id)) || 
                                       (movie.tmdb_id && favorites.has(`tmdb_${movie.tmdb_id}`)) 
                                       ? '#ff6b6b' : 'inherit' 
                              }}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </Container>
                </div>
              ))}
            </div>
            
            {/* Carousel Indicators */}
            {trendingMovies.length > 1 && (
              <div className="hero-carousel-indicators">
                {trendingMovies.slice(0, 5).map((_, index) => (
                  <button
                    key={index}
                    className={`carousel-indicator ${index === carouselIndex ? 'active' : ''}`}
                    onClick={() => setCarouselIndex(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Carousel Navigation */}
            {trendingMovies.length > 1 && (
              <>
                <button
                  className="carousel-nav prev"
                  onClick={() => {
                    const slideCount = Math.min(trendingMovies.length, 5);
                    setCarouselIndex((prev) => (prev - 1 + slideCount) % slideCount);
                  }}
                  aria-label="Previous slide"
                >
                  ←
                </button>
                <button
                  className="carousel-nav next"
                  onClick={() => {
                    const slideCount = Math.min(trendingMovies.length, 5);
                    setCarouselIndex((prev) => (prev + 1) % slideCount);
                  }}
                  aria-label="Next slide"
                >
                  →
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="hero-fallback">
            <Container>
              <h1>Discover movies you'll actually vibe with.</h1>
              <p>Made with AI. Made for your taste.</p>
              <form onSubmit={handleSearch}>
                <div className="big-search-container">
                  <input
                    type="text"
                    className="big-search-input"
                    placeholder="Search by genre, vibe, or film…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="big-search-btn">
                    <FaSearch size={18} />
                  </button>
                </div>
              </form>
              {!isAuthenticated && (
                <div className="auth-buttons">
                  <Link to="/register" className="auth-btn primary" style={{ textDecoration: 'none' }}>
                    Get Started
                  </Link>
                  <Link to="/login" className="auth-btn secondary" style={{ textDecoration: 'none' }}>
                    Login
                  </Link>
                </div>
              )}
            </Container>
          </div>
        )}
      </section>

      {/* Vibe Tags */}
      <section className="vibe-tags-section">
        <Container>
          <div className="vibe-tags-grid">
            {vibeTags.map((vibe, index) => {
              const Icon = vibe.icon;
              return (
                <div 
                  key={index}
                  className="vibe-tag"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVibeClick(vibe.prompt);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleVibeClick(vibe.prompt);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Search ${vibe.label} movies`}
                >
                  <Icon className="vibe-icon" size={18} />
                  <span>{vibe.label}</span>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* AI Picks Today */}
      {isAuthenticated && (
        <section className="ai-picks-section">
          <Container>
            <h2 className="section-title">
              <MdAutoAwesome className="section-icon" size={24} />
              Today's AI Selections
            </h2>
            <p className="section-subtitle">Handpicked by AI, just for you.</p>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
              </div>
            ) : aiPicks.length > 0 ? (
              <div className="ai-picks-grid">
                {aiPicks.map((movie) => (
                  <div key={movie.id} className="ai-pick-card">
                    <div className="ai-pick-poster">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(135deg, ${palette.orangeWine} 0%, ${palette.deepBlue} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: palette.textDark,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          padding: '1rem'
                        }}>
                          {movie.title}
                        </div>
                      )}
                    </div>
                    <div className="ai-pick-content">
                      <h3 className="ai-pick-title">{movie.title}</h3>
                      <p className="ai-pick-meta">
                        {movie.genre} • {movie.year}
                      </p>
                      <p className="ai-pick-description">
                        {movie.tagline || movie.reason || movie.description || 'A carefully selected film based on your taste.'}
                      </p>
                      <Link to={`/movie/${movie.tmdb_id ? `tmdb_${movie.tmdb_id}` : movie.id || 'unknown'}`} className="ai-pick-btn">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-text">
                  Get personalized recommendations to see AI picks here.
                </p>
                <Link to="/recommendations" className="empty-state-btn">
                  Get Recommendations
                </Link>
              </div>
            )}
          </Container>
        </section>
      )}

      {/* Mood Sections */}
      <section className="mood-sections">
        <Container>
          <div className="mood-grid">
            {moodSections.map((mood, index) => {
              const Icon = mood.icon;
              return (
                <div 
                  key={index}
                  className={`mood-box ${mood.className}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMoodClick(mood.prompt);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleMoodClick(mood.prompt);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Explore ${mood.title} movies`}
                >
                  <Icon className="mood-icon" size={48} />
                  <h3 className="mood-title">{mood.title}</h3>
                  <p className="mood-description">{mood.description}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Welcome Back Section (for logged-in users) */}
      {isAuthenticated && user && (
        <section className="welcome-section">
          <Container>
            <div className="welcome-header">
              <h2 className="welcome-name">Welcome back, {user.username}.</h2>
              <p className="welcome-taste">
                Your taste today leans toward psychological & romance.
              </p>
            </div>

            {personalizedPicks.length > 0 ? (
              <div className="welcome-cards">
                {personalizedPicks.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    showFavoriteButton={true}
                    onFavoriteToggle={handleFavoriteToggle}
                    isFavorited={favorites.has(movie.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-text">
                  Start exploring to get personalized picks.
                </p>
                <Link to="/recommendations" className="empty-state-btn">
                  Get Recommendations
                </Link>
              </div>
            )}
          </Container>
        </section>
      )}

      {/* Atmosphere Footer */}
      <footer className="curated-footer">
        <Container>
          <div className="curated-footer__grid">
            <div className="footer-brand-card">
              <div className="footer-brand-chip">
                <MdSmartToy size={20} />
                <span>AI Mood Engine</span>
              </div>
              <h3>CineSense</h3>
              <p>
                Daily, AI-curated watchlists crafted around your moods. Soft gradients, calm UI,
                cinematic depth.
              </p>
              <div className="footer-pill-row">
                <span className="footer-pill">Curated vibes</span>
                <span className="footer-pill soft">Pastel aesthetic</span>
              </div>
            </div>

            <div className="footer-link-columns">
              <div>
                <p className="footer-heading">Product</p>
                {isAuthenticated ? (
                  <>
                    <Link to="/recommendations">AI Picks</Link>
                    <Link to="/search">Explore Vibes</Link>
                    <Link to="/favorites">Saved Lists</Link>
                  </>
                ) : (
                  <>
                    <Link to="/search">Explore Vibes</Link>
                    <span 
                      style={{ cursor: 'pointer', color: 'inherit' }}
                      onClick={() => navigate('/login')}
                    >
                      AI Picks
                    </span>
                    <span 
                      style={{ cursor: 'pointer', color: 'inherit' }}
                      onClick={() => navigate('/login')}
                    >
                      Saved Lists
                    </span>
                  </>
                )}
              </div>
              <div>
                <p className="footer-heading">Community</p>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub Updates</a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter Journal</a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Visual Drops</a>
              </div>
              <div>
                <p className="footer-heading">Support</p>
                {isAuthenticated ? (
                  <Link to="/profile">Account</Link>
                ) : (
                  <Link to="/login">Account</Link>
                )}
                {!isAuthenticated && <Link to="/register">Membership</Link>}
                <a href="mailto:hello@cinesense.ai">hello@cinesense.ai</a>
              </div>
            </div>
          </div>

          <div className="curated-footer__bar">
            <span>© 2025 CineSense. Made for late-night cinephiles.</span>
            <div className="footer-bar-actions">
              <button
                className="footer-social-btn"
                onClick={() => setDarkMode(!darkMode)}
                title="Tema modu"
              >
                {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
              </button>
              <div className="footer-socials">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn"
                >
                  <FaGithub size={16} />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn"
                >
                  <FaTwitter size={16} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn"
                >
                  <FaInstagram size={16} />
                </a>
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default Home;
