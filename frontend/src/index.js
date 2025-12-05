import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';

// Global error handler for chunk loading errors
// This handles cases where webpack chunks fail to load (often due to stale cache)
window.addEventListener('error', (event) => {
  if (event.error && event.error.name === 'ChunkLoadError') {
    console.warn('ChunkLoadError detected. Reloading page...');
    // Reload the page to fetch fresh chunks
    window.location.reload();
  }
});

// Handle unhandled promise rejections for chunk loading
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.name === 'ChunkLoadError') {
    console.warn('ChunkLoadError in promise. Reloading page...');
    event.preventDefault();
    window.location.reload();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

