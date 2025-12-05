// Favorites Page - Your Personal Movie Collection
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Spinner, Alert, Dropdown, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import { 
  FaHeart, FaSearch, FaFilter, FaTimes, FaSortAmountDown, 
  FaMagic, FaLightbulb, FaChartPie, FaRobot, FaFilm,
  FaChartBar, FaTheaterMasks, FaStar
} from 'react-icons/fa';
import { MdAutoAwesome, MdMovie } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import './Favorites.css';
import { gradients } from '../theme/colors';
import logger from '../utils/logger';

const Favorites = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Favorites states
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [sortBy, setSortBy] = useState('added'); // 'added', 'rating', 'year', 'alphabetical'
  
  // Insights
  const [insights, setInsights] = useState(null);
  
  // Available filters
  const availableGenres = ['Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Comedy', 'Drama', 'Action', 'Mystery'];
  const availableMoods = ['Dark', 'Cozy', 'Emotional', 'Funny', 'Mind-bending', 'Atmospheric', 'Uplifting', 'Intense'];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchFavorites();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [favorites, searchQuery, selectedGenres, selectedMoods, sortBy]);

  const fetchFavorites = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get('/movies/favorites/list');
      const favs = response.data || [];
      setFavorites(favs);
      
      // Generate insights
      generateInsights(favs);
    } catch (error) {
      logger.error('Failed to fetch favorites:', error);
      setError(error.response?.data?.error || 'Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (favs) => {
    if (favs.length === 0) {
      setInsights(null);
      return;
    }
    
    // Count genres
    const genreCounts = {};
    favs.forEach(movie => {
      const genre = movie.genre || 'Unknown';
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
    
    // Get top genres
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
    
    // Count tags/moods
    const moodCounts = {};
    favs.forEach(movie => {
      if (movie.tags && Array.isArray(movie.tags)) {
        movie.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          moodCounts[normalizedTag] = (moodCounts[normalizedTag] || 0) + 1;
        });
      }
    });
    
    // Get most liked mood
    const mostLikedMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)[0]?.[0] || 'varied';
    
    // AI insight based on genres and moods
    let aiInsight = '';
    if (topGenres.length > 0) {
      const primaryGenre = topGenres[0].toLowerCase();
      if (primaryGenre.includes('horror')) {
        aiInsight = 'You enjoy atmospheric horror and psychological thrillers.';
      } else if (primaryGenre.includes('romance')) {
        aiInsight = 'You love soulful romances and emotional stories.';
      } else if (primaryGenre.includes('sci-fi')) {
        aiInsight = 'You appreciate thought-provoking sci-fi and futuristic narratives.';
      } else if (primaryGenre.includes('drama')) {
        aiInsight = 'You favor character-driven dramas with emotional depth.';
      } else if (primaryGenre.includes('comedy')) {
        aiInsight = 'You enjoy witty comedies and feel-good stories.';
      } else {
        aiInsight = `You have diverse taste with a preference for ${topGenres[0]}.`;
      }
    }
    
    setInsights({
      total: favs.length,
      topGenres,
      mostLikedMood: mostLikedMood.charAt(0).toUpperCase() + mostLikedMood.slice(1),
      aiInsight
    });
  };

  const applyFiltersAndSort = () => {
    let filtered = [...favorites];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(movie => 
        movie.title.toLowerCase().includes(query) ||
        (movie.description && movie.description.toLowerCase().includes(query))
      );
    }
    
    // Apply genre filter
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(movie => 
        selectedGenres.some(genre => 
          movie.genre && movie.genre.toLowerCase() === genre.toLowerCase()
        )
      );
    }
    
    // Apply mood filter
    if (selectedMoods.length > 0) {
      filtered = filtered.filter(movie => {
        if (!movie.tags || !Array.isArray(movie.tags)) return false;
        return selectedMoods.some(mood => 
          movie.tags.some(tag => 
            tag.toLowerCase().includes(mood.toLowerCase())
          )
        );
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'alphabetical':
          return (a.title || '').localeCompare(b.title || '');
        case 'added':
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });
    
    setFilteredFavorites(filtered);
  };

  const handleRemoveFavorite = async (movieId) => {
    try {
      await api.delete(`/movies/favorites/${movieId}`);
      setFavorites(prev => prev.filter(m => m.id !== movieId));
      setToast({ message: 'Removed from favorites', type: 'info' });
    } catch (error) {
      logger.error('Remove favorite error:', error);
      setToast({ message: 'Failed to remove from favorites', type: 'danger' });
    }
  };

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleMoodToggle = (mood) => {
    setSelectedMoods(prev => 
      prev.includes(mood) 
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenres([]);
    setSelectedMoods([]);
  };

  const handleGenerateFromFavorites = () => {
    if (favorites.length === 0) {
      setToast({ message: 'Add some favorites first!', type: 'warning' });
      return;
    }
    
    // Build prompt from favorites
    const titles = favorites.slice(0, 3).map(m => m.title).join(', ');
    const prompt = `Movies similar to my favorites: ${titles}`;
    
    navigate('/recommendations', { state: { customSearch: prompt } });
  };

  const handleSimilarToCollection = () => {
    if (favorites.length === 0) {
      setToast({ message: 'Add some favorites first!', type: 'warning' });
      return;
    }
    
    const genres = insights?.topGenres?.join(', ') || 'various genres';
    const prompt = `${genres} movies with ${insights?.mostLikedMood?.toLowerCase() || 'varied'} mood`;
    
    navigate('/recommendations', { state: { customSearch: prompt } });
  };

  const handleAnalyzeTaste = () => {
    if (!insights) {
      setToast({ message: 'Add some favorites first!', type: 'warning' });
      return;
    }
    
    const message = `
      Your Taste Analysis:
      
      Total Favorites: ${insights.total}
      Top Genres: ${insights.topGenres.join(', ')}
      Most Liked Mood: ${insights.mostLikedMood}
      
      AI Says: ${insights.aiInsight}
    `;
    
    alert(message);
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="favorites-page">
      <Container fluid style={{ maxWidth: '1400px' }}>
        {/* Toast Notification */}
        {toast && (
          <Alert 
            variant={toast.type} 
            className="position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg" 
            style={{ zIndex: 9999, minWidth: '300px' }}
            dismissible
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Alert>
        )}

        {/* Header */}
        <div className="favorites-header text-center mb-5" style={{ padding: '60px 0 40px' }}>
          <div className="heart-container mb-4">
            <div className="heart-glow">
              <FaHeart size={60} className="text-danger" />
            </div>
          </div>
          
          <h1 className="display-3 fw-bold text-white mb-3" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            Your Favorite Movies
          </h1>
          
          <p className="lead text-white-50" style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
            Your personal cinematic universe, curated by you.
          </p>
        </div>

        {/* Smart Insights */}
        {insights && (
          <Card className="mb-4 border-0 shadow-lg insights-card" style={{ borderRadius: '25px', overflow: 'hidden' }}>
            <Card.Body className="p-4" style={{ background: gradients.green }}>
              <h4 className="text-white mb-4 fw-bold d-flex align-items-center">
                <FaChartPie className="me-3" size={28} />
                Smart Favorite Insights
              </h4>
              
              <Row className="text-white">
                <Col md={3} className="text-center mb-3 mb-md-0">
                  <div className="insight-item">
                    <FaFilm size={32} className="mb-2" />
                    <h2 className="mb-0 fw-bold">{insights.total}</h2>
                    <small className="text-white-50">Total Favorites</small>
                  </div>
                </Col>
                
                <Col md={3} className="text-center mb-3 mb-md-0">
                  <div className="insight-item">
                    <MdMovie size={32} className="mb-2" />
                    <h5 className="mb-0 fw-bold">{insights.topGenres[0]}</h5>
                    <small className="text-white-50">Top Genre</small>
                  </div>
                </Col>
                
                <Col md={3} className="text-center mb-3 mb-md-0">
                  <div className="insight-item">
                    <MdAutoAwesome size={32} className="mb-2" />
                    <h5 className="mb-0 fw-bold">{insights.mostLikedMood}</h5>
                    <small className="text-white-50">Most Liked Mood</small>
                  </div>
                </Col>
                
                <Col md={3} className="text-center">
                  <div className="insight-item">
                    <FaRobot size={32} className="mb-2" />
                    <p className="mb-0 small">{insights.aiInsight}</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Filters & Sort */}
        <Card className="mb-4 border-0 shadow-lg" style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
          <Card.Body className="p-4">
            <Row className="align-items-center mb-3">
              <Col md={6}>
                <InputGroup size="lg">
                  <InputGroup.Text style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search in your favorites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      color: 'white',
                      fontSize: '1.05rem'
                    }}
                  />
                </InputGroup>
              </Col>
              
              <Col md={6} className="text-end">
                <Dropdown className="d-inline-block">
                  <Dropdown.Toggle 
                    variant="outline-light" 
                    size="lg"
                    className="fw-semibold"
                    style={{ borderRadius: '15px', minWidth: '200px' }}
                  >
                    <FaSortAmountDown className="me-2" />
                    Sort by: {sortBy === 'added' ? 'Recently Added' : sortBy === 'rating' ? 'Rating' : sortBy === 'year' ? 'Year' : 'Alphabetical'}
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setSortBy('added')}>Recently Added</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSortBy('rating')}>Rating</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSortBy('year')}>Year</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSortBy('alphabetical')}>Alphabetical</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            </Row>
            
            {/* Genre Filters */}
            <div className="mb-3">
              <div className="d-flex align-items-center mb-2">
                <FaFilter className="me-2 text-info" />
                <small className="text-white fw-semibold">Genres:</small>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {availableGenres.map(genre => (
                  <Badge
                    key={genre}
                    bg={selectedGenres.includes(genre) ? 'primary' : 'secondary'}
                    className="filter-badge"
                    onClick={() => handleGenreToggle(genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Mood Filters */}
            <div className="mb-3">
              <div className="d-flex align-items-center mb-2">
                <MdAutoAwesome className="me-2 text-warning" />
                <small className="text-white fw-semibold">Moods:</small>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {availableMoods.map(mood => (
                  <Badge
                    key={mood}
                    bg={selectedMoods.includes(mood) ? 'warning' : 'dark'}
                    text={selectedMoods.includes(mood) ? 'dark' : 'light'}
                    className="filter-badge"
                    onClick={() => handleMoodToggle(mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>
            
            {(searchQuery || selectedGenres.length > 0 || selectedMoods.length > 0) && (
              <div className="text-center">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={clearFilters}
                  style={{ borderRadius: '15px' }}
                >
                  <FaTimes className="me-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* AI Powered Actions */}
        {favorites.length > 0 && (
          <Card className="mb-4 border-0 shadow-lg ai-actions-card" style={{ borderRadius: '20px', background: gradients.daylight }}>
            <Card.Body className="p-4">
              <h5 className="text-white mb-3 fw-bold text-center d-flex align-items-center justify-content-center">
                <FaMagic className="me-2" />
                AI-Powered Favorites Actions
              </h5>
              <div className="d-flex justify-content-center flex-wrap gap-3">
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={handleGenerateFromFavorites}
                  className="fw-semibold ai-action-btn"
                >
                  <MdAutoAwesome className="me-2" />
                  Generate from Favorites
                </Button>
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={handleSimilarToCollection}
                  className="fw-semibold ai-action-btn"
                >
                  <FaFilm className="me-2" />
                  Similar to Collection
                </Button>
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={handleAnalyzeTaste}
                  className="fw-semibold ai-action-btn"
                >
                  <FaRobot className="me-2" />
                  Analyze My Taste
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" size="lg" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-4 text-white fs-5">Loading your favorites...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Favorites Grid */}
        {!loading && !error && (
          <>
            {filteredFavorites.length > 0 ? (
              <>
                <div className="mb-3 text-white">
                  <p className="mb-0">
                    Showing <strong>{filteredFavorites.length}</strong> of <strong>{favorites.length}</strong> favorites
                  </p>
                </div>
                
                <Row>
                  {filteredFavorites.map((movie) => (
                    <Col md={6} lg={4} key={movie.id} className="mb-4">
                      <div className="favorite-movie-card position-relative">
                        <MovieCard
                          movie={movie}
                          showFavoriteButton={false}
                        />
                        
                        {/* Remove Button */}
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0 m-3 remove-favorite-btn"
                          onClick={() => handleRemoveFavorite(movie.id)}
                          style={{ 
                            borderRadius: '50%', 
                            width: '40px', 
                            height: '40px',
                            padding: '0',
                            zIndex: 10
                          }}
                        >
                          <FaHeart />
                        </Button>
                        
                        {/* AI Tagline */}
                        {movie.tagline && (
                          <Card.Footer className="bg-transparent border-0 p-3">
                            <div className="d-flex align-items-start">
                              <FaLightbulb className="me-2 text-warning flex-shrink-0" style={{ marginTop: '2px' }} />
                              <small className="text-muted fst-italic">"{movie.tagline}"</small>
                            </div>
                          </Card.Footer>
                        )}
                        
                        {/* View Details Button */}
                        <Card.Footer className="bg-transparent border-0 p-3 pt-0">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="w-100"
                            onClick={() => navigate(`/movies/${movie.id}`)}
                          >
                            📄 View Details
                          </Button>
                        </Card.Footer>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            ) : favorites.length > 0 ? (
              <Card 
                className="text-center border-0 shadow-lg p-5" 
                style={{ 
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Card.Body className="p-5">
                  <FaSearch size={70} className="text-muted mb-3" />
                  <h4 className="text-white mb-3">No movies match your filters</h4>
                  <p className="text-white-50 mb-4">Try adjusting your filters or search query</p>
                  <Button 
                    variant="primary" 
                    onClick={clearFilters}
                    className="px-5 py-3"
                    style={{ borderRadius: '15px' }}
                  >
                    <FaTimes className="me-2" />
                    Clear Filters
                  </Button>
                </Card.Body>
              </Card>
            ) : (
              <Card 
                className="text-center border-0 shadow-lg p-5" 
                style={{ 
                  borderRadius: '20px',
                  background: gradients.green,
                  color: 'white'
                }}
              >
                <Card.Body className="p-5">
                  <div className="heart-container mb-4" style={{ display: 'inline-block' }}>
                    <div className="heart-empty">
                      <FaHeart size={80} />
                    </div>
                  </div>
                  <h3 className="mb-3 fw-bold">Your Collection is Empty</h3>
                  <p className="mb-4" style={{ fontSize: '1.15rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2rem' }}>
                    Start building your personal movie collection by adding favorites from our recommendations or search!
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <Button 
                      variant="light" 
                      size="lg" 
                      onClick={() => navigate('/recommendations')}
                      className="px-5 py-3 fw-semibold"
                      style={{ borderRadius: '15px' }}
                    >
                      <FaMagic className="me-2" />
                      Get Recommendations
                    </Button>
                    <Button 
                      variant="outline-light" 
                      size="lg" 
                      onClick={() => navigate('/search')}
                      className="px-5 py-3 fw-semibold"
                      style={{ borderRadius: '15px' }}
                    >
                      <FaSearch className="me-2" />
                      Search Movies
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Container>
    </div>
  );
};

export default Favorites;
