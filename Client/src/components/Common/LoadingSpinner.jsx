// src/components/Common/LoadingSpinner.jsx
import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = ({ label, page = false, size = 40, color = "#2563eb" }) => {
  const text = label ?? (size <= 24 ? "" : "در حال دریافت اطلاعات...");
  return (
    <div className={`spinner-container${page ? " spinner-container--page" : ""}${size <= 24 ? " spinner-container--compact" : ""}`} role="status" aria-live="polite">
      <div className="spinner" style={{ width: size, height: size, borderTopColor: color }}></div>
      {text && <span>{text}</span>}
    </div>
  );
}

LoadingSpinner.propTypes = { label: PropTypes.string, page: PropTypes.bool, size: PropTypes.number, color: PropTypes.string };

export default LoadingSpinner;
