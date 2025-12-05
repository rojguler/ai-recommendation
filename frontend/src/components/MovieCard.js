// Movie Card Component - Modern card design with enhanced UI/UX for displaying movie information
import React, { memo } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaTag, FaBook, FaHeart, FaRegHeart } from 'react-icons/fa';
import palette, { gradients } from '../theme/colors';

const MovieCard = memo(({ movie, showFavoriteButton = false, onFavoriteToggle, isFavorited = false }) => {
  return (
    <Card
      className="movie-card mb-4 border-0"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        background: palette.creamSoft,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(137, 137, 43, 0.08)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(137, 137, 43, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Movie Poster Section - Enhanced with overlay effect */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {movie.poster_url ? (
          <Card.Img 
            variant="top" 
            src={movie.poster_url} 
            className="movie-poster"
            loading="lazy"
            alt={`${movie.title} poster`}
            style={{ 
              objectFit: 'cover',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              height: '280px',
              width: '100%',
              display: 'block'
            }}
          />
        ) : (
          <div
            className="movie-poster d-flex align-items-center justify-content-center text-white"
            style={{
              background: gradients.green,
              height: '280px',
              width: '100%',
              position: 'relative'
            }}
          >
            <div className="text-center p-3">
              <h5 className="mb-1 fw-bold" style={{ fontSize: '1rem' }}>{movie.title}</h5>
              <p className="mb-0 opacity-90" style={{ fontSize: '0.85rem' }}>{movie.year}</p>
            </div>
          </div>
        )}
        {/* Favorite Button Overlay - Modern floating button */}
        {showFavoriteButton && (
          <Button
            variant={isFavorited ? "danger" : "light"}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onFavoriteToggle(movie.id, !isFavorited);
            }}
            className="position-absolute top-0 end-0 movie-favorite-btn"
            style={{
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isFavorited ? 'none' : '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.3s ease',
              zIndex: 10,
              margin: '8px',
              padding: 0
            }}
          >
            {isFavorited ? (
              <FaHeart size={14} />
            ) : (
              <FaRegHeart size={14} style={{ color: palette.textLight }} />
            )}
          </Button>
        )}
      </div>

      {/* Card Body - Ultra compact design with minimal spacing */}
      <Card.Body
        className="p-4 d-flex flex-column"
        style={{
          background: gradients.daylight,
          flex: '1 1 auto'
        }}
      >
        <Card.Title
          className="mb-1 fw-bold"
          style={{
            fontSize: '1.15rem',
            color: palette.textDark,
            lineHeight: '1.3'
          }}
        >
          {movie.title}
        </Card.Title>
        
        <Card.Subtitle
          className="mb-1"
          style={{
            color: palette.textMedium,
            fontSize: '0.85rem',
            fontWeight: '500'
          }}
        >
          {movie.genre} • {movie.year}
        </Card.Subtitle>

        {/* Tagline Section - Very compact */}
        {movie.tagline && (
          <Card.Text
            className="fst-italic mb-1 px-2 py-1 rounded"
            style={{
              color: palette.textMedium,
              fontSize: '0.8rem',
              background: 'rgba(255, 255, 255, 0.6)',
              borderLeft: `3px solid ${palette.orangeWine}`,
              lineHeight: '1.4'
            }}
          >
            "{movie.tagline}"
          </Card.Text>
        )}

        {/* Description Section - Very compact, only 2 lines */}
        <Card.Text
          className="mb-2"
          style={{
            color: palette.textMedium,
            lineHeight: '1.5',
            fontSize: '0.85rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {movie.description}
        </Card.Text>

        {/* Tags Section - Very compact badges */}
        {movie.tags && movie.tags.length > 0 && (
          <div className="mb-2">
            <div className="d-flex flex-wrap gap-1">
              {movie.tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  bg="primary" 
                  className="text-capitalize px-2 py-1" 
                  style={{ 
                    fontSize: '0.65rem',
                    fontWeight: '500',
                    borderRadius: '6px'
                  }}
                >
                  {tag}
                </Badge>
              ))}
              {movie.tags.length > 3 && (
                <Badge 
                  bg="secondary" 
                  className="px-2 py-1"
                  style={{ 
                    fontSize: '0.65rem',
                    fontWeight: '500',
                    borderRadius: '6px'
                  }}
                >
                  +{movie.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Compact button at bottom */}
        <div className="d-flex gap-2 mt-auto pt-2">
          <Button 
            as={Link} 
            to={`/movie/${movie.id || (movie.tmdb_id ? `tmdb_${movie.tmdb_id}` : '')}`} 
            variant="primary" 
            size="sm" 
            className="flex-grow-1 d-flex align-items-center justify-content-center px-2 py-2"
            style={{ 
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease'
            }}
          >
            <FaBook className="me-2" size={11} />
            View Details
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;

