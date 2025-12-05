// Authentication Context - Manages user authentication state
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import logger from '../utils/logger';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user data
  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      logger.error('Failed to fetch user:', error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set default authorization header when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      // Fetch user data
      fetchUser();
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token, fetchUser]);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      setToken(response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      // Better error handling
      let errorMessage = 'Login failed';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.data?.message || 'Login failed';
        
        // Handle rate limiting
        if (error.response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait 15 minutes and try again.';
        }
        
        // Handle validation errors
        if (error.response.status === 400 && error.response.data?.errors) {
          const validationErrors = error.response.data.errors;
          errorMessage = Object.values(validationErrors).flat().join(', ');
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Cannot connect to server. Please check your internet connection or try again later.';
      } else {
        // Error setting up request
        errorMessage = error.message || 'An unexpected error occurred';
      }
      
      logger.error('Login error:', error);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      setToken(response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    register,
    logout,
    fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

