// src/components/common/LoadingSpinner.jsx
import React from 'react';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="spinner-container" role="status" aria-label="Loading">
      <div className="spinner"></div>
    </div>
  );
}

export default LoadingSpinner;