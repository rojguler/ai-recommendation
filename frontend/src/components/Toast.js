// Toast Notification Component - Shows success/error messages
import React, { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onClose) {
        setTimeout(onClose, 300); // Wait for fade out
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!show) return null;

  return (
    <Alert
      variant={type}
      dismissible
      onClose={() => {
        setShow(false);
        if (onClose) setTimeout(onClose, 300);
      }}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        minWidth: '300px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      {message}
    </Alert>
  );
};

export default Toast;

