// Register Page - User registration
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaUserPlus, FaUser, FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';
import { MdMovie } from 'react-icons/md';
import palette from '../theme/colors';

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Minimum 8 characters, at least one uppercase, one lowercase, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateUsername = (username) => {
  // Username: 3-20 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (!validateUsername(username)) {
      errors.username = 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
    }
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!validatePassword(password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
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

    const result = await register(username.trim(), email.trim(), password);
    
    if (result.success) {
      navigate('/recommendations');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
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
            <Card.Title className="h3 fw-bold mb-2" style={{ color: palette.textDark }}>Join CineSense</Card.Title>
            <p className="text-muted" style={{ fontSize: '0.95rem' }}>Create your account and start discovering amazing movies</p>
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
                <FaUser className="me-2" size={14} />
                Username
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Choose a username (3-20 characters)"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (validationErrors.username) {
                    setValidationErrors(prev => ({ ...prev, username: '' }));
                  }
                }}
                isInvalid={!!validationErrors.username}
                required
                className="py-2"
              />
              {validationErrors.username && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.username}
                </Form.Control.Feedback>
              )}
              <Form.Text className="text-muted">
                3-20 characters, letters, numbers, and underscores only
              </Form.Text>
            </Form.Group>
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
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                isInvalid={!!validationErrors.password}
                required
                minLength={8}
                className="py-2"
              />
              {validationErrors.password && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.password}
                </Form.Control.Feedback>
              )}
              <Form.Text className="text-muted">
                Minimum 8 characters with uppercase, lowercase, and number
              </Form.Text>
            </Form.Group>
            <Button variant="success" type="submit" className="w-100 py-2 fw-semibold" disabled={loading} size="lg">
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Registering...
                </>
              ) : (
                <>
                  <FaUserPlus className="me-2" />
                  Create Account
                </>
              )}
            </Button>
          </Form>
          <div className="text-center mt-4 pt-3 border-top">
            <p className="text-muted mb-0">
              Already have an account?{' '}
              <Link to="/login" className="text-decoration-none fw-semibold">
                <FaSignInAlt className="me-1" size={12} />
                Login here
              </Link>
            </p>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Register;

