// Modern AI-Powered Search Page
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Form, Button, Card, Badge, Spinner, Alert, Tabs, Tab, InputGroup } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import { FaSearch, FaFilter, FaTag, FaTimes, FaUser, FaRobot, FaFire, FaHistory, FaLightbulb } from 'react-icons/fa';
import { MdMovie, MdPeople } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import palette, { gradients } from '../theme/colors';
import logger from '../utils/logger';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Search states
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [aiMode, setAiMode] = useState(searchParams.get('ai') === 'true');
  const [activeTab, setActiveTab] = useState('movies');
  
  // Results states
  const [movies, setMovies] = useState([]);
  const [people, setPeople] = useState([]);
  const [aiTags, setAiTags] = useState([]);
  const [genreSuggestions, setGenreSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState({ movies: [], genres: [], aiSuggestions: [] });
  
  // Filters
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || '');
  const [yearFrom, setYearFrom] = useState(searchParams.get('yearFrom') || '');
  const [yearTo, setYearTo] = useState(searchParams.get('yearTo') || '');
  const [availableGenres, setAvailableGenres] = useState([]);
  
  // Search history (from localStorage)
  const [searchHistory, setSearchHistory] = useState([]);
  
  const searchInputRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);

  useEffect(() => {
    fetchGenres();
    fetchTrending();
    loadSearchHistory();
    
    if (isAuthenticated) {
      fetchFavorites();
    }
    
    // Perform search if query exists
    if (searchParams.get('q')) {
      handleSearch();
    }
  }, []);

  const fetchGenres = async () => {
    try {
      const response = await api.get('/movies/genres');
      setAvailableGenres(response.data);
    } catch (error) {
      logger.error('Failed to fetch genres:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await api.get('/movies/trending?timeWindow=week');
      setTrending(response.data.trending || []);
    } catch (error) {
      logger.error('Failed to fetch trending:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/movies/favorites/list');
      const favoriteIds = new Set(response.data.map(m => m.id));
      setFavorites(favoriteIds);
    } catch (error) {
      logger.error('Failed to fetch favorites:', error);
    }
  };

  const loadSearchHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setSearchHistory(history.slice(0, 5)); // Last 5 searches
    } catch (error) {
      logger.error('Failed to load search history:', error);
    }
  };

  const saveToSearchHistory = (searchQuery) => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updated = [
        searchQuery,
        ...history.filter(item => item !== searchQuery)
      ].slice(0, 10); // Keep last 10
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      setSearchHistory(updated.slice(0, 5));
    } catch (error) {
      logger.error('Failed to save search history:', error);
    }
  };

  // Autocomplete with debounce
  const handleQueryChange = (value) => {
    setQuery(value);
    
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    if (value.trim().length >= 2) {
      setShowAutocomplete(true);
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchAutocomplete(value);
      }, 300);
    } else {
      setShowAutocomplete(false);
    }
  };

  const fetchAutocomplete = async (searchQuery) => {
    try {
      const response = await api.get(`/movies/search/autocomplete?q=${encodeURIComponent(searchQuery)}`);
      setAutocompleteResults(response.data);
    } catch (error) {
      logger.error('Autocomplete error:', error);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    setLoading(true);
    setError('');
    setShowAutocomplete(false);
    
    // Save to history
    saveToSearchHistory(query.trim());
    
    try {
      if (aiMode) {
        // AI-powered search
        const response = await api.get(`/movies/search/ai?q=${encodeURIComponent(query.trim())}`);
        setMovies(response.data.movies || []);
        setGenreSuggestions(response.data.genreSuggestions || []);
        setAiTags(response.data.aiTags || []);
        
        // Also search people
        const peopleResponse = await api.get(`/movies/search/people?q=${encodeURIComponent(query.trim())}`);
        setPeople(peopleResponse.data.people || []);
      } else {
        // Regular TMDB search
        const params = new URLSearchParams();
        params.append('q', query.trim());
        if (selectedGenre) params.append('genre', selectedGenre);
        if (yearFrom) params.append('yearFrom', yearFrom);
        if (yearTo) params.append('yearTo', yearTo);
        
        const response = await api.get(`/movies/search?${params.toString()}`);
        setMovies(response.data);
        setGenreSuggestions([]);
        setAiTags([]);
        
        // Search people
        const peopleResponse = await api.get(`/movies/search/people?q=${encodeURIComponent(query.trim())}`);
        setPeople(peopleResponse.data.people || []);
      }
      
      // Update URL
      const params = new URLSearchParams();
      params.set('q', query.trim());
      params.set('ai', aiMode.toString());
      if (selectedGenre) params.set('genre', selectedGenre);
      if (yearFrom) params.set('yearFrom', yearFrom);
      if (yearTo) params.set('yearTo', yearTo);
      setSearchParams(params);
      
    } catch (error) {
      // Only show error if we truly have no results
      const errorMessage = error.response?.data?.error || 'Failed to search movies';
      logger.error('Search error:', error);
      
      // If we have some results, don't show error - just log it
      if (movies.length === 0 && people.length === 0) {
        setError(errorMessage);
      } else {
        // We have some results, just log the error silently
        logger.warn('Partial search error (some results found):', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async (movieId, isFavorited) => {
    if (!isAuthenticated) return;
    
    try {
      if (isFavorited) {
        await api.post('/movies/favorites', { movieId });
        setFavorites(prev => new Set([...prev, movieId]));
      } else {
        await api.delete(`/movies/favorites/${movieId}`);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(movieId);
          return newSet;
        });
      }
    } catch (error) {
      logger.error('Favorite toggle error:', error);
    }
  };

  const handleAutocompleteSelect = (suggestion) => {
    if (suggestion.type === 'movie') {
      setQuery(suggestion.title);
      setShowAutocomplete(false);
      setTimeout(() => handleSearch(), 100);
    } else if (suggestion.type === 'genre') {
      setQuery(suggestion.name);
      setShowAutocomplete(false);
      setTimeout(() => handleSearch(), 100);
    } else {
      setQuery(suggestion);
      setShowAutocomplete(false);
      setTimeout(() => handleSearch(), 100);
    }
  };

  const handleHistorySelect = (historyItem) => {
    setQuery(historyItem);
    setTimeout(() => handleSearch(), 100);
  };

  const handleTagClick = (tag) => {
    setQuery(tag);
    setTimeout(() => handleSearch(), 100);
  };

  const clearSearch = () => {
    setQuery('');
    setMovies([]);
    setPeople([]);
    setAiTags([]);
    setGenreSuggestions([]);
    setSelectedGenre('');
    setYearFrom('');
    setYearTo('');
    setSearchParams({});
  };

  return (
    <Container fluid className="page-transition px-4" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <Row className="mb-4 mt-3">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle p-3 me-3 shadow-lg"
                style={{
                  background: aiMode ? gradients.daylight : gradients.green,
                  border: aiMode
                    ? '3px solid rgba(234, 172, 47, 0.35)'
                    : '3px solid rgba(78, 73, 165, 0.35)'
                }}
              >
                {aiMode ? <FaRobot size={36} color={palette.greenPrimary} /> : <FaSearch size={36} color={palette.greenPrimary} />}
              </div>
              <div>
                <h2 className="mb-1 fw-bold" style={{ fontSize: '2rem', color: palette.textDark }}>
                  {aiMode ? 'AI-Powered Search' : 'Movie Search'}
                </h2>
                <p className="text-muted mb-0" style={{ fontSize: '1.05rem' }}>
                  {aiMode ? 'Semantic search powered by AI' : 'Find movies by title, genre, or description'}
                </p>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Search Bar */}
      <Card
        className="mb-4 border-0 shadow-lg position-relative"
        style={{
          borderRadius: '20px',
          background: gradients.daylight,
          border: '2px solid rgba(78, 73, 165, 0.15)'
        }}
      >
        <Card.Body className="p-4">
          <Form onSubmit={handleSearch}>
            <Row>
              <Col md={10}>
                <InputGroup size="lg">
                  <InputGroup.Text
                    style={{
                      background: gradients.green,
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    ref={searchInputRef}
                    type="text"
                    placeholder={aiMode 
                      ? "Try: 'slow burn horror', 'movies like Interstellar', 'cozy romance in paris', 'psychological thriller no jumpscares', 'sad but beautiful love story', 'mind-bending sci-fi'..." 
                      : "Search by title, genre, or description..."
                    }
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading) {
                        handleSearch();
                      }
                    }}
                    onFocus={() => {
                      if (searchHistory.length > 0 && !query) {
                        setShowAutocomplete(true);
                      }
                    }}
                    style={{
                      fontSize: '1.1rem',
                      padding: '0.8rem 1rem',
                      border: '2px solid rgba(94, 97, 34, 0.2)'
                    }}
                  />
                  {aiMode && (
                    <Form.Text className="text-muted mt-2 d-block" style={{ fontSize: '0.85rem' }}>
                      💡 AI Mode: Describe what you want in natural language. Be specific about mood, genre, setting, or style.
                    </Form.Text>
                  )}
                  {query && (
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => {
                        setQuery('');
                        setShowAutocomplete(false);
                      }}
                    >
                      <FaTimes />
                    </Button>
                  )}
                </InputGroup>
                
                {/* Autocomplete Dropdown */}
                {showAutocomplete && (
                  <Card 
                    className="position-absolute shadow-lg border-0 mt-2" 
                    style={{ 
                      zIndex: 1000, 
                      width: 'calc(100% - 2rem)',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      borderRadius: '15px'
                    }}
                  >
                    <Card.Body className="p-3">
                      {/* Search History */}
                      {!query && searchHistory.length > 0 && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <FaHistory className="me-2 text-muted" size={14} />
                            <small className="text-muted fw-semibold">Recent Searches</small>
                          </div>
                          {searchHistory.map((item, index) => (
                            <div
                              key={index}
                              className="p-2 hover-bg-light rounded cursor-pointer"
                              onClick={() => handleHistorySelect(item)}
                              style={{ cursor: 'pointer' }}
                            >
                              <small>{item}</small>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Movie suggestions */}
                      {autocompleteResults.movies.length > 0 && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <MdMovie className="me-2 text-primary" size={16} />
                            <small className="text-muted fw-semibold">Movies</small>
                          </div>
                          {autocompleteResults.movies.map((movie, index) => (
                            <div
                              key={index}
                              className="d-flex align-items-center p-2 hover-bg-light rounded cursor-pointer"
                              onClick={() => handleAutocompleteSelect(movie)}
                              style={{ cursor: 'pointer' }}
                            >
                              {movie.poster && (
                                <img 
                                  src={movie.poster} 
                                  alt={movie.title}
                                  style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
                                  className="me-2"
                                />
                              )}
                              <div>
                                <div className="fw-semibold">{movie.title}</div>
                                <small className="text-muted">{movie.year}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Genre suggestions */}
                      {autocompleteResults.genres.length > 0 && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <FaTag className="me-2 text-success" size={14} />
                            <small className="text-muted fw-semibold">Genres</small>
                          </div>
                          {autocompleteResults.genres.map((genre, index) => (
                            <div
                              key={index}
                              className="p-2 hover-bg-light rounded cursor-pointer"
                              onClick={() => handleAutocompleteSelect(genre)}
                              style={{ cursor: 'pointer' }}
                            >
                              <Badge bg="success">{genre.name}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* AI suggestions */}
                      {autocompleteResults.aiSuggestions.length > 0 && (
                        <div>
                          <div className="d-flex align-items-center mb-2">
                            <FaLightbulb className="me-2 text-warning" size={14} />
                            <small className="text-muted fw-semibold">Suggestions</small>
                          </div>
                          {autocompleteResults.aiSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-2 hover-bg-light rounded cursor-pointer"
                              onClick={() => handleAutocompleteSelect(suggestion)}
                              style={{ cursor: 'pointer' }}
                            >
                              <small className="text-muted">{suggestion}</small>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                )}
              </Col>
              <Col md={2} className="d-flex align-items-center">
                <Button 
                  variant={loading ? "secondary" : "primary"} 
                  type="submit" 
                  className="w-100" 
                  size="lg"
                  disabled={loading}
                  style={{ 
                    background: loading ? palette.textMuted : gradients.green,
                    border: 'none',
                    fontWeight: '600'
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <FaSearch className="me-2" />
                      Search
                    </>
                  )}
                </Button>
              </Col>
            </Row>
            
            {/* AI Toggle & Filters */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <Form.Check 
                type="switch"
                id="ai-toggle"
                label={
                  <span className="d-flex align-items-center">
                    <FaRobot className="me-2" />
                    <span className="fw-semibold">AI-Powered Search</span>
                    <Badge bg="danger" className="ms-2" style={{ fontSize: '0.7rem' }}>BETA</Badge>
                  </span>
                }
                checked={aiMode}
                onChange={(e) => setAiMode(e.target.checked)}
                style={{ fontSize: '1.05rem' }}
              />
              
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="me-2"
                >
                  <FaFilter className="me-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                {query && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={clearSearch}
                  >
                    <FaTimes className="me-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filters */}
            {showFilters && !aiMode && (
              <Row className="mt-3 pt-3 border-top">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Genre</Form.Label>
                    <Form.Select
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre(e.target.value)}
                    >
                      <option value="">All Genres</option>
                      {availableGenres.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Year From</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="e.g., 2000"
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Year To</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="e.g., 2024"
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </Form.Group>
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button variant="primary" onClick={handleSearch} className="w-100">
                    Apply
                  </Button>
                </Col>
              </Row>
            )}
          </Form>
        </Card.Body>
      </Card>

      {/* AI Genre Suggestions */}
      {aiMode && genreSuggestions.length > 0 && (
        <Card 
          className="mb-4 border-0 shadow-lg" 
          style={{ 
            borderRadius: '20px',
            background: gradients.daylight,
            border: '2px solid rgba(255, 193, 7, 0.2)'
          }}
        >
          <Card.Body className="p-4">
            <div className="d-flex align-items-center mb-3">
              <FaLightbulb className="me-2 text-warning" size={22} />
              <Card.Title className="mb-0 fw-bold" style={{ fontSize: '1.3rem' }}>
                AI Genre Suggestions
              </Card.Title>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {genreSuggestions.map((genre, index) => (
                <Badge
                  key={index}
                  bg="warning"
                  text="dark"
                  className="text-capitalize"
                  style={{ 
                    fontSize: '0.95rem', 
                    padding: '0.6rem 1.2rem', 
                    cursor: 'pointer',
                    borderRadius: '20px',
                    fontWeight: '600'
                  }}
                  onClick={() => {
                    setQuery(genre);
                    setTimeout(() => handleSearch(), 100);
                  }}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* AI Tags */}
      {aiMode && aiTags.length > 0 && (
        <Card 
          className="mb-4 border-0 shadow-lg" 
          style={{ 
            borderRadius: '20px',
            background: gradients.green,
            border: '2px solid rgba(13, 202, 240, 0.2)'
          }}
        >
          <Card.Body className="p-4">
            <div className="d-flex align-items-center mb-3">
              <FaTag className="me-2 text-info" size={20} />
              <Card.Title className="mb-0 fw-bold" style={{ fontSize: '1.3rem' }}>
                AI-Generated Tags
              </Card.Title>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {aiTags.map((tag, index) => (
                <Badge
                  key={index}
                  bg="info"
                  className="text-capitalize"
                  style={{ 
                    fontSize: '0.9rem', 
                    padding: '0.5rem 1rem', 
                    cursor: 'pointer',
                    borderRadius: '20px'
                  }}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* Results Tabs */}
      {(movies.length > 0 || people.length > 0 || query) && !loading && (
        <Card className="border-0 shadow-lg" style={{ borderRadius: '20px' }}>
          <Card.Body className="p-0">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="px-4 pt-3"
              variant="pills"
            >
              {/* Movies Tab */}
              <Tab 
                eventKey="movies" 
                title={
                  <span className="d-flex align-items-center px-3">
                    <MdMovie className="me-2" size={18} />
                    Movies ({movies.length})
                  </span>
                }
              >
                <div className="p-4">
                  {movies.length > 0 ? (
                    <Row>
                      {movies.map((movie) => (
                        <Col md={4} lg={3} key={movie.id || movie.tmdb_id} className="mb-4">
                          <MovieCard
                            movie={movie}
                            showFavoriteButton={isAuthenticated}
                            onFavoriteToggle={handleFavoriteToggle}
                            isFavorited={favorites.has(movie.id)}
                          />
                          {movie.reason && (
                            <Card className="mt-2 border-info" style={{ borderRadius: '12px' }}>
                              <Card.Body className="p-3">
                                <small className="text-muted">
                                  <FaRobot className="me-2 text-info" />
                                  <strong>AI:</strong> {movie.reason}
                                </small>
                              </Card.Body>
                            </Card>
                          )}
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center py-5">
                      <MdMovie size={80} className="text-muted mb-3" />
                      <h4 className="text-muted">No movies found</h4>
                      <p className="text-muted">Try adjusting your search query or filters</p>
                    </div>
                  )}
                </div>
              </Tab>
              
              {/* People Tab */}
              <Tab 
                eventKey="people" 
                title={
                  <span className="d-flex align-items-center px-3">
                    <MdPeople className="me-2" size={18} />
                    People ({people.length})
                  </span>
                }
              >
                <div className="p-4">
                  {people.length > 0 ? (
                    <Row>
                      {people.map((person) => (
                        <Col md={4} lg={3} key={person.id} className="mb-4">
                          <Card 
                            className="h-100 shadow-sm hover-shadow" 
                            style={{ borderRadius: '15px', cursor: 'pointer' }}
                          >
                            {person.profile_path && (
                              <Card.Img 
                                variant="top" 
                                src={person.profile_path} 
                                style={{ 
                                  height: '300px', 
                                  objectFit: 'cover',
                                  borderTopLeftRadius: '15px',
                                  borderTopRightRadius: '15px'
                                }} 
                              />
                            )}
                            <Card.Body>
                              <Card.Title className="fw-bold">{person.name}</Card.Title>
                              <Badge bg="secondary" className="mb-2">
                                {person.known_for_department}
                              </Badge>
                              {person.known_for && person.known_for.length > 0 && (
                                <div className="mt-2">
                                  <small className="text-muted">Known for:</small>
                                  {person.known_for.map((movie, idx) => (
                                    <div key={idx}>
                                      <small className="text-muted">• {movie.title}</small>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center py-5">
                      <MdPeople size={80} className="text-muted mb-3" />
                      <h4 className="text-muted">No people found</h4>
                      <p className="text-muted">Try searching for actors or directors</p>
                    </div>
                  )}
                </div>
              </Tab>
              
              {/* Trending Tab */}
              <Tab 
                eventKey="trending" 
                title={
                  <span className="d-flex align-items-center px-3">
                    <FaFire className="me-2" size={16} />
                    Trending
                  </span>
                }
              >
                <div className="p-4">
                  {trending.length > 0 ? (
                    <Row>
                      {trending.map((movie) => (
                        <Col md={4} lg={3} key={movie.tmdb_id} className="mb-4">
                          <MovieCard
                            movie={movie}
                            showFavoriteButton={isAuthenticated}
                            onFavoriteToggle={handleFavoriteToggle}
                            isFavorited={favorites.has(movie.id)}
                          />
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="text-muted mt-3">Loading trending movies...</p>
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      )}
      
      {/* Empty State */}
      {!query && !loading && (
        <Card 
          className="text-center border-0 shadow-lg p-5" 
          style={{ 
            borderRadius: '20px',
            background: gradients.daylight,
            border: '2px solid rgba(255, 193, 7, 0.2)'
          }}
        >
          <Card.Body className="p-5">
            <div 
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4 shadow-lg" 
              style={{ 
                width: '140px', 
                height: '140px',
                background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.15) 0%, rgba(13, 110, 253, 0.25) 100%)',
                border: '3px solid rgba(13, 110, 253, 0.3)'
              }}
            >
              <FaSearch size={70} color={palette.greenPrimary} />
            </div>
            <Card.Title className="h3 mb-3 fw-bold" style={{ color: palette.textDark, fontSize: '1.8rem' }}>
              Start Your Movie Discovery
            </Card.Title>
            <Card.Text className="text-muted mb-4" style={{ fontSize: '1.15rem', lineHeight: '1.8', maxWidth: '700px', margin: '0 auto' }}>
              Enter a movie title, genre, mood, or even a natural language query like "cozy romance in Paris" to get started.
              {aiMode && " AI will understand your query and find the perfect matches!"}
            </Card.Text>
            
            {/* Trending Preview */}
            {trending.length > 0 && (
              <div className="mt-5">
                <h5 className="mb-4 fw-bold d-flex align-items-center justify-content-center">
                  <FaFire className="me-2 text-danger" />
                  Trending This Week
                </h5>
                <Row className="justify-content-center">
                  {trending.slice(0, 4).map((movie) => (
                    <Col md={3} key={movie.tmdb_id} className="mb-3">
                      <MovieCard
                        movie={movie}
                        showFavoriteButton={isAuthenticated}
                        onFavoriteToggle={handleFavoriteToggle}
                        isFavorited={favorites.has(movie.id)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
      
      <style>{`
        .hover-bg-light:hover {
          background-color: palette.creamSoft;
        }
        .hover-shadow {
          transition: all 0.3s ease;
        }
        .hover-shadow:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </Container>
  );
};

export default Search;
