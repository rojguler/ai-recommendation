// Profile Page - Modern AI-focused profile design without reviews
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  FaUser, FaHeart, FaStar, FaEdit, FaCalendarAlt,
  FaEye, FaSearch, FaMagic, FaTrash, FaSave
} from 'react-icons/fa';
import { MdMovie, MdSmartToy } from 'react-icons/md';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import logger from '../utils/logger';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('watched');
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');

  const availableGenres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama',
    'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
    'Western', 'Documentary', 'Family', 'Musical', 'War', 'Biography'
  ];

  useEffect(() => {
    fetchProfileData();
    loadAIHistory();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/users/profile');
      setProfile(response.data);
      setSelectedGenres(response.data.favorite_genres || []);
      setWatchedMovies(response.data.liked_movies || []);
      setBio(response.data.bio || generateBioFromGenres(response.data.favorite_genres || []));
      
      // Fetch favorites
      const favResponse = await api.get('/movies/favorites/list');
      setFavorites(favResponse.data);
    } catch (error) {
      logger.error('Failed to fetch profile:', error);
      setToast({ message: 'Failed to load profile', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const generateBioFromGenres = (genres) => {
    if (!genres || genres.length === 0) return 'Movie enthusiast';
    const genreLabels = {
      'Horror': 'Horror addict',
      'Sci-Fi': 'Sci-fi lover',
      'Romance': 'Romance enthusiast',
      'Action': 'Action fan',
      'Comedy': 'Comedy seeker',
      'Thriller': 'Thriller devotee'
    };
    const labels = genres.slice(0, 2).map(g => genreLabels[g] || g).join(', ');
    return labels || 'Movie enthusiast';
  };

  const loadAIHistory = () => {
    // Load AI recommendation history from localStorage
    const history = JSON.parse(localStorage.getItem('aiRecommendationHistory') || '[]');
    setAiHistory(history);
  };

  const saveAIHistory = (prompt, recommendations) => {
    const history = JSON.parse(localStorage.getItem('aiRecommendationHistory') || '[]');
    const newEntry = {
      id: Date.now(),
      prompt,
      recommendations: recommendations.map(m => ({ id: m.id, title: m.title, poster_url: m.poster_url })),
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20); // Keep last 20
    localStorage.setItem('aiRecommendationHistory', JSON.stringify(updatedHistory));
    setAiHistory(updatedHistory);
  };

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => {
      const updated = prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre];
      return updated;
    });
  };

  const handleSaveGenres = async () => {
    try {
      await api.put('/users/profile/genres', { genres: selectedGenres });
      setToast({ message: 'Favorite genres updated successfully!', type: 'success' });
      fetchProfileData();
    } catch (error) {
      setToast({ message: 'Failed to update favorite genres', type: 'danger' });
    }
  };

  const handleFavoriteToggle = async (movieId, isFavorited) => {
    try {
      if (isFavorited) {
        await api.post('/movies/favorites', { movieId });
        setFavorites(prev => [...prev, { id: movieId }]);
      } else {
        await api.delete(`/movies/favorites/${movieId}`);
        setFavorites(prev => prev.filter(m => m.id !== movieId));
      }
    } catch (error) {
      logger.error('Favorite toggle error:', error);
    }
  };

  const handleRemoveFromWatched = async (movieId) => {
    try {
      await api.delete('/users/preferences', { 
        data: { movieId }
      });
      setWatchedMovies(prev => prev.filter(m => m.id !== movieId));
      setToast({ message: 'Removed from watched', type: 'info' });
    } catch (error) {
      logger.error('Failed to remove from watched:', error);
      setToast({ message: 'Failed to remove from watched', type: 'danger' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" size="lg" />
        <p className="mt-3 text-muted">Loading profile...</p>
      </Container>
    );
  }

  return (
    <div className="profile-page">
      <Container>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Profile Header */}
        <div className="profile-header-card">
          <Row className="align-items-center">
            <Col md="auto" className="mb-4 mb-md-0">
              <div className="profile-avatar">
                <FaUser />
              </div>
            </Col>
            <Col>
              <h1 className="profile-username">
                {profile?.username || user?.username}
              </h1>
              {editingBio ? (
                <div className="d-flex align-items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={() => setEditingBio(false)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') setEditingBio(false);
                    }}
                    className="form-control"
                    style={{ 
                      maxWidth: '400px',
                      borderRadius: '12px',
                      border: '2px solid rgba(0, 0, 0, 0.1)',
                      padding: '0.75rem 1rem',
                      fontSize: '17px'
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <p 
                  className="profile-bio"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditingBio(true)}
                >
                  {bio || generateBioFromGenres(selectedGenres)}
                  <FaEdit className="ms-2" size={14} style={{ opacity: 0.6 }} />
                </p>
              )}
              <div className="profile-meta">
                <div className="profile-meta-item">
                  <FaCalendarAlt />
                  <span>Joined {formatDate(profile?.created_at)}</span>
                </div>
                {selectedGenres.length > 0 && (
                  <div className="profile-genres">
                    {selectedGenres.slice(0, 3).map(genre => (
                      <span key={genre} className="profile-genre-badge">
                        {genre}
                      </span>
                    ))}
                    {selectedGenres.length > 3 && (
                      <span className="profile-genre-badge" style={{ background: 'var(--orange-wine)' }}>
                        +{selectedGenres.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon watched">
              <FaEye />
            </div>
            <div className="stat-number">{watchedMovies.length}</div>
            <div className="stat-label">Watched</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon favorites">
              <FaHeart />
            </div>
            <div className="stat-number">{favorites.length}</div>
            <div className="stat-label">Favorites</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon ai">
              <FaSearch />
            </div>
            <div className="stat-number">{aiHistory.length}</div>
            <div className="stat-label">AI Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon genres">
              <FaStar />
            </div>
            <div className="stat-number">{selectedGenres.length}</div>
            <div className="stat-label">Genres</div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="profile-tabs-container">
          <div className="modern-tabs">
            <button
              className={`modern-tab ${activeTab === 'watched' ? 'active' : ''}`}
              onClick={() => setActiveTab('watched')}
            >
              <FaEye />
              Watched
            </button>
            <button
              className={`modern-tab ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <FaHeart />
              Favorites
            </button>
            <button
              className={`modern-tab ${activeTab === 'ai-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-history')}
            >
              <MdSmartToy />
              AI History
            </button>
          </div>

          <div className="tab-content">
            {/* Tab 1: Watched Movies */}
            {activeTab === 'watched' && (
              <div>
                {watchedMovies.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <MdMovie />
                    </div>
                    <p className="empty-state-text">No watched movies yet. Like movies to add them here!</p>
                  </div>
                ) : (
                  <div className="movies-grid">
                    {watchedMovies.map((movie) => (
                      <div key={movie.id} className="movie-item">
                        <Link to={`/movie/${movie.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {movie.poster_url ? (
                            <img 
                              src={movie.poster_url} 
                              alt={movie.title}
                              className="movie-poster"
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                aspectRatio: '2/3',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, var(--deep-blue) 0%, var(--olives) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                padding: '1rem',
                                textAlign: 'center'
                              }}
                            >
                              {movie.title}
                            </div>
                          )}
                          <div className="movie-title">{movie.title}</div>
                          <div className="movie-meta">{movie.genre} • {movie.year}</div>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFromWatched(movie.id);
                          }}
                          className="movie-delete-btn"
                        >
                          <FaTrash size={14} color="#dc3545" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Favorites */}
            {activeTab === 'favorites' && (
              <div>
                {favorites.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FaHeart />
                    </div>
                    <p className="empty-state-text">No favorites yet. Add movies to your favorites!</p>
                    <Button as={Link} to="/recommendations" className="save-button">
                      Get Recommendations
                    </Button>
                  </div>
                ) : (
                  <div className="movies-grid">
                    {favorites.map((movie) => (
                      <div key={movie.id} className="movie-item">
                        <Link to={`/movie/${movie.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {movie.poster_url ? (
                            <img 
                              src={movie.poster_url} 
                              alt={movie.title}
                              className="movie-poster"
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                aspectRatio: '2/3',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, var(--deep-blue) 0%, var(--olives) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                padding: '1rem',
                                textAlign: 'center'
                              }}
                            >
                              {movie.title}
                            </div>
                          )}
                          <div className="movie-title">{movie.title}</div>
                          <div className="movie-meta">{movie.genre} • {movie.year}</div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: AI Recommendation History */}
            {activeTab === 'ai-history' && (
              <div>
                {aiHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <MdSmartToy />
                    </div>
                    <p className="empty-state-text">No AI recommendations yet. Start exploring!</p>
                    <Button as={Link} to="/recommendations" className="save-button">
                      <FaMagic className="me-2" />
                      Get AI Recommendations
                    </Button>
                  </div>
                ) : (
                  <div>
                    {aiHistory.map((entry) => (
                      <div key={entry.id} className="ai-history-card">
                        <div className="ai-history-header">
                          <div>
                            <div className="ai-history-prompt">{entry.prompt}</div>
                            <div className="ai-history-date">
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Button
                            as={Link}
                            to="/recommendations"
                            state={{ customSearch: entry.prompt }}
                            className="save-button"
                            style={{ fontSize: '15px', padding: '0.6rem 1.5rem' }}
                          >
                            <FaMagic className="me-2" />
                            Re-run
                          </Button>
                        </div>
                        <div className="ai-history-movies">
                          {entry.recommendations?.slice(0, 6).map((movie) => (
                            <Link key={movie.id} to={`/movie/${movie.id}`} className="ai-history-movie">
                              {movie.poster_url ? (
                                <img 
                                  src={movie.poster_url} 
                                  alt={movie.title}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(135deg, var(--deep-blue) 0%, var(--olives) 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    color: 'white',
                                    textAlign: 'center',
                                    padding: '4px'
                                  }}
                                >
                                  {movie.title}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Settings - Genre Preferences */}
        <div className="genres-section">
          <div className="genres-header">
            <div className="genres-header-icon">
              <FaStar />
            </div>
            <div>
              <h3 className="genres-title">Favorite Genres</h3>
              <p className="genres-subtitle">Select genres to improve AI recommendations</p>
            </div>
          </div>
          <div className="genres-grid">
            {availableGenres.map(genre => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  className={`genre-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleGenreToggle(genre)}
                >
                  {isSelected && <FaStar className="me-1" size={12} />}
                  {genre}
                </button>
              );
            })}
          </div>
          <Button 
            className="save-button"
            onClick={handleSaveGenres}
          >
            <FaSave />
            Save Genres
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default Profile;
