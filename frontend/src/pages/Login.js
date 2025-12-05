// Login Page - User authentication
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaSignInAlt, FaEnvelope, FaLock, FaUserPlus } from 'react-icons/fa';
import { MdMovie } from 'react-icons/md';
import palette from '../theme/colors';
import logger from '../utils/logger';

// Validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const validateForm = () => {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Check if there's a redirect path and custom search from Home page
        const redirectTo = location.state?.redirectTo || '/recommendations';
        const customSearch = location.state?.customSearch;
        
        if (customSearch) {
          navigate(redirectTo, { 
            state: { customSearch } 
          });
        } else {
          navigate(redirectTo);
        }
      } else {
        // More detailed error messages
        let errorMsg = result.error || 'Login failed. Please check your credentials and try again.';
        
        // Check if it's a connection error
        if (errorMsg.includes('Cannot connect') || errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED')) {
          errorMsg = 'Cannot connect to server. Please make sure the backend is running on http://localhost:5000';
        }
        
        setError(errorMsg);
      }
    } catch (err) {
      logger.error('Login error:', err);
      
      // Better error handling
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (err.message?.includes('Network Error') || err.code === 'ECONNREFUSED') {
        errorMsg = 'Cannot connect to server. Please make sure the backend is running on http://localhost:5000';
      } else if (err.response) {
        errorMsg = err.response.data?.error || 'Login failed. Please check your credentials.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5 page-transition" style={{ maxWidth: '480px' }}>
      <Card className="border-0" style={{ 
        borderRadius: '24px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(137, 137, 43, 0.1)'
      }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ 
                   width: '80px', 
                   height: '80px',
                   background: `linear-gradient(135deg, ${palette.greenPrimary}15 0%, ${palette.greenPrimary}25 100%)`,
                   border: `2px solid ${palette.greenPrimary}30`
                 }}>
              <MdMovie size={40} color={palette.greenPrimary} />
            </div>
            <Card.Title className="h3 fw-bold mb-2" style={{ color: palette.textDark }}>Login to CineSense</Card.Title>
            <p className="text-muted" style={{ fontSize: '0.95rem' }}>Welcome back! Please sign in to continue</p>
            <p className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
              Don't have an account?{' '}
              <Link to="/register" className="text-decoration-none fw-semibold" style={{ color: palette.greenPrimary }}>
                Create one here
              </Link>
            </p>
          </div>
          {error && (
            <Alert variant="danger" className="d-flex align-items-center">
              <span className="me-2">⚠️</span>
              {error}
            </Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <FaEnvelope className="me-2" size={14} />
                Email Address
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                isInvalid={!!validationErrors.email}
                required
                className="py-2"
              />
              {validationErrors.email && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.email}
                </Form.Control.Feedback>
              )}
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <FaLock className="me-2" size={14} />
                Password
              </Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                isInvalid={!!validationErrors.password}
                required
                className="py-2"
              />
              {validationErrors.password && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.password}
                </Form.Control.Feedback>
              )}
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 py-2 fw-semibold" disabled={loading} size="lg">
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Logging in...
                </>
              ) : (
                <>
                  <FaSignInAlt className="me-2" />
                  Login
                </>
              )}
            </Button>
          </Form>
          <div className="text-center mt-4 pt-3 border-top">
            <p className="text-muted mb-0">
              Don't have an account?{' '}
              <Link to="/register" className="text-decoration-none fw-semibold">
                <FaUserPlus className="me-1" size={12} />
                Register here
              </Link>
            </p>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;

