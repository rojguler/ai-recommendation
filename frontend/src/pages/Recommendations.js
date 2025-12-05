// AI-Powered Recommendations Page - Your Personalized Movie Discovery Hub
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button, Card, Badge, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import {
  FaMagic, FaRobot, FaHeart, FaRedo, FaStar, FaLightbulb,
  FaTheaterMasks, FaFilm, FaHandSparkles, FaMoon
} from 'react-icons/fa';
import { MdMovie, MdAutoAwesome } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import './Recommendations.css';
import { gradients } from '../theme/colors';
import logger from '../utils/logger';

const Recommendations = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // AI Mode states
  const [mode, setMode] = useState('user_taste'); // 'user_taste', 'discover', 'surprise'
  const [customDescription, setCustomDescription] = useState('');
  const [selectedQuickOptions, setSelectedQuickOptions] = useState([]);
  
  // Recommendation states
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  
  // Favorites
  const [favorites, setFavorites] = useState(new Set());
  
  // Quick options - expanded
  const quickGenres = ['Horror', 'Romance', 'Sci-Fi', 'Comedy', 'Thriller', 'Drama', 'Action', 'Mystery', 'Fantasy', 'Documentary', 'Animation', 'Western', 'Crime', 'Adventure', 'War', 'Musical'];
  const quickMoods = ['Cozy', 'Heartbreaking', 'Intelligent', 'Dark', 'Funny', 'Uplifting', 'Intense', 'Emotional', 'Melancholic', 'Hopeful', 'Nostalgic', 'Energetic', 'Calm', 'Suspenseful', 'Inspiring', 'Thought-provoking'];
  const quickVibes = ['Slow Burn', 'Aesthetic', 'Mind-bending', 'Feel-good', 'Atmospheric', 'Fast-paced', 'Surreal', 'Nostalgic', 'Minimalist', 'Epic', 'Intimate', 'Experimental', 'Classic', 'Modern', 'Gritty', 'Elegant'];
  
  // Prompt examples and templates
  const promptExamples = [
    "slow burn romantic movie in Paris",
    "psychological horror with no jumpscares",
    "movies like Interstellar but sadder",
    "cozy rainy day movie to watch alone",
    "mind-bending thriller with plot twists",
    "emotional coming-of-age story",
    "aesthetic visually stunning cinematography",
    "funny but also makes you cry",
    "dark comedy about modern life",
    "sci-fi movie that makes you think",
    "romantic comedy set in the 90s",
    "horror movie that's actually beautiful",
    "movies similar to The Matrix",
    "sad but beautiful love story",
    "action movie with great characters",
    "documentary that changed your perspective",
    "movie that feels like a warm hug",
    "thriller that keeps you guessing",
    "sci-fi romance in space",
    "coming-of-age movie about friendship"
  ];
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  // Handle custom search from Home page
  const handleCustomSearch = useCallback(async (description) => {
    if (!description || !description.trim()) return;
    
    setLoading(true);
    setError('');
    setCustomDescription(description);
    
    try {
      const response = await api.post('/recommendations/custom', {
        description: description.trim()
      });
      
      const recs = response.data.recommendations || [];
      setRecommendations(recs);
      
      if (recs.length > 0) {
        setToast({ 
          message: `Found ${recs.length} movies matching "${description}"!`, 
          type: 'success' 
        });
        
        // Save to AI history
        const newHistoryEntry = {
          prompt: description.trim(),
          timestamp: new Date().toISOString(),
          movies: recs.map(movie => ({
            id: movie.id,
            title: movie.title,
            poster_url: movie.poster_url,
            genre: movie.genre,
            year: movie.year
          }))
        };
        
        const currentHistory = JSON.parse(localStorage.getItem('aiRecommendationHistory') || '[]');
        localStorage.setItem('aiRecommendationHistory', JSON.stringify([newHistoryEntry, ...currentHistory.slice(0, 19)]));
      } else {
        setToast({ 
          message: 'No movies found. Try a different description!', 
          type: 'warning' 
        });
      }
    } catch (error) {
      logger.error('Custom recommendations error:', error);
      setError(error.response?.data?.error || 'Failed to get recommendations');
      setToast({ 
        message: 'Failed to get AI recommendations. Please try again.', 
        type: 'danger' 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.state?.customSearch) {
      const searchQuery = location.state.customSearch;
      setCustomDescription(searchQuery);
      setMode('surprise');
      setTimeout(() => {
        handleCustomSearch(searchQuery);
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.customSearch, handleCustomSearch]);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/movies/favorites/list');
      const favoriteIds = new Set(response.data.map(m => m.id));
      setFavorites(favoriteIds);
    } catch (error) {
      logger.error('Failed to fetch favorites:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!isAuthenticated) {
      setError('Please login to get personalized recommendations');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get('/recommendations');
      const recs = response.data.recommendations || [];
      setRecommendations(recs);
      
      if (recs.length > 0) {
        setToast({ 
          message: `Got ${recs.length} personalized recommendations!`, 
          type: 'success' 
        });
      }
    } catch (error) {
      logger.error('Recommendations error:', error);
      setError(error.response?.data?.error || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAISearch = async () => {
    if (!customDescription.trim() && selectedQuickOptions.length === 0) {
      setError('Please describe what kind of movie you want or select quick options');
      return;
    }
    
    // Build and enhance prompt from description + quick options
    let prompt = customDescription.trim();
    
    // Enhance prompt with quick options
    if (selectedQuickOptions.length > 0) {
      const genres = selectedQuickOptions.filter(opt => quickGenres.includes(opt));
      const moods = selectedQuickOptions.filter(opt => quickMoods.includes(opt));
      const vibes = selectedQuickOptions.filter(opt => quickVibes.includes(opt));
      
      let enhancedParts = [];
      if (genres.length > 0) enhancedParts.push(`genre: ${genres.join(', ')}`);
      if (moods.length > 0) enhancedParts.push(`mood: ${moods.join(', ')}`);
      if (vibes.length > 0) enhancedParts.push(`vibe: ${vibes.join(', ')}`);
      
      if (enhancedParts.length > 0) {
        prompt = prompt 
          ? `${prompt}. ${enhancedParts.join('. ')}` 
          : enhancedParts.join('. ');
      }
    }
    
    // Validate and improve prompt
    if (prompt.length < 3) {
      setError('Please provide a more detailed description (at least 3 characters)');
      return;
    }
    
    if (prompt.length > 500) {
      setError('Prompt is too long. Please keep it under 500 characters.');
      return;
    }
    
    // Save to prompt history
    saveToPromptHistory(prompt);
    
    await handleCustomSearch(prompt);
  };

  const handleQuickOptionToggle = (option) => {
    setSelectedQuickOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(o => o !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCustomDescription('');
    setSelectedQuickOptions([]);
    setRecommendations([]);
    
    if (newMode === 'user_taste' && isAuthenticated) {
      fetchRecommendations();
    }
  };

  const handleRegenerateWithTwist = async (twist) => {
    if (!customDescription && recommendations.length === 0) return;
    
    const basePrompt = customDescription || 'similar movies';
    const newPrompt = `${basePrompt}, but make it ${twist}`;
    
    await handleCustomSearch(newPrompt);
  };

  const handleMoreLikeThis = async (movie) => {
    const prompt = `Movies similar to ${movie.title} (${movie.year}) - ${movie.genre}`;
    await handleCustomSearch(prompt);
  };

  const handleFavoriteToggle = async (movieId, isFavorited) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      if (isFavorited) {
        await api.post('/movies/favorites', { movieId });
        setFavorites(prev => new Set([...prev, movieId]));
        setToast({ message: 'Added to favorites!', type: 'success' });
      } else {
        await api.delete(`/movies/favorites/${movieId}`);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(movieId);
          return newSet;
        });
        setToast({ message: 'Removed from favorites', type: 'info' });
      }
    } catch (error) {
      logger.error('Favorite toggle error:', error);
      setToast({ message: 'Failed to update favorites', type: 'danger' });
    }
  };

  // Prompt history state
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load prompt history from localStorage
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
      setPromptHistory(history.slice(0, 10)); // Last 10 prompts
    } catch (error) {
      logger.error('Failed to load prompt history:', error);
    }
  }, []);

  // Save prompt to history
  const saveToPromptHistory = (prompt) => {
    try {
      const history = JSON.parse(localStorage.getItem('aiPromptHistory') || '[]');
      const updated = [
        { prompt: prompt.trim(), timestamp: new Date().toISOString() },
        ...history.filter(item => item.prompt !== prompt.trim())
      ].slice(0, 20); // Keep last 20
      localStorage.setItem('aiPromptHistory', JSON.stringify(updated));
      setPromptHistory(updated.slice(0, 10));
    } catch (error) {
      logger.error('Failed to save prompt history:', error);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="recommendations-page">
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

        {/* Hero Section: AI Recommendation Hub */}
        <div className="ai-hero-section text-center mb-5 position-relative" style={{ padding: '60px 0' }}>
          {/* Animated Background */}
          <div className="ai-nebula-bg"></div>
          
          <div className="position-relative" style={{ zIndex: 2 }}>
            <div className="d-flex justify-content-center align-items-center mb-4">
              <div className="ai-orb-container me-3">
                <div className="ai-orb pulsing"></div>
              </div>
              <h1 className="display-3 fw-bold text-white mb-0" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                Your Personalized AI Recommendations
              </h1>
            </div>
            
            <p className="lead text-white-50 mb-4" style={{ fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>
              <FaRobot className="me-2" />
              Gemini AI, your taste, mood and past favorites combined to bring you unique movie picks.
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <Card className="mb-4 border-0 shadow-lg mode-selector-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          <Card.Body className="p-4">
            <div className="d-flex justify-content-center">
              <ButtonGroup size="lg">
                <Button
                  variant={mode === 'user_taste' ? 'primary' : 'outline-primary'}
                  onClick={() => handleModeChange('user_taste')}
                  className="d-flex align-items-center px-4"
                  style={{ borderRadius: '15px 0 0 15px' }}
                >
                  <FaHeart className="me-2" />
                  Your Taste
                </Button>
                <Button
                  variant={mode === 'discover' ? 'success' : 'outline-success'}
                  onClick={() => handleModeChange('discover')}
                  className="d-flex align-items-center px-4"
                >
                  <FaLightbulb className="me-2" />
                  Discover New
                </Button>
                <Button
                  variant={mode === 'surprise' ? 'danger' : 'outline-danger'}
                  onClick={() => handleModeChange('surprise')}
                  className="d-flex align-items-center px-4"
                  style={{ borderRadius: '0 15px 15px 0' }}
                >
                  <FaMagic className="me-2" />
                  AI Surprise Me
                </Button>
              </ButtonGroup>
            </div>
          </Card.Body>
        </Card>

        {/* AI Prompt Area */}
        {(mode === 'surprise' || mode === 'discover') && (
          <Card className="mb-4 border-0 shadow-lg ai-prompt-card" style={{ borderRadius: '25px', background: gradients.green }}>
            <Card.Body className="p-5">
              <h3 className="text-white mb-4 fw-bold d-flex align-items-center">
                <FaMagic className="me-3" size={28} />
                Tell the AI what kind of movie you want…
              </h3>
              
              <Form.Group className="mb-4">
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Describe what you're looking for... Examples: 'slow burn romantic movie in Paris', 'psychological horror with no jumpscares', 'movies like Interstellar but sadder', 'cozy rainy day movie', 'mind-bending thriller', 'emotional coming-of-age story'..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleAISearch();
                    }
                  }}
                  className="ai-input"
                  style={{ 
                    fontSize: '1.1rem',
                    borderRadius: '15px',
                    border: '3px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    resize: 'vertical'
                  }}
                />
                <Form.Text className="text-white-50 mt-2 d-block" style={{ fontSize: '0.9rem' }}>
                  💡 Tip: Press Ctrl+Enter to search quickly | Be specific about mood, genre, setting, or style
                </Form.Text>
              </Form.Group>
              
              {/* Prompt Examples & History */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-white mb-0 d-flex align-items-center">
                    <FaLightbulb className="me-2" />
                    Try These Examples (Click to use):
                  </h6>
                  {promptHistory.length > 0 && (
                    <Button
                      variant="link"
                      className="text-white-50 p-0"
                      style={{ textDecoration: 'none', fontSize: '0.85rem' }}
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? 'Hide' : 'Show'} History ({promptHistory.length})
                    </Button>
                  )}
                </div>
                
                {/* Prompt History */}
                {showHistory && promptHistory.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <small className="text-white-50 d-block mb-2">Recent Prompts:</small>
                    <div className="d-flex flex-wrap gap-2">
                      {promptHistory.map((item, idx) => (
                        <Badge
                          key={idx}
                          bg="info"
                          text="dark"
                          className="prompt-example-badge"
                          onClick={() => {
                            setCustomDescription(item.prompt);
                            setSelectedQuickOptions([]);
                            setShowHistory(false);
                          }}
                          style={{ 
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.7rem',
                            borderRadius: '15px'
                          }}
                        >
                          {item.prompt.length > 40 ? `${item.prompt.substring(0, 40)}...` : item.prompt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Prompt Examples */}
                <div className="d-flex flex-wrap gap-2">
                  {promptExamples.slice(0, 6).map((example, idx) => (
                    <Badge
                      key={idx}
                      bg="light"
                      text="dark"
                      className="prompt-example-badge"
                      onClick={() => {
                        setCustomDescription(example);
                        setSelectedQuickOptions([]);
                      }}
                      style={{ 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '0.5rem 0.8rem',
                        borderRadius: '20px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
                {promptExamples.length > 6 && (
                  <Button
                    variant="link"
                    className="text-white-50 p-0 mt-2"
                    style={{ textDecoration: 'none', fontSize: '0.85rem' }}
                    onClick={() => {
                      const randomExample = promptExamples[Math.floor(Math.random() * promptExamples.length)];
                      setCustomDescription(randomExample);
                    }}
                  >
                    🎲 Or try a random example
                  </Button>
                )}
              </div>

              {/* Quick Options */}
              <div className="mb-4">
                <h5 className="text-white mb-3 d-flex align-items-center">
                  <FaTheaterMasks className="me-2" />
                  Quick Genres
                </h5>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {quickGenres.map(genre => (
                    <Badge
                      key={genre}
                      bg={selectedQuickOptions.includes(genre) ? 'light' : 'dark'}
                      text={selectedQuickOptions.includes(genre) ? 'dark' : 'light'}
                      className="quick-option-badge"
                      onClick={() => handleQuickOptionToggle(genre)}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>

                <h5 className="text-white mb-3 d-flex align-items-center">
                  <FaHeart className="me-2" />
                  Quick Moods
                </h5>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {quickMoods.map(mood => (
                    <Badge
                      key={mood}
                      bg={selectedQuickOptions.includes(mood) ? 'warning' : 'dark'}
                      text={selectedQuickOptions.includes(mood) ? 'dark' : 'light'}
                      className="quick-option-badge"
                      onClick={() => handleQuickOptionToggle(mood)}
                    >
                      {mood}
                    </Badge>
                  ))}
                </div>

                <h5 className="text-white mb-3 d-flex align-items-center">
                  <FaHandSparkles className="me-2" />
                  Quick Vibes
                </h5>
                <div className="d-flex flex-wrap gap-2">
                  {quickVibes.map(vibe => (
                    <Badge
                      key={vibe}
                      bg={selectedQuickOptions.includes(vibe) ? 'info' : 'dark'}
                      text={selectedQuickOptions.includes(vibe) ? 'dark' : 'light'}
                      className="quick-option-badge"
                      onClick={() => handleQuickOptionToggle(vibe)}
                    >
                      {vibe}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <div className="text-center">
                <Button 
                  variant="light" 
                  size="lg" 
                  onClick={handleAISearch}
                  disabled={loading || (!customDescription.trim() && selectedQuickOptions.length === 0)}
                  className="px-5 py-3 fw-bold ai-search-btn"
                  style={{ 
                    borderRadius: '15px', 
                    fontSize: '1.2rem',
                    minWidth: '250px',
                    opacity: (!customDescription.trim() && selectedQuickOptions.length === 0) ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Gemini is analyzing...
                    </>
                  ) : (
                    <>
                      <MdAutoAwesome className="me-2" size={24} />
                      Get AI Recommendations
                    </>
                  )}
                </Button>
                {!loading && (
                  <div className="mt-3">
                    <small className="text-white-50">
                      💡 You can also press <kbd className="bg-dark text-white px-2 py-1 rounded" style={{ fontSize: '0.75rem' }}>Ctrl+Enter</kbd> to search
                    </small>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* User Taste Mode */}
        {mode === 'user_taste' && (
          <Card className="mb-4 border-0 shadow-lg" style={{ borderRadius: '20px' }}>
            <Card.Body className="p-5 text-center">
              <div className="mb-4">
                <FaStar size={60} className="text-warning mb-3" />
                <h3 className="fw-bold mb-3">Based on Your Taste</h3>
                <p className="text-muted mb-4" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                  Get recommendations based on your profile preferences, favorite genres, and liked movies.
                </p>
              </div>
              
              {!isAuthenticated ? (
                <Alert variant="warning">
                  Please <a href="/login" className="alert-link">login</a> to get personalized recommendations based on your taste.
                </Alert>
              ) : (
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={fetchRecommendations}
                  disabled={loading}
                  className="px-5 py-3 fw-bold"
                  style={{ borderRadius: '15px' }}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaFilm className="me-2" />
                      Get Profile Recommendations
                    </>
                  )}
                </Button>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* AI Processing Animation */}
        {loading && (
          <div className="ai-processing-section text-center py-5">
            <div className="ai-orb-container mb-4">
              <div className="ai-orb pulsing-large"></div>
            </div>
            <h4 className="text-white mb-3 fw-bold">Gemini is analyzing your taste…</h4>
            <div className="matrix-placeholders">
              <Row className="justify-content-center">
                {[1, 2, 3].map(i => (
                  <Col md={4} key={i} className="mb-3">
                    <div className="matrix-card-placeholder"></div>
                  </Col>
                ))}
              </Row>
            </div>
          </div>
        )}

        {/* Recommendations Results */}
        {!loading && recommendations.length > 0 && (
          <>
            <div className="mb-4 text-center">
              <h3 className="fw-bold text-white mb-3">
                <MdMovie className="me-2" size={32} />
                AI Found {recommendations.length} Perfect Movies for You
              </h3>
            </div>

            <Row className="mb-4">
              {recommendations.map((movie) => (
                <Col md={6} lg={4} key={movie.id} className="mb-4">
                  {/* AI-Enhanced Movie Card */}
                  <Card className="h-100 border-0 shadow-lg movie-card-ai" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                    <div className="position-relative">
                      <MovieCard
                        movie={movie}
                        showFavoriteButton={isAuthenticated}
                        onFavoriteToggle={handleFavoriteToggle}
                        isFavorited={favorites.has(movie.id)}
                      />
                      
                      {/* AI Badge */}
                      <div className="position-absolute top-0 end-0 m-3">
                        <Badge bg="danger" className="ai-badge">
                          <FaRobot className="me-1" />
                          AI Pick
                        </Badge>
                      </div>
                    </div>
                    
                    {/* AI Tagline */}
                    {movie.tagline && (
                      <Card.Body className="pt-3 pb-2" style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' }}>
                        <div className="d-flex align-items-start mb-2">
                          <FaMagic className="me-2 text-primary flex-shrink-0" style={{ marginTop: '2px' }} />
                          <small className="text-muted fst-italic">"{movie.tagline}"</small>
                        </div>
                      </Card.Body>
                    )}
                    
                    {/* AI Reason */}
                    {movie.reason && (
                      <Card.Body className="pt-2 pb-3" style={{ background: 'linear-gradient(135deg, rgba(118, 75, 162, 0.05) 0%, rgba(102, 126, 234, 0.05) 100%)' }}>
                        <div className="mb-2">
                          <strong className="text-primary d-flex align-items-center">
                            <FaLightbulb className="me-2" size={14} />
                            Why recommended for you:
                          </strong>
                          <small className="text-muted">{movie.reason}</small>
                        </div>
                      </Card.Body>
                    )}
                    
                    {/* Mini Scene */}
                    {movie.mini_scene && (
                      <Card.Body className="pt-2 pb-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <div className="d-flex align-items-start">
                          <FaTheaterMasks className="me-2 text-info flex-shrink-0" style={{ marginTop: '2px' }} />
                          <small className="text-muted">{movie.mini_scene}</small>
                        </div>
                      </Card.Body>
                    )}
                    
                    {/* Action Buttons */}
                    <Card.Footer className="bg-transparent border-0 p-3">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="w-100"
                        onClick={() => handleMoreLikeThis(movie)}
                      >
                        <FaRedo className="me-2" />
                        More Like This
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Regenerate Options */}
            <Card className="border-0 shadow-lg mb-5" style={{ borderRadius: '20px', background: gradients.daylight }}>
              <Card.Body className="p-4">
                <h5 className="text-white mb-3 fw-bold text-center">
                  <FaRedo className="me-2" />
                  Want to Refine Your Results?
                </h5>
                <div className="d-flex justify-content-center flex-wrap gap-3">
                  <Button 
                    variant="light" 
                    size="lg"
                    onClick={() => handleRegenerateWithTwist('darker')}
                    disabled={loading}
                    className="fw-semibold"
                    style={{ borderRadius: '15px' }}
                  >
                    <FaMoon className="me-2" /> Make it Darker
                  </Button>
                  <Button 
                    variant="light" 
                    size="lg"
                    onClick={() => handleRegenerateWithTwist('funnier')}
                    disabled={loading}
                    className="fw-semibold"
                    style={{ borderRadius: '15px' }}
                  >
                    😄 Make it Funnier
                  </Button>
                  <Button 
                    variant="light" 
                    size="lg"
                    onClick={() => handleRegenerateWithTwist('more emotional')}
                    disabled={loading}
                    className="fw-semibold"
                    style={{ borderRadius: '15px' }}
                  >
                    💔 More Emotional
                  </Button>
                  <Button 
                    variant="light" 
                    size="lg"
                    onClick={handleAISearch}
                    disabled={loading}
                    className="fw-semibold"
                    style={{ borderRadius: '15px' }}
                  >
                    <FaRedo className="me-2" />
                    Try Again
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!loading && recommendations.length === 0 && !error && (
          <Card 
            className="text-center border-0 shadow-lg p-5" 
            style={{ 
              borderRadius: '20px',
              background: gradients.green,
              color: 'white'
            }}
          >
            <Card.Body className="p-5">
              <div className="ai-orb-container mb-4" style={{ display: 'inline-block' }}>
                <div className="ai-orb"></div>
              </div>
              <h3 className="mb-3 fw-bold">Ready to Discover Your Next Favorite Movie?</h3>
              <p className="mb-4" style={{ fontSize: '1.15rem', opacity: 0.9, maxWidth: '700px', margin: '0 auto 2rem' }}>
                {mode === 'user_taste' && isAuthenticated && 'Click "Get Profile Recommendations" to receive personalized movie suggestions based on your taste.'}
                {mode === 'user_taste' && !isAuthenticated && 'Login to get personalized recommendations based on your profile and favorites.'}
                {mode === 'surprise' && 'Tell AI what kind of movie you want and let Gemini work its magic!'}
                {mode === 'discover' && 'Describe your ideal movie or select quick options to discover something new!'}
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default Recommendations;
